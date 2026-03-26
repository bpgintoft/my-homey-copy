import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Cascade-deletes all data linked to a family member
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'child') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await req.json();
  if (!memberId) return Response.json({ error: 'Missing memberId' }, { status: 400 });

  const db = base44.asServiceRole.entities;
  const results = { deleted: {}, errors: [] };

  // Helper: delete all records matching a filter
  const deleteAll = async (entityName, filterObj) => {
    const records = await db[entityName].filter(filterObj);
    if (records.length === 0) { results.deleted[entityName] = 0; return; }
    await Promise.all(records.map(r => db[entityName].delete(r.id)));
    results.deleted[entityName] = records.length;
  };

  // 1. Chores assigned to this member
  await deleteAll('Chore', { assigned_to_member_id: memberId });

  // 2. Milestones
  await deleteAll('Milestone', { assigned_to_member_id: memberId });

  // 3. FamilyMemberLinks
  await deleteAll('FamilyMemberLink', { assigned_to_member_id: memberId });

  // 4. SchoolPrograms
  await deleteAll('SchoolProgram', { family_member_id: memberId });

  // 5. FinancialAccounts
  await deleteAll('FinancialAccount', { family_member_id: memberId });

  // 6. Notifications referencing this member
  await deleteAll('Notification', { triggering_member_id: memberId });
  await deleteAll('Notification', { recipient_member_id: memberId });

  // 7. MealPlan records don't reference members directly — no action needed.
  // 8. MaintenanceTasks: unassign rather than delete (tasks belong to the house, not the person)
  const assignedTasks = await db.MaintenanceTask.filter({ assigned_to: memberId });
  if (assignedTasks.length > 0) {
    await Promise.all(assignedTasks.map(t =>
      db.MaintenanceTask.update(t.id, { assigned_to: null, assigned_name: null })
    ));
    results.deleted['MaintenanceTask_unassigned'] = assignedTasks.length;
  }

  // 9. Finally delete the FamilyMember itself
  await db.FamilyMember.delete(memberId);
  results.deleted['FamilyMember'] = 1;

  return Response.json({ success: true, results });
});