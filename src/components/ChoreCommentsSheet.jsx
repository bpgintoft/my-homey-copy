import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Send } from 'lucide-react';
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
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
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

export default function ChoreCommentsSheet({ chore, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserMember, setCurrentUserMember] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      // Fetch current user's family member record for avatar lookup
      base44.entities.FamilyMember.filter({ email: u.email }).then(members => {
        if (members.length > 0) setCurrentUserMember(members[0]);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['choreComments', chore?.id],
    queryFn: () => base44.entities.ChoreComment.filter({ chore_id: chore.id }, '-created_date'),
    enabled: !!chore?.id && open,
  });

  const addCommentMutation = useMutation({
    mutationFn: (text) => base44.entities.ChoreComment.create({ chore_id: chore.id, text, author_name: currentUser?.full_name || '' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['choreComments', chore?.id]);
      queryClient.invalidateQueries(['choreCommentCounts']);
      setNewComment('');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.ChoreComment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['choreComments', chore?.id]);
      queryClient.invalidateQueries(['choreCommentCounts']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            💬 Comments
          </SheetTitle>
          {chore && <p className="text-sm text-gray-500 font-normal">{chore.title}</p>}
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-3 pb-2 border-b border-gray-100">
          <Textarea
            placeholder="Add a comment..."
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
        </form>

        <div className="flex-1 overflow-y-auto mt-3 space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <CommentAvatar authorName={comment.author_name} email={comment.created_by} familyMembers={familyMembers} currentUserEmail={currentUser?.email} currentUserMember={currentUserMember} />
                <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900">{renderTextWithLinks(comment.text)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(comment.created_date.endsWith('Z') ? comment.created_date : comment.created_date + 'Z'), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}