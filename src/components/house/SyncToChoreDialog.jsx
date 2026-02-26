import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { User } from 'lucide-react';

export default function SyncToChoreDialog({ 
  open, 
  onOpenChange, 
  task, 
  familyMembers, 
  onConfirm 
}) {
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const handleConfirm = () => {
    if (!selectedMemberId) return;
    const member = familyMembers.find(m => m.id === selectedMemberId);
    onConfirm(selectedMemberId, member?.name);
    setSelectedMemberId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Family Member's To-Do List</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{task?.title}</span> will be added to the selected family member's to-do list.
            </p>
            {task?.next_due && (
              <p className="text-xs text-gray-600 mt-1">
                Due date: {new Date(task.next_due).toLocaleDateString()}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Select Family Member</Label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose who to assign this to" />
              </SelectTrigger>
              <SelectContent>
                {familyMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {member.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedMemberId('');
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedMemberId}
              className="bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
            >
              Add to To-Do List
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}