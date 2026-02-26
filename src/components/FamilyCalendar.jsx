import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import LocationAutocomplete from './LocationAutocomplete';

export default function FamilyCalendar({ activities }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [hasNavigated, setHasNavigated] = useState(false);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState(new Set());
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    location: '',
    start: '',
    end: '',
    calendarId: '',
    recurrence: 'none',
    recurrenceEnd: '',
    weeklyDays: [],
    isAllDay: false
  });
  const queryClient = useQueryClient();

  // Avatar mapping for family members
  const calendarAvatars = {
    'Bryan': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/b093cc037_Bryan.png',
    'Kate': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/d14194fd4_Kate.png',
    'Mara': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/08e4782d7_Mara.png',
    'Phoenix': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/ef00eaae1_Phoenix.png'
  };

  // Helper to get avatar for calendar
  const getCalendarAvatar = (calendarName) => {
    for (const [name, url] of Object.entries(calendarAvatars)) {
      if (calendarName?.toLowerCase().includes(name.toLowerCase())) {
        return url;
      }
    }
    return null;
  };

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
    },
    staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes in background
    refetchOnWindowFocus: true // Refresh when user returns to tab
  });

  // Fetch existing thumbnails for Google Calendar events
  const { data: thumbnails = [] } = useQuery({
    queryKey: ['calendarEventThumbnails'],
    queryFn: async () => {
      return await base44.entities.CalendarEventThumbnail.list();
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
  
  // Initialize selected calendars when calendars load
  React.useEffect(() => {
    if (calendars.length > 0 && selectedCalendarIds.size === 0) {
      setSelectedCalendarIds(new Set(calendars.map(c => c.id)));
    }
  }, [calendars]);
  
  // Filter events by selected calendars
  const filteredGoogleEvents = googleEvents.filter(event => 
    selectedCalendarIds.has(event.calendarId)
  );
  
  const toggleCalendar = (calendarId) => {
    const newSelected = new Set(selectedCalendarIds);
    if (newSelected.has(calendarId)) {
      newSelected.delete(calendarId);
    } else {
      newSelected.add(calendarId);
    }
    setSelectedCalendarIds(newSelected);
  };

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
        calendarId: '',
        recurrence: 'none',
        recurrenceEnd: '',
        weeklyDays: [],
        isAllDay: false
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
    ...filteredGoogleEvents.map(e => ({
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
        prompt: `A minimalist flat icon representing "${activity.title}". Style: very simple shapes, solid colors, minimal detail, flat design, clean white background. No text or words.`
      });
      return { activityId: activity.id, iconUrl: url };
    },
    onSuccess: ({ activityId, iconUrl }) => {
      queryClient.setQueryData(['kidsActivities'], (old) =>
        old.map(a => a.id === activityId ? { ...a, icon_url: iconUrl } : a)
      );
    }
  });

  // Generate thumbnail for Google Calendar event
  const generateGoogleEventThumbnailMutation = useMutation({
    mutationFn: async ({ eventId, calendarId, title }) => {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `A minimalist flat icon representing "${title}". Style: very simple shapes, solid colors, minimal detail, flat design, clean white background. No text or words.`
      });
      
      const thumbnail = await base44.entities.CalendarEventThumbnail.create({
        google_event_id: eventId,
        google_calendar_id: calendarId,
        event_title: title,
        icon_url: url
      });
      
      return thumbnail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEventThumbnails'] });
    }
  });

  // Get thumbnail URL for a Google Calendar event
  const getThumbnailForEvent = (eventId) => {
    const thumbnail = thumbnails.find(t => t.google_event_id === eventId);
    return thumbnail?.icon_url;
  };

  // Auto-generate thumbnails for Google Calendar events without them
  React.useEffect(() => {
    if (googleEvents.length > 0 && thumbnails.length >= 0) {
      googleEvents.forEach(event => {
        const hasThumbnail = thumbnails.some(t => t.google_event_id === event.id);
        if (!hasThumbnail && event.title && !generateGoogleEventThumbnailMutation.isPending) {
          // Auto-generate thumbnail
          generateGoogleEventThumbnailMutation.mutate({
            eventId: event.id,
            calendarId: event.calendarId,
            title: event.title
          });
        }
      });
    }
  }, [googleEvents, thumbnails]);

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
    setHasNavigated(true);
    setHasScrolledUp(false);
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
    setHasScrolledUp(false);
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
    setHasNavigated(false);
    setHasScrolledUp(false);
  };

  // Detect scroll direction
  React.useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isCurrentWeek = currentWeekStart <= new Date() && new Date() < addDays(currentWeekStart, 7);
      
      if (isCurrentWeek && !hasNavigated) {
        if (currentScrollY < lastScrollY && !hasScrolledUp) {
          // Scrolling up
          setHasScrolledUp(true);
        }
      }
      
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentWeekStart, hasNavigated, hasScrolledUp]);

  const generateRecurrenceRule = (recurrence, recurrenceEnd, weeklyDays) => {
    if (recurrence === 'none') return null;
    
    let rrule = 'RRULE:FREQ=';
    
    switch (recurrence) {
      case 'daily':
        rrule += 'DAILY';
        break;
      case 'weekly':
        rrule += 'WEEKLY';
        if (weeklyDays.length > 0) {
          rrule += `;BYDAY=${weeklyDays.join(',')}`;
        }
        break;
      case 'monthly':
        rrule += 'MONTHLY';
        break;
      case 'yearly':
        rrule += 'YEARLY';
        break;
      default:
        return null;
    }
    
    if (recurrenceEnd) {
      const endDate = new Date(recurrenceEnd);
      const until = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      rrule += `;UNTIL=${until}`;
    }
    
    return rrule;
  };

  const handleCreateEvent = () => {
    if (!newEvent.summary || !newEvent.start || !newEvent.end || !newEvent.calendarId) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const recurrenceRule = generateRecurrenceRule(newEvent.recurrence, newEvent.recurrenceEnd, newEvent.weeklyDays);
    
    // Ensure datetime has seconds (required by Google Calendar API)
    const eventData = {
      summary: newEvent.summary,
      description: newEvent.description,
      location: newEvent.location,
      calendarId: newEvent.calendarId,
      start: newEvent.start.includes(':') && newEvent.start.split(':').length === 2 
        ? `${newEvent.start}:00` 
        : newEvent.start,
      end: newEvent.end.includes(':') && newEvent.end.split(':').length === 2 
        ? `${newEvent.end}:00` 
        : newEvent.end,
      recurrence: recurrenceRule ? [recurrenceRule] : undefined,
      isAllDay: newEvent.isAllDay
    };
    
    createEventMutation.mutate(eventData);
  };

  const parseRecurrenceRule = (recurrenceArray) => {
    if (!recurrenceArray || recurrenceArray.length === 0) {
      return { recurrence: 'none', recurrenceEnd: '', weeklyDays: [] };
    }
    
    const rrule = recurrenceArray[0];
    let recurrence = 'none';
    let recurrenceEnd = '';
    let weeklyDays = [];
    
    if (rrule.includes('FREQ=DAILY')) recurrence = 'daily';
    else if (rrule.includes('FREQ=WEEKLY')) recurrence = 'weekly';
    else if (rrule.includes('FREQ=MONTHLY')) recurrence = 'monthly';
    else if (rrule.includes('FREQ=YEARLY')) recurrence = 'yearly';
    
    const byDayMatch = rrule.match(/BYDAY=([^;]+)/);
    if (byDayMatch) {
      weeklyDays = byDayMatch[1].split(',');
    }
    
    const untilMatch = rrule.match(/UNTIL=([^;]+)/);
    if (untilMatch) {
      const untilStr = untilMatch[1];
      const year = untilStr.substring(0, 4);
      const month = untilStr.substring(4, 6);
      const day = untilStr.substring(6, 8);
      recurrenceEnd = `${year}-${month}-${day}`;
    }
    
    return { recurrence, recurrenceEnd, weeklyDays };
  };

  const handleEditEvent = (event) => {
    // Convert ISO datetime to datetime-local format
    const formatDateTime = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    };

    const { recurrence, recurrenceEnd, weeklyDays } = parseRecurrenceRule(event.recurrence);
    
    // Check if it's an all-day event (start has no time component)
    const isAllDay = event.start && !event.start.includes('T');

    setEditingEvent({
      id: event.id,
      calendarId: event.calendarId,
      originalCalendarId: event.calendarId,
      summary: event.title || event.summary || '',
      description: event.description || '',
      location: event.location || '',
      start: isAllDay ? event.start : formatDateTime(event.start),
      end: isAllDay ? event.end : formatDateTime(event.end),
      recurrence,
      recurrenceEnd,
      weeklyDays,
      isAllDay
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

    const recurrenceRule = generateRecurrenceRule(editingEvent.recurrence, editingEvent.recurrenceEnd, editingEvent.weeklyDays);

    const eventData = {
      id: editingEvent.id,
      calendarId: editingEvent.calendarId,
      originalCalendarId: editingEvent.originalCalendarId,
      summary: editingEvent.summary,
      description: editingEvent.description || '',
      location: editingEvent.location || '',
      start: editingEvent.isAllDay 
        ? editingEvent.start 
        : (editingEvent.start.includes(':') && editingEvent.start.split(':').length === 2 
            ? `${editingEvent.start}:00` 
            : editingEvent.start),
      end: editingEvent.isAllDay 
        ? editingEvent.end 
        : (editingEvent.end.includes(':') && editingEvent.end.split(':').length === 2 
            ? `${editingEvent.end}:00` 
            : editingEvent.end),
      recurrence: recurrenceRule ? [recurrenceRule] : undefined,
      isAllDay: editingEvent.isAllDay
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
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-0.5 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousWeek}
          className="h-7 w-7 rounded-lg flex-shrink-0 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-xs font-semibold text-gray-900 whitespace-nowrap mx-1">
          {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d')}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWeek}
          className="h-7 w-7 rounded-lg flex-shrink-0 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="rounded-lg flex-shrink-0 h-7 px-2 text-xs"
        >
          Today
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-lg flex-shrink-0 p-0"
            >
              <Filter className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Filter Calendars</h4>
              {calendars.map((calendar) => (
                <div key={calendar.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={calendar.id}
                    checked={selectedCalendarIds.has(calendar.id)}
                    onCheckedChange={() => toggleCalendar(calendar.id)}
                  />
                  <label
                    htmlFor={calendar.id}
                    className="text-sm flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: calendar.backgroundColor }}
                    />
                    {calendar.name}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          className="h-7 w-7 rounded-full bg-gradient-to-r from-[#0AACFF] to-[#0890D9] shadow-lg flex-shrink-0 p-0"
          size="icon"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="w-4 h-4 text-white" />
        </Button>
      </div>

      {/* Error message */}
      {googleError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          Error loading Google Calendar: {googleError.message}
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
            const allDayActivities = getActivitiesForDay(day);
            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekStart = new Date(currentWeekStart);
            weekStart.setHours(0, 0, 0, 0);
            
            const isCurrentWeek = weekStart <= today && today < addDays(weekStart, 7);
            
            // Only filter future events if: current week AND haven't navigated to previous weeks AND haven't scrolled up
            const dayActivities = (isCurrentWeek && !hasNavigated && !hasScrolledUp)
              ? allDayActivities.filter(activity => {
                  if (!activity.start) return true;
                  const eventEnd = activity.end ? parseISO(activity.end) : parseISO(activity.start);
                  return eventEnd >= now;
                })
              : allDayActivities;
            
            if (dayActivities.length === 0) return null;

            const isToday = isSameDay(day, new Date());

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-3"
              >
                <div className="text-sm font-semibold text-gray-800 mb-2 px-4">
                  {format(day, 'EEE d')}
                </div>
                
                <div className="space-y-1">
                  {dayActivities.map((activity) => {
                    const memberColor = memberColors[activity.child_name] || 'bg-gray-400';
                    // Check if event is all-day (no time component in ISO string)
                    const isAllDay = activity.start && !activity.start.includes('T');
                    const eventTime = isAllDay ? 'All Day' : (activity.start ? format(parseISO(activity.start), 'h:mm a') : (activity.time || 'All day'));
                    
                    const avatarUrl = activity.source === 'google' && activity.calendarName 
                      ? getCalendarAvatar(activity.calendarName) 
                      : null;
                    
                    return (
                      <motion.div
                        key={`${activity.source}-${activity.id}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen pl-4 pr-6 py-1 bg-white flex items-stretch gap-2"
                      >
                        {/* Time - outside event rectangle */}
                        <div className="flex items-center justify-center flex-shrink-0 w-16">
                          <div className="text-sm font-medium text-gray-700">
                            {eventTime}
                          </div>
                        </div>

                        {/* Event rectangle */}
                        <div
                          onClick={() => activity.source === 'google' && handleEditEvent(activity)}
                          className={`rounded-lg p-2 pr-2 flex items-center gap-2 flex-1 min-w-0 ${activity.source === 'google' ? 'cursor-pointer' : ''}`}
                          style={{
                            borderLeft: `3px solid ${activity.backgroundColor || '#8B5CF6'}`
                          }}
                        >
                          {/* Avatar for Google Calendar events */}
                          {avatarUrl && (
                            <img 
                              src={avatarUrl} 
                              alt="Calendar owner"
                              className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                            />
                          )}

                          {/* Event details */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="font-medium text-sm text-gray-900 truncate leading-tight">
                              {activity.title}
                            </div>
                            {activity.location && (
                              <div className="text-xs text-gray-600 leading-tight truncate">
                                {activity.location}
                              </div>
                            )}
                          </div>

                          {/* Member initial */}
                          {activity.child_name && (
                            <div className={`w-7 h-7 rounded-full ${memberColor} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
                              {getInitial(activity.child_name)}
                            </div>
                          )}
                        </div>
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-calendar">Calendar *</Label>
              <Select
                value={editingEvent?.calendarId || ''}
                onValueChange={(value) => setEditingEvent({ ...editingEvent, calendarId: value })}
              >
                <SelectTrigger id="edit-calendar">
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
              <Label htmlFor="edit-summary">Title *</Label>
              <Input
                id="edit-summary"
                value={editingEvent?.summary || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, summary: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-all-day"
                checked={editingEvent?.isAllDay || false}
                onCheckedChange={(checked) => {
                  const newState = { ...editingEvent, isAllDay: checked };
                  // Convert datetime to date or vice versa
                  if (checked) {
                    // Convert to date-only format (YYYY-MM-DD)
                    if (editingEvent.start && editingEvent.start.includes('T')) {
                      newState.start = editingEvent.start.split('T')[0];
                    }
                    if (editingEvent.end && editingEvent.end.includes('T')) {
                      newState.end = editingEvent.end.split('T')[0];
                    }
                  }
                  setEditingEvent(newState);
                }}
              />
              <Label htmlFor="edit-all-day" className="cursor-pointer">All Day Event</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-start">{editingEvent?.isAllDay ? 'Start Date *' : 'Start Date & Time *'}</Label>
              <Input
                id="edit-start"
                type={editingEvent?.isAllDay ? "date" : "datetime-local"}
                value={editingEvent?.start || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">{editingEvent?.isAllDay ? 'End Date *' : 'End Date & Time *'}</Label>
              <Input
                id="edit-end"
                type={editingEvent?.isAllDay ? "date" : "datetime-local"}
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
            <div className="space-y-2">
              <Label htmlFor="edit-recurrence">Repeat</Label>
              <Select
                value={editingEvent?.recurrence || 'none'}
                onValueChange={(value) => setEditingEvent({ ...editingEvent, recurrence: value, weeklyDays: [] })}
              >
                <SelectTrigger id="edit-recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingEvent?.recurrence === 'weekly' && (
              <div className="space-y-2">
                <Label>Repeat on</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'S', value: 'SU' },
                    { label: 'M', value: 'MO' },
                    { label: 'T', value: 'TU' },
                    { label: 'W', value: 'WE' },
                    { label: 'T', value: 'TH' },
                    { label: 'F', value: 'FR' },
                    { label: 'S', value: 'SA' }
                  ].map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={(editingEvent?.weeklyDays || []).includes(day.value) ? "default" : "outline"}
                      size="sm"
                      className="w-9 h-9 p-0 rounded-full"
                      onClick={() => {
                        const days = (editingEvent?.weeklyDays || []).includes(day.value)
                          ? editingEvent.weeklyDays.filter(d => d !== day.value)
                          : [...(editingEvent?.weeklyDays || []), day.value];
                        setEditingEvent({ ...editingEvent, weeklyDays: days });
                      }}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {editingEvent?.recurrence !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="edit-recurrence-end">Ends on</Label>
                <Input
                  id="edit-recurrence-end"
                  type="date"
                  value={editingEvent?.recurrenceEnd || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, recurrenceEnd: e.target.value })}
                />
              </div>
            )}
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-all-day"
                checked={newEvent.isAllDay}
                onCheckedChange={(checked) => setNewEvent({ ...newEvent, isAllDay: checked })}
              />
              <Label htmlFor="new-all-day" className="cursor-pointer">All Day Event</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">{newEvent.isAllDay ? 'Start Date *' : 'Start Date & Time *'}</Label>
              <Input
                id="start"
                type={newEvent.isAllDay ? "date" : "datetime-local"}
                value={newEvent.start}
                onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">{newEvent.isAllDay ? 'End Date *' : 'End Date & Time *'}</Label>
              <Input
                id="end"
                type={newEvent.isAllDay ? "date" : "datetime-local"}
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
            <div className="space-y-2">
              <Label htmlFor="recurrence">Repeat</Label>
              <Select
                value={newEvent.recurrence}
                onValueChange={(value) => setNewEvent({ ...newEvent, recurrence: value, weeklyDays: [] })}
              >
                <SelectTrigger id="recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newEvent.recurrence === 'weekly' && (
              <div className="space-y-2">
                <Label>Repeat on</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'S', value: 'SU' },
                    { label: 'M', value: 'MO' },
                    { label: 'T', value: 'TU' },
                    { label: 'W', value: 'WE' },
                    { label: 'T', value: 'TH' },
                    { label: 'F', value: 'FR' },
                    { label: 'S', value: 'SA' }
                  ].map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={newEvent.weeklyDays.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      className="w-9 h-9 p-0 rounded-full"
                      onClick={() => {
                        const days = newEvent.weeklyDays.includes(day.value)
                          ? newEvent.weeklyDays.filter(d => d !== day.value)
                          : [...newEvent.weeklyDays, day.value];
                        setNewEvent({ ...newEvent, weeklyDays: days });
                      }}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {newEvent.recurrence !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="recurrence-end">Ends on</Label>
                <Input
                  id="recurrence-end"
                  type="date"
                  value={newEvent.recurrenceEnd}
                  onChange={(e) => setNewEvent({ ...newEvent, recurrenceEnd: e.target.value })}
                />
              </div>
            )}
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