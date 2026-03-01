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
        // Only include RRULE lines, not EXDATE — Google rejects UNTIL on EXDATE lines
        const rruleLines = (recurrence && Array.isArray(recurrence))
          ? recurrence.filter(r => r && r.startsWith('RRULE'))
          : [];
        event.recurrence = rruleLines;
      }
      return event;
    };

    // Helper: resolve an iCal-format event ID (starts with _) to a real Google event ID
    // by searching the calendar for events around that time.
    const resolveEventId = async (calId, eventId, startTime) => {
      if (!eventId.startsWith('_')) return eventId;
      // iCal IDs cannot be used directly; search by time window
      const searchStart = new Date(startTime);
      searchStart.setHours(searchStart.getHours() - 1);
      const searchEnd = new Date(startTime);
      searchEnd.setHours(searchEnd.getHours() + 1);
      const res = await calendar.events.list({
        calendarId: calId,
        timeMin: searchStart.toISOString(),
        timeMax: searchEnd.toISOString(),
        singleEvents: true,
        maxResults: 50,
      });
      const events = res.data.items || [];
      // Match by iCalUID or by matching iCal-formatted ID
      const match = events.find(e =>
        e.id === eventId ||
        (e.iCalUID && ('_' + e.iCalUID.replace(/@.*/,'').replace(/-/g,'').toLowerCase()) === eventId.toLowerCase()) ||
        e.iCalUID?.toLowerCase().startsWith(eventId.replace(/^_/, '').toLowerCase())
      );
      return match ? match.id : eventId;
    };

    // --- Edit this instance only ---
    if (recurringEditScope === 'this') {
      const resolvedId = await resolveEventId(calendarId, id, start);
      const response = await calendar.events.patch({
        calendarId,
        eventId: resolvedId,
        requestBody: buildEventBody(false),
      });
      return Response.json({ event: response.data });
    }

    // --- Edit all future events (split the series) ---
    if (recurringEditScope === 'future') {
      const masterEventId = recurringEventId || id;
      const resolvedMasterId = await resolveEventId(calendarId, masterEventId, start);

      // 1. Truncate the original series to end just before this instance
      const masterEvent = await calendar.events.get({ calendarId, eventId: resolvedMasterId });
      const masterRecurrence = masterEvent.data.recurrence || [];

      // Build an UNTIL date from the original start time of this instance (day before)
      const instanceStart = new Date(originalStartTime?.dateTime || originalStartTime?.date || start);
      instanceStart.setDate(instanceStart.getDate() - 1);
      const until = instanceStart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      // Only modify RRULE lines, leave EXDATE lines untouched
      const truncatedRecurrence = masterRecurrence.map(r => {
        if (!r.startsWith('RRULE')) return r;
        return r.replace(/;UNTIL=[^;]*/g, '').replace(/;COUNT=\d+/g, '') + `;UNTIL=${until}`;
      });

      await calendar.events.patch({
        calendarId,
        eventId: resolvedMasterId,
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

    // --- Non-recurring: update the event directly ---
    const resolvedId = await resolveEventId(calendarId, id, start);
    const eventBody = buildEventBody(true);

    if (originalCalendarId && originalCalendarId !== calendarId) {
      // Moving to a different calendar: delete from old, insert into new
      const originalResolvedId = await resolveEventId(originalCalendarId, id, start);
      await calendar.events.delete({ calendarId: originalCalendarId, eventId: originalResolvedId });
      const response = await calendar.events.insert({ calendarId, requestBody: eventBody });
      return Response.json({ event: response.data });
    } else {
      const response = await calendar.events.update({ calendarId, eventId: resolvedId, requestBody: eventBody });
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