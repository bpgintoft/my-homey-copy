import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Send, TrendingUp, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getCommentAuthorMember } from '@/lib/getCommentAuthorMember';

const AVATAR_COLORS = ['bg-blue-400', 'bg-green-400', 'bg-pink-400', 'bg-purple-400', 'bg-orange-400', 'bg-teal-400'];

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderTextWithLinks(text) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
          {part}
        </a>
      );
    }
    return part ? <span key={i}>{part}</span> : null;
  });
}

function CommentAvatar({ authorName, email, familyMembers, currentUserEmail, currentUserMember }) {
  const member = getCommentAuthorMember(email, authorName, currentUserEmail, currentUserMember, familyMembers);
  const displayName = member?.name || authorName || email?.split('@')[0] || '?';
  const initials = displayName.trim().split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colorIndex = Math.abs(displayName.charCodeAt(0) || 0) % AVATAR_COLORS.length;

  if (member?.photo_url) {
    return <img src={member.photo_url} alt={displayName} title={displayName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div title={displayName} className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[colorIndex]}`}>
      {initials}
    </div>
  );
}

// Per-member banner gradient colors (matches FamilyMemberPage MEMBER_CONFIG)
const MEMBER_BANNER_COLORS = {
  Bryan:   { solid: '#3B82F6', light: 'rgba(96,165,250,0.18)',  border: 'rgba(59,130,246,0.5)',  line: 'rgba(59,130,246,0.35)' },
  Kate:    { solid: '#34D399', light: 'rgba(110,231,183,0.18)', border: 'rgba(52,211,153,0.5)',  line: 'rgba(52,211,153,0.35)' },
  Phoenix: { solid: '#F97316', light: 'rgba(251,146,60,0.18)',  border: 'rgba(249,115,22,0.5)',  line: 'rgba(249,115,22,0.35)' },
  Mara:    { solid: '#FFB6C1', light: 'rgba(255,182,193,0.18)', border: 'rgba(255,150,170,0.5)', line: 'rgba(255,150,170,0.35)' },
};

function getMemberBannerColor(familyMembers, authorName, email, currentUserEmail, currentUserMember) {
  const member = getCommentAuthorMember(email, authorName, currentUserEmail, currentUserMember, familyMembers);
  return member?.name ? (MEMBER_BANNER_COLORS[member.name] || null) : null;
}

// Convert a hex color to a very light tinted background (20% opacity approximation)
function hexToLightBg(hex) {
  if (!hex) return '#f3f4f6';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

function hexToBorderColor(hex) {
  if (!hex) return '#d1d5db';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.55)`;
}

// Progress timeline bar across the top
function ProgressTimeline({ progressUpdates, onClickNode, familyMembers, currentUserEmail, currentUserMember, assignedMemberName }) {
  const nodes = [
    { type: 'start' },
    ...progressUpdates.map((p, i) => ({ type: 'progress', index: i, comment: p })),
    { type: 'end' },
  ];

  // Use the chore's assigned member banner color as the primary palette
  const assignedColors = MEMBER_BANNER_COLORS[assignedMemberName] || null;

  const lastProgressI = (() => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].type === 'progress') return i;
    }
    return -1;
  })();

  return (
    <div className="w-full px-2 py-3">
      <div className="flex items-start w-full">
        {nodes.map((node, i) => {
          const isLast = i === nodes.length - 1;
          const isFirst = i === 0;
          const isHighlighted = node.type === 'progress' && i === lastProgressI;

          // For progress nodes, get the author's banner color (fallback to assigned member color)
          let nodeColors = assignedColors;
          if (node.type === 'progress' && node.comment) {
            const member = getCommentAuthorMember(
              node.comment.created_by,
              node.comment.author_name,
              currentUserEmail,
              currentUserMember,
              familyMembers
            );
            if (member?.name && MEMBER_BANNER_COLORS[member.name]) {
              nodeColors = MEMBER_BANNER_COLORS[member.name];
            }
          }

          const circleStyle = isFirst
            ? { borderColor: assignedColors?.solid || '#9ca3af', backgroundColor: assignedColors?.solid || '#9ca3af' }
            : isLast
            ? { borderColor: '#d1d5db', backgroundColor: 'white' }
            : isHighlighted
            ? { borderColor: nodeColors?.solid || '#6b7280', backgroundColor: nodeColors?.solid || '#6b7280' }
            : { borderColor: nodeColors?.border || '#d1d5db', backgroundColor: nodeColors?.light || '#f3f4f6' };

          const labelStyle = isFirst
            ? { color: assignedColors?.solid || '#6b7280' }
            : isLast
            ? { color: '#d1d5db' }
            : isHighlighted
            ? { color: nodeColors?.solid || '#6b7280', fontWeight: 600 }
            : { color: '#9ca3af' };

          const circleEl = (
            <button
              key={`node-${i}`}
              onClick={() => node.type === 'progress' && onClickNode(node.comment.id)}
              className={`flex flex-col items-center ${node.type === 'progress' ? 'cursor-pointer' : 'cursor-default'}`}
              style={{ flexShrink: 0, width: 52 }}
            >
              <div
                className="rounded-full border-2 w-5 h-5 flex items-center justify-center transition-all"
                style={circleStyle}
              >
                {(isFirst || isHighlighted) && (
                  <div className="w-2 h-2 rounded-full bg-white opacity-90" />
                )}
              </div>
              <span
                className="text-center leading-tight mt-1 break-words"
                style={{ fontSize: '9px', width: 52, ...labelStyle }}
              >
                {isFirst ? 'Incomplete' : isLast ? 'Complete' : `Update ${node.index + 1}`}
              </span>
            </button>
          );

          if (isLast) return circleEl;

          return (
            <React.Fragment key={`frag-${i}`}>
              {circleEl}
              <div
                className="flex-1 mt-2.5"
                style={{
                  height: 2,
                  minWidth: 6,
                  backgroundColor: assignedColors?.line || '#e5e7eb',
                  borderRadius: 1,
                }}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function ChoreCommentsSheet({ chore, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [isProgressUpdate, setIsProgressUpdate] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserMember, setCurrentUserMember] = useState(null);
  const [editingDueDate, setEditingDueDate] = useState(null);
  const chatEndRef = useRef(null);
  const commentRefs = useRef({});
  const dueDateInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      base44.entities.FamilyMember.filter({ email: u.email }).then(members => {
        if (members.length > 0) setCurrentUserMember(members[0]);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (chore) setEditingDueDate(chore.next_due || '');
  }, [chore?.id]);

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['choreComments', chore?.id],
    queryFn: async () => {
      if (!chore?.id) return [];
      const choreIds = [chore.id, ...(chore.linked_chore_ids || [])];
      const allComments = await Promise.all(
        choreIds.map(id => base44.entities.ChoreComment.filter({ chore_id: id }, '-created_date'))
      );
      return allComments.flat().sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!chore?.id && open,
  });

  // Separate progress updates (in chronological order)
  const progressUpdates = comments.filter(c => c.is_progress_update);

  // n progress updates → progress = n/(n+1) * 100, rounded
  const calcProgressFromUpdateCount = (n) => Math.round((n / (n + 1)) * 100);

  const updateChoreProgress = async (newProgressUpdateCount) => {
    if (!chore?.id) return;
    const newProgress = calcProgressFromUpdateCount(newProgressUpdateCount);
    await base44.entities.Chore.update(chore.id, { progress: newProgress });
    if (chore.linked_chore_ids?.length) {
      await Promise.all(chore.linked_chore_ids.map(id => base44.entities.Chore.update(id, { progress: newProgress })));
    }
    queryClient.invalidateQueries(['chores']);
  };

  const addCommentMutation = useMutation({
    mutationFn: async ({ text, isProgress }) => {
      await base44.entities.ChoreComment.create({
        chore_id: chore.id,
        text,
        author_name: currentUser?.full_name || '',
        is_progress_update: isProgress,
      });
      if (isProgress) {
        await updateChoreProgress(progressUpdates.length + 1);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['choreComments', chore?.id]);
      queryClient.invalidateQueries(['choreCommentCounts']);
      setNewComment('');
      setIsProgressUpdate(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async ({ id, isProgress }) => {
      await base44.entities.ChoreComment.delete(id);
      if (isProgress) {
        const newCount = Math.max(0, progressUpdates.length - 1);
        await updateChoreProgress(newCount);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['choreComments', chore?.id]);
      queryClient.invalidateQueries(['choreCommentCounts']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ text: newComment.trim(), isProgress: isProgressUpdate });
  };

  const scrollToComment = (commentId) => {
    const el = commentRefs.current[commentId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight
      el.classList.add('ring-2', 'ring-offset-1');
      setTimeout(() => el.classList.remove('ring-2', 'ring-offset-1'), 1500);
    }
  };

  const handleSaveDueDate = async () => {
    if (!chore?.id) return;
    await base44.entities.Chore.update(chore.id, { next_due: editingDueDate || null });
    if (chore.linked_chore_ids?.length) {
      await Promise.all(chore.linked_chore_ids.map(id => base44.entities.Chore.update(id, { next_due: editingDueDate || null })));
    }
    queryClient.invalidateQueries(['chores']);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            📋 Progress & Updates
          </SheetTitle>
          {chore && <p className="text-sm text-gray-500 font-normal">{chore.title}</p>}
        </SheetHeader>

        {/* Progress Timeline */}
        <div className="border-b border-gray-100 pb-1">
          <ProgressTimeline
            progressUpdates={progressUpdates}
            onClickNode={scrollToComment}
            familyMembers={familyMembers}
            currentUserEmail={currentUser?.email}
            currentUserMember={currentUserMember}
            assignedMemberName={chore?.assigned_to_name}
          />
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto mt-2 space-y-3 px-1">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No updates yet. Be the first!</p>
          ) : (
            comments.map((comment) => {
              const member = getCommentAuthorMember(
                comment.created_by,
                comment.author_name,
                currentUser?.email,
                currentUserMember,
                familyMembers
              );
              const memberColor = member?.color || null;

              if (comment.is_progress_update) {
                return (
                  <div
                    key={comment.id}
                    ref={el => commentRefs.current[comment.id] = el}
                    className="flex items-start gap-2 transition-all duration-300"
                  >
                    <CommentAvatar
                      authorName={comment.author_name}
                      email={comment.created_by}
                      familyMembers={familyMembers}
                      currentUserEmail={currentUser?.email}
                      currentUserMember={currentUserMember}
                    />
                    <div
                      className="flex-1 min-w-0 rounded-lg p-3 text-sm border"
                      style={{
                        backgroundColor: memberColor ? hexToLightBg(memberColor) : '#f0fdf4',
                        borderColor: memberColor ? hexToBorderColor(memberColor) : '#bbf7d0',
                      }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="w-3 h-3 flex-shrink-0" style={{ color: memberColor || '#16a34a' }} />
                        <span className="text-xs font-semibold" style={{ color: memberColor || '#15803d' }}>
                          Progress Update
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900">{renderTextWithLinks(comment.text)}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {comment.author_name} · {formatDistanceToNow(new Date(comment.created_date.endsWith('Z') ? comment.created_date : comment.created_date + 'Z'), { addSuffix: true })}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteCommentMutation.mutate({ id: comment.id, isProgress: true })}
                          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={comment.id}
                  ref={el => commentRefs.current[comment.id] = el}
                  className="flex items-start gap-2 transition-all duration-300"
                >
                  <CommentAvatar
                    authorName={comment.author_name}
                    email={comment.created_by}
                    familyMembers={familyMembers}
                    currentUserEmail={currentUser?.email}
                    currentUserMember={currentUserMember}
                  />
                  <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900">{renderTextWithLinks(comment.text)}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {comment.author_name} · {formatDistanceToNow(new Date(comment.created_date.endsWith('Z') ? comment.created_date : comment.created_date + 'Z'), { addSuffix: true })}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteCommentMutation.mutate({ id: comment.id, isProgress: false })}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Due Date Section */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-600">Due Date:</span>
            <div className="relative flex-1">
              {!editingDueDate && (
                <div className="absolute inset-0 flex items-center text-gray-400 pointer-events-none pl-2 text-xs">
                  Set a date
                </div>
              )}
              <input
                ref={dueDateInputRef}
                type="date"
                value={editingDueDate}
                onChange={(e) => setEditingDueDate(e.target.value)}
                onBlur={handleSaveDueDate}
                min={new Date().toISOString().split('T')[0]}
                className="relative w-full px-2 py-1.5 text-xs border border-gray-200 rounded bg-white text-gray-700 cursor-pointer"
                style={{ colorScheme: 'light' }}
              />
            </div>
            {editingDueDate && (
              <button
                onClick={() => {
                  setEditingDueDate('');
                  handleSaveDueDate();
                }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Input form */}
        <div className="pt-3 border-t border-gray-100">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Textarea
                placeholder={isProgressUpdate ? "Describe your progress..." : "Add a comment..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="flex-1 resize-none"
                style={{ fontSize: '16px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={!newComment.trim() || addCommentMutation.isPending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={isProgressUpdate}
                onChange={(e) => setIsProgressUpdate(e.target.checked)}
                className="w-4 h-4 rounded accent-gray-600 cursor-pointer"
              />
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Mark as Progress Update
              </span>
            </label>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}