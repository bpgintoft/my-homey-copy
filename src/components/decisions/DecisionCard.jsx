import React from 'react';
import { MessageCircle, Calendar } from 'lucide-react';

const statusConfig = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  needs_discussion: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
};

const voteDisplay = { yes: '✅', no: '—', maybe: '🤔' };

export default function DecisionCard({ decision, onClick }) {
  const status = decision.status || 'pending';
  const config = statusConfig[status];

  return (
    <div
      onClick={() => onClick(decision)}
      className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/30 transition-all border border-white/20"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-base">{decision.title}</h3>
          {decision.description && (
            <p className="text-xs text-gray-700 mt-1">{decision.description}</p>
          )}
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${config.bg} ${config.text}`}>
          ⏰ {config.label}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mt-4">
        <div className="flex gap-4">
          <div className="text-xs font-bold">
            <span className="text-gray-900">Bryan </span>
            <span className="text-base">{decision.bryan_vote ? voteDisplay[decision.bryan_vote] : '—'}</span>
          </div>
          <div className="text-xs font-bold">
            <span className="text-gray-900">Kate </span>
            <span className="text-base">{decision.kate_vote ? voteDisplay[decision.kate_vote] : '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-600">
          {decision.comments?.length > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{decision.comments.length}</span>
            </div>
          )}
          {decision.created_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(decision.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}