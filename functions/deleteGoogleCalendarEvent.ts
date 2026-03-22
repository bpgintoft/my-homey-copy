import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@144.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { calendarId, eventId, recurringDeleteScope } = await req.json();

    if (!calendarId || !eventId) {
      return Response.json({ error: 'Missing calendar ID or event ID' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    // If recurring delete scope is specified, pass it as the 'sendNotifications' option
    // 'this' = delete only this instance
    // 'future' = delete this and future events
    const params = {
      calendarId,
      eventId,
    };

    // Add scope parameter if provided (Google Calendar API uses different parameter for this)
    if (recurringDeleteScope === 'this') {
      params.scope = 'thisEvent';
    } else if (recurringDeleteScope === 'future') {
      params.scope = 'thisAndFollowing';
    }

    await calendar.events.delete(params);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete Google Calendar event error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});