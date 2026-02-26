import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function SyncToCalendarDialog({ 
  open, 
  onOpenChange, 
  task, 
  onConfirm 
}) {
  const [selectedCalendarId, setSelectedCalendarId] = useState('');

  const { data: calendars = [], isLoading } = useQuery({
    queryKey: ['googleCalendars'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getGoogleCalendars', {});
      return response.data || [];
    },
    enabled: open,
  });

  const handleConfirm = () => {
    if (!selectedCalendarId) return;
    const calendar = calendars.find(c => c.id === selectedCalendarId);
    onConfirm(selectedCalendarId, calendar?.summary);
    setSelectedCalendarId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync to Google Calendar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{task?.title}</span> will be added to your selected Google Calendar.
            </p>
            {task?.next_due && (
              <p className="text-xs text-gray-600 mt-1">
                Event date: {new Date(task.next_due).toLocaleDateString()}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Select Calendar</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map(calendar => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {calendar.summary}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedCalendarId('');
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedCalendarId || isLoading}
              className="bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
            >
              Sync to Calendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}