import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const body = await req.json();
  const base44 = createClientFromRequest(req);

  const state = body.data?._provider_meta?.['x-goog-resource-state'];
  if (state === 'sync') {
    return Response.json({ status: 'sync_ack' });
  }

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // Fetch all calendars to sync across all of them
  const calendarsRes = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: authHeader }
  );
  const calendarsData = await calendarsRes.json();
  const calendars = (calendarsData.items || []).filter(cal => cal.accessRole !== 'freeBusyReader');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  for (const cal of calendars) {
    try {
      // Load sync token for this calendar
      const syncRecords = await base44.asServiceRole.entities.SyncState.filter({ calendar_id: cal.id });
      const syncRecord = syncRecords[0] || null;

      let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?maxResults=100&singleEvents=true`;
      if (syncRecord?.sync_token) {
        url += `&syncToken=${syncRecord.sync_token}`;
      } else {
        url += '&timeMin=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      let res = await fetch(url, { headers: authHeader });

      if (res.status === 410) {
        // syncToken expired — full resync
        url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?maxResults=100&singleEvents=true`
          + '&timeMin=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        res = await fetch(url, { headers: authHeader });
      }

      if (!res.ok) continue;

      // Drain all pages
      const allItems = [];
      let pageData = await res.json();
      let newSyncToken = null;

      while (true) {
        allItems.push(...(pageData.items || []));
        if (pageData.nextSyncToken) newSyncToken = pageData.nextSyncToken;
        if (!pageData.nextPageToken) break;
        const nextRes = await fetch(url + `&pageToken=${pageData.nextPageToken}`, { headers: authHeader });
        if (!nextRes.ok) break;
        pageData = await nextRes.json();
      }

      // Process changed events
      for (const event of allItems) {
        if (event.status === 'cancelled') {
          // Delete from cache
          const existing = await base44.asServiceRole.entities.CachedCalendarEvent.filter({ google_event_id: event.id });
          if (existing[0]) {
            await base44.asServiceRole.entities.CachedCalendarEvent.delete(existing[0].id);
          }
        } else {
          const mapped = {
            google_event_id: event.id,
            calendar_id: cal.id,
            calendar_name: cal.summary,
            background_color: cal.backgroundColor || '#4285F4',
            title: event.summary || 'Untitled',
            description: event.description || '',
            location: event.location || '',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            recurrence: event.recurrence || null,
            is_all_day: !event.start?.dateTime,
          };

          const existing = await base44.asServiceRole.entities.CachedCalendarEvent.filter({ google_event_id: event.id });
          if (existing[0]) {
            await base44.asServiceRole.entities.CachedCalendarEvent.update(existing[0].id, mapped);
          } else {
            await base44.asServiceRole.entities.CachedCalendarEvent.create(mapped);
          }
          await sleep(200);
        }
      }

      // Save the new syncToken
      if (newSyncToken) {
        if (syncRecord) {
          await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { sync_token: newSyncToken });
        } else {
          await base44.asServiceRole.entities.SyncState.create({ calendar_id: cal.id, sync_token: newSyncToken });
        }
      }
    } catch (err) {
      console.error(`Error processing calendar ${cal.summary}:`, err.message);
    }
  }

  return Response.json({ status: 'ok' });
});