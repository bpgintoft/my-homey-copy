import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Wrench, Calendar, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { format } from 'date-fns';

export default function LinkedMaintenancePanel({ maintenanceTaskId, choreId, defaultExpanded = false }) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [newCoAssignees, setNewCoAssignees] = useState([]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: () => base44.entities.MaintenanceTask.list(),
    enabled: !!maintenanceTaskId,
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const { data: allChores = [] } = useQuery({
    queryKey: ['chores'],
    queryFn: () => base44.entities.Chore.list(),
  });

  const task = tasks.find(t => t.id === maintenanceTaskId);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.MaintenanceTask.update(id, data);
      // Sync next_due/title back to the triggering chore
      if (choreId && (editData?.next_due || editData?.title)) {
        await base44.entities.Chore.update(choreId, { next_due: editData.next_due, title: editData.title });
      }
      // Also sync to any other already-linked chores
      const existingChoreIds = (task?.synced_chore_ids || []).filter(cid => cid !== choreId);
      for (const cid of existingChoreIds) {
        await base44.entities.Chore.update(cid, { next_due: editData.next_due, title: editData.title });
      }
      // Add new co-assignees if selected
      if (newCoAssignees.length > 0) {
        const selectedMembers = familyMembers.filter(m => newCoAssignees.includes(m.id));
        const existingChores = allChores.filter(c => (task?.synced_chore_ids || []).includes(c.id));
        const newChores = await Promise.all(
          selectedMembers.map(member =>
            base44.entities.Chore.create({
              title: editData.title || task.title,
              assigned_to_member_id: member.id,
              assigned_to_name: member.name,
              timing: 'short-term',
              next_due: editData.next_due || task.next_due,
              is_completed: false,
              maintenance_task_id: id,
            })
          )
        );
        const allChoreIds = [...(task?.synced_chore_ids || []), ...newChores.map(c => c.id)];
        // Link all sibling IDs on each chore
        for (const chore of [...existingChores, ...newChores]) {
          await base44.entities.Chore.update(chore.id, { linked_chore_ids: allChoreIds.filter(cid => cid !== chore.id) });
        }
        await base44.entities.MaintenanceTask.update(id, { synced_chore_ids: allChoreIds });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenanceTasks']);
      queryClient.invalidateQueries(['chores']);
      setIsEditing(false);
      setNewCoAssignees([]);
    },
  });

  if (!maintenanceTaskId || !task) return null;

  const getCategoryColor = (category) => {
    const colors = {
      hvac: 'bg-orange-100 text-orange-700',
      plumbing: 'bg-blue-100 text-blue-700',
      electrical: 'bg-yellow-100 text-yellow-700',
      exterior: 'bg-green-100 text-green-700',
      interior: 'bg-purple-100 text-purple-700',
      appliances: 'bg-pink-100 text-pink-700',
      safety: 'bg-red-100 text-red-700',
      seasonal: 'bg-teal-100 text-teal-700',
      landscaping: 'bg-emerald-100 text-emerald-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const handleEdit = () => {
    setEditData({ ...task });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({ id: task.id, data: editData });
  };

  return (
    <div className="mt-3 border border-orange-200 rounded-lg bg-orange-50 overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-orange-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Wrench className="w-4 h-4 text-orange-600 flex-shrink-0" />
        <span className="text-sm font-medium text-orange-800 flex-1">Linked Maintenance Task</span>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-orange-500" /> : <ChevronRight className="w-4 h-4 text-orange-500" />}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-orange-200">
          {!isEditing ? (
            <>
              <div className="pt-2 space-y-2">
                <div className="font-medium text-sm text-gray-800">{task.title}</div>
                {task.description && <p className="text-xs text-gray-600">{task.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {task.category && <Badge className={`text-xs ${getCategoryColor(task.category)}`}>{task.category}</Badge>}
                  {task.priority && <Badge variant="outline" className="text-xs">{task.priority}</Badge>}
                  {task.frequency && <Badge variant="outline" className="text-xs">{task.frequency}</Badge>}
                </div>
                {task.next_due && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Calendar className="w-3.5 h-3.5" />
                    Due: {format(new Date(task.next_due), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" className="text-xs w-full" onClick={handleEdit}>
                Edit Maintenance Task
              </Button>
            </>
          ) : (
            <div className="pt-2 space-y-2">
              <Input
                value={editData.title || ''}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="Task title"
                className="text-sm h-8"
              />
              <Textarea
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Description"
                rows={2}
                className="text-sm"
              />
              <Select value={editData.priority} onValueChange={(v) => setEditData({ ...editData, priority: v })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={editData.next_due || ''}
                onChange={(e) => setEditData({ ...editData, next_due: e.target.value })}
                className="text-sm h-8"
              />
              {/* Co-assign to other family members not already assigned */}
              {(() => {
                const alreadyAssignedChores = allChores.filter(c => (task?.synced_chore_ids || []).includes(c.id));
                const alreadyAssignedMemberIds = alreadyAssignedChores.map(c => c.assigned_to_member_id);
                const available = familyMembers.filter(m => !alreadyAssignedMemberIds.includes(m.id));
                if (available.length === 0) return null;
                return (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Also assign to:</Label>
                    {available.map(m => (
                      <div key={m.id} className="flex items-center gap-2 cursor-pointer" onClick={() => setNewCoAssignees(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}>
                        <Checkbox checked={newCoAssignees.includes(m.id)} onCheckedChange={() => {}} className="pointer-events-none" />
                        <span className="text-sm">{m.name}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="flex-1 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}