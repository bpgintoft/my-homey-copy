import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, User, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function MaintenanceTaskCard({ task, onSync, onComplete, onEdit }) {
  const getCategoryColor = (category) => {
    const colors = {
      hvac: 'bg-orange-100 text-orange-700',
      plumbing: 'bg-blue-100 text-blue-700',
      electrical: 'bg-yellow-100 text-yellow-700',
      exterior: 'bg-green-100 text-green-700',
      interior: 'bg-purple-100 text-purple-700',
      appliances: 'bg-pink-100 text-pink-700',
      safety: 'bg-red-100 text-red-700',
      seasonal: 'bg-teal-100 text-teal-700',
      landscaping: 'bg-emerald-100 text-emerald-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600'
    };
    return colors[priority] || 'bg-gray-100 text-gray-600';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const isSyncedToChore = !!task.synced_chore_id;
  const isSyncedToCalendar = !!task.synced_google_event_id;

  return (
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {getStatusIcon(task.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">{task.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(task)}
                className="text-xs h-7"
              >
                Edit
              </Button>
            </div>
            
            {task.description && (
              <p className="text-sm text-gray-600 mb-3">{task.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className={getCategoryColor(task.category)}>
                {task.category}
              </Badge>
              {task.priority && (
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              )}
              {task.frequency && (
                <Badge variant="outline" className="text-xs">
                  {task.frequency}
                </Badge>
              )}
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              {task.next_due && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {format(new Date(task.next_due), 'MMM d, yyyy')}</span>
                </div>
              )}
              {task.assigned_name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Assigned to: {task.assigned_name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`sync-chore-${task.id}`}
                  checked={isSyncedToChore}
                  onCheckedChange={() => !isSyncedToChore && onSync(task, 'chore')}
                  disabled={isSyncedToChore}
                />
                <label 
                  htmlFor={`sync-chore-${task.id}`} 
                  className="text-sm cursor-pointer"
                >
                  {isSyncedToChore ? 'Synced to To-Do' : 'Add to To-Do List'}
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`sync-cal-${task.id}`}
                  checked={isSyncedToCalendar}
                  onCheckedChange={() => !isSyncedToCalendar && onSync(task, 'calendar')}
                  disabled={isSyncedToCalendar}
                />
                <label 
                  htmlFor={`sync-cal-${task.id}`} 
                  className="text-sm cursor-pointer"
                >
                  {isSyncedToCalendar ? 'Synced to Calendar' : 'Sync to Calendar'}
                </label>
              </div>
            </div>

            {task.status !== 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onComplete(task)}
                className="mt-3 w-full"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark as Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}