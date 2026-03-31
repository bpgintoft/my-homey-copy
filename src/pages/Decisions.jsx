import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import DecisionCard from '../components/decisions/DecisionCard';
import DecisionDialog from '../components/decisions/DecisionDialog';
import NewDecisionDialog from '../components/decisions/NewDecisionDialog';

export default function Decisions() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [filter, setFilter] = useState('undecided');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isChildUser = currentUser?.role === 'child';

  const { data: decisions = [] } = useQuery({
    queryKey: ['familyDecisions'],
    queryFn: () => base44.entities.FamilyDecision.list('-created_date', 100),
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const adultMembers = familyMembers.filter(m => m.can_vote === true);

  // Auto-open a specific decision if linked from a notification (run once)
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current || decisions.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const decisionId = params.get('decision');
    if (decisionId) {
    const found = decisions.find(d => d.id === decisionId);
    if (found) {
      autoOpenedRef.current = true;
      handleOpenDecision(found);
    }
    }
  }, [decisions]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FamilyDecision.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyDecisions'] });
      setShowNew(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FamilyDecision.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyDecisions'] });
      setSelectedDecision(null);
    },
  });

  const clearUnreadMutation = useMutation({
    mutationFn: ({ id, unread_by }) => base44.entities.FamilyDecision.update(id, { unread_by, last_updated_by_email: null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['familyDecisions'] }),
  });

  const handleOpenDecision = (d) => {
    // Remove current user from unread_by
    if (currentUser && d.unread_by?.includes(currentUser.email)) {
      const newUnread = d.unread_by.filter(e => e !== currentUser.email);
      clearUnreadMutation.mutate({ id: d.id, unread_by: newUnread });
    }
    setSelectedDecision(d);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FamilyDecision.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyDecisions'] });
      setSelectedDecision(null);
    },
  });

  const filterDecisions = () => {
    if (filter === 'undecided') return decisions.filter(d => !d.is_archived && (d.status === 'pending' || d.status === 'needs_discussion'));
    if (filter === 'needs_action') return decisions.filter(d => !d.is_archived && (d.status === 'needs_action'));
    if (filter === 'archived') return decisions.filter(d => d.is_archived);
    return decisions;
  };

  const filtered = filterDecisions();

  const needsActionCount = decisions.filter(d => !d.is_archived && d.status === 'needs_action').length;

  const filters = [
    { key: 'undecided', label: 'Undecided' },
    { key: 'needs_action', label: 'Needs Action', count: needsActionCount },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-32 lg:pb-8" style={{background: 'linear-gradient(160deg, #f0edff 0%, #e8e2ff 40%, #ede8ff 70%, #f5f0ff 100%)'}}>

      {/* Hero Banner — stripes + fade all in one container, no overflow:hidden */}
      <div className="relative" style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #a855f7 100%)',
      }}>
        {/* Diagonal stripes */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 10px, rgba(167,139,250,0.15) 10px, rgba(167,139,250,0.15) 20px, rgba(255,255,255,0.07) 20px, rgba(255,255,255,0.07) 25px, rgba(124,58,237,0.1) 25px, rgba(124,58,237,0.1) 30px)',
        }} />
        {/* Fade to page background at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(237,232,255,0.6) 77%, #ede8ff 100%)',
        }} />

        {/* Title row */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-8 pb-4 max-w-2xl mx-auto h-36 md:h-44">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight">
              <span className="text-white">Family </span>
              <span className="text-violet-200">Decisions</span>
            </h1>
            <p className="text-violet-300 text-xs mt-0.5">Proposals, votes &amp; follow-ups</p>
          </div>
          {!isChildUser && (
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-violet-700 text-sm transition-all hover:scale-105 bg-white flex-shrink-0"
              style={{boxShadow: '0 2px 12px rgba(0,0,0,0.15)'}}
            >
              <Plus className="w-4 h-4" />
              Propose
            </button>
          )}
        </div>

        {/* Filter tabs sit inside the banner so stripes fade behind them */}
        <div className="relative z-10 max-w-2xl mx-auto w-full px-4 pb-6">
          <div className="grid grid-cols-3 gap-2">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`relative px-4 py-2.5 rounded-full transition-all font-semibold text-sm ${
                  filter === f.key
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-violet-500 hover:text-violet-700 bg-white/70 border border-violet-200 hover:bg-white'
                }`}
              >
                {f.label}
                {f.count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow">
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-2xl mx-auto w-full px-4 flex-1">
        {decisions.length === 0 && (
          <div className="text-center py-20 text-violet-400">
            <div className="text-4xl mb-3">🤝</div>
            <p className="font-medium text-gray-700">No decisions yet</p>
            <p className="text-sm mt-1">Tap "Propose" to get started</p>
          </div>
        )}

        {filtered.length === 0 && decisions.length > 0 && (
          <div className="text-center py-12 text-violet-400">
            <p className="font-medium text-gray-700">No {filter} decisions</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="space-y-3 pb-4">
            {filtered.map(d => (
              <DecisionCard
                key={d.id}
                decision={d}
                onClick={handleOpenDecision}
                hasUnread={currentUser && d.unread_by?.includes(currentUser.email)}
                familyMembers={adultMembers}
              />
            ))}
          </div>
        )}
      </div>

      {showNew && currentUser && !isChildUser && (
        <NewDecisionDialog
          proposerEmail={currentUser.email}
          proposerName={currentUser.full_name || currentUser.email}
          onSave={(data) => createMutation.mutate(data)}
          onClose={() => setShowNew(false)}
        />
      )}

      {selectedDecision && currentUser && !isChildUser && (
        <DecisionDialog
          decision={selectedDecision}
          currentUserEmail={currentUser.email}
          familyMembers={adultMembers}
          onSave={(id, data) => updateMutation.mutate({ id, data })}
          onDelete={(id) => {
            if (confirm('Delete this decision?')) deleteMutation.mutate(id);
          }}
          onClose={() => setSelectedDecision(null)}
        />
      )}
    </div>
  );
}