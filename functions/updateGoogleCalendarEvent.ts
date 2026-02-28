import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@144.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { id, calendarId, summary, description, location, start, end, recurrence, originalCalendarId, isAllDay } = await req.json();

    if (!id || !calendarId) {
      return Response.json({ error: 'Missing event ID or calendar ID' }, { status: 400 });
    }

    // Strip recurring instance suffix (e.g. "eventId_20260227T151500Z" -> "eventId")
    const baseEventId = id.includes('_') ? id.split('_')[0] : id;

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

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
    } else {
      event.recurrence = [];
    }

    // If calendar has changed, we need to move the event
    if (originalCalendarId && originalCalendarId !== calendarId) {
      // Delete from old calendar
      await calendar.events.delete({
        calendarId: originalCalendarId,
        eventId: id,
      });

      // Create in new calendar
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      return Response.json({ event: response.data });
    } else {
      // Update in same calendar
      const response = await calendar.events.update({
        calendarId,
        eventId: baseEventId,
        requestBody: event,
      });

      return Response.json({ event: response.data });
    }
  } catch (error) {
    console.error('Update Google Calendar event error:', error);
    const message = error.message?.includes('Event type cannot be changed')
      ? 'This event was automatically created by Google (e.g. from a Gmail email) and cannot be edited via the API. Please edit it directly in Google Calendar.'
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  }
});