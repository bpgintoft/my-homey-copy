import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  CheckCircle2, Clock, Youtube, ExternalLink, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';

export default function MaintenanceCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchingVideo, setSearchingVideo] = useState(false);

  const queryClient = useQueryClient();

  const { data: tasks } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: () => base44.entities.MaintenanceTask.list(),
  });

  const { data: familyMembers } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const { data: appliances } = useQuery({
    queryKey: ['appliances'],
    queryFn: () => base44.entities.RoomItem.filter({ type: 'appliance' }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTasks'] });
      setSelectedTask(null);
    },
  });

  const memberMap = familyMembers?.reduce((acc, m) => ({ ...acc, [m.id]: m }), {}) || {};

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Pad start to begin on Sunday
    const startDay = start.getDay();
    const paddingStart = Array(startDay).fill(null);
    
    return [...paddingStart, ...days];
  }, [currentMonth]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped = {};
    tasks?.forEach(task => {
      if (task.next_due) {
        const dateKey = format(parseISO(task.next_due), 'yyyy-MM-dd');
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Auto-generated maintenance from appliances
  const applianceMaintenance = useMemo(() => {
    const maintenance = [];
    appliances?.forEach(appliance => {
      if (appliance.maintenance_interval_months && appliance.last_maintenance_date) {
        const nextDue = new Date(appliance.last_maintenance_date);
        nextDue.setMonth(nextDue.getMonth() + appliance.maintenance_interval_months);
        maintenance.push({
          id: `appliance-${appliance.id}`,
          title: `${appliance.name} Maintenance`,
          description: appliance.maintenance_notes || `Regular maintenance for ${appliance.brand} ${appliance.model}`,
          next_due: format(nextDue, 'yyyy-MM-dd'),
          category: 'appliances',
          appliance_name: `${appliance.brand} ${appliance.model}`,
          isAuto: true,
        });
      }
    });
    return maintenance;
  }, [appliances]);

  // Combine all tasks
  const allTasksByDate = useMemo(() => {
    const combined = { ...tasksByDate };
    applianceMaintenance.forEach(task => {
      const dateKey = task.next_due;
      if (!combined[dateKey]) combined[dateKey] = [];
      combined[dateKey].push(task);
    });
    return combined;
  }, [tasksByDate, applianceMaintenance]);

  const handleMarkComplete = async (task) => {
    if (task.isAuto) return; // Can't mark auto-generated as complete here
    
    const today = format(new Date(), 'yyyy-MM-dd');
    let nextDue = null;
    
    if (task.frequency) {
      const d = new Date();
      switch (task.frequency) {
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'quarterly': d.setMonth(d.getMonth() + 3); break;
        case 'semi-annually': d.setMonth(d.getMonth() + 6); break;
        case 'annually': d.setFullYear(d.getFullYear() + 1); break;
      }
      nextDue = format(d, 'yyyy-MM-dd');
    }

    await updateTaskMutation.mutateAsync({
      id: task.id,
      data: { status: 'completed', last_completed: today, next_due: nextDue }
    });
  };

  const searchYouTubeVideo = async (task) => {
    setSearchingVideo(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the best YouTube tutorial video for: "${task.title}" home maintenance task. ${task.appliance_name ? `For appliance: ${task.appliance_name}` : ''}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          video_url: { type: "string" },
          video_title: { type: "string" },
          found: { type: "boolean" }
        }
      }
    });
    
    if (result.found && result.video_url && !task.isAuto) {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        data: { youtube_url: result.video_url }
      });
    } else if (result.video_url) {
      window.open(result.video_url, '_blank');
    }
    setSearchingVideo(false);
  };

  const priorityColors = {
    low: 'bg-slate-400',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-12">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-emerald-200 mb-3">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Schedule</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Maintenance Calendar</h1>
            <p className="text-emerald-100">All your tasks and appliance maintenance in one view</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Card className="border-0 shadow-xl">
          {/* Calendar Header */}
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-2xl">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <Button variant="ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="min-h-[100px] bg-slate-50 rounded-lg" />;
                }
                
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayTasks = allTasksByDate[dateKey] || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);

                return (
                  <div 
                    key={dateKey}
                    className={`min-h-[100px] p-2 rounded-lg border transition-colors ${
                      isCurrentDay ? 'bg-emerald-50 border-emerald-300' :
                      isCurrentMonth ? 'bg-white border-slate-200 hover:border-slate-300' :
                      'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentDay ? 'text-emerald-700' :
                      isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <button
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={`w-full text-left text-xs p-1 rounded truncate ${
                            task.isAuto ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                          } hover:opacity-80 transition-opacity`}
                        >
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priorityColors[task.priority] || 'bg-slate-400'}`} />
                          {task.title}
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-slate-500 pl-1">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-6 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-3 h-3 rounded bg-emerald-100" />
                Manual Tasks
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-3 h-3 rounded bg-purple-100" />
                Auto from Appliances
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Modal */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedTask.isAuto && (
                    <Badge className="bg-purple-100 text-purple-700">Auto-Generated</Badge>
                  )}
                  {selectedTask.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {selectedTask.description && (
                  <p className="text-slate-600">{selectedTask.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedTask.next_due && (
                    <div>
                      <span className="text-slate-500">Due Date:</span>
                      <p className="font-medium">{format(parseISO(selectedTask.next_due), 'MMMM d, yyyy')}</p>
                    </div>
                  )}
                  {selectedTask.category && (
                    <div>
                      <span className="text-slate-500">Category:</span>
                      <p className="font-medium capitalize">{selectedTask.category}</p>
                    </div>
                  )}
                  {selectedTask.frequency && (
                    <div>
                      <span className="text-slate-500">Frequency:</span>
                      <p className="font-medium capitalize">{selectedTask.frequency}</p>
                    </div>
                  )}
                  {selectedTask.assigned_to && memberMap[selectedTask.assigned_to] && (
                    <div>
                      <span className="text-slate-500">Assigned To:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: memberMap[selectedTask.assigned_to].color || '#64748b' }}
                        >
                          {memberMap[selectedTask.assigned_to].name?.charAt(0)}
                        </div>
                        <span className="font-medium">{memberMap[selectedTask.assigned_to].name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedTask.appliance_name && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm text-purple-700">Related Appliance:</span>
                    <p className="font-medium text-purple-900">{selectedTask.appliance_name}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {selectedTask.youtube_url ? (
                    <a href={selectedTask.youtube_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">
                        <Youtube className="w-4 h-4 mr-2 text-red-600" />
                        Watch Tutorial
                      </Button>
                    </a>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => searchYouTubeVideo(selectedTask)}
                      disabled={searchingVideo}
                    >
                      <Youtube className="w-4 h-4 mr-2 text-red-600" />
                      {searchingVideo ? 'Searching...' : 'Find Tutorial'}
                    </Button>
                  )}
                  
                  {!selectedTask.isAuto && (
                    <Button 
                      onClick={() => handleMarkComplete(selectedTask)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}