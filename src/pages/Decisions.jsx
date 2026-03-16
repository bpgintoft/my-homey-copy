import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import DecisionCard from '../components/decisions/DecisionCard';
import DecisionDialog from '../components/decisions/DecisionDialog';
import NewDecisionDialog from '../components/decisions/NewDecisionDialog';

const BRYAN_EMAIL = 'bpgintoft@gmail.com';
const KATE_EMAIL = 'kateeliz11@gmail.com';

const nameForEmail = (email) => {
  if (email === BRYAN_EMAIL) return 'Bryan';
  if (email === KATE_EMAIL) return 'Kate';
  return email;
};

export default function Decisions() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [filter, setFilter] = useState('undecided');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: decisions = [] } = useQuery({
    queryKey: ['familyDecisions'],
    queryFn: () => base44.entities.FamilyDecision.list('-created_date', 100),
  });

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
        setSelectedDecision(found);
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
    <div className="min-h-screen flex flex-col pb-32 lg:pb-8" style={{background: 'linear-gradient(160deg, #1a1040 0%, #2d1b69 40%, #3d2a8a 70%, #4a3fb5 100%)'}}>

      {/* Hero Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight">
            <span className="text-white">Family </span>
            <span style={{color: '#c4b5fd'}}>Decisions</span>
          </h1>
          <p className="text-indigo-300 text-xs mt-0.5">Proposals, votes &amp; follow-ups</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white text-sm transition-all hover:scale-105 hover:brightness-110 flex-shrink-0"
          style={{background: 'rgba(180, 140, 255, 0.55)', border: '1px solid rgba(200, 170, 255, 0.5)', backdropFilter: 'blur(10px)'}}
        >
          <Plus className="w-4 h-4" />
          Propose
        </button>
      </div>

      {/* Filter tabs */}
      <div className="max-w-2xl mx-auto w-full px-4 mb-4">
        <div className="grid grid-cols-3 gap-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`relative px-4 py-2.5 rounded-full transition-all font-semibold text-sm ${
                filter === f.key
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-indigo-300 hover:text-white hover:bg-white/10 border border-white/8'
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

      {/* Cards */}
      <div className="max-w-2xl mx-auto w-full px-4 flex-1">
        {decisions.length === 0 && (
          <div className="text-center py-20 text-indigo-300">
            <div className="text-4xl mb-3">🤝</div>
            <p className="font-medium text-white">No decisions yet</p>
            <p className="text-sm mt-1">Tap "Propose Decision" to get started</p>
          </div>
        )}

        {filtered.length === 0 && decisions.length > 0 && (
          <div className="text-center py-12 text-indigo-300">
            <p className="font-medium text-white">No {filter} decisions</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="space-y-3 pb-4">
            {filtered.map(d => (
              <DecisionCard key={d.id} decision={d} onClick={setSelectedDecision} />
            ))}
          </div>
        )}
      </div>

      {showNew && currentUser && (
        <NewDecisionDialog
          proposerEmail={currentUser.email}
          proposerName={nameForEmail(currentUser.email)}
          onSave={(data) => createMutation.mutate(data)}
          onClose={() => setShowNew(false)}
        />
      )}

      {selectedDecision && currentUser && (
        <DecisionDialog
          decision={selectedDecision}
          currentUserEmail={currentUser.email}
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