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
      <div className="px-6 pt-8 pb-6 relative overflow-hidden" style={{background: '#3d35a8'}}>
        {/* Radiating rays */}
        <div className="absolute inset-0" style={{
          background: 'conic-gradient(from 200deg at 110% 120%, transparent 0deg, rgba(120,100,255,0.18) 2deg, transparent 4deg, rgba(100,80,240,0.12) 6deg, transparent 8deg, rgba(130,110,255,0.15) 10deg, transparent 12deg, rgba(110,90,245,0.1) 14deg, transparent 16deg, rgba(120,100,255,0.18) 18deg, transparent 20deg, rgba(100,80,240,0.12) 22deg, transparent 24deg, rgba(130,110,255,0.15) 26deg, transparent 28deg, rgba(110,90,245,0.1) 30deg, transparent 32deg, rgba(120,100,255,0.18) 34deg, transparent 36deg, rgba(100,80,240,0.12) 38deg, transparent 40deg, rgba(130,110,255,0.15) 42deg, transparent 44deg, rgba(110,90,245,0.1) 46deg, transparent 48deg, rgba(120,100,255,0.18) 50deg, transparent 52deg, rgba(100,80,240,0.12) 54deg, transparent 56deg, rgba(130,110,255,0.15) 58deg, transparent 60deg, rgba(110,90,245,0.1) 62deg, transparent 64deg, rgba(120,100,255,0.18) 66deg, transparent 68deg, rgba(100,80,240,0.12) 70deg, transparent 72deg, transparent 360deg)',
        }} />
        {/* Glow orb */}
        <div className="absolute" style={{
          top: '-40%', right: '-10%',
          width: '60%', height: '200%',
          background: 'radial-gradient(ellipse, rgba(160,80,255,0.35) 0%, rgba(100,60,220,0.15) 40%, transparent 70%)',
          filter: 'blur(20px)',
        }} />
        {/* Subtle grid texture overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.025) 3px, rgba(255,255,255,0.025) 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.025) 3px, rgba(255,255,255,0.025) 4px)',
        }} />
        {/* Bottom fade to page bg */}
        <div className="absolute bottom-0 left-0 right-0 h-8" style={{background: 'linear-gradient(to bottom, transparent, #5B4FCF)'}} />
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