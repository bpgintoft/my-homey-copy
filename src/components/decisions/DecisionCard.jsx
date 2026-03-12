import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  needs_discussion: 'bg-blue-100 text-blue-800',
};

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved ✓',
  rejected: 'Rejected',
  needs_discussion: 'Needs Discussion',
};

const voteEmoji = { yes: '✅', no: '❌', maybe: '🤔', '': '—' };

export default function DecisionCard({ decision, onClick }) {
  const bryanVote = decision.bryan_vote || '';
  const kateVote = decision.kate_vote || '';
  const bothVoted = bryanVote && kateVote;

  return (
    <div
      className="cursor-pointer bg-[#6E63D8] hover:bg-[#7a6fe0] transition-all duration-200 rounded-3xl px-5 py-4 shadow-sm"
      onClick={() => onClick(decision)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-white text-sm leading-snug flex-1">{decision.title}</h3>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColors[decision.status] || statusColors.pending}`}>
          {statusLabels[decision.status] || 'Pending'}
        </span>
      </div>
      {decision.description && (
        <p className="text-xs text-indigo-200 mb-3 line-clamp-2">{decision.description}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1 text-xs text-white">
            Bryan {voteEmoji[bryanVote] || '—'}
          </span>
          <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1 text-xs text-white">
            Kate {voteEmoji[kateVote] || '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-indigo-200 text-xs">
          {decision.comments?.length > 0 && <span>💬 {decision.comments.length}</span>}
          <span>{decision.created_date ? format(new Date(decision.created_date), 'MMM d') : ''}</span>
        </div>
      </div>

    </div>
  );
}