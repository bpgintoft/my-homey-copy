import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@144.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { id, calendarId, summary, description, location, start, end } = await req.json();

    if (!id || !calendarId) {
      return Response.json({ error: 'Missing event ID or calendar ID' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary,
      description,
      location,
      start: {
        dateTime: start,
        timeZone: 'America/Chicago',
      },
      end: {
        dateTime: end,
        timeZone: 'America/Chicago',
      },
    };

    const response = await calendar.events.update({
      calendarId,
      eventId: id,
      requestBody: event,
    });

    return Response.json({ event: response.data });
  } catch (error) {
    console.error('Update Google Calendar event error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});