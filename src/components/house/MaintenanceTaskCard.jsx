import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, User, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function MaintenanceTaskCard({ task, onSync, onComplete, onEdit }) {
  const [isExpanded, setIsExpanded] = useState(false);
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
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex-shrink-0">
            {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </div>
          <div className="flex-shrink-0">
            {getStatusIcon(task.status)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{task.title}</h3>
          </div>
          {task.next_due && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(task.next_due), 'MMM d')}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t space-y-4">
                {task.description && (
                  <p className="text-sm text-gray-600">{task.description}</p>
                )}

                <div className="flex flex-wrap gap-2">
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

                <div className="flex flex-col gap-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`sync-chore-${task.id}`}
                      checked={isSyncedToChore}
                      onCheckedChange={(e) => {
                        e?.stopPropagation?.();
                        if (!isSyncedToChore) onSync(task, 'chore');
                      }}
                      disabled={isSyncedToChore}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label 
                      htmlFor={`sync-chore-${task.id}`} 
                      className="text-sm cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isSyncedToChore ? 'Synced to To-Do' : 'Add to To-Do List'}
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`sync-cal-${task.id}`}
                      checked={isSyncedToCalendar}
                      onCheckedChange={(e) => {
                        e?.stopPropagation?.();
                        if (!isSyncedToCalendar) onSync(task, 'calendar');
                      }}
                      disabled={isSyncedToCalendar}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label 
                      htmlFor={`sync-cal-${task.id}`} 
                      className="text-sm cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isSyncedToCalendar ? 'Synced to Calendar' : 'Sync to Calendar'}
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  {task.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onComplete(task);
                      }}
                      className="flex-1"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}