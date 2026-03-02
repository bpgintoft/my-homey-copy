import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Calendar, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function CoAssignedChorePanel({ chore, onEdit }) {
  const queryClient = useQueryClient();
  const [editingDue, setEditingDue] = useState(false);
  const [newDue, setNewDue] = useState(chore.next_due || '');

  const updateDueMutation = useMutation({
    mutationFn: async (date) => {
      const allChoreIds = [chore.id, ...(chore.linked_chore_ids || [])];
      await Promise.all(allChoreIds.map(id => base44.entities.Chore.update(id, { next_due: date || null })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chores']);
      setEditingDue(false);
    },
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const coAssignedMembers = familyMembers.filter(m =>
    chore.linked_chore_ids?.length && chore.co_assigned_member_ids?.includes(m.id)
  );

  // Fall back: fetch sibling chores to find co-assignees if co_assigned_member_ids not populated
  const { data: siblingChores = [] } = useQuery({
    queryKey: ['siblingChores', chore.id],
    queryFn: async () => {
      if (!chore.linked_chore_ids?.length) return [];
      const all = await base44.entities.Chore.list();
      return all.filter(c => chore.linked_chore_ids.includes(c.id));
    },
    enabled: !!chore.linked_chore_ids?.length,
  });

  const allAssignees = [
    { name: chore.assigned_to_name, id: chore.assigned_to_member_id, isCurrentMember: true },
    ...siblingChores.map(c => ({ name: c.assigned_to_name, id: c.assigned_to_member_id, isCurrentMember: false })),
  ];

  const timingLabel = {
    'short-term': 'Short-term',
    'mid-term': 'Mid-term',
    'long-term': 'Long-term',
  }[chore.timing] || chore.timing;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-blue-700 text-sm">Co-Assigned Task</span>
        </div>
        <ChevronDown className="w-4 h-4 text-blue-400" />
      </div>

      {/* Body */}
      <div className="bg-white mx-3 mb-3 rounded-lg p-4 space-y-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base">{chore.title}</h3>
          {chore.next_due && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due: {new Date(chore.next_due + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        {timingLabel && (
          <div className="flex gap-2">
            <span className="px-2.5 py-1 rounded-full border text-xs font-semibold text-gray-700">{timingLabel}</span>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-500 mb-2">Assigned to:</p>
          <div className="space-y-1.5">
            {allAssignees.map((assignee, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                  {assignee.name?.[0] || '?'}
                </div>
                <span className="text-sm text-gray-800">
                  {assignee.name}
                  {assignee.isCurrentMember && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {onEdit && (
          <Button variant="outline" className="w-full mt-1" onClick={onEdit}>
            Edit Task
          </Button>
        )}
      </div>
    </div>
  );
}