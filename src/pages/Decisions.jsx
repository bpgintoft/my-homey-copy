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
    <div className="min-h-screen bg-[#5B4FCF]">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 relative overflow-hidden">
        {/* Low-poly geometric facets */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 160">
          {/* Dark facets */}
          <polygon points="0,0 320,0 180,160 0,160"        fill="rgba(0,0,0,0.18)" />
          <polygon points="320,0 800,0 800,60 500,160 180,160" fill="rgba(0,0,0,0.08)" />
          <polygon points="500,0 800,0 800,60"              fill="rgba(0,0,0,0.22)" />
          <polygon points="0,0 160,0 80,160 0,80"           fill="rgba(255,255,255,0.04)" />
          <polygon points="600,160 800,60 800,160"          fill="rgba(0,0,0,0.15)" />
          <polygon points="200,0 500,0 350,160 100,160"     fill="rgba(255,255,255,0.03)" />
          {/* Glowing edge lines */}
          <line x1="320" y1="0" x2="180" y2="160" stroke="rgba(220,180,255,0.55)" strokeWidth="1.2" />
          <line x1="500" y1="0" x2="800" y2="60"  stroke="rgba(220,180,255,0.4)"  strokeWidth="0.8" />
          <line x1="500" y1="160" x2="800" y2="60" stroke="rgba(200,160,255,0.35)" strokeWidth="0.8" />
          <line x1="0"   y1="80"  x2="180" y2="160" stroke="rgba(220,180,255,0.25)" strokeWidth="0.7" />
        </svg>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Family Decisions</h1>
            <p className="text-sm text-indigo-200 mt-0.5">Proposals, votes, and follow-ups</p>
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

      <div className="max-w-2xl mx-auto px-4 pb-8 pt-2">
        <div className="mb-6 mx-2">
          <div className="border-t border-black/20" />
          <div className="border-t border-white/10" />
        </div>
        {decisions.length === 0 && (
          <div className="text-center py-20 text-indigo-200">
            <div className="text-4xl mb-3">🤝</div>
            <p className="font-medium text-white">No decisions yet</p>
            <p className="text-sm mt-1">Tap "Propose" to get started</p>
          </div>
        )}

        {pending.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3 px-1">Needs a Decision</h2>
            <div className="space-y-3">
              {pending.map(d => (
                <DecisionCard key={d.id} decision={d} onClick={setSelectedDecision} />
              ))}
            </div>
          </div>
        )}

        {resolved.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3 px-1">Resolved</h2>
            <div className="space-y-3">
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