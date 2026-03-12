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
  const [filter, setFilter] = useState('pending');
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
    if (filter === 'pending') return decisions.filter(d => d.status === 'pending' || d.status === 'needs_discussion');
    if (filter === 'approved') return decisions.filter(d => d.status === 'approved');
    if (filter === 'rejected') return decisions.filter(d => d.status === 'rejected');
    if (filter === 'archived') return decisions.filter(d => d.is_archived);
    return decisions;
  };

  const filtered = filterDecisions();

  const filters = [
    { key: 'pending', label: 'Needs Decision', icon: '⏳' },
    { key: 'approved', label: 'Approved', icon: '✅' },
    { key: 'rejected', label: 'Rejected', icon: '❌' },
    { key: 'archived', label: 'Archived', icon: '📦' },
    { key: 'all', label: 'All', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-[#4a3fb5] flex flex-col pb-44 lg:pb-8">
      {/* Header */}
      <div className="px-6 pt-8 pb-6" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Family Decisions</h1>
            <p className="text-xs text-indigo-200 mt-0.5">Proposals, votes &amp; follow-ups</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 bg-white text-[#5B4FCF] font-semibold text-sm px-4 py-2 rounded-full shadow hover:bg-indigo-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Propose
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 pt-4 bg-[#5B4FCF] rounded-t-3xl shadow-inner flex-1">

        {decisions.length === 0 && (
          <div className="text-center py-20 text-indigo-200">
            <div className="text-4xl mb-3">🤝</div>
            <p className="font-medium text-white">No decisions yet</p>
            <p className="text-sm mt-1">Tap "Propose" to get started</p>
          </div>
        )}

        {filtered.length === 0 && decisions.length > 0 && (
          <div className="text-center py-12 text-indigo-200">
            <p className="font-medium text-white">No {filter === 'all' ? 'decisions' : filter} decisions</p>
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

      {/* Bottom filter dashboard */}
      <div className="fixed lg:relative bottom-0 left-0 right-0 bg-gradient-to-t from-[#5B4FCF] to-[#5B4FCF]/95 px-4 py-6">
        <div className="max-w-2xl mx-auto grid grid-cols-5 gap-3">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                filter === f.key
                  ? 'bg-white text-[#5B4FCF] shadow-lg scale-105'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <span className="text-2xl">{f.icon}</span>
              <span className="text-xs font-medium text-center leading-tight">{f.label}</span>
            </button>
          ))}
        </div>
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