import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar } from 'lucide-react';

export default function SyncChoreToCalendarDialog({ open, onOpenChange, chore }) {
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [date, setDate] = useState(chore?.next_due || '');
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const { data: calendarsData, isLoading: loadingCalendars } = useQuery({
    queryKey: ['googleCalendars'],
    queryFn: () => base44.functions.invoke('getGoogleCalendars').then(r => r.data.calendars || []),
    enabled: open,
  });

  const calendars = calendarsData || [];

  const handleSync = async () => {
    if (!selectedCalendarId || !date) return;
    setSyncing(true);

    await base44.functions.invoke('createGoogleCalendarEvent', {
      calendarId: selectedCalendarId,
      summary: chore.title,
      description: `Family to-do: ${chore.title}`,
      start: date,
      end: date,
      isAllDay: true,
    });

    setSyncing(false);
    setSynced(true);
    setTimeout(() => {
      setSynced(false);
      onOpenChange(false);
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Sync to Google Calendar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600 font-medium truncate">{chore?.title}</p>

          <div>
            <Label className="mb-1 block text-sm text-gray-600">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block text-sm text-gray-600">Choose a calendar</Label>
            {loadingCalendars ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading calendars...
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {calendars.map(cal => (
                  <div
                    key={cal.id}
                    onClick={() => setSelectedCalendarId(cal.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${selectedCalendarId === cal.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.backgroundColor }} />
                    <span className="text-sm">{cal.name}</span>
                    {cal.primary && <span className="text-xs text-gray-400 ml-auto">Primary</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSync} disabled={!selectedCalendarId || !date || syncing}>
            {syncing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</> : synced ? '✓ Synced!' : 'Add to Calendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}