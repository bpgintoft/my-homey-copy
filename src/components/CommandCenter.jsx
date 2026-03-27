import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from 'react-router-dom';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { parseISO, isSameDay, addDays, format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Home, CalendarDays, CheckSquare, ChevronRight } from 'lucide-react';

const TZ = 'America/Chicago';

// Badge shown on the bell icon
export function CommandCenterBadge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none z-10">
      {count > 99 ? '99+' : count}
    </span>
  );
}

// Hook that computes the badge count from cached query data (no extra DB calls)
export function useCommandCenterCount() {
  const { data: maintenanceTasks = [] } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: () => base44.entities.MaintenanceTask.list('-next_due', 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: chores = [] } = useQuery({
    queryKey: ['chores'],
    queryFn: () => base44.entities.Chore.list('-updated_date', 300),
    staleTime: 2 * 60 * 1000,
  });

  const { data: cachedEvents = [] } = useQuery({
    queryKey: ['cachedCalendarEvents'],
    queryFn: () => base44.entities.CachedCalendarEvent.list('-start', 500),
    staleTime: 30 * 60 * 1000,
  });

  return useMemo(() => {
    const now = toZonedTime(new Date(), TZ);
    const todayStart = toZonedTime(new Date(), TZ);
    todayStart.setHours(0, 0, 0, 0);
    const in7Days = addDays(todayStart, 7);

    const dueMaintenance = maintenanceTasks.filter(t => {
      if (!t.next_due || t.status === 'completed') return false;
      const d = parseISO(t.next_due);
      return d >= todayStart && d <= in7Days;
    });

    const highPriorityChores = chores.filter(c =>
      !c.is_completed && c.timing === 'short-term'
    );

    const todayEvents = cachedEvents.filter(e => {
      if (!e.start) return false;
      const d = e.start.includes('T') ? toZonedTime(new Date(e.start), TZ) : parseISO(e.start);
      return isSameDay(d, todayStart);
    });

    return {
      count: dueMaintenance.length + highPriorityChores.length + todayEvents.length,
      dueMaintenance,
      highPriorityChores,
      todayEvents,
    };
  }, [maintenanceTasks, chores, cachedEvents]);
}

function Section({ emoji, title, items, renderItem, emptyText }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span>{emoji}</span> {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 italic pl-1">{emptyText}</p>
      ) : (
        <div className="space-y-1">
          {items.map(renderItem)}
        </div>
      )}
    </div>
  );
}

function ItemRow({ label, sublabel, to, onClick }) {
  const inner = (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer group">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">{label}</div>
        {sublabel && <div className="text-xs text-gray-500 truncate">{sublabel}</div>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
    </div>
  );

  if (to) return <Link to={to} onClick={onClick}>{inner}</Link>;
  return <div onClick={onClick}>{inner}</div>;
}

export default function CommandCenter({ open, onClose }) {
  const { dueMaintenance, highPriorityChores, todayEvents } = useCommandCenterCount();

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const roomMap = useMemo(() => {
    const m = {};
    rooms.forEach(r => { m[r.id] = r; });
    return m;
  }, [rooms]);

  const getMaintenanceSubtitle = (task) => {
    const parts = [];
    if (task.next_due) parts.push(`Due ${format(parseISO(task.next_due), 'MMM d')}`);
    if (task.appliance_name) parts.push(task.appliance_name);
    return parts.join(' · ');
  };

  const getEventTime = (event) => {
    if (!event.start) return '';
    if (!event.start.includes('T')) return 'All Day';
    return formatInTimeZone(parseISO(event.start), TZ, 'h:mm a');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[85vh] overflow-y-auto p-0 rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-white text-lg font-bold">Homey Command Center</DialogTitle>
          </div>
          <p className="text-gray-300 text-sm ml-12">Here's what needs your love today.</p>
        </div>

        <div className="px-4 py-5 space-y-6">
          {/* House Health */}
          <Section
            emoji="🏠"
            title="House Health"
            items={dueMaintenance}
            emptyText="All clear — no maintenance due this week!"
            renderItem={(task) => (
              <ItemRow
                key={task.id}
                label={task.title}
                sublabel={getMaintenanceSubtitle(task)}
                to={createPageUrl('House')}
                onClick={onClose}
              />
            )}
          />

          <div className="border-t border-gray-100" />

          {/* Family Pulse */}
          <Section
            emoji="📅"
            title="Family Pulse"
            items={todayEvents}
            emptyText="Nothing on the calendar today."
            renderItem={(event) => (
              <ItemRow
                key={event.id || event.google_event_id}
                label={event.title}
                sublabel={getEventTime(event)}
                to={createPageUrl('Calendar')}
                onClick={onClose}
              />
            )}
          />

          <div className="border-t border-gray-100" />

          {/* Priority Chores */}
          <Section
            emoji="✅"
            title="Priority Chores"
            items={highPriorityChores}
            emptyText="No high-priority chores — nice work!"
            renderItem={(chore) => {
              const memberPage = chore.assigned_to_name;
              const knownPages = ['Bryan', 'Kate', 'Phoenix', 'Mara'];
              const to = memberPage && knownPages.includes(memberPage)
                ? createPageUrl(memberPage)
                : createPageUrl('House');
              return (
                <ItemRow
                  key={chore.id}
                  label={chore.title}
                  sublabel={chore.assigned_to_name || undefined}
                  to={to}
                  onClick={onClose}
                />
              );
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}