import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const isDecisionNotification = (n) =>
  n.chore_title?.toLowerCase().includes('decision') || n.chore_title?.toLowerCase().includes('proposed');

export default function ChoreNotificationsDialog({ memberId }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', memberId],
    queryFn: () => base44.entities.Notification.filter({ recipient_member_id: memberId, is_read: false }),
    enabled: !!memberId,
  });

  const dismissAllMutation = useMutation({
    mutationFn: () =>
      Promise.all(notifications.map(n => base44.entities.Notification.update(n.id, { is_read: true }))),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications', memberId]);
    },
  });

  const dismissOneMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications', memberId]);
    },
  });

  if (notifications.length === 0) return null;

  // Group by triggering member
  const grouped = notifications.reduce((acc, n) => {
    const key = n.triggering_member_name || 'Someone';
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <Dialog open={true} onOpenChange={(open) => { /* only dismiss via buttons */ }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Completed Since Your Last Visit
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {Object.entries(grouped).map(([name, items]) => (
            <div key={name}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Completed by {name}
              </p>
              <div className="space-y-2">
                {items.map((n) => (
                  <div key={n.id} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{n.chore_title}</p>
                      {n.completed_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDistanceToNow(new Date(n.completed_date), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <button
                      className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
                      onClick={() => dismissOneMutation.mutate(n.id)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => dismissAllMutation.mutate()} disabled={dismissAllMutation.isPending}>
            Dismiss All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}