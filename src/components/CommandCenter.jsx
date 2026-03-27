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
    const todayStart = toZonedTime(new Date(), TZ);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = addDays(todayStart, 1);
    const in30Days = addDays(todayStart, 30);
    const in7Days = addDays(todayStart, 7);

    // 📅 Family Pulse: only TODAY's events
    const todayEvents = cachedEvents
      .filter(e => {
        if (!e.start) return false;
        const d = e.start.includes('T') ? toZonedTime(new Date(e.start), TZ) : parseISO(e.start);
        return isSameDay(d, todayStart);
      })
      .sort((a, b) => {
        if (!a.start.includes('T')) return -1;
        if (!b.start.includes('T')) return 1;
        return new Date(a.start) - new Date(b.start);
      });

    // 🏠 House Health: past due OR due within 30 days
    const dueMaintenance = maintenanceTasks
      .filter(t => {
        if (!t.next_due || t.status === 'completed') return false;
        const d = parseISO(t.next_due);
        return d <= in30Days; // includes past due (before today)
      })
      .sort((a, b) => parseISO(a.next_due) - parseISO(b.next_due));

    // ✅ Priority Chores: past due, due within 7 days, OR marked urgent
    const urgentChores = chores
      .filter(c => {
        if (c.is_completed) return false;
        if (c.priority === 'urgent') return true;
        if (c.next_due) {
          const d = parseISO(c.next_due);
          return d <= in7Days; // includes past due
        }
        return false;
      })
      .sort((a, b) => {
        // Past due / soonest first; no date goes last
        if (a.next_due && b.next_due) return parseISO(a.next_due) - parseISO(b.next_due);
        if (a.next_due) return -1;
        if (b.next_due) return 1;
        return 0;
      });

    return {
      count: dueMaintenance.length + urgentChores.length + todayEvents.length,
      dueMaintenance,
      highPriorityChores: urgentChores,
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
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden p-0 rounded-2xl">
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
            emptyText="Nothing urgent today. Enjoy the peace!"
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
            emptyText="Nothing urgent today. Enjoy the peace!"
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
            emptyText="Nothing urgent today. Enjoy the peace!"
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
                  sublabel={[chore.assigned_to_name, chore.next_due ? `Due ${format(parseISO(chore.next_due), 'MMM d')}` : (chore.priority === 'urgent' ? 'Urgent' : undefined)].filter(Boolean).join(' · ') || undefined}
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