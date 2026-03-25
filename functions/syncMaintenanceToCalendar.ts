import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Fetch maintenance tasks
    const tasks = await base44.entities.MaintenanceTask.filter({
      status: { $in: ['pending', 'in_progress', 'overdue'] }
    });

    const results = [];
    
    for (const task of tasks) {
      if (!task.next_due) continue;

      // Create calendar event
      const event = {
        summary: `🏠 ${task.title}`,
        description: `${task.description || ''}\n\nCategory: ${task.category}\nPriority: ${task.priority}\n\n${task.notes || ''}`,
        start: {
          date: task.next_due
        },
        end: {
          date: task.next_due
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 } // 1 hour before
          ]
        }
      };

      // Add to Google Calendar
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (response.ok) {
        const eventData = await response.json();
        results.push({
          task: task.title,
          status: 'created',
          eventId: eventData.id,
          link: eventData.htmlLink
        });
      } else {
        const error = await response.text();
        results.push({
          task: task.title,
          status: 'failed',
          error
        });
      }
    }

    return Response.json({
      success: true,
      synced: results.length,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});