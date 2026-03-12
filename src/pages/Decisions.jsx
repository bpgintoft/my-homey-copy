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
    <div className="min-h-screen bg-[#1a1035]">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 relative overflow-hidden bg-[#0d0820]">
        {/* Flowing wave layers */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 160" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="glow1" cx="40%" cy="60%" r="60%">
              <stop offset="0%" stopColor="#9b4dff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0d0820" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glow2" cx="75%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#c77dff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0d0820" stopOpacity="0" />
            </radialGradient>
            <filter id="wave-blur">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="#0d0820" />
          <rect width="100%" height="100%" fill="url(#glow1)" />
          <rect width="100%" height="100%" fill="url(#glow2)" />
          {/* Wave 1 - wide luminous sweep */}
          <path d="M-50,110 C100,40 250,130 400,70 C550,10 700,90 850,50 L850,180 L-50,180 Z"
            fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.5" filter="url(#wave-blur)" />
          {/* Wave 2 */}
          <path d="M-50,130 C120,70 280,150 430,90 C580,30 720,110 850,80 L850,180 L-50,180 Z"
            fill="none" stroke="#c084fc" strokeWidth="1" strokeOpacity="0.35" filter="url(#wave-blur)" />
          {/* Wave 3 - bright inner glow streak */}
          <path d="M-50,90 C80,20 200,110 380,55 C520,5 680,85 850,30"
            fill="none" stroke="#e0aaff" strokeWidth="2" strokeOpacity="0.4" filter="url(#wave-blur)" />
          {/* Soft shimmer fill under wave 1 */}
          <path d="M-50,110 C100,40 250,130 400,70 C550,10 700,90 850,50 L850,180 L-50,180 Z"
            fill="url(#glow1)" opacity="0.3" />
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