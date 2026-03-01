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
        // Only include RRULE lines — Google rejects UNTIL on EXDATE lines
        const rruleLines = (recurrence && Array.isArray(recurrence))
          ? recurrence.filter(r => r && r.startsWith('RRULE'))
          : [];
        event.recurrence = rruleLines;
      }
      return event;
    };

    // --- Edit this instance only ---
    if (recurringEditScope === 'this') {
      // Google supports iCal-format instance IDs (e.g. _xxx_20260325T151500Z) directly with patch
      const response = await calendar.events.patch({
        calendarId,
        eventId: id,
        requestBody: buildEventBody(false),
      });
      return Response.json({ event: response.data });
    }

    // --- Edit all future events (split the series) ---
    if (recurringEditScope === 'future') {
      const masterEventId = recurringEventId || id;

      // 1. Fetch master event — the master may live on a different calendar than the instance.
      //    Try the provided calendarId first, then fall back to fetching all calendars and searching.
      let masterRecurrence = [];
      let masterCalendarId = calendarId;
      try {
        const masterEvent = await calendar.events.get({ calendarId, eventId: masterEventId });
        masterRecurrence = masterEvent.data.recurrence || [];
      } catch (_e) {
        // Fallback: search all calendars for the master event
        const calListRes = await calendar.calendarList.list();
        const allCals = calListRes.data.items || [];
        for (const cal of allCals) {
          try {
            const ev = await calendar.events.get({ calendarId: cal.id, eventId: masterEventId });
            masterRecurrence = ev.data.recurrence || [];
            masterCalendarId = cal.id;
            break;
          } catch (_) { /* keep trying */ }
        }
      }

      // 2. Truncate the original series to end just before this instance
      const instanceStart = new Date(
        (originalStartTime && (originalStartTime.dateTime || originalStartTime.date)) || start
      );
      instanceStart.setDate(instanceStart.getDate() - 1);
      const until = instanceStart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      // Only modify RRULE lines, leave EXDATE lines untouched
      const truncatedRecurrence = masterRecurrence.map(r => {
        if (!r.startsWith('RRULE')) return r;
        return r.replace(/;UNTIL=[^;]*/g, '').replace(/;COUNT=\d+/g, '') + `;UNTIL=${until}`;
      });

      await calendar.events.patch({
        calendarId: masterCalendarId,
        eventId: masterEventId,
        requestBody: { recurrence: truncatedRecurrence },
      });

      // 3. Create a new event for this and future occurrences
      const newEvent = buildEventBody(true);
      const response = await calendar.events.insert({
        calendarId,
        requestBody: newEvent,
      });
      return Response.json({ event: response.data });
    }

    // --- Non-recurring: update the event directly ---
    const eventBody = buildEventBody(true);

    if (originalCalendarId && originalCalendarId !== calendarId) {
      // Moving to a different calendar: delete from old, insert into new
      await calendar.events.delete({ calendarId: originalCalendarId, eventId: id });
      const response = await calendar.events.insert({ calendarId, requestBody: eventBody });
      return Response.json({ event: response.data });
    } else {
      // Use patch instead of update — patch works with iCal-format IDs too
      const response = await calendar.events.patch({ calendarId, eventId: id, requestBody: eventBody });
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