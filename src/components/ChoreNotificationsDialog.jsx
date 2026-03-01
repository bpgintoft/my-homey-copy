import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from 'lucide-react';

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

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) dismissAllMutation.mutate(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Tasks Completed by Others
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-gray-500">The following co-assigned tasks were completed while you were away:</p>
          {notifications.map((n) => (
            <div key={n.id} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-4 py-3">
              <div>
                <p className="font-medium text-gray-900 text-sm">{n.chore_title}</p>
                <p className="text-xs text-gray-500">Completed by <span className="font-semibold">{n.triggering_member_name}</span></p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400 hover:text-gray-600"
                onClick={() => dismissOneMutation.mutate(n.id)}
              >
                Dismiss
              </Button>
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