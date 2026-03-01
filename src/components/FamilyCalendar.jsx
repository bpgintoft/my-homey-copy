import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronUp, Edit2, MapPin, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import LocationAutocomplete from './LocationAutocomplete';

export default function FamilyCalendar({ activities }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date(new Date().setHours(0,0,0,0)));
  const [hasNavigated, setHasNavigated] = useState(false);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState(new Set());
  const [editingEvent, setEditingEvent] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [recurringCalendarMoveDialog, setRecurringCalendarMoveDialog] = useState(null); // { eventData }
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
    'Phoenix': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/ef00eaae1_Phoenix.png',
    'Family': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/c17d012b5_image.png'
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

  // Load cached events instantly from DB
  const { data: cachedEvents = [] } = useQuery({
    queryKey: ['cachedCalendarEvents'],
    queryFn: () => base44.entities.CachedCalendarEvent.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Also fetch live from Google in background (refreshes cache)
  const { data: liveGoogleEvents = [], isLoading: isLoadingGoogle, error: googleError } = useQuery({
    queryKey: ['googleCalendarEvents', currentWeekStart.toISOString()],
    queryFn: async () => {
      const timeMin = currentWeekStart.toISOString();
      const timeMax = addDays(currentWeekStart, 7).toISOString();
      const { data } = await base44.functions.invoke('getGoogleCalendarEvents', { timeMin, timeMax });
      return data.events || [];
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true
  });

  // Use live events if available, otherwise fall back to cached events for the current week
  const googleEvents = React.useMemo(() => {
    if (liveGoogleEvents.length > 0) return liveGoogleEvents;
    // Map cached events to the same shape as live Google events
    const weekStart = currentWeekStart;
    const weekEnd = addDays(currentWeekStart, 7);
    return cachedEvents
      .filter(e => {
        if (!e.start) return false;
        const d = new Date(e.start);
        return d >= weekStart && d < weekEnd;
      })
      .map(e => ({
        id: e.google_event_id,
        calendarId: e.calendar_id,
        calendarName: e.calendar_name,
        backgroundColor: e.background_color,
        title: e.title,
        description: e.description,
        location: e.location,
        start: e.start,
        end: e.end,
        recurrence: e.recurrence,
        source: 'google',
      }));
  }, [liveGoogleEvents, cachedEvents, currentWeekStart]);

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

  // Get holiday emoji based on event title
  const getHolidayEmoji = (title) => {
    if (!title) return '🎉';
    const t = title.toLowerCase();
    if (t.includes('christmas')) return '🎄';
    if (t.includes('halloween')) return '🎃';
    if (t.includes('thanksgiving')) return '🦃';
    if (t.includes('easter')) return '🐣';
    if (t.includes('valentine')) return '❤️';
    if (t.includes('patrick') || t.includes("st. pat") || t.includes('st pat')) return '🍀';
    if (t.includes('independence') || t.includes('july 4') || t.includes('4th of july')) return '🎆';
    if (t.includes('new year')) return '🎆';
    if (t.includes('memorial')) return '🪖';
    if (t.includes('labor day')) return '⚒️';
    if (t.includes('columbus') || t.includes('indigenous')) return '🗺️';
    if (t.includes('veterans')) return '🎖️';
    if (t.includes('martin luther') || t.includes('mlk')) return '✊';
    if (t.includes('presidents')) return '🏛️';
    if (t.includes('mother')) return '🌸';
    if (t.includes('father')) return '👔';
    if (t.includes('hanukkah') || t.includes('chanukah')) return '🕎';
    if (t.includes('kwanzaa')) return '🕯️';
    if (t.includes('diwali')) return '🪔';
    if (t.includes('passover')) return '✡️';
    if (t.includes('rosh') || t.includes('yom kippur')) return '🍎';
    if (t.includes('eid')) return '🌙';
    if (t.includes('juneteenth')) return '✊';
    return '🎉';
  };

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
    setCurrentWeekStart(new Date(new Date().setHours(0,0,0,0)));
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
      // Use end-of-day UTC to ensure the last recurrence date is included
      const until = recurrenceEnd.replace(/-/g, '') + 'T235959Z';
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
    const formatTime = (t) => t && t.includes('T') && t.split(':').length === 2 ? `${t}:00` : t;
    const eventData = {
      summary: newEvent.summary,
      description: newEvent.description,
      location: newEvent.location,
      calendarId: newEvent.calendarId,
      start: formatTime(newEvent.start),
      end: formatTime(newEvent.end),
      recurrence: recurrenceRule ? [recurrenceRule] : null,
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

  const handleEditEvent = async (event) => {
    // Convert ISO datetime to datetime-local format
    const formatDateTime = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    };

    const isAllDay = event.start && !event.start.includes('T');

    // Detect if this is a recurring instance:
    // - has recurringEventId field set, OR
    // - its own id ends with _YYYYMMDD (Google expanded instance format)
    const masterEventId = event.recurringEventId || null;
    const isRecurringInstance = !!(masterEventId);

    // For recurring instances, the recurrence rule lives on the master event,
    // but Google doesn't return it on expanded instances via singleEvents=true.
    // Look for a sibling event in liveGoogleEvents that has the same recurringEventId
    // and happens to carry recurrence (unlikely), or just mark it as weekly so the
    // UI shows the correct state. We'll try fetching the master via a week-range search.
    let recurrenceArray = event.recurrence && event.recurrence.length > 0 ? event.recurrence : null;

    if (isRecurringInstance && !recurrenceArray) {
      // Try to find the recurrence from another event in our already-loaded events list
      // that shares the same recurringEventId and has recurrence data
      const sibling = googleEvents.find(e => 
        e.id === masterEventId || e.recurringEventId === masterEventId
      );
      if (sibling?.recurrence?.length > 0) {
        recurrenceArray = sibling.recurrence;
      }
    }

    // If still no recurrence info, try fetching the master event directly
    if (isRecurringInstance && !recurrenceArray && masterEventId) {
      try {
        const { data } = await base44.functions.invoke('getGoogleCalendarEvents', {
          masterEventId,
          calendarId: event.calendarId,
        });
        recurrenceArray = data?.recurrence || null;
      } catch (e) {
        console.error('[EditEvent] Failed to fetch master event:', e);
      }
    }

    // If still nothing and we know it's recurring, default to weekly so the UI reflects it
    if (isRecurringInstance && !recurrenceArray) {
      recurrenceArray = ['RRULE:FREQ=WEEKLY'];
    }

    const { recurrence, recurrenceEnd, weeklyDays } = parseRecurrenceRule(recurrenceArray);

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
      isAllDay,
      isRecurringInstance,
      recurringEventId: masterEventId,
      originalStartTime: event.start || null,
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
      return;
    }

    // If this is a recurring instance, always ask scope first
    if (editingEvent.isRecurringInstance) {
      setRecurringCalendarMoveDialog({ pendingEdit: true });
      return;
    }

    submitUpdate();
  };

  const submitUpdate = (recurringEditScope) => {
    const recurrenceRule = generateRecurrenceRule(editingEvent.recurrence, editingEvent.recurrenceEnd, editingEvent.weeklyDays);
    const formatTime = (t) => t && t.includes('T') && t.split(':').length === 2 ? `${t}:00` : t;
    const eventData = {
      id: editingEvent.id,
      calendarId: editingEvent.calendarId,
      originalCalendarId: editingEvent.originalCalendarId,
      summary: editingEvent.summary,
      description: editingEvent.description || '',
      location: editingEvent.location || '',
      start: editingEvent.isAllDay ? editingEvent.start : formatTime(editingEvent.start),
      end: editingEvent.isAllDay ? editingEvent.end : formatTime(editingEvent.end),
      recurrence: recurrenceRule ? [recurrenceRule] : null,
      isAllDay: editingEvent.isAllDay,
      recurringEditScope: recurringEditScope || undefined,
      recurringEventId: editingEvent.recurringEventId || undefined,
      originalStartTime: editingEvent.originalStartTime || undefined,
    };

    updateEventMutation.mutate(eventData);
  };

  const handleRecurringCalendarMoveChoice = (scope) => {
    setRecurringCalendarMoveDialog(null);
    submitUpdate(scope);
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
    <div className="-mx-6 px-6">
      {/* Sticky header section */}
      <div className="sticky top-16 lg:top-0 bg-[#F5F5F7] z-30 pb-3 -mx-6 px-6">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-0.5 mb-3 pt-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousWeek}
          className="h-6 w-6 rounded-lg flex-shrink-0 p-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <div className="text-xs font-semibold text-gray-900 whitespace-nowrap mx-1">
          {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d')}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWeek}
          className="h-6 w-6 rounded-lg flex-shrink-0 p-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="rounded-lg flex-shrink-0 h-6 px-2 text-xs"
        >
          Today
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 rounded-lg flex-shrink-0 p-0"
            >
              <Filter className="w-3 h-3" />
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
          className="h-6 w-6 rounded-full bg-gradient-to-r from-[#0AACFF] to-[#0890D9] shadow-lg flex-shrink-0 p-0"
          size="icon"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="w-3.5 h-3.5 text-white" />
        </Button>
      </div>



      {/* Day labels */}
      <div className="flex gap-2 mb-3 px-2">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => {
              const dayId = `day-${format(day, 'yyyy-MM-dd')}`;
              const element = document.getElementById(dayId);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg py-1 transition-colors cursor-pointer"
          >
            {format(day, 'EEE')}
          </button>
        ))}
      </div>
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
                id={`day-${format(day, 'yyyy-MM-dd')}`}
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
                    const isHoliday = activity.source === 'google' && activity.calendarName?.toLowerCase().includes('holiday');
                    
                    return (
                      <motion.div
                        key={`${activity.source}-${activity.id}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen pl-4 pr-6 py-1 bg-white"
                      >
                        <div className="flex items-stretch gap-2">
                          {/* Time - outside event rectangle */}
                          <div className="flex items-center justify-center flex-shrink-0 w-16">
                            <div className="text-sm font-medium text-gray-700 whitespace-nowrap">
                              {eventTime}
                            </div>
                          </div>

                          {/* Event rectangle */}
                          <div className="flex-1 min-w-0">
                            <div
                              onClick={() => setExpandedEventId(expandedEventId === activity.id ? null : activity.id)}
                              className="rounded-lg p-2 pr-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
                              style={{
                                borderLeft: `3px solid ${activity.backgroundColor || '#8B5CF6'}`
                              }}
                            >
                              {/* Avatar for Google Calendar events */}
                              {isHoliday ? (
                                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xl">
                                  {getHolidayEmoji(activity.title)}
                                </div>
                              ) : avatarUrl && (
                                <img 
                                  src={avatarUrl} 
                                  alt="Calendar owner"
                                  className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                                />
                              )}

                              {/* Event details */}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className={`font-medium text-sm text-gray-900 leading-tight ${expandedEventId === activity.id ? '' : 'truncate'}`}>
                                   {activity.title}
                                </div>
                                {activity.location && !expandedEventId && (
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

                              {/* Expand/collapse icon */}
                              {expandedEventId === activity.id ? (
                                <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                            </div>

                            {/* Expanded details */}
                            <AnimatePresence>
                              {expandedEventId === activity.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3 pt-2 space-y-2">
                                    {activity.location && (
                                      <a
                                        href={`https://maps.google.com/?q=${encodeURIComponent(activity.location)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start gap-2 text-sm text-blue-600 hover:text-blue-700 active:text-blue-800"
                                      >
                                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span className="underline">{activity.location}</span>
                                      </a>
                                    )}
                                    {activity.description && (
                                      <div className="flex items-start gap-2 text-sm text-gray-700">
                                        <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span className="whitespace-pre-wrap">{activity.description}</span>
                                      </div>
                                    )}
                                    {activity.source === 'google' && (
                                      <div className="flex justify-end pt-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditEvent(activity);
                                          }}
                                          className="h-8 text-xs"
                                        >
                                          <Edit2 className="w-3 h-3 mr-1" />
                                          Edit Event
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
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

      {/* Recurring Edit Scope Dialog */}
      <Dialog open={!!recurringCalendarMoveDialog} onOpenChange={(open) => !open && setRecurringCalendarMoveDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Recurring Event</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">This is a recurring event. Do you want to edit only this occurrence, or this and all following events?</p>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => handleRecurringCalendarMoveChoice('this')}>
              This Event Only
            </Button>
            <Button className="flex-1" onClick={() => handleRecurringCalendarMoveChoice('future')}>
              All Future Events
            </Button>
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