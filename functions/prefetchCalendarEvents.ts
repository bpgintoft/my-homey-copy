import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { google } from 'npm:googleapis@144.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    const calListRes = await calendar.calendarList.list({ maxResults: 50 });
    const calendars = calListRes.data.items || [];

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000).toISOString(); // 6 weeks

    // Fetch all calendars in parallel
    const perCalResults = await Promise.all(calendars.map(async (cal) => {
      const eventsRes = await calendar.events.list({
        calendarId: cal.id,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });
      return (eventsRes.data.items || []).map(event => ({
        google_event_id: event.id,
        calendar_id: cal.id,
        calendar_name: cal.summary,
        background_color: cal.backgroundColor || '#4285f4',
        title: event.summary || '(No title)',
        description: event.description || '',
        location: event.location || '',
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        recurrence: event.recurrence || [],
        is_all_day: !!(event.start?.date && !event.start?.dateTime),
      }));
    }));

    const allEvents = perCalResults.flat();
    const newEventIds = new Set(allEvents.map(e => e.google_event_id));

    // Get existing cache
    const existing = await base44.asServiceRole.entities.CachedCalendarEvent.list('-start', 2000);
    const existingIds = new Set(existing.map(e => e.google_event_id));

    // Only create truly new events (skip existing ones to stay within rate limits)
    const toCreate = allEvents.filter(e => !existingIds.has(e.google_event_id));
    const toDelete = existing.filter(e => !newEventIds.has(e.google_event_id));

    // Delete stale in batches of 5
    for (let i = 0; i < toDelete.length; i += 5) {
      await Promise.all(toDelete.slice(i, i + 5).map(e =>
        base44.asServiceRole.entities.CachedCalendarEvent.delete(e.id)
      ));
    }

    // Create new in batches of 5
    for (let i = 0; i < toCreate.length; i += 5) {
      await Promise.all(toCreate.slice(i, i + 5).map(e =>
        base44.asServiceRole.entities.CachedCalendarEvent.create(e)
      ));
    }

    return Response.json({ success: true, total: allEvents.length, created: toCreate.length, deleted: toDelete.length });
  } catch (error) {
    console.error('prefetchCalendarEvents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});