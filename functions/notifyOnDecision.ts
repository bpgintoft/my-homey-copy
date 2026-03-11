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

    const proposerEmail = decision.proposer_email;
    const isCreate = event?.type === 'create';
    const isUpdate = event?.type === 'update';

    // Determine who to notify (the other person)
    let recipientEmail = null;
    let recipientName = null;

    if (proposerEmail === BRYAN_EMAIL) {
      recipientEmail = KATE_EMAIL;
      recipientName = 'Kate';
    } else if (proposerEmail === KATE_EMAIL) {
      recipientEmail = BRYAN_EMAIL;
      recipientName = 'Bryan';
    } else {
      // Unknown proposer - notify both
      recipientEmail = null;
    }

    // For updates (votes/comments), notify the proposer if someone else responded
    // We check who the current user is via the request
    let notifyEmail = recipientEmail;
    let notifyName = recipientName;

    if (!notifyEmail) {
      return Response.json({ ok: true, skipped: 'unknown proposer' });
    }

    // Find the recipient user by email
    const users = await base44.asServiceRole.entities.User.list();
    const recipientUser = users.find(u => u.email === notifyEmail);

    if (!recipientUser) {
      return Response.json({ ok: true, skipped: 'recipient user not found' });
    }

    // Create a notification for the recipient
    let notifTitle = '';
    if (isCreate) {
      notifTitle = `New decision proposed: "${decision.title}"`;
    } else if (isUpdate) {
      notifTitle = `Update on decision: "${decision.title}"`;
    } else {
      notifTitle = `Decision update: "${decision.title}"`;
    }

    await base44.asServiceRole.entities.Notification.create({
      recipient_member_id: notifyEmail,
      triggering_member_name: decision.proposer_name || proposerEmail,
      triggering_member_id: proposerEmail,
      chore_title: notifTitle,
      chore_id: decision.id || '',
      completed_date: new Date().toISOString(),
      is_read: false,
    });

    return Response.json({ ok: true, notified: notifyEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});