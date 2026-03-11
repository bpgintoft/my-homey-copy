import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from 'lucide-react';

const BRYAN_EMAIL = 'bpgintoft@gmail.com';
const KATE_EMAIL = 'kateeliz11@gmail.com';

const voteEmoji = { yes: '✅ Yes', no: '❌ No', maybe: '🤔 Maybe' };

export default function DecisionDialog({ decision, currentUserEmail, onSave, onDelete, onClose }) {
  const isBryan = currentUserEmail === BRYAN_EMAIL;
  const isKate = currentUserEmail === KATE_EMAIL;

  const [myVote, setMyVote] = useState(
    isBryan ? (decision.bryan_vote || '') : (decision.kate_vote || '')
  );
  const [myComment, setMyComment] = useState(
    isBryan ? (decision.bryan_comment || '') : (decision.kate_comment || '')
  );
  const [status, setStatus] = useState(decision.status || 'pending');

  const handleSave = () => {
    const updates = { status };
    if (isBryan) {
      updates.bryan_vote = myVote;
      updates.bryan_comment = myComment;
    } else if (isKate) {
      updates.kate_vote = myVote;
      updates.kate_comment = myComment;
    }
    onSave(decision.id, updates);
  };

  const otherName = isBryan ? 'Kate' : 'Bryan';
  const otherVote = isBryan ? decision.kate_vote : decision.bryan_vote;
  const otherComment = isBryan ? decision.kate_comment : decision.bryan_comment;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{decision.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {decision.description && (
            <p className="text-sm text-gray-600">{decision.description}</p>
          )}

          {/* Other person's response */}
          {(otherVote || otherComment) && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">{otherName}'s Response</p>
              {otherVote && (
                <p className="text-sm font-medium">{voteEmoji[otherVote] || otherVote}</p>
              )}
              {otherComment && (
                <p className="text-sm text-gray-700 mt-1">{otherComment}</p>
              )}
            </div>
          )}

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

          {/* My comment */}
          <div className="space-y-2">
            <Label>Your Comment (optional)</Label>
            <Textarea
              value={myComment}
              onChange={e => setMyComment(e.target.value)}
              placeholder="Add context, conditions, thoughts..."
              rows={3}
            />
          </div>

          {/* Status — only proposer or Bryan (admin) can set */}
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
            <Button onClick={handleSave} className="flex-1">Save Response</Button>
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