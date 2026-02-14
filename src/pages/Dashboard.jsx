import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Home, AlertTriangle, CheckCircle2, Clock, Calendar, 
  FileText, Wrench, Users, Bell, ArrowRight, 
  Thermometer, DollarSign, TrendingUp, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from 'framer-motion';
import { format, isAfter, isBefore, addDays } from 'date-fns';

export default function Dashboard() {
  const { data: homeInfo } = useQuery({
    queryKey: ['homeInfo'],
    queryFn: () => base44.entities.HomeInfo.list(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: () => base44.entities.MaintenanceTask.list('-next_due'),
  });

  const { data: items } = useQuery({
    queryKey: ['allItems'],
    queryFn: () => base44.entities.RoomItem.list(),
  });

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: familyMembers } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather'],
    queryFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Get the current weather for Wauwatosa, WI 53213. Include temperature, conditions, and high/low.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            temperature: { type: "number" },
            conditions: { type: "string" },
            high: { type: "number" },
            low: { type: "number" }
          }
        }
      });
      return result;
    },
    staleTime: 1000 * 60 * 30,
  });

  const home = homeInfo?.[0];
  const today = new Date();
  
  // Calculate stats
  const overdueTasks = tasks?.filter(t => t.status !== 'completed' && t.next_due && isBefore(new Date(t.next_due), today)) || [];
  const upcomingTasks = tasks?.filter(t => t.status !== 'completed' && t.next_due && isAfter(new Date(t.next_due), today) && isBefore(new Date(t.next_due), addDays(today, 30))) || [];
  const completedThisMonth = tasks?.filter(t => t.status === 'completed' && t.last_completed && new Date(t.last_completed).getMonth() === today.getMonth()) || [];
  
  const expiringWarranties = documents?.filter(d => d.type === 'warranty' && d.expiration_date && isAfter(new Date(d.expiration_date), today) && isBefore(new Date(d.expiration_date), addDays(today, 90))) || [];
  
  const appliancesNeedingMaintenance = items?.filter(i => {
    if (!i.maintenance_interval_months || !i.last_maintenance_date) return false;
    const nextDue = new Date(i.last_maintenance_date);
    nextDue.setMonth(nextDue.getMonth() + i.maintenance_interval_months);
    return isBefore(nextDue, addDays(today, 30));
  }) || [];

  const stats = [
    { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, color: 'text-red-600 bg-red-100', urgent: overdueTasks.length > 0 },
    { label: 'Due Soon', value: upcomingTasks.length, icon: Clock, color: 'text-amber-600 bg-amber-100' },
    { label: 'Completed', value: completedThisMonth.length, icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
    { label: 'Appliances', value: items?.filter(i => i.type === 'appliance').length || 0, icon: Package, color: 'text-blue-600 bg-blue-100' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-800 to-slate-700 text-white py-12 px-6">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-slate-400 text-sm mb-1">Welcome back to</p>
            <h1 className="text-3xl font-bold mb-1">1934 Church St.</h1>
            <p className="text-slate-300">Your home at a glance</p>
          </motion.div>
          
          {/* Weather Widget */}
          {!weatherLoading && weatherData && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="absolute right-6 top-1/2 -translate-y-1/2 text-right hidden md:block"
            >
              <div className="text-4xl font-bold">{weatherData.temperature}°F</div>
              <div className="text-slate-300">{weatherData.conditions}</div>
              <div className="text-sm text-slate-400">H: {weatherData.high}° L: {weatherData.low}°</div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 -mt-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`border-0 shadow-lg ${stat.urgent ? 'ring-2 ring-red-400' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Urgent Attention */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    Overdue Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overdueTasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-800">{task.title}</p>
                          <p className="text-sm text-slate-500">Due: {format(new Date(task.next_due), 'MMM d, yyyy')}</p>
                        </div>
                        <Badge variant="destructive">Overdue</Badge>
                      </div>
                    ))}
                  </div>
                  <Link to={createPageUrl('Maintenance')}>
                    <Button variant="ghost" className="w-full mt-4 text-red-600">
                      View All <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Tasks */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Upcoming Maintenance
                  </CardTitle>
                  <Link to={createPageUrl('MaintenanceCalendar')}>
                    <Button variant="ghost" size="sm">View Calendar</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingTasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            task.priority === 'urgent' ? 'bg-red-500' :
                            task.priority === 'high' ? 'bg-orange-500' :
                            task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                          }`} />
                          <div>
                            <p className="font-medium text-slate-800">{task.title}</p>
                            <p className="text-sm text-slate-500">
                              {task.assigned_name && `${task.assigned_name} • `}
                              {format(new Date(task.next_due), 'MMM d')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{task.category}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No upcoming tasks in the next 30 days</p>
                )}
              </CardContent>
            </Card>

            {/* Appliance Maintenance Due */}
            {appliancesNeedingMaintenance.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-amber-600" />
                    Appliance Maintenance Due
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {appliancesNeedingMaintenance.slice(0, 4).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-800">{item.name}</p>
                          <p className="text-sm text-slate-500">{item.brand} {item.model}</p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700">Service Due</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={createPageUrl('Appliances')} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="w-4 h-4 mr-2" /> Manage Appliances
                  </Button>
                </Link>
                <Link to={createPageUrl('Documents')} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" /> Documents Vault
                  </Button>
                </Link>
                <Link to={createPageUrl('HomeDetails')} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Home className="w-4 h-4 mr-2" /> Home Details Log
                  </Button>
                </Link>
                <Link to={createPageUrl('Contacts')} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" /> Important Contacts
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Family Members */}
            {familyMembers?.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Family</CardTitle>
                    <Link to={createPageUrl('Family')}>
                      <Button variant="ghost" size="sm">Manage</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {familyMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: member.color || '#64748b' }}
                        >
                          {member.name?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{member.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expiring Warranties */}
            {expiringWarranties.length > 0 && (
              <Card className="border-0 shadow-lg border-l-4 border-l-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-600" />
                    Warranties Expiring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {expiringWarranties.slice(0, 3).map(doc => (
                      <div key={doc.id} className="p-2 bg-amber-50 rounded-lg">
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-slate-500">
                          Expires: {format(new Date(doc.expiration_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Link to={createPageUrl('Documents')}>
                    <Button variant="ghost" size="sm" className="w-full mt-2">
                      View All Documents
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Recent Documents */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Documents</CardTitle>
                  <Link to={createPageUrl('Documents')}>
                    <Button variant="ghost" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {documents?.length > 0 ? (
                  <div className="space-y-2">
                    {documents.slice(0, 4).map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-slate-500 capitalize">{doc.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No documents yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}