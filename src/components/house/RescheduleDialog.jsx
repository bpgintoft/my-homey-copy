import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarDays, CheckCircle2 } from 'lucide-react';

export default function RescheduleDialog({ 
  open, 
  onOpenChange, 
  task, 
  onConfirm 
}) {
  const [nextDueDate, setNextDueDate] = useState('');
  const dateInputRef = useRef(null);

  const handleConfirm = () => {
    if (!nextDueDate) return;
    onConfirm(nextDueDate);
    setNextDueDate('');
  };

  const handleOpenChange = (open) => {
    if (!open) setNextDueDate('');
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-green-600" />
            Schedule Next Due Date
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-800">{task?.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">Marked as complete!</p>
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium text-gray-700">
              Schedule next due date for this task:
            </Label>
            <div className="relative">
              {!nextDueDate && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
                  Tap to select a date
                </div>
              )}
              <input
                ref={dateInputRef}
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-gray-50 text-center text-gray-700 cursor-pointer hover:border-gray-400 transition-colors"
                style={{ colorScheme: 'light' }}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
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