import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronRight, MapPin, DollarSign, Clock, User, Edit2, Check, X } from 'lucide-react';

const MODES = [
  { key: 'exploring', label: '🔍 Exploring', desc: 'Options being considered' },
  { key: 'active', label: '✅ Active', desc: 'Current activities' },
  { key: 'completed', label: '🏆 History', desc: 'Past activities' },
];

const EMPTY_FORM = { name: '', location: '', price: '', schedule: '', coach_contact: '', season: '', notes: '' };

export default function ActivitiesDialog({ open, onClose, memberId, memberName, color = 'blue' }) {
  const queryClient = useQueryClient();
  const [activeMode, setActiveMode] = useState('exploring');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const colorMap = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };
  const activeColor = colorMap[color] || colorMap.blue;

  const { data: activities = [] } = useQuery({
    queryKey: ['familyActivities', memberId],
    queryFn: () => base44.entities.FamilyActivity.filter({ family_member_id: memberId }),
    enabled: open && !!memberId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FamilyActivity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyActivities', memberId]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FamilyActivity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyActivities', memberId]);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FamilyActivity.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['familyActivities', memberId]),
  });

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate({ ...form, mode: activeMode, family_member_id: memberId, family_member_name: memberName });
    }
  };

  const handleEdit = (activity) => {
    setEditingId(activity.id);
    setForm({
      name: activity.name || '',
      location: activity.location || '',
      price: activity.price || '',
      schedule: activity.schedule || '',
      coach_contact: activity.coach_contact || '',
      season: activity.season || '',
      notes: activity.notes || '',
    });
    setShowForm(true);
  };

  const handleMoveMode = (activity, newMode) => {
    updateMutation.mutate({ id: activity.id, data: { mode: newMode } });
  };

  const modeActivities = activities.filter(a => a.mode === activeMode);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] flex flex-col overflow-hidden top-4 translate-y-0">
        <DialogHeader>
          <DialogTitle>Activities — {memberName}</DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 flex-shrink-0">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => { setActiveMode(m.key); setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeMode === m.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Activity cards */}
          {modeActivities.length === 0 && !showForm && (
            <p className="text-sm text-gray-400 text-center py-6">{MODES.find(m => m.key === activeMode)?.desc} — none yet</p>
          )}

          {modeActivities.map(activity => (
            <div key={activity.id} className={`rounded-xl border p-3 space-y-2 ${activeColor.replace('text-', 'border-').replace('bg-', '').split(' ')[0]} bg-white border`} style={{borderColor: 'rgb(229 231 235)'}}>
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-gray-900 text-sm leading-tight">{activity.name}</h4>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(activity)} className="p-1 rounded hover:bg-gray-100 transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(activity.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {activity.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3" />{activity.location}</div>
                )}
                {activity.price && (
                  <div className="flex items-center gap-1 text-xs text-gray-500"><DollarSign className="w-3 h-3" />{activity.price}</div>
                )}
                {activity.schedule && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 col-span-2"><Clock className="w-3 h-3" />{activity.schedule}</div>
                )}
                {activity.coach_contact && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 col-span-2"><User className="w-3 h-3" />{activity.coach_contact}</div>
                )}
                {activity.season && (
                  <div className="flex items-center gap-1 text-xs text-gray-500"><span>📅</span>{activity.season}</div>
                )}
              </div>
              {activity.notes && (
                <p className="text-xs text-gray-500 italic">{activity.notes}</p>
              )}
              {/* Move to next stage */}
              <div className="flex gap-1 pt-1 flex-wrap">
                {activeMode === 'exploring' && (
                  <button onClick={() => handleMoveMode(activity, 'active')} className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center gap-1">
                    Mark Active <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                {activeMode === 'active' && (
                  <>
                    <button onClick={() => handleMoveMode(activity, 'exploring')} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                      ← Back to Exploring
                    </button>
                    <button onClick={() => handleMoveMode(activity, 'completed')} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center gap-1">
                      Mark Completed <ChevronRight className="w-3 h-3" />
                    </button>
                  </>
                )}
                {activeMode === 'completed' && (
                  <button onClick={() => handleMoveMode(activity, 'active')} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                    ← Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add form */}
          {showForm && (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{editingId ? 'Edit Activity' : 'New Activity'}</p>
              <Input placeholder="Activity name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="text-sm" />
                <Input placeholder="Price / Cost" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="text-sm" />
              </div>
              <Input placeholder="Schedule (e.g., Tues/Thurs 5pm)" value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})} className="text-sm" />
              {(activeMode === 'active' || editingId) && (
                <Input placeholder="Coach / Contact" value={form.coach_contact} onChange={e => setForm({...form, coach_contact: e.target.value})} className="text-sm" />
              )}
              {(activeMode === 'completed' || editingId) && (
                <Input placeholder="Season (e.g., Fall 2025)" value={form.season} onChange={e => setForm({...form, season: e.target.value})} className="text-sm" />
              )}
              <Textarea placeholder="Notes / memories" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="text-sm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={!form.name.trim()}>
                  <Check className="w-3.5 h-3.5 mr-1" />{editingId ? 'Save' : 'Add'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {!showForm && (
          <div className="flex-shrink-0 pt-2">
            <Button size="sm" variant="outline" className="w-full" onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}>
              <Plus className="w-4 h-4 mr-1" /> Add to {MODES.find(m => m.key === activeMode)?.label}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}