import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@144.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { calendarId, eventId } = await req.json();

    if (!calendarId || !eventId) {
      return Response.json({ error: 'Missing calendar ID or event ID' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete Google Calendar event error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});