import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Users } from 'lucide-react';

export default function SyncToChoreDialog({ 
  open, 
  onOpenChange, 
  task, 
  familyMembers, 
  onConfirm 
}) {
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const toggleMember = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (!selectedMemberIds.length) return;
    const selectedMembers = familyMembers.filter(m => selectedMemberIds.includes(m.id));
    onConfirm(selectedMembers);
    setSelectedMemberIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelectedMemberIds([]); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Family Member's To-Do List</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{task?.title}</span> will be added to the selected members' to-do lists.
            </p>
            {task?.next_due && (
              <p className="text-xs text-gray-600 mt-1">
                Due date: {new Date(task.next_due).toLocaleDateString()}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Select Family Members (one or more)
            </Label>
            <div className="space-y-2">
              {familyMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => toggleMember(member.id)}>
                  <Checkbox
                    checked={selectedMemberIds.includes(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                  />
                  <span className="text-sm font-medium">{member.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={() => { setSelectedMemberIds([]); onOpenChange(false); }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedMemberIds.length}
              className="bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
            >
              Add to To-Do List{selectedMemberIds.length > 1 ? ` (${selectedMemberIds.length})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}