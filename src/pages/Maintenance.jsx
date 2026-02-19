import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Wrench,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Lightbulb,
  Loader2,
  ChevronDown,
  ChevronUp,
  CalendarPlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, AnimatePresence } from 'framer-motion';

export default function Maintenance() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '', description: '', category: 'seasonal', frequency: 'annually',
    season: 'any', priority: 'medium', next_due: '', estimated_cost: '', notes: ''
  });

  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: () => base44.entities.MaintenanceTask.list('-next_due'),
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['maintenanceSuggestions'],
    queryFn: async () => {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const taskList = tasks?.map(t => `${t.title} (last done: ${t.last_completed || 'never'})`).join(', ') || 'none logged';
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a home maintenance expert. Based on the current month (${currentMonth}) and location (Wauwatosa, Wisconsin - cold winters, humid summers), suggest 5-7 home maintenance tasks that should be done. 
        
The home is at 1934 Church St and was built around the 1930s-1940s. It's a classic American home.

Current maintenance log: ${taskList}

Consider:
- Seasonal tasks appropriate for ${currentMonth} in Wisconsin
- Common maintenance for older homes
- Tasks that haven't been done recently
- Safety-related items

For each task, provide the task name, why it's important, estimated time to complete, and whether professional help is recommended.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            season: { type: "string" },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  reason: { type: "string" },
                  estimated_time: { type: "string" },
                  professional_recommended: { type: "boolean" },
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });
      return result;
    },
    enabled: !!tasks,
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTasks'] });
      setIsAddOpen(false);
      setNewTask({
        title: '', description: '', category: 'seasonal', frequency: 'annually',
        season: 'any', priority: 'medium', next_due: '', estimated_cost: '', notes: ''
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceTask.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenanceTasks'] }),
  });

  const handleCreateTask = async () => {
    setIsSubmitting(true);
    await createTaskMutation.mutateAsync({
      ...newTask,
      estimated_cost: newTask.estimated_cost ? parseFloat(newTask.estimated_cost) : null,
      status: 'pending',
    });
    setIsSubmitting(false);
  };

  const handleMarkComplete = async (task) => {
    const today = new Date().toISOString().split('T')[0];
    let nextDue = null;
    
    // Calculate next due date based on frequency
    if (task.frequency) {
      const d = new Date();
      switch (task.frequency) {
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'quarterly': d.setMonth(d.getMonth() + 3); break;
        case 'semi-annually': d.setMonth(d.getMonth() + 6); break;
        case 'annually': d.setFullYear(d.getFullYear() + 1); break;
        default: break;
      }
      nextDue = d.toISOString().split('T')[0];
    }

    await updateTaskMutation.mutateAsync({
      id: task.id,
      data: {
        status: 'completed',
        last_completed: today,
        next_due: nextDue,
      }
    });
  };

  const handleAddSuggestion = (suggestion) => {
    setNewTask({
      ...newTask,
      title: suggestion.title,
      description: suggestion.reason,
      category: suggestion.category?.toLowerCase().replace(/ /g, '_') || 'seasonal',
      priority: suggestion.priority || 'medium',
    });
    setIsAddOpen(true);
  };

  const handleSyncToCalendar = async () => {
    setIsSyncing(true);
    try {
      const result = await base44.functions.invoke('syncMaintenanceToCalendar', {});
      alert(`✅ Successfully synced ${result.data.synced} maintenance tasks to Google Calendar!`);
    } catch (error) {
      alert(`❌ Error syncing to calendar: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredTasks = tasks?.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
    return true;
  }) || [];

  const priorityColors = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  };

  const categoryLabels = {
    hvac: 'HVAC',
    plumbing: 'Plumbing',
    electrical: 'Electrical',
    exterior: 'Exterior',
    interior: 'Interior',
    appliances: 'Appliances',
    safety: 'Safety',
    seasonal: 'Seasonal',
    landscaping: 'Landscaping',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-16">
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-emerald-200 mb-3">
              <Wrench className="w-5 h-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Upkeep</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Home Maintenance</h1>
            <p className="text-emerald-100">Keep your home running smoothly</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* AI Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="-mt-12 relative z-10 mb-8"
        >
          <Collapsible open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
            <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-amber-100/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                      <Lightbulb className="w-5 h-5" />
                      Smart Maintenance Tips
                      {suggestions?.season && (
                        <Badge variant="outline" className="ml-2 border-amber-300 text-amber-700">
                          {suggestions.season}
                        </Badge>
                      )}
                    </CardTitle>
                    {suggestionsOpen ? <ChevronUp className="w-5 h-5 text-amber-600" /> : <ChevronDown className="w-5 h-5 text-amber-600" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {suggestionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                      <span className="ml-2 text-amber-700">Analyzing your home's needs...</span>
                    </div>
                  ) : suggestions?.suggestions?.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {suggestions.suggestions.map((suggestion, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-4 bg-white rounded-lg shadow-sm border border-amber-100 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-slate-800">{suggestion.title}</h4>
                            <Badge className={priorityColors[suggestion.priority]}>
                              {suggestion.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{suggestion.reason}</p>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {suggestion.estimated_time}
                              {suggestion.professional_recommended && (
                                <span className="ml-2 text-amber-600">• Pro recommended</span>
                              )}
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAddSuggestion(suggestion)}
                              className="text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-amber-700 py-4">No suggestions available right now.</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>

        {/* Filters & Add Button */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSyncToCalendar}
              disabled={isSyncing}
              variant="outline"
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              {isSyncing ? 'Syncing...' : 'Sync to Calendar'}
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Maintenance Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Task Title *</Label>
                  <Input 
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    placeholder="e.g., Change HVAC filter"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={newTask.category} onValueChange={v => setNewTask({...newTask, category: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={newTask.priority} onValueChange={v => setNewTask({...newTask, priority: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Frequency</Label>
                    <Select value={newTask.frequency} onValueChange={v => setNewTask({...newTask, frequency: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                        <SelectItem value="as-needed">As Needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Best Season</Label>
                    <Select value={newTask.season} onValueChange={v => setNewTask({...newTask, season: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Time</SelectItem>
                        <SelectItem value="spring">Spring</SelectItem>
                        <SelectItem value="summer">Summer</SelectItem>
                        <SelectItem value="fall">Fall</SelectItem>
                        <SelectItem value="winter">Winter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Next Due Date</Label>
                    <Input 
                      type="date"
                      value={newTask.next_due}
                      onChange={e => setNewTask({...newTask, next_due: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Estimated Cost ($)</Label>
                    <Input 
                      type="number"
                      value={newTask.estimated_cost}
                      onChange={e => setNewTask({...newTask, estimated_cost: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                    placeholder="What needs to be done..."
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea 
                    value={newTask.notes}
                    onChange={e => setNewTask({...newTask, notes: e.target.value})}
                    placeholder="Any additional notes..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1">Cancel</Button>
                  <Button 
                    onClick={handleCreateTask} 
                    disabled={!newTask.title || isSubmitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isSubmitting ? 'Creating...' : 'Add Task'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Tasks List */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <Card key={i} className="border-0 shadow-md animate-pulse">
                <CardContent className="p-6">
                  <div className="h-5 bg-slate-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={`border-0 shadow-md hover:shadow-lg transition-shadow ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={statusColors[task.status]}>
                            {task.status?.replace('_', ' ')}
                          </Badge>
                          <Badge className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline">{categoryLabels[task.category] || task.category}</Badge>
                        </div>
                      </div>
                      <h3 className={`font-semibold text-slate-800 mb-2 ${task.status === 'completed' ? 'line-through' : ''}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                        {task.next_due && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Due: {new Date(task.next_due).toLocaleDateString()}
                          </span>
                        )}
                        {task.last_completed && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Last done: {new Date(task.last_completed).toLocaleDateString()}
                          </span>
                        )}
                        {task.frequency && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {task.frequency}
                          </span>
                        )}
                      </div>
                      {task.status !== 'completed' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleMarkComplete(task)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark Complete
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No tasks found</h3>
              <p className="text-slate-500 mb-4">
                {statusFilter !== 'all' || categoryFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Start by adding maintenance tasks or try the AI suggestions above'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}