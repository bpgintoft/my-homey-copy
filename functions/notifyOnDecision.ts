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

    // Look up the actual FamilyMember IDs by name so notifications match what ChoreNotificationsDialog queries
    const allMembers = await base44.asServiceRole.entities.FamilyMember.list();
    const actorName = actorEmail === BRYAN_EMAIL ? 'Bryan' : 'Kate';
    const recipientName = actorEmail === BRYAN_EMAIL ? 'Kate' : 'Bryan';
    const recipientMember = allMembers.find(m => m.name === recipientName);

    if (!recipientMember) {
      return Response.json({ ok: true, skipped: 'recipient family member not found' });
    }

    // Check if an unread notification already exists for this decision + recipient
    const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
      recipient_member_id: recipientMember.id,
      chore_id: decisionId,
      is_read: false,
    });

    if (existingNotifs.length > 0) {
      return Response.json({ ok: true, skipped: 'notification already exists' });
    }

    const notifTitle = isCreate
      ? `New decision proposed: "${decision.title}"`
      : `${actorName} updated: "${decision.title}"`;

    const actorMember = allMembers.find(m => m.name === actorName);

    await base44.asServiceRole.entities.Notification.create({
      recipient_member_id: recipientMember.id,
      triggering_member_name: actorName,
      triggering_member_id: actorMember?.id || actorEmail,
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