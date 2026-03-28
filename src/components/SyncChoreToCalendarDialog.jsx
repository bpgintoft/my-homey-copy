import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Calendar, CheckCircle2, RefreshCw, X } from 'lucide-react';

export default function SyncChoreToCalendarDialog({ open, onOpenChange, chore }) {
  const queryClient = useQueryClient();
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [date, setDate] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  const alreadySynced = !!(chore?.synced_google_calendar_id && chore?.synced_google_event_id);

  useEffect(() => {
    if (open && chore) {
      setDate(chore.next_due || '');
      setSelectedCalendarId(chore.synced_google_calendar_id || '');
      setSynced(false);
    }
  }, [open, chore]);

  const { data: calendarsData, isLoading: loadingCalendars } = useQuery({
    queryKey: ['googleCalendars'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getGoogleCalendars');
      const payload = res?.data ?? res;
      if (Array.isArray(payload?.calendars)) return payload.calendars;
      if (Array.isArray(payload)) return payload;
      return [];
    },
    enabled: open,
  });

  const calendars = calendarsData || [];

  const handleSaveDueDate = async () => {
    setSavingDate(true);
    await base44.entities.Chore.update(chore.id, { next_due: date || null });
    // If linked chores, update them too
    if (chore.linked_chore_ids?.length) {
      await Promise.all(chore.linked_chore_ids.map(id => base44.entities.Chore.update(id, { next_due: date || null })));
    }
    queryClient.invalidateQueries(['chores']);
    setSavingDate(false);
  };

  const handleRemoveDueDate = async () => {
    setDate('');
    setSavingDate(true);
    await base44.entities.Chore.update(chore.id, { next_due: null });
    if (chore.linked_chore_ids?.length) {
      await Promise.all(chore.linked_chore_ids.map(id => base44.entities.Chore.update(id, { next_due: null })));
    }
    queryClient.invalidateQueries(['chores']);
    setSavingDate(false);
  };

  const handleSync = async () => {
    if (!selectedCalendarId || !date) return;
    setSyncing(true);

    let eventId = chore.synced_google_event_id;
    const calendarChanged = selectedCalendarId !== chore.synced_google_calendar_id;

    if (alreadySynced && !calendarChanged) {
      await base44.functions.invoke('updateGoogleCalendarEvent', {
        calendarId: selectedCalendarId,
        eventId,
        summary: chore.title,
        description: `Family to-do: ${chore.title}`,
        start: date,
        end: date,
        isAllDay: true,
      });
    } else {
      const res = await base44.functions.invoke('createGoogleCalendarEvent', {
        calendarId: selectedCalendarId,
        summary: chore.title,
        description: `Family to-do: ${chore.title}`,
        start: date,
        end: date,
        isAllDay: true,
      });
      eventId = res.data?.event?.id;
    }

    const updatePayload = {
      next_due: date,
      synced_google_calendar_id: autoSync ? selectedCalendarId : null,
      synced_google_event_id: autoSync ? eventId : null,
    };
    await base44.entities.Chore.update(chore.id, updatePayload);
    queryClient.invalidateQueries(['chores']);

    setSyncing(false);
    setSynced(true);
    setTimeout(() => {
      setSynced(false);
      onOpenChange(false);
    }, 1200);
  };

  const handleRemoveSync = async () => {
    await base44.entities.Chore.update(chore.id, {
      synced_google_calendar_id: null,
      synced_google_event_id: null,
    });
    queryClient.invalidateQueries(['chores']);
    onOpenChange(false);
  };

  const dueDateChanged = date !== (chore?.next_due || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Due Date & Calendar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <p className="text-sm text-gray-700 font-medium truncate">{chore?.title}</p>

          {/* Due Date Section */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600 font-semibold">Due Date</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1"
              />
              {date && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                  title="Remove due date"
                  onClick={handleRemoveDueDate}
                  disabled={savingDate}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {dueDateChanged && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveDueDate}
                disabled={savingDate}
                className="w-full"
              >
                {savingDate ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Saving...</> : 'Save Due Date'}
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Google Calendar Section */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-600 font-semibold">Sync to Google Calendar</Label>

            {alreadySynced && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Currently synced to Google Calendar</span>
              </div>
            )}

            {loadingCalendars ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading calendars...
              </div>
            ) : Array.isArray(calendars) && calendars.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
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
            ) : (
              <p className="text-sm text-gray-500">No calendars found. Please authorize Google Calendar access.</p>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="autoSync"
                checked={autoSync}
                onCheckedChange={setAutoSync}
              />
              <label htmlFor="autoSync" className="text-sm text-gray-700 cursor-pointer flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                Keep in sync (auto-update when chore changes)
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2">
          {alreadySynced && (
            <Button variant="ghost" className="text-red-500 hover:text-red-600 mr-auto" onClick={handleRemoveSync}>
              Remove sync
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSync} disabled={!selectedCalendarId || !date || syncing}>
            {syncing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
            ) : synced ? (
              '✓ Synced!'
            ) : alreadySynced ? (
              'Update Sync'
            ) : (
              'Add to Calendar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}