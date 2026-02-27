import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from 'lucide-react';

export default function RescheduleDialog({ 
  open, 
  onOpenChange, 
  task, 
  onConfirm 
}) {
  const [nextDueDate, setNextDueDate] = useState('');

  const handleConfirm = () => {
    if (!nextDueDate) return;
    onConfirm(nextDueDate);
    setNextDueDate('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{task?.title}</span> has been marked as complete!
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Schedule the next due date for this task:
            </p>
          </div>

          <div>
            <Label className="mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Next Due Date
            </Label>
            <Input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setNextDueDate('');
                onOpenChange(false);
              }}
            >
              Skip
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!nextDueDate}
              className="bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
            >
              Reschedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}