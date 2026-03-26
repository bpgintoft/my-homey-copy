import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

    // Load all adult family members dynamically
    const allMembers = await base44.asServiceRole.entities.FamilyMember.list();
    const adultMembers = allMembers.filter(m => m.person_type === 'adult');

    const actorMember = adultMembers.find(m => m.email === actorEmail);
    if (!actorMember) {
      return Response.json({ ok: true, skipped: 'actor not a known adult family member' });
    }

    // Notify all other adult members
    const recipients = adultMembers.filter(m => m.email !== actorEmail);

    if (recipients.length === 0) {
      return Response.json({ ok: true, skipped: 'no other adults to notify' });
    }

    const decisionId = decision.id || event?.entity_id || '';

    const notifTitle = isCreate
      ? `New decision proposed: "${decision.title}"`
      : `${actorMember.name} updated: "${decision.title}"`;

    // For each recipient, check for existing unread notification and create if none
    const results = await Promise.all(
      recipients.map(async (recipient) => {
        if (!recipient.id) return { skipped: 'no member id' };

        const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
          recipient_member_id: recipient.id,
          chore_id: decisionId,
          is_read: false,
        });

        if (existingNotifs.length > 0) {
          return { skipped: `notification already exists for ${recipient.name}` };
        }

        await base44.asServiceRole.entities.Notification.create({
          recipient_member_id: recipient.id,
          triggering_member_name: actorMember.name,
          triggering_member_id: actorMember.id,
          chore_title: notifTitle,
          chore_id: decisionId,
          completed_date: new Date().toISOString(),
          is_read: false,
        });

        return { notified: recipient.name };
      })
    );

    return Response.json({ ok: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});