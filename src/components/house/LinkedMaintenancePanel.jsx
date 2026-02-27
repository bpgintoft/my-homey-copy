import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Calendar, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { format } from 'date-fns';

export default function LinkedMaintenancePanel({ maintenanceTaskId, choreId }) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: () => base44.entities.MaintenanceTask.list(),
    enabled: !!maintenanceTaskId,
  });

  const task = tasks.find(t => t.id === maintenanceTaskId);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceTask.update(id, data),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries(['maintenanceTasks']);
      // Also sync next_due back to the chore
      if (choreId && editData?.next_due) {
        base44.entities.Chore.update(choreId, { next_due: editData.next_due, title: editData.title });
        queryClient.invalidateQueries(['chores']);
      }
      setIsEditing(false);
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