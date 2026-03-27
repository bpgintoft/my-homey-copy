import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { google } from 'npm:googleapis@134';

// Scheduled every 15 minutes.
// Uses Google's updatedMin param to only fetch recently-changed events (delta sync).
// Falls back to a full resync once per hour to catch deletions.
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
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 21);

  // Delta: only fetch events updated in the last 16 minutes (slightly more than interval)
  const updatedMin = new Date(now.getTime() - 16 * 60 * 1000);

  // Determine if this is a full resync run (once per hour, on the :00 or :15 minute mark closest to the top)
  const minuteOfHour = now.getMinutes();
  const isFullResync = minuteOfHour < 16; // ~once per hour

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
        .filter(event => event.status !== 'cancelled') // skip deleted events
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
      await sleep(200);
    } catch (err) {
      console.error(`Error fetching calendar ${cal.summary}:`, err.message);
      await sleep(500);
    }
  }

  console.log(`Fetched ${allEvents.length} events (${isFullResync ? 'full' : 'delta'})`);

  if (allEvents.length === 0 && !isFullResync) {
    // Nothing changed since last run — done
    console.log('No changes detected, skipping DB writes.');
    return Response.json({ success: true, count: 0, mode: 'delta', message: 'No changes' });
  }

  // Load only the events we need to check against
  let existingMap = {};
  if (isFullResync) {
    // Full resync: load all cached events to detect deletions
    const existing = await base44.asServiceRole.entities.CachedCalendarEvent.list('-start', 1000);
    for (const e of existing) existingMap[e.google_event_id] = e;

    // Delete stale events that are no longer returned by Google
    const incomingIds = new Set(allEvents.map(e => e.google_event_id));
    const toDelete = existing.filter(e => !incomingIds.has(e.google_event_id));
    for (const e of toDelete) {
      await base44.asServiceRole.entities.CachedCalendarEvent.delete(e.id);
      await sleep(150);
    }
    if (toDelete.length > 0) console.log(`Deleted ${toDelete.length} stale events`);
  } else {
    // Delta: only load the specific events we fetched (by google_event_id filter)
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
        await sleep(150);
        updated++;
      } else {
        skipped++;
      }
    } else {
      await base44.asServiceRole.entities.CachedCalendarEvent.create(event);
      await sleep(150);
      created++;
    }
  }

  console.log(`Done: ${created} created, ${updated} updated, ${skipped} skipped`);
  return Response.json({ success: true, count: allEvents.length, created, updated, skipped, mode: isFullResync ? 'full' : 'delta' });
});