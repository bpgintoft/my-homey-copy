import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { google } from 'npm:googleapis@134';

// Scheduled every 30 minutes.
// Uses Google's updatedMin param to only fetch recently-changed events (delta sync).
// Falls back to a full resync once every 4 hours to catch deletions.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduler (no user) or admin users
  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (_) {
    // Scheduler call — no user context, proceed
  }

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
  if (!accessToken) {
    return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth });

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const now = new Date();

  // Rate-limit guard: skip if last sync was within 25 minutes (prevents overlap from manual + scheduled)
  const syncStates = await base44.asServiceRole.entities.SyncState.list('-updated_date', 1);
  const syncState = syncStates[0];
  if (syncState?.last_synced_at) {
    const lastSync = new Date(syncState.last_synced_at);
    const minutesSinceLast = (now.getTime() - lastSync.getTime()) / 60000;
    if (minutesSinceLast < 25) {
      console.log(`Skipping — last sync was ${Math.round(minutesSinceLast)} minutes ago.`);
      return Response.json({ success: true, skipped: true, reason: 'rate_limited' });
    }
  }

  // Parse request body for optional custom time range
  let bodyTimeMin = null;
  let bodyTimeMax = null;
  try {
    const body = await req.json();
    if (body.timeMin) bodyTimeMin = new Date(body.timeMin);
    if (body.timeMax) bodyTimeMax = new Date(body.timeMax);
  } catch (_) {
    // No body or invalid JSON — use defaults
  }

  const timeMin = bodyTimeMin || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const timeMax = bodyTimeMax || new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

  // Delta: only fetch events updated in the last 32 minutes (slightly more than 30-min interval)
  const updatedMin = new Date(now.getTime() - 32 * 60 * 1000);

  // Full resync once every 4 hours to catch deletions (not every hour)
  const hourOfDay = now.getUTCHours();
  const minuteOfHour = now.getUTCMinutes();
  const isFullResync = minuteOfHour < 31 && hourOfDay % 4 === 0;

  console.log(`Mode: ${isFullResync ? 'FULL RESYNC' : 'DELTA SYNC'}`);

  // Fetch calendar list
  const calendarsRes = await calendar.calendarList.list();
  const calendars = (calendarsRes.data.items || []).filter(cal => cal.accessRole !== 'freeBusyReader');

  let allEvents = [];

  for (const cal of calendars) {
    try {
      const params = {
        calendarId: cal.id,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'updated',
        maxResults: 100,
      };

      // On delta runs, only fetch recently updated events
      if (!isFullResync) {
        params.updatedMin = updatedMin.toISOString();
      }

      const eventsRes = await calendar.events.list(params);
      const events = (eventsRes.data.items || [])
        .filter(event => event.status !== 'cancelled')
        .map(event => ({
          google_event_id: event.id,
          calendar_id: cal.id,
          calendar_name: cal.summary,
          background_color: cal.backgroundColor || '#4285F4',
          title: event.summary || 'Untitled',
          description: event.description || '',
          location: event.location || '',
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          recurrence: event.recurrence || null,
          is_all_day: !event.start.dateTime,
        }));

      allEvents = allEvents.concat(events);
      // Longer delay between calendars to avoid quota bursts
      await sleep(500);
    } catch (err) {
      console.error(`Error fetching calendar ${cal.summary}:`, err.message);
      await sleep(1000);
    }
  }

  console.log(`Fetched ${allEvents.length} events (${isFullResync ? 'full' : 'delta'})`);

  if (allEvents.length === 0 && !isFullResync) {
    // Nothing changed since last run — done
    console.log('No changes detected, skipping DB writes.');
    // Still record the sync time so the rate-limit guard works
    await recordLastSync(base44, syncState, now);
    return Response.json({ success: true, count: 0, mode: 'delta', message: 'No changes' });
  }

  // Load only the events we need to check against
  let existingMap = {};
  if (isFullResync) {
    const existing = await base44.asServiceRole.entities.CachedCalendarEvent.list('-start', 1000);
    for (const e of existing) existingMap[e.google_event_id] = e;

    // Delete stale events no longer returned by Google
    const incomingIds = new Set(allEvents.map(e => e.google_event_id));
    const toDelete = existing.filter(e => !incomingIds.has(e.google_event_id));
    for (const e of toDelete) {
      await base44.asServiceRole.entities.CachedCalendarEvent.delete(e.id);
      await sleep(300);
    }
    if (toDelete.length > 0) console.log(`Deleted ${toDelete.length} stale events`);
  } else {
    const incoming = await base44.asServiceRole.entities.CachedCalendarEvent.filter(
      { google_event_id: { $in: allEvents.map(e => e.google_event_id) } },
      '-start', 200
    );
    for (const e of incoming) existingMap[e.google_event_id] = e;
  }

  // Upsert only changed/new events
  let created = 0, updated = 0, skipped = 0;
  for (const event of allEvents) {
    const ex = existingMap[event.google_event_id];
    if (ex) {
      const changed =
        ex.title !== event.title ||
        ex.start !== event.start ||
        ex.end !== event.end ||
        ex.location !== event.location ||
        ex.description !== event.description;
      if (changed) {
        await base44.asServiceRole.entities.CachedCalendarEvent.update(ex.id, event);
        await sleep(300);
        updated++;
      } else {
        skipped++;
      }
    } else {
      await base44.asServiceRole.entities.CachedCalendarEvent.create(event);
      await sleep(300);
      created++;
    }
  }

  // Record successful sync time
  await recordLastSync(base44, syncState, now);

  console.log(`Done: ${created} created, ${updated} updated, ${skipped} skipped`);
  return Response.json({ success: true, count: allEvents.length, created, updated, skipped, mode: isFullResync ? 'full' : 'delta' });
});

async function recordLastSync(base44, syncState, now) {
  try {
    if (syncState) {
      await base44.asServiceRole.entities.SyncState.update(syncState.id, { last_synced_at: now.toISOString() });
    } else {
      await base44.asServiceRole.entities.SyncState.create({ last_synced_at: now.toISOString() });
    }
  } catch (err) {
    console.error('Failed to record last sync time:', err.message);
  }
}