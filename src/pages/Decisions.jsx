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

  const pending = decisions.filter(d => d.status === 'pending' || d.status === 'needs_discussion');
  const resolved = decisions.filter(d => d.status === 'approved' || d.status === 'rejected');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#5B4FCF] to-[#4a3fb5]">
      {/* Header with decorative dots */}
      <div className="px-6 pt-6 pb-8 relative overflow-hidden" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '30px 30px'}}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">Family Decisions</h1>
              <p className="text-sm text-indigo-200 mt-1">Proposals, votes &amp; follow-ups</p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-white text-[#5B4FCF] font-semibold text-base px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5" />
              Propose
            </button>
          </div>

          {/* Needs a Decision label */}
          {pending.length > 0 && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 mb-6">
              <span className="text-indigo-300">🔹</span>
              <span className="text-sm font-semibold text-white uppercase tracking-wide">Needs a Decision</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8 pt-4">

        {decisions.length === 0 && (
          <div className="text-center py-20 text-indigo-200">
            <div className="text-4xl mb-3">🤝</div>
            <p className="font-medium text-white">No decisions yet</p>
            <p className="text-sm mt-1">Tap "Propose" to get started</p>
          </div>
        )}

        {pending.length > 0 && (
          <div className="mb-8">
            <div className="space-y-3">
              {pending.map(d => (
                <DecisionCard key={d.id} decision={d} onClick={setSelectedDecision} />
              ))}
            </div>
          </div>
        )}

        {resolved.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-4 px-1">Resolved</h2>
            <div className="space-y-3 opacity-75">
              {resolved.map(d => (
                <DecisionCard key={d.id} decision={d} onClick={setSelectedDecision} />
              ))}
            </div>
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