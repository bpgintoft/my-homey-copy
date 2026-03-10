import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, addDays, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin, FileText, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function MonthlyCalendar({ activities }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [expandedEventId, setExpandedEventId] = useState(null);
  const eventsRef = React.useRef(null);

  const stickyRef = React.useRef(null);

  const handleDaySelect = (day) => {
    setSelectedDay(day);
    setExpandedEventId(null);
    // Scroll so the events list top sits just below the sticky calendar header
    setTimeout(() => {
      if (eventsRef.current && stickyRef.current) {
        const container = document.querySelector('main');
        if (container) {
          const stickyHeight = stickyRef.current.getBoundingClientRect().height;
          const containerRect = container.getBoundingClientRect();
          // Scroll so sticky header + events top aligns correctly
          // We want: containerRect.top + stickyHeight = eventsRect.top after scroll
          // So: scrollTop = container.scrollTop + eventsRect.top - containerRect.top - stickyHeight
          const eventsRect = eventsRef.current.getBoundingClientRect();
          const scrollTarget = container.scrollTop + (eventsRect.top - containerRect.top) - stickyHeight;
          container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }
      }
    }, 50);
  };

  // Same data fetching as FamilyCalendar
  const { data: cachedEvents = [] } = useQuery({
    queryKey: ['cachedCalendarEvents'],
    queryFn: () => base44.entities.CachedCalendarEvent.list('-start', 500),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: liveMonthEvents = [] } = useQuery({
    queryKey: ['googleCalendarEvents', monthStart.toISOString()],
    queryFn: async () => {
      const timeMin = monthStart.toISOString();
      const timeMax = monthEnd.toISOString();
      const { data } = await base44.functions.invoke('getGoogleCalendarEvents', { timeMin, timeMax });
      return data.events || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: calendarsData } = useQuery({
    queryKey: ['googleCalendars'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getGoogleCalendars');
      return data;
    }
  });

  const calendars = calendarsData?.calendars || [];

  // Build a calendarId -> backgroundColor map
  const calendarColorMap = React.useMemo(() => {
    const map = {};
    calendars.forEach(c => { map[c.id] = c.backgroundColor; });
    return map;
  }, [calendars]);

  // Cached events for the month as fallback
  const cachedMonthEvents = React.useMemo(() => {
    return cachedEvents
      .filter(e => {
        if (!e.start) return false;
        const d = new Date(e.start);
        return d >= monthStart && d <= monthEnd;
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
        source: 'google',
      }));
  }, [cachedEvents, currentMonth]);

  const googleEvents = liveMonthEvents.length > 0 ? liveMonthEvents : cachedMonthEvents;

  // All events combined
  const allEvents = [
    ...activities.map(a => ({
      ...a,
      source: 'manual',
      start: a.date,
      backgroundColor: '#8B5CF6',
    })),
    ...googleEvents.map(e => ({
      ...e,
      source: 'google',
      // Resolve color from calendars list if not already on event
      backgroundColor: e.backgroundColor || calendarColorMap[e.calendarId] || '#4285F4',
    }))
  ];

  const getEventsForDay = (day) => {
    return allEvents.filter(a => {
      if (!a.start) return false;
      return isSameDay(parseISO(a.start), day);
    }).sort((a, b) => {
      const aIsAllDay = !a.start.includes('T');
      const bIsAllDay = !b.start.includes('T');
      if (aIsAllDay && !bIsAllDay) return -1;
      if (!aIsAllDay && bIsAllDay) return 1;
      return new Date(a.start) - new Date(b.start);
    });
  };

  // Build calendar grid (always 6 rows x 7 cols starting Sunday)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const calendarAvatars = {
    'Bryan': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/b093cc037_Bryan.png',
    'Kate': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/d14194fd4_Kate.png',
    'Mara': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/08e4782d7_Mara.png',
    'Phoenix': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/ef00eaae1_Phoenix.png',
    'Family': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/c17d012b5_image.png'
  };

  const getCalendarAvatar = (calendarName) => {
    for (const [name, url] of Object.entries(calendarAvatars)) {
      if (calendarName?.toLowerCase().includes(name.toLowerCase())) return url;
    }
    return null;
  };

  const getHolidayEmoji = (title) => {
    if (!title) return '🎉';
    const t = title.toLowerCase();
    if (t.includes('christmas')) return '🎄';
    if (t.includes('halloween')) return '🎃';
    if (t.includes('thanksgiving')) return '🦃';
    if (t.includes('easter')) return '🐣';
    if (t.includes('valentine')) return '❤️';
    if (t.includes('patrick') || t.includes('st pat')) return '🍀';
    if (t.includes('independence') || t.includes('july 4') || t.includes('4th of july')) return '🎆';
    if (t.includes('new year')) return '🎆';
    if (t.includes('memorial')) return '🪖';
    if (t.includes('labor day')) return '⚒️';
    if (t.includes('veterans')) return '🎖️';
    if (t.includes('martin luther') || t.includes('mlk')) return '✊';
    if (t.includes('presidents')) return '🏛️';
    if (t.includes('mother')) return '🌸';
    if (t.includes('father')) return '👔';
    if (t.includes('hanukkah') || t.includes('chanukah')) return '🕎';
    return '🎉';
  };

  const memberColors = {
    'Phoenix': 'bg-blue-400',
    'Mara': 'bg-pink-400',
    'Kate': 'bg-green-400',
    'Bryan': 'bg-yellow-400'
  };

  const selectedDayEvents = getEventsForDay(selectedDay);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="-mx-6 px-6">
      {/* Month navigation */}
      <div ref={stickyRef} className="sticky top-0 z-20 pb-3 -mx-6 px-6 pt-3" style={{ backgroundColor: '#F5F5F7' }}>
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-sm font-semibold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {gridDays.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDay);
            // Deduplicate colors for dots (max 3)
            const dotColors = [...new Set(dayEvents.map(e => e.backgroundColor).filter(Boolean))].slice(0, 3);

            return (
              <button
                key={idx}
                onClick={() => handleDaySelect(day)}
                className={`flex flex-col items-center py-0.5 rounded-lg transition-colors ${isSelected ? 'bg-gray-900' : 'hover:bg-gray-100'}`}
              >
                <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium
                  ${!isCurrentMonth ? 'text-gray-300' : isToday && !isSelected ? 'text-blue-600 font-bold' : isSelected ? 'text-white' : 'text-gray-800'}`}>
                  {format(day, 'd')}
                </span>
                <div className="flex gap-0.5 h-1.5 mt-0.5">
                  {dotColors.map((color, ci) => (
                    <span key={ci} className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? 'white' : color }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      <div className="mt-4" ref={eventsRef}>
        <div className="text-sm font-semibold text-gray-800 mb-2 px-4">
          {isSameDay(selectedDay, today) ? 'Today' : format(selectedDay, 'EEEE, MMM d')}
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No events</div>
        ) : (
          <div className="space-y-1">
            {selectedDayEvents.map((activity) => {
              const memberColor = memberColors[activity.child_name] || 'bg-gray-400';
              const isAllDay = activity.start && !activity.start.includes('T');
              const eventTime = isAllDay ? 'All Day' : (activity.start ? format(parseISO(activity.start), 'h:mm a') : (activity.time || 'All day'));
              const avatarUrl = activity.source === 'google' && activity.calendarName ? getCalendarAvatar(activity.calendarName) : null;
              const isHoliday = activity.source === 'google' && activity.calendarName?.toLowerCase().includes('holiday');

              return (
                <motion.div
                  key={`${activity.source}-${activity.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pl-4 pr-6 py-1 bg-white"
                >
                  <div className="flex items-stretch gap-2">
                    <div className="flex items-center justify-center flex-shrink-0 w-16">
                      <div className="text-sm font-medium text-gray-700 whitespace-nowrap">{eventTime}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        onClick={() => setExpandedEventId(expandedEventId === activity.id ? null : activity.id)}
                        className="rounded-lg p-2 pr-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{ borderLeft: `3px solid ${activity.backgroundColor || '#8B5CF6'}` }}
                      >
                        {isHoliday ? (
                          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xl">
                            {getHolidayEmoji(activity.title)}
                          </div>
                        ) : avatarUrl && (
                          <img src={avatarUrl} alt="Calendar owner" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                        )}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className={`font-medium text-sm text-gray-900 leading-tight ${expandedEventId === activity.id ? '' : 'truncate'}`}>
                            {activity.title}
                          </div>
                          {activity.location && !expandedEventId && (
                            <div className="text-xs text-gray-600 leading-tight truncate">{activity.location}</div>
                          )}
                        </div>
                        {activity.child_name && (
                          <div className={`w-7 h-7 rounded-full ${memberColor} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
                            {activity.child_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {expandedEventId === activity.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>

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
        )}
      </div>
    </div>
  );
}