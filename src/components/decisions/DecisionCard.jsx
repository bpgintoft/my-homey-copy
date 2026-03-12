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
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-100 bg-white rounded-2xl shadow-sm"
      onClick={() => onClick(decision)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1">{decision.title}</h3>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColors[decision.status] || statusColors.pending}`}>
            {statusLabels[decision.status] || 'Pending'}
          </span>
        </div>
        {decision.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{decision.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1 text-xs text-gray-600">
              Bryan <span className="font-medium">{voteEmoji[bryanVote] || '—'}</span>
            </span>
            <span className="inline-flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1 text-xs text-gray-600">
              Kate <span className="font-medium">{voteEmoji[kateVote] || '—'}</span>
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {decision.created_date ? format(new Date(decision.created_date), 'MMM d') : ''}
          </span>
        </div>
        {(decision.proposer_name || decision.comments?.length > 0) && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            {decision.proposer_name && (
              <p className="text-xs text-gray-400">by {decision.proposer_name}</p>
            )}
            {decision.comments?.length > 0 && (
              <p className="text-xs text-gray-400">💬 {decision.comments.length}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}