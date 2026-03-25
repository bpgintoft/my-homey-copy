import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@134';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { calendarId, summary, description, start, end, location, recurrence, isAllDay } = await req.json();

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not authorized' }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary,
      description,
      location,
      start: isAllDay ? {
        date: start,
      } : {
        dateTime: start,
        timeZone: 'America/Chicago',
      },
      end: isAllDay ? {
        date: end,
      } : {
        dateTime: end,
        timeZone: 'America/Chicago',
      },
    };

    // Only add recurrence if it exists and is not empty
    if (recurrence && Array.isArray(recurrence) && recurrence.length > 0 && recurrence[0]) {
      event.recurrence = recurrence;
    }

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return Response.json({ event: response.data });
  } catch (error) {
    console.error('Create Google Calendar event error:', error);
    return Response.json({ 
      error: error.message || 'Unknown error',
      details: error.stack 
    }, { status: 500 });
  }
});