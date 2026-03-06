import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { google } from 'npm:googleapis@144.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch all calendars
    const calListRes = await calendar.calendarList.list({ maxResults: 50 });
    const calendars = calListRes.data.items || [];

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 8 weeks forward

    const allEvents = [];

    for (const cal of calendars) {
      const eventsRes = await calendar.events.list({
        calendarId: cal.id,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      });

      const events = eventsRes.data.items || [];
      for (const event of events) {
        const isAllDay = !!(event.start?.date && !event.start?.dateTime);
        allEvents.push({
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
          is_all_day: isAllDay,
        });
      }
    }

    // Clear old cache and replace with fresh data
    const existing = await base44.asServiceRole.entities.CachedCalendarEvent.list();
    await Promise.all(existing.map(e => base44.asServiceRole.entities.CachedCalendarEvent.delete(e.id)));

    // Insert new events in batches
    const batchSize = 20;
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize);
      await Promise.all(batch.map(e => base44.asServiceRole.entities.CachedCalendarEvent.create(e)));
    }

    return Response.json({ success: true, count: allEvents.length });
  } catch (error) {
    console.error('prefetchCalendarEvents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});