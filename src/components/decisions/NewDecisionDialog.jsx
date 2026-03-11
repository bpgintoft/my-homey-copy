import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NewDecisionDialog({ proposerEmail, proposerName, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      proposer_email: proposerEmail,
      proposer_name: proposerName,
      status: 'pending',
      bryan_vote: '',
      kate_vote: '',
      bryan_comment: '',
      kate_comment: '',
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md top-4 translate-y-0">
        <DialogHeader>
          <DialogTitle>Propose a Decision</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Question / Topic *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Should we do a family season pass?"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>More Details (optional)</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add any context, links, prices, etc."
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={!title.trim()} className="flex-1">
              Submit
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}