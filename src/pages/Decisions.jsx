import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [resolvedOpen, setResolvedOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: decisions = [] } = useQuery({
    queryKey: ['familyDecisions'],
    queryFn: () => base44.entities.FamilyDecision.list('-created_date', 100),
  });

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

  const pending = decisions.filter(d => d.status === 'pending' || d.status === 'needs_discussion');
  const resolved = decisions.filter(d => d.status === 'approved' || d.status === 'rejected');

  return (
    <div className="min-h-screen bg-[#F0F2F8]">

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#b8f0d8] via-[#d4edff] to-[#e8d5ff] px-6 pt-8 pb-10">
        <div className="max-w-2xl mx-auto flex items-end justify-between">
          <div className="z-10">
            <h1 className="text-3xl font-extrabold text-gray-800 leading-tight">Family<br/>Decisions</h1>
            <p className="text-sm text-gray-600 mt-1">Proposals, votes<br/>&amp; follow-ups</p>
          </div>
          {/* Decorative cartoon family illustration placeholder */}
          <div className="text-6xl select-none mr-2">👨‍👩‍👧‍👦</div>
        </div>
        {/* Decorative bubbles */}
        <div className="absolute top-4 right-20 text-2xl opacity-60">💬</div>
        <div className="absolute top-10 right-10 text-xl opacity-40">💬</div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-4 pb-24">

        {/* Pending Section */}
        {pending.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-[#6B7EC8] uppercase tracking-widest">Needs a Decision</span>
              <ChevronDown className="w-4 h-4 text-[#6B7EC8]" />
            </div>
            <div className="space-y-3">
              {pending.map(d => (
                <DecisionCard key={d.id} decision={d} onClick={setSelectedDecision} />
              ))}
            </div>
          </div>
        )}

        {/* Resolved Section */}
        {resolved.length > 0 && (
          <div className="mb-4">
            <button
              className="flex items-center justify-between w-full mb-3 px-1"
              onClick={() => setResolvedOpen(o => !o)}
            >
              <span className="text-xs font-bold text-[#6B7EC8] uppercase tracking-widest">Resolved</span>
              {resolvedOpen ? <ChevronUp className="w-4 h-4 text-[#6B7EC8]" /> : <ChevronDown className="w-4 h-4 text-[#6B7EC8]" />}
            </button>
            {resolvedOpen && (
              <div className="space-y-3">
                {resolved.map(d => (
                  <DecisionCard key={d.id} decision={d} onClick={setSelectedDecision} />
                ))}
              </div>
            )}
          </div>
        )}

        {decisions.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🤝</div>
            <p className="font-medium text-gray-600">No decisions yet</p>
            <p className="text-sm mt-1">Tap "Propose" to get started</p>
          </div>
        )}
      </div>

      {/* Floating Propose Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-[#5B4FCF] text-white font-semibold text-sm px-5 py-3 rounded-full shadow-lg hover:bg-[#4a3fb5] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Propose
        </button>
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