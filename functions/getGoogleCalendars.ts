import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@134';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not authorized' }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });

    const calendarsRes = await calendar.calendarList.list();
    const calendars = (calendarsRes.data.items || []).map(cal => ({
      id: cal.id,
      name: cal.summary,
      backgroundColor: cal.backgroundColor,
      primary: cal.primary || false,
    }));

    return Response.json({ calendars });
  } catch (error) {
    console.error('Get Google Calendars error:', error);
    return Response.json({ 
      error: error.message || 'Unknown error',
      details: error.stack 
    }, { status: 500 });
  }
});