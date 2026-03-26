import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { google } from 'npm:googleapis@134';

// Scheduled every 15 minutes — fetches the next 4 weeks of Google Calendar events
// and writes them to the CachedCalendarEvent entity so the UI loads instantly.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Accept calls from the scheduler (no user) or from admins
  let isAuthorized = false;
  try {
    const user = await base44.auth.me();
    if (user?.role === 'admin') isAuthorized = true;
  } catch (_) {
    // Called by scheduler — no user context, allow via service role
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch a 4-week window (past 1 week + future 3 weeks) to cover navigation
    const now = new Date();
    const timeMin = new Date(now);
    timeMin.setDate(timeMin.getDate() - 7);
    const timeMax = new Date(now);
    timeMax.setDate(timeMax.getDate() + 21);

    const calendarsRes = await calendar.calendarList.list();
    const calendars = (calendarsRes.data.items || []).filter(cal => cal.accessRole !== 'freeBusyReader');

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    let allEvents = [];
    for (const cal of calendars) {
      try {
        const eventsRes = await calendar.events.list({
          calendarId: cal.id,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 100,
        });

        const events = (eventsRes.data.items || []).map(event => ({
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
        await sleep(300); // avoid rate limiting between calendar fetches
      } catch (err) {
        console.error(`Error fetching calendar ${cal.summary}:`, err.message);
        await sleep(500); // back off a bit more on error
      }
    }

    console.log(`Fetched ${allEvents.length} events from Google Calendar`);

    // Load existing cached events indexed by google_event_id
    const existing = await base44.asServiceRole.entities.CachedCalendarEvent.list('-start', 1000);
    const existingMap = {};
    for (const e of existing) existingMap[e.google_event_id] = e;

    const incomingIds = new Set(allEvents.map(e => e.google_event_id));

    // Delete stale events no longer in the window
    const toDelete = existing.filter(e => !incomingIds.has(e.google_event_id));
    await Promise.all(toDelete.map(e => base44.asServiceRole.entities.CachedCalendarEvent.delete(e.id)));

    // Upsert: update existing, create new — in parallel batches of 10
    const upsertBatch = async (events) => {
      await Promise.all(events.map(event => {
        const existing = existingMap[event.google_event_id];
        if (existing) {
          return base44.asServiceRole.entities.CachedCalendarEvent.update(existing.id, event);
        } else {
          return base44.asServiceRole.entities.CachedCalendarEvent.create(event);
        }
      }));
    };

    for (let i = 0; i < allEvents.length; i += 10) {
      await upsertBatch(allEvents.slice(i, i + 10));
    }

    console.log(`Cache updated: ${allEvents.length} events written`);
    return Response.json({ success: true, count: allEvents.length, window: { from: timeMin, to: timeMax } });
  } catch (error) {
    console.error('syncCalendarCache error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});