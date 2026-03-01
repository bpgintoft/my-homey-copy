import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@144.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      id, calendarId, summary, description, location, start, end,
      recurrence, originalCalendarId, isAllDay,
      recurringEditScope, // 'this' | 'future' | undefined (non-recurring)
      recurringEventId,   // the master event ID for recurring instances
      originalStartTime,  // the original start of this instance
    } = await req.json();

    if (!id || !calendarId) {
      return Response.json({ error: 'Missing event ID or calendar ID' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    const buildEventBody = (includeRecurrence) => {
      const event = {
        summary,
        description,
        location,
        start: isAllDay ? { date: start } : { dateTime: start, timeZone: 'America/Chicago' },
        end: isAllDay ? { date: end } : { dateTime: end, timeZone: 'America/Chicago' },
      };
      if (includeRecurrence) {
        event.recurrence = (recurrence && Array.isArray(recurrence) && recurrence.length > 0 && recurrence[0])
          ? recurrence
          : [];
      }
      return event;
    };

    // --- Edit this instance only ---
    if (recurringEditScope === 'this') {
      // Update just this occurrence using its instance id
      const response = await calendar.events.update({
        calendarId,
        eventId: id,
        requestBody: buildEventBody(false),
      });
      return Response.json({ event: response.data });
    }

    // --- Edit all future events (split the series) ---
    if (recurringEditScope === 'future') {
      const masterEventId = recurringEventId || (id.includes('_') ? id.split('_')[0] : id);

      // 1. Truncate the original series to end just before this instance
      const masterEvent = await calendar.events.get({ calendarId, eventId: masterEventId });
      const masterRecurrence = masterEvent.data.recurrence || [];

      // Build an UNTIL date from the original start time of this instance (day before)
      const instanceStart = new Date(originalStartTime?.dateTime || originalStartTime?.date || start);
      instanceStart.setDate(instanceStart.getDate() - 1);
      const until = instanceStart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const truncatedRecurrence = masterRecurrence.map(r => {
        // Remove existing UNTIL/COUNT and add new UNTIL
        return r.replace(/;UNTIL=[^;]*/g, '').replace(/;COUNT=\d+/g, '') + `;UNTIL=${until}`;
      });

      await calendar.events.patch({
        calendarId,
        eventId: masterEventId,
        requestBody: { recurrence: truncatedRecurrence },
      });

      // 2. Create a new event for this and future occurrences
      const newEvent = buildEventBody(true);
      const response = await calendar.events.insert({
        calendarId,
        requestBody: newEvent,
      });
      return Response.json({ event: response.data });
    }

    // --- Non-recurring or edit all (legacy) ---
    const baseEventId = id.includes('_') ? id.split('_')[0] : id;
    const eventBody = buildEventBody(true);

    if (originalCalendarId && originalCalendarId !== calendarId) {
      await calendar.events.delete({ calendarId: originalCalendarId, eventId: id });
      const response = await calendar.events.insert({ calendarId, requestBody: eventBody });
      return Response.json({ event: response.data });
    } else {
      const response = await calendar.events.update({ calendarId, eventId: baseEventId, requestBody: eventBody });
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