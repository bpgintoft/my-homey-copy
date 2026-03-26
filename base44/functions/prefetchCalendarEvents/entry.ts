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
    // Only 2 weeks — keeps function fast and within time limits
    const timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all calendars in parallel
    const perCalResults = await Promise.all(calendars.map(async (cal) => {
      const eventsRes = await calendar.events.list({
        calendarId: cal.id,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
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

    // Get ALL cached events (to properly deduplicate by google_event_id)
    const existing = await base44.asServiceRole.entities.CachedCalendarEvent.list('-start', 1000);
    const existingIds = new Set(existing.map(e => e.google_event_id));

    // Only create new events (skip already-cached ones to stay within rate limits)
    const toCreate = allEvents.filter(e => !existingIds.has(e.google_event_id));

    // Create new in batches of 10
    for (let i = 0; i < toCreate.length; i += 10) {
      await Promise.all(toCreate.slice(i, i + 10).map(e =>
        base44.asServiceRole.entities.CachedCalendarEvent.create(e)
      ));
    }

    return Response.json({ success: true, total: allEvents.length, created: toCreate.length });
  } catch (error) {
    console.error('prefetchCalendarEvents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});