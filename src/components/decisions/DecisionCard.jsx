import React from 'react';
import { format } from 'date-fns';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  needs_discussion: 'bg-blue-100 text-blue-700',
};

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_discussion: 'Discussing',
};

const voteEmoji = { yes: '✅', no: '❌', maybe: '🤔', '': '—' };

const voteBg = {
  yes: 'bg-green-500 text-white',
  no: 'bg-red-400 text-white',
  maybe: 'bg-amber-400 text-white',
  '': 'bg-gray-200 text-gray-500',
};

// Simple deterministic emoji icon based on title
const cardIcons = ['📋', '🏠', '🌴', '🐾', '🎟️', '🌟', '🍕', '🚗', '💡', '🎉'];
function getCardIcon(id) {
  if (!id) return '📋';
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  return cardIcons[hash % cardIcons.length];
}

export default function DecisionCard({ decision, onClick }) {
  const bryanVote = decision.bryan_vote || '';
  const kateVote = decision.kate_vote || '';
  const status = decision.status || 'pending';
  const icon = getCardIcon(decision.id);

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 cursor-pointer active:scale-[0.99] transition-transform"
      onClick={() => onClick(decision)}
    >
      {/* Top row: icon + title + status badge */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center text-2xl flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-base leading-snug">{decision.title}</h3>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${statusColors[status]}`}>
              {statusLabels[status]}
            </span>
          </div>
          {decision.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2 leading-snug">{decision.description}</p>
          )}
        </div>
      </div>

      {/* Bottom row: votes + comment count + date */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${voteBg[bryanVote]}`}>
            Bryan {voteEmoji[bryanVote] || '—'}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${voteBg[kateVote]}`}>
            Kate {voteEmoji[kateVote] || '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          {decision.comments?.length > 0 && (
            <span className="flex items-center gap-0.5">💬 {decision.comments.length}</span>
          )}
          {decision.created_date && (
            <span>{format(new Date(decision.created_date), 'MMM d')}</span>
          )}
        </div>
      </div>
    </div>
  );
}