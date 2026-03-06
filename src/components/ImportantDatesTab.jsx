import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Trash2, Edit2, Users, RefreshCw, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

const categoryConfig = {
  school_holiday:  { label: 'School Holiday', color: 'bg-blue-100 text-blue-700' },
  trip:            { label: 'Trip / Travel',   color: 'bg-emerald-100 text-emerald-700' },
  work_leave:      { label: 'Work Leave',      color: 'bg-orange-100 text-orange-700' },
  deadline:        { label: 'Deadline',        color: 'bg-red-100 text-red-700' },
  summer_plan:     { label: 'Summer Plan',     color: 'bg-yellow-100 text-yellow-700' },
  other:           { label: 'Other',           color: 'bg-gray-100 text-gray-700' },
};

const categoryOrder = ['deadline', 'school_holiday', 'trip', 'summer_plan', 'work_leave', 'other'];

const EMPTY_FORM = { title: '', date: '', end_date: '', description: '', category: '', custom_category: '', applies_to: 'Everyone' };

export default function ImportantDatesTab() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [syncingId, setSyncingId] = useState(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncTarget, setSyncTarget] = useState(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');

  const { data: dates = [] } = useQuery({
    queryKey: ['importantDates'],
    queryFn: () => base44.entities.ImportantDate.list('-date'),
  });

  const { data: calendarsData } = useQuery({
    queryKey: ['googleCalendars'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getGoogleCalendars');
      const data = res?.data ?? res;
      return Array.isArray(data?.calendars) ? data.calendars : [];
    },
  });
  const calendars = Array.isArray(calendarsData) ? calendarsData : [];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ImportantDate.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['importantDates']); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ImportantDate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['importantDates']); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ImportantDate.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['importantDates']),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowDialog(true); };
  const openEdit = (d) => { setEditing(d); setForm({ ...EMPTY_FORM, ...d, custom_category: d.custom_category || '' }); setShowDialog(true); };
  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openSync = (d) => {
    setSyncTarget(d);
    setSelectedCalendarId(d.synced_google_calendar_id || (calendars[0]?.id || ''));
    setShowSyncDialog(true);
  };

  const handleSync = async () => {
    if (!syncTarget || !selectedCalendarId) return;
    setSyncingId(syncTarget.id);
    setShowSyncDialog(false);

    const isAllDay = true;
    const endDate = syncTarget.end_date || syncTarget.date;
    // Google all-day end is exclusive, add 1 day
    const endDateExclusive = (() => {
      const d = new Date(endDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })();

    const res = await base44.functions.invoke('createGoogleCalendarEvent', {
      calendarId: selectedCalendarId,
      summary: syncTarget.title,
      description: [
        syncTarget.description,
        syncTarget.applies_to ? `Applies to: ${syncTarget.applies_to}` : '',
      ].filter(Boolean).join('\n'),
      start: syncTarget.date,
      end: endDateExclusive,
      isAllDay,
    });

    if (res.data?.event?.id) {
      await base44.entities.ImportantDate.update(syncTarget.id, {
        synced_google_calendar_id: selectedCalendarId,
        synced_google_event_id: res.data.event.id,
      });
      queryClient.invalidateQueries(['importantDates']);
    }
    setSyncingId(null);
    setSyncTarget(null);
  };

  const getCategoryLabel = (d) => {
    if (d.category === 'other' && d.custom_category) return d.custom_category;
    return categoryConfig[d.category]?.label || 'Other';
  };

  // Group by category
  const grouped = categoryOrder.reduce((acc, cat) => {
    const items = dates.filter(d => d.category === cat).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{dates.length} important date{dates.length !== 1 ? 's' : ''} saved</p>
        <Button onClick={openAdd} className="bg-gradient-to-r from-[#0AACFF] to-[#0890D9] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Date
        </Button>
      </div>

      {dates.length === 0 && (
        <Card className="bg-white border-0 shadow-sm p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No important dates yet</h3>
          <p className="text-gray-500 mb-4">Add school holidays, trips, work leave, deadlines, and more</p>
          <Button onClick={openAdd} className="bg-gradient-to-r from-[#0AACFF] to-[#0890D9] text-white">
            <Plus className="w-4 h-4 mr-2" /> Add First Date
          </Button>
        </Card>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
            {cat === 'other' ? 'Other' : categoryConfig[cat]?.label}
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(d => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                >
                  <CardContent className="p-5">
                    {/* Always visible: title + date */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900">{d.title}</h4>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {format(parseISO(d.date), 'MMM d, yyyy')}
                            {d.end_date && d.end_date !== d.date && ` – ${format(parseISO(d.end_date), 'MMM d, yyyy')}`}
                          </span>
                        </div>
                      </div>
                      <span className="text-gray-300 text-xs ml-2">{expandedId === d.id ? '▲' : '▼'}</span>
                    </div>

                    {/* Expanded details */}
                    {expandedId === d.id && (
                      <div className="mt-4 space-y-2 border-t pt-3">
                        {d.applies_to && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span>{d.applies_to}</span>
                          </div>
                        )}
                        {d.description && (
                          <p className="text-sm text-gray-500">{d.description}</p>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <Badge className={categoryConfig[cat]?.color}>{categoryConfig[cat]?.label}</Badge>
                          <div className="flex items-center gap-1">
                            {d.synced_google_event_id ? (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                              </span>
                            ) : (
                              <Button variant="ghost" size="sm"
                                className="text-xs text-gray-400 hover:text-blue-600 h-7 px-2"
                                disabled={syncingId === d.id}
                                onClick={(e) => { e.stopPropagation(); openSync(d); }}>
                                <RefreshCw className={`w-3 h-3 mr-1 ${syncingId === d.id ? 'animate-spin' : ''}`} />
                                Sync
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600"
                              onClick={(e) => { e.stopPropagation(); openEdit(d); }}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500"
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(d.id); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Important Date' : 'Add Important Date'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder="Title (e.g., Spring Break, Work trip to Chicago)"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {categoryOrder.map(cat => (
                  <SelectItem key={cat} value={cat}>{categoryConfig[cat].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={form.applies_to} onValueChange={v => setForm({ ...form, applies_to: v })}>
              <SelectTrigger><SelectValue placeholder="Applies to" /></SelectTrigger>
              <SelectContent>
                {['Everyone', 'Kids', 'Parents', 'Bryan', 'Kate', 'Mara', 'Phoenix'].map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End Date (optional)</label>
                <Input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>

            <Textarea placeholder="Notes or description (optional)"
              value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />

            <Button onClick={handleSave} disabled={!form.title || !form.date || !form.category}
              className="w-full bg-gradient-to-r from-[#0AACFF] to-[#0890D9] text-white">
              {editing ? 'Save Changes' : 'Add Date'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync to Calendar Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sync to Google Calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-500">Choose which calendar to add <strong>{syncTarget?.title}</strong> to:</p>
            <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
              <SelectTrigger><SelectValue placeholder="Select calendar" /></SelectTrigger>
              <SelectContent>
                {calendars.map(cal => (
                  <SelectItem key={cal.id} value={cal.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: cal.backgroundColor }} />
                      {cal.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSync} disabled={!selectedCalendarId}
              className="w-full bg-gradient-to-r from-[#0AACFF] to-[#0890D9] text-white">
              Sync Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}