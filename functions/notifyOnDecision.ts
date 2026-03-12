import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BRYAN_EMAIL = 'bpgintoft@gmail.com';
const KATE_EMAIL = 'kateeliz11@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;
    const decision = data;

    if (!decision) {
      return Response.json({ error: 'No decision data' }, { status: 400 });
    }

    const isCreate = event?.type === 'create';

    // For creates, the actor is the proposer. For updates, use last_updated_by_email.
    const actorEmail = isCreate ? decision.proposer_email : decision.last_updated_by_email;

    if (!actorEmail) {
      return Response.json({ ok: true, skipped: 'no actor email' });
    }

    // Notify the other person
    let notifyEmail = null;
    if (actorEmail === BRYAN_EMAIL) {
      notifyEmail = KATE_EMAIL;
    } else if (actorEmail === KATE_EMAIL) {
      notifyEmail = BRYAN_EMAIL;
    } else {
      return Response.json({ ok: true, skipped: 'unknown actor' });
    }

    const decisionId = decision.id || event?.entity_id || '';

    // Check if an unread notification already exists for this decision + recipient
    // to avoid spamming multiple notifications for the same proposal
    const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
      recipient_member_id: notifyEmail,
      chore_id: decisionId,
      is_read: false,
    });

    if (existingNotifs.length > 0) {
      // Already have an unread notification for this decision — don't create another
      return Response.json({ ok: true, skipped: 'notification already exists' });
    }

    const notifTitle = `New decision proposed: "${decision.title}"`;

    await base44.asServiceRole.entities.Notification.create({
      recipient_member_id: notifyEmail,
      triggering_member_name: decision.proposer_name || proposerEmail,
      triggering_member_id: proposerEmail,
      chore_title: notifTitle,
      chore_id: decisionId,
      completed_date: new Date().toISOString(),
      is_read: false,
    });

    return Response.json({ ok: true, notified: notifyEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});