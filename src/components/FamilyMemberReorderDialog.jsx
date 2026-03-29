import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

export default function FamilyMemberReorderDialog({ open, onOpenChange }) {
  const [members, setMembers] = useState([]);
  const queryClient = useQueryClient();

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list('display_order', 100),
  });

  useEffect(() => {
    if (familyMembers.length > 0) {
      const sorted = [...familyMembers].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      setMembers(sorted);
    }
  }, [familyMembers]);

  const updateMutation = useMutation({
    mutationFn: (updates) => Promise.all(
      updates.map(({ id, display_order }) =>
        base44.entities.FamilyMember.update(id, { display_order })
      )
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
      onOpenChange(false);
    },
  });

  const moveUp = (index) => {
    if (index === 0) return;
    const newMembers = [...members];
    [newMembers[index - 1], newMembers[index]] = [newMembers[index], newMembers[index - 1]];
    setMembers(newMembers);
  };

  const moveDown = (index) => {
    if (index === members.length - 1) return;
    const newMembers = [...members];
    [newMembers[index], newMembers[index + 1]] = [newMembers[index + 1], newMembers[index]];
    setMembers(newMembers);
  };

  const handleSave = () => {
    const updates = members.map((member, index) => ({
      id: member.id,
      display_order: index,
    }));
    updateMutation.mutate(updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reorder Family Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {members.map((member, index) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 min-w-0"
            >
              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: member.color || '#64748b' }}
                >
                  {member.name?.charAt(0)}
                </div>
                <span className="font-medium text-gray-700 truncate">{member.name}</span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === members.length - 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1">
            {updateMutation.isPending ? 'Saving...' : 'Save Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}