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

export default function DecisionCard({ decision, onClick, hasUnread, familyMembers = [] }) {
  return (
    <div
      className="relative cursor-pointer transition-all duration-200 rounded-3xl px-5 py-4"
      style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)'}}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onClick={() => onClick(decision)}
    >
      {hasUnread && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-lg z-10">
          1
        </span>
      )}
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
          {familyMembers.map(m => {
            const vote = decision[`${m.name.toLowerCase()}_vote`] || '';
            return (
              <span key={m.id} className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1 text-xs text-white">
                {m.name} {voteEmoji[vote] || '—'}
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-indigo-200 text-xs">
          {decision.comments?.length > 0 && <span>💬 {decision.comments.length}</span>}
          <span>{decision.created_date ? format(new Date(decision.created_date), 'MMM d') : ''}</span>
        </div>
      </div>
    </div>
  );
}