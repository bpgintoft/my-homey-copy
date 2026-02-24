import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import LocationAutocomplete from './LocationAutocomplete';

export default function FamilyCalendar({ activities }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    location: '',
    start: '',
    end: '',
    calendarId: ''
  });
  const queryClient = useQueryClient();

  // Generate a week of dates
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Fetch Google Calendar events
  const { data: googleEvents = [], isLoading: isLoadingGoogle, error: googleError } = useQuery({
    queryKey: ['googleCalendarEvents', currentWeekStart.toISOString()],
    queryFn: async () => {
      const timeMin = currentWeekStart.toISOString();
      const timeMax = addDays(currentWeekStart, 7).toISOString();
      const { data } = await base44.functions.invoke('getGoogleCalendarEvents', { timeMin, timeMax });
      return data.events || [];
    }
  });

  // Fetch Google Calendars
  const { data: calendarsData } = useQuery({
    queryKey: ['googleCalendars'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getGoogleCalendars');
      return data;
    }
  });

  const calendars = calendarsData?.calendars || [];

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const { data } = await base44.functions.invoke('createGoogleCalendarEvent', eventData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['googleCalendarEvents'] });
      setShowAddDialog(false);
      setNewEvent({
        summary: '',
        description: '',
        location: '',
        start: '',
        end: '',
        calendarId: ''
      });
      toast.success('Event created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create event: ' + error.message);
    }
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const { data } = await base44.functions.invoke('updateGoogleCalendarEvent', eventData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['googleCalendarEvents'] });
      setShowEditDialog(false);
      setEditingEvent(null);
      toast.success('Event updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update event: ' + error.message);
    }
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async ({ calendarId, eventId }) => {
      const { data } = await base44.functions.invoke('deleteGoogleCalendarEvent', { calendarId, eventId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['googleCalendarEvents'] });
      setShowEditDialog(false);
      setEditingEvent(null);
      toast.success('Event deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete event: ' + error.message);
    }
  });

  // Debug logging
  if (googleError) {
    console.error('Google Calendar error:', googleError);
  }

  // Combine activities and Google events
  const allEvents = [
    ...activities.map(a => ({
      ...a,
      source: 'manual',
      start: a.date,
      backgroundColor: '#8B5CF6' // Purple for manual activities
    })),
    ...googleEvents.map(e => ({
      ...e,
      source: 'google',
      date: e.start
    }))
  ];

  // Group events by day
  const getActivitiesForDay = (day) => {
    return allEvents.filter(a => a.start && isSameDay(parseISO(a.start), day));
  };

  // Generate icon for activity
  const generateIconMutation = useMutation({
    mutationFn: async (activity) => {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `A simple, cute, colorful cartoon icon representing "${activity.title}". Style: playful, child-friendly, clean design on white background.`
      });
      return { activityId: activity.id, iconUrl: url };
    },
    onSuccess: ({ activityId, iconUrl }) => {
      queryClient.setQueryData(['kidsActivities'], (old) =>
        old.map(a => a.id === activityId ? { ...a, icon_url: iconUrl } : a)
      );
    }
  });

  // Get initials for family member
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // Color scheme for different family members
  const memberColors = {
    'Phoenix': 'bg-blue-400',
    'Mara': 'bg-pink-400',
    'Kate': 'bg-green-400',
    'Bryan': 'bg-yellow-400'
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const handleCreateEvent = () => {
    if (!newEvent.summary || !newEvent.start || !newEvent.end || !newEvent.calendarId) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Ensure datetime has seconds (required by Google Calendar API)
    const eventData = {
      ...newEvent,
      start: newEvent.start.includes(':') && newEvent.start.split(':').length === 2 
        ? `${newEvent.start}:00` 
        : newEvent.start,
      end: newEvent.end.includes(':') && newEvent.end.split(':').length === 2 
        ? `${newEvent.end}:00` 
        : newEvent.end,
    };
    
    createEventMutation.mutate(eventData);
  };

  const handleEditEvent = (event) => {
    // Convert ISO datetime to datetime-local format
    const formatDateTime = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    };

    setEditingEvent({
      id: event.id,
      calendarId: event.calendarId,
      summary: event.title || event.summary || '',
      description: event.description || '',
      location: event.location || '',
      start: formatDateTime(event.start),
      end: formatDateTime(event.end),
    });
    setShowEditDialog(true);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent.summary || !editingEvent.start || !editingEvent.end) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!editingEvent.calendarId || !editingEvent.id) {
      toast.error('Missing event information');
      console.error('Missing calendarId or id:', editingEvent);
      return;
    }

    const eventData = {
      id: editingEvent.id,
      calendarId: editingEvent.calendarId,
      summary: editingEvent.summary,
      description: editingEvent.description || '',
      location: editingEvent.location || '',
      start: editingEvent.start.includes(':') && editingEvent.start.split(':').length === 2 
        ? `${editingEvent.start}:00` 
        : editingEvent.start,
      end: editingEvent.end.includes(':') && editingEvent.end.split(':').length === 2 
        ? `${editingEvent.end}:00` 
        : editingEvent.end,
    };

    console.log('Updating event with data:', eventData);
    updateEventMutation.mutate(eventData);
  };

  const handleDeleteEvent = () => {
    if (!editingEvent) return;
    if (confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate({
        calendarId: editingEvent.calendarId,
        eventId: editingEvent.id
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6">
      {/* Week navigation */}
      <div className="flex items-center justify-center gap-1 mb-6 px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousWeek}
          className="h-9 w-9 rounded-xl flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-base font-semibold text-gray-900 whitespace-nowrap">
          {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d')}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWeek}
          className="h-9 w-9 rounded-xl flex-shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="rounded-xl flex-shrink-0"
        >
          Today
        </Button>
        <Button
          className="h-9 w-9 rounded-full bg-gradient-to-r from-[#0AACFF] to-[#0890D9] shadow-lg flex-shrink-0"
          size="icon"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="w-5 h-5 text-white" />
        </Button>
      </div>

      {/* Error message */}
      {googleError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          Error loading Google Calendar: {googleError.message}
        </div>
      )}

      {/* Loading indicator */}
      {isLoadingGoogle && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-600">
          Loading Google Calendar events...
        </div>
      )}

      {/* Day labels */}
      <div className="flex gap-2 mb-4 px-2">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="flex-1 text-center">
            <div className="text-sm font-medium text-gray-600">
              {format(day, 'EEE')}
            </div>
          </div>
        ))}
      </div>

      {/* Events list grouped by day */}
      <div className="space-y-3">
        <AnimatePresence>
          {weekDays.map((day) => {
            const dayActivities = getActivitiesForDay(day);
            
            if (dayActivities.length === 0) return null;

            const isToday = isSameDay(day, new Date());

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`rounded-2xl p-4 ${
                  isToday ? 'bg-blue-50' : 'bg-purple-50/30'
                }`}
              >
                <div className="text-sm font-semibold text-gray-800 mb-3">
                  {format(day, 'EEE d')}
                </div>
                
                <div className="space-y-2">
                  {dayActivities.map((activity) => {
                    const memberColor = memberColors[activity.child_name] || 'bg-gray-400';
                    const eventTime = activity.start ? format(parseISO(activity.start), 'h:mm a') : (activity.time || 'All day');
                    
                    return (
                      <motion.div
                        key={`${activity.source}-${activity.id}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => activity.source === 'google' && handleEditEvent(activity)}
                        className={`bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 ${activity.source === 'google' ? 'cursor-pointer' : ''}`}
                        style={{
                          borderLeft: `4px solid ${activity.backgroundColor || '#8B5CF6'}`
                        }}
                      >
                        {/* Icon */}
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{
                            backgroundColor: activity.backgroundColor ? `${activity.backgroundColor}20` : '#F3E8FF'
                          }}
                        >
                          {activity.icon_url ? (
                            <img 
                              src={activity.icon_url} 
                              alt={activity.title}
                              className="w-10 h-10 object-contain"
                            />
                          ) : activity.source === 'manual' ? (
                            <div
                              className="text-2xl cursor-pointer"
                              onClick={() => generateIconMutation.mutate(activity)}
                              title="Click to generate icon"
                            >
                              {generateIconMutation.isPending ? '⏳' : '🎨'}
                            </div>
                          ) : (
                            <div className="text-2xl">📅</div>
                          )}
                        </div>

                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {activity.title}
                          </div>
                          <div className="text-sm text-gray-600">
                            {eventTime}
                            {activity.location && ` • ${activity.location}`}
                          </div>
                          {activity.source === 'google' && activity.calendarName && (
                            <div className="text-xs text-gray-500">
                              {activity.calendarName}
                            </div>
                          )}
                        </div>

                        {/* Member initial */}
                        {activity.child_name && (
                          <div className={`w-9 h-9 rounded-full ${memberColor} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                            {getInitial(activity.child_name)}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {weekDays.every(day => getActivitiesForDay(day).length === 0) && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-3">📅</div>
            <p className="text-gray-500">No activities scheduled this week</p>
          </div>
        )}
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-summary">Title *</Label>
              <Input
                id="edit-summary"
                value={editingEvent?.summary || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, summary: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start Date & Time *</Label>
              <Input
                id="edit-start"
                type="datetime-local"
                value={editingEvent?.start || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End Date & Time *</Label>
              <Input
                id="edit-end"
                type="datetime-local"
                value={editingEvent?.end || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, end: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <LocationAutocomplete
                value={editingEvent?.location || ''}
                onChange={(value) => setEditingEvent({ ...editingEvent, location: value })}
                placeholder="Event location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingEvent?.description || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                placeholder="Event description"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={handleDeleteEvent}
              disabled={deleteEventMutation.isPending}
              className="w-full sm:w-auto"
            >
              {deleteEventMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
            <div className="flex gap-2 flex-1">
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateEvent}
                disabled={updateEventMutation.isPending}
                className="flex-1"
              >
                {updateEventMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Calendar Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="calendar">Calendar *</Label>
              <Select
                value={newEvent.calendarId}
                onValueChange={(value) => setNewEvent({ ...newEvent, calendarId: value })}
              >
                <SelectTrigger id="calendar">
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>
                      {cal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Title *</Label>
              <Input
                id="summary"
                value={newEvent.summary}
                onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Start Date & Time *</Label>
              <Input
                id="start"
                type="datetime-local"
                value={newEvent.start}
                onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Date & Time *</Label>
              <Input
                id="end"
                type="datetime-local"
                value={newEvent.end}
                onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <LocationAutocomplete
                value={newEvent.location}
                onChange={(value) => setNewEvent({ ...newEvent, location: value })}
                placeholder="Event location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Event description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateEvent}
              disabled={createEventMutation.isPending}
            >
              {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}