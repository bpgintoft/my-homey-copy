import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
    const updates = { status };
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
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug pr-6">{decision.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {decision.description && (
            <p className="text-sm text-gray-600">{decision.description}</p>
          )}

          {/* Votes row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Bryan</p>
              <p className="text-sm font-medium">{decision.bryan_vote ? voteEmoji[decision.bryan_vote] : '—'}</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Kate</p>
              <p className="text-sm font-medium">{decision.kate_vote ? voteEmoji[decision.kate_vote] : '—'}</p>
            </div>
          </div>

          {/* My vote */}
          <div className="space-y-2">
            <Label>Your Vote</Label>
            <div className="flex gap-2">
              {['yes', 'no', 'maybe'].map(v => (
                <Button
                  key={v}
                  size="sm"
                  variant={myVote === v ? 'default' : 'outline'}
                  onClick={() => setMyVote(v)}
                  className="flex-1"
                >
                  {voteEmoji[v]}
                </Button>
              ))}
            </div>
          </div>

          {/* Comments chat log */}
          {localComments.length > 0 && (
            <div className="space-y-2">
              <Label>Discussion</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                {localComments.map((c, i) => {
                  const isMe = c.commenter_email === currentUserEmail;
                  const isEditing = editingIndex === i;
                  return (
                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-xl px-3 py-2 max-w-[85%] w-full ${isMe ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                        <p className="text-xs font-semibold mb-0.5 opacity-70">{c.commenter_name}</p>
                        {isEditing ? (
                          <div className="space-y-1">
                            <Textarea
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              rows={2}
                              className="text-sm text-gray-900 bg-white"
                              style={{ fontSize: '16px' }}
                            />
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditingIndex(null); setEditingText(''); }}>
                                <X className="w-3 h-3" />
                              </Button>
                              <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleEditSave(i)}>
                                <Check className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-snug">{c.text}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 px-1">
                        <p className="text-xs text-gray-400">
                          {c.timestamp ? format(new Date(c.timestamp), 'MMM d, h:mm a') : ''}
                        </p>
                        {isMe && !isEditing && (
                          <>
                            <button onClick={() => { setEditingIndex(i); setEditingText(c.text); }} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                            <button onClick={() => handleDeleteComment(i)} className="text-xs text-gray-400 hover:text-red-500">Delete</button>
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
            <Label>{localComments.length > 0 ? 'Add a comment' : 'Comment (optional)'}</Label>
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add context, conditions, thoughts..."
              rows={2}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved ✓</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="needs_discussion">Needs Discussion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1 gap-1">
              <Send className="w-4 h-4" />
              Save
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {decision.proposer_email === currentUserEmail && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onDelete(decision.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}