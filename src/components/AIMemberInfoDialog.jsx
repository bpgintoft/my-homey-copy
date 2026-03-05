import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from 'lucide-react';

export default function AIMemberInfoDialog({ memberId, memberName, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!input.trim()) {
      setError('Please enter some information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await base44.functions.invoke('processFamilyMemberInfo', {
        familyMemberId: memberId,
        input: input.trim()
      });

      if (response.data?.success) {
        setInput('');
        setOpen(false);
        onSuccess?.();
      } else {
        setError(response.data?.error || 'Failed to process information');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:shadow-xl z-30"
          title={`Add info about ${memberName}`}
        >
          <Sparkles className="w-6 h-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Information for {memberName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Describe any information you want to add about {memberName}. Type, paste, or dictate details like medical info, contacts, school details, travel info, measurements, or anything else. AI will categorize it automatically.
          </p>
          <Textarea
            placeholder="Type or paste information here... (e.g., 'Blood type O+, wears size 7 shoes, allergic to peanuts...')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            className="w-full"
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add Information
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}