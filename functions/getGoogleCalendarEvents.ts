import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@134';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeMin, timeMax } = await req.json();

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not authorized' }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });

    // Get list of all calendars
    const calendarsRes = await calendar.calendarList.list();
    const calendars = calendarsRes.data.items || [];

    let allEvents = [];

    // Fetch events from each calendar
    for (const cal of calendars) {
      try {
        const eventsRes = await calendar.events.list({
          calendarId: cal.id,
          timeMin: timeMin,
          timeMax: timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = (eventsRes.data.items || []).map(event => ({
          id: event.id,
          calendarId: cal.id,
          calendarName: cal.summary,
          title: event.summary || 'Untitled',
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          location: event.location,
          description: event.description,
          backgroundColor: cal.backgroundColor || '#4285F4',
        }));
        
        allEvents = allEvents.concat(events);
      } catch (err) {
        console.error(`Error fetching events from calendar ${cal.summary}:`, err.message);
      }
    }

    // Sort all events by start time
    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    return Response.json({ events: allEvents });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});