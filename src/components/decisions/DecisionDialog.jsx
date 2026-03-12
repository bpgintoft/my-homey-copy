import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Send, Pencil, X, Check } from 'lucide-react';
import { format } from 'date-fns';

const BRYAN_EMAIL = 'bpgintoft@gmail.com';
const KATE_EMAIL = 'kateeliz11@gmail.com';

const voteEmoji = { yes: '✅ Yes', no: '❌ No', maybe: '🤔 Maybe' };

export default function DecisionDialog({ decision, currentUserEmail, onSave, onDelete, onClose }) {
  const isBryan = currentUserEmail === BRYAN_EMAIL;
  const isKate = currentUserEmail === KATE_EMAIL;
  const myName = isBryan ? 'Bryan' : 'Kate';

  const [myVote, setMyVote] = useState(
    isBryan ? (decision.bryan_vote || '') : (decision.kate_vote || '')
  );
  const [status, setStatus] = useState(decision.status || 'pending');
  const [newComment, setNewComment] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [localComments, setLocalComments] = useState(decision.comments || []);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localComments.length]);

  const handleSave = () => {
    const bryantVote = isBryan ? myVote : decision.bryan_vote;
    const kateVote = isKate ? myVote : decision.kate_vote;
    
    // Auto-update status: if both voted yes, move to needs_action
    let finalStatus = status;
    if (bryantVote === 'yes' && kateVote === 'yes' && status === 'pending') {
      finalStatus = 'needs_action';
    }
    
    // Auto-archive: if status is completed, archive it
    let isArchived = decision.is_archived;
    if (finalStatus === 'completed') {
      isArchived = true;
      finalStatus = 'completed';
    }

    const updates = { status: finalStatus, is_archived: isArchived, last_updated_by_email: currentUserEmail };
    if (isBryan) updates.bryan_vote = myVote;
    else if (isKate) updates.kate_vote = myVote;

    let updatedComments = [...localComments];
    if (newComment.trim()) {
      updatedComments = [
        ...updatedComments,
        {
          commenter_email: currentUserEmail,
          commenter_name: myName,
          text: newComment.trim(),
          timestamp: new Date().toISOString(),
        }
      ];
    }
    updates.comments = updatedComments;
    onSave(decision.id, updates);
  };

  const handleEditSave = (i) => {
    if (!editingText.trim()) return;
    const updated = localComments.map((c, idx) =>
      idx === i ? { ...c, text: editingText.trim() } : c
    );
    setLocalComments(updated);
    setEditingIndex(null);
    setEditingText('');
  };

  const handleDeleteComment = (i) => {
    setLocalComments(localComments.filter((_, idx) => idx !== i));
  };

  const otherVote = isBryan ? decision.kate_vote : decision.bryan_vote;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden p-0 border-0 rounded-3xl bg-[#5B4FCF]">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base leading-snug text-white pr-6">{decision.title}</DialogTitle>
          {decision.description && (
            <p className="text-sm text-indigo-200 mt-0.5">{decision.description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-5 pb-2">
          {/* Votes row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-xs text-indigo-200 mb-1">Bryan</p>
              <p className="text-sm font-medium text-white">{decision.bryan_vote ? voteEmoji[decision.bryan_vote] : '—'}</p>
            </div>
            <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-xs text-indigo-200 mb-1">Kate</p>
              <p className="text-sm font-medium text-white">{decision.kate_vote ? voteEmoji[decision.kate_vote] : '—'}</p>
            </div>
          </div>

          {/* My vote */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Your Vote</p>
            <div className="flex gap-2">
              {['yes', 'no', 'maybe'].map(v => (
                <button
                  key={v}
                  onClick={() => setMyVote(v)}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors border-2 ${
                    myVote === v
                      ? 'bg-white text-[#5B4FCF] border-white shadow-lg scale-105'
                      : 'bg-transparent text-white/60 border-white/20 hover:border-white/50 hover:text-white'
                  }`}
                >
                  {voteEmoji[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Comments chat log */}
          {localComments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Discussion</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {localComments.map((c, i) => {
                  const isMe = c.commenter_email === currentUserEmail;
                  const isEditing = editingIndex === i;
                  return (
                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-2xl px-3 py-2 max-w-[85%] ${isMe ? 'bg-white text-[#5B4FCF]' : 'bg-white/20 text-white'}`}>
                        <p className={`text-xs font-semibold mb-0.5 ${isMe ? 'text-indigo-400' : 'text-indigo-200'}`}>{c.commenter_name}</p>
                        {isEditing ? (
                          <div className="space-y-1">
                            <Textarea
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              rows={2}
                              className="text-sm text-gray-900 bg-white border-0"
                              style={{ fontSize: '16px' }}
                            />
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-gray-500" onClick={() => { setEditingIndex(null); setEditingText(''); }}>
                                <X className="w-3 h-3" />
                              </Button>
                              <Button size="sm" className="h-6 px-2 text-xs bg-[#5B4FCF] text-white" onClick={() => handleEditSave(i)}>
                                <Check className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-snug">{c.text}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 px-1">
                        <p className="text-xs text-indigo-300">
                          {c.timestamp ? format(new Date(c.timestamp), 'MMM d, h:mm a') : ''}
                        </p>
                        {isMe && !isEditing && (
                          <>
                            <button onClick={() => { setEditingIndex(i); setEditingText(c.text); }} className="text-xs text-indigo-300 hover:text-white">Edit</button>
                            <button onClick={() => handleDeleteComment(i)} className="text-xs text-indigo-300 hover:text-red-300">Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>
            </div>
          )}

          {/* New comment input */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">{localComments.length > 0 ? 'Add a comment' : 'Comment (optional)'}</p>
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add context, conditions, thoughts..."
              rows={2}
              className="bg-white/15 border-0 text-white placeholder:text-indigo-300 rounded-2xl"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Status</p>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white/15 border-0 text-white rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="needs_action">Needs Action</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2 pb-4">
            <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 bg-white text-[#5B4FCF] font-semibold py-2.5 rounded-full hover:bg-indigo-50 transition-colors">
              <Send className="w-4 h-4" />
              Save
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-full bg-white/15 text-white font-medium hover:bg-white/25 transition-colors text-sm">Cancel</button>
            {decision.proposer_email === currentUserEmail && (
              <button onClick={() => onDelete(decision.id)} className="p-2.5 rounded-full bg-red-400/30 text-red-200 hover:bg-red-400/50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}