import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@134';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { timeMin, timeMax, masterEventId, calendarId: singleCalendarId } = body;

    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");
    } catch (_) {
      return Response.json({ events: [], notConnected: true });
    }

    if (!accessToken) {
      return Response.json({ events: [], notConnected: true });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    // If fetching a single master event for its recurrence rule
    if (masterEventId && singleCalendarId) {
      try {
        const eventRes = await calendar.events.get({ calendarId: singleCalendarId, eventId: masterEventId });
        return Response.json({ recurrence: eventRes.data.recurrence || null });
      } catch (err) {
        // Master event ID may use iCal format (starts with _). Try searching for it as a recurring event instance.
        console.error('Master event fetch failed, trying search:', err.message);
        // Return empty recurrence so UI still opens
        return Response.json({ recurrence: null });
      }
    }

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
          recurrence: event.recurrence || null,
          recurringEventId: event.recurringEventId || null,
          originalStartTime: event.originalStartTime || null,
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
    console.error('Google Calendar function error:', error);
    return Response.json({ 
      error: error.message || 'Unknown error',
      details: error.stack 
    }, { status: 500 });
  }
});