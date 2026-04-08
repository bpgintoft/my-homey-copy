import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Cascade-deletes all data linked to a family member
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { memberId } = await req.json();
    if (!memberId) return Response.json({ error: 'Missing memberId' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const results = { deleted: {} };

    const deleteAll = async (entityName, filterObj) => {
      const records = await db[entityName].filter(filterObj);
      if (records.length === 0) { results.deleted[entityName] = 0; return; }
      await Promise.all(records.map(r => db[entityName].delete(r.id)));
      results.deleted[entityName] = records.length;
    };

    await deleteAll('Chore', { assigned_to_member_id: memberId });
    await deleteAll('Milestone', { assigned_to_member_id: memberId });
    await deleteAll('FamilyMemberLink', { assigned_to_member_id: memberId });
    await deleteAll('SchoolProgram', { family_member_id: memberId });
    await deleteAll('FinancialAccount', { family_member_id: memberId });
    await deleteAll('Notification', { triggering_member_id: memberId });
    await deleteAll('Notification', { recipient_member_id: memberId });

    const assignedTasks = await db.MaintenanceTask.filter({ assigned_to: memberId });
    if (assignedTasks.length > 0) {
      await Promise.all(assignedTasks.map(t =>
        db.MaintenanceTask.update(t.id, { assigned_to: null, assigned_name: null })
      ));
      results.deleted['MaintenanceTask_unassigned'] = assignedTasks.length;
    }

    await db.FamilyMember.delete(memberId);
    results.deleted['FamilyMember'] = 1;

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('[ERROR]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});