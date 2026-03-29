import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useSwipe } from '../components/useSwipe';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, MapPin, DollarSign, Clock, Sparkles, Users, Trash2, ExternalLink, UserPlus, Edit2, ScanLine } from 'lucide-react';
import HomeyScanModal from '../components/HomeyScanModal';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import FamilyCalendar from '../components/FamilyCalendar';
import ImportantDatesTab from '../components/ImportantDatesTab';

export default function Calendar() {
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  const touchStartY = useRef(0);
  
  useSwipe((direction) => {
    if (direction === 'left') {
      navigate(createPageUrl('House'));
    } else if (direction === 'right') {
      navigate(createPageUrl('Meals'));
    }
  }, bannerRef);

  const [showDialog, setShowDialog] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [newActivity, setNewActivity] = useState({});
  const [editingActivity, setEditingActivity] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const queryClient = useQueryClient();



  const { data: activities = [] } = useQuery({
    queryKey: ['kidsActivities'],
    queryFn: () => base44.entities.KidsActivity.list(),
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.KidsActivity.create({ ...data, source: 'manual' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['kidsActivities']);
      setShowDialog(false);
      setNewActivity({});
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (id) => base44.entities.KidsActivity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['kidsActivities']);
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KidsActivity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['kidsActivities']);
      setShowDialog(false);
      setEditingActivity(null);
      setNewActivity({});
    },
  });

  const generateActivitiesMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find current kids activities, events, and sports leagues in or near Milwaukee, WI suitable for ages 4 and 9. Include local rec programs, museums, parks events, and sports leagues. For each activity, find the official registration or event details URL. Return as JSON array with: title, type (event/sports_league/program), location, date (YYYY-MM-DD), time, age_range, description, cost, registration_url (the full URL to the event page or registration page).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            activities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  type: { type: "string" },
                  location: { type: "string" },
                  date: { type: "string" },
                  time: { type: "string" },
                  age_range: { type: "string" },
                  description: { type: "string" },
                  cost: { type: "string" },
                  registration_url: { type: "string" }
                }
              }
            }
          }
        }
      });
      return result.activities;
    },
    onSuccess: async (generated) => {
      for (const activity of generated) {
        await base44.entities.KidsActivity.create({ ...activity, source: 'ai_generated' });
      }
      queryClient.invalidateQueries(['kidsActivities']);
    },
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getActivitiesForDay = (day) => {
    return activities.filter(a => a.date && isSameDay(parseISO(a.date), day));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingActivities = activities
    .filter(a => a.date && parseISO(a.date) >= today)
    .sort((a, b) => parseISO(a.date) - parseISO(b.date))
    .slice(0, 6);

  const typeColors = {
    event: 'bg-blue-100 text-blue-700',
    sports_league: 'bg-emerald-100 text-emerald-700',
    program: 'bg-purple-100 text-purple-700',
    reminder: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      
      <div className="relative overflow-hidden">
        <style>{`
          .kids-banner-bg {
            background: #C5DFF0;
            position: relative;
          }
          .kids-banner-bg::before {
            content: '';
            position: absolute;
            inset: 0;
            background: 
              repeating-linear-gradient(
                45deg,
                rgba(197, 223, 240, 0.6) 0px,
                rgba(197, 223, 240, 0.6) 10px,
                rgba(140, 180, 210, 0.4) 10px,
                rgba(140, 180, 210, 0.4) 20px,
                rgba(197, 223, 240, 0.6) 20px,
                rgba(197, 223, 240, 0.6) 25px,
                rgba(220, 235, 245, 0.3) 25px,
                rgba(220, 235, 245, 0.3) 30px
              ),
              radial-gradient(circle, rgba(140, 180, 210, 0.4) 2px, transparent 2px);
            background-size: 100% 100%, 15px 15px;
            background-position: 0 0, 7px 7px;
          }
        `}</style>
        <div ref={bannerRef} className="relative h-40 md:h-48 kids-banner-bg cursor-grab active:cursor-grabbing">
          <div className="relative z-10 flex items-center justify-between px-4 md:px-12 gap-0 h-full">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-1 md:mb-2">
                Calendar
              </h1>
              <p className="text-sm md:text-lg text-gray-700">
                Events, programs & fun for the family
              </p>
            </div>
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/a100bf97d_familybiking.png" 
              alt="Family Biking"
              className="hidden md:block h-40 md:h-56 w-auto object-cover flex-shrink-0"
              loading="eager"
              decoding="async"
            />
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/5317f8746_familyplaying.png" 
              alt="Family Playing"
              className="h-40 md:h-56 w-auto object-cover flex-shrink-0"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-8">
        <Tabs defaultValue="calendar" className="space-y-2">
          <TabsList className="bg-white shadow-sm border-b-2 border-gray-200 rounded-none w-full justify-start">
            <TabsTrigger value="calendar" className="border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent rounded-none">Calendar</TabsTrigger>
            <TabsTrigger value="upcoming" className="border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent rounded-none">Upcoming</TabsTrigger>
            <TabsTrigger value="important" className="border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent rounded-none">Important Dates</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <div className="flex justify-end gap-2 pb-2">
              <Button
                onClick={() => setShowScanModal(true)}
                className="bg-gradient-to-r from-[#E91E8C] to-[#0AACFF] text-white font-semibold shadow-md"
                size="sm"
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Scan to Homey
              </Button>
            </div>
            <FamilyCalendar activities={activities} initialEventId={new URLSearchParams(window.location.search).get('eventId')} />
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {upcomingActivities.length} Upcoming Events
            </h2>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowScanModal(true)}
                className="bg-gradient-to-r from-[#E91E8C] to-[#0AACFF] text-white font-semibold w-full sm:w-auto shadow-md"
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Scan to Homey
              </Button>
              <Button
                onClick={() => generateActivitiesMutation.mutate()}
                disabled={generateActivitiesMutation.isPending}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50 w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generateActivitiesMutation.isPending ? 'Finding...' : 'Find Local Activities'}
              </Button>
              <Button
                onClick={() => setShowDialog(true)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingActivities.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2 flex-1 pr-2">
                          {activity.source === 'manual' && (
                            <UserPlus className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" title="Manually added" />
                          )}
                          <h3 className="font-semibold text-gray-900 text-lg">{activity.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={typeColors[activity.type] || 'bg-gray-100 text-gray-700'}>
                            {activity.type?.replace('_', ' ')}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-600"
                            onClick={() => {
                              setEditingActivity(activity);
                              setNewActivity(activity);
                              setShowDialog(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                            onClick={() => deleteActivityMutation.mutate(activity.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {activity.date && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <CalendarIcon className="w-4 h-4" />
                          {format(parseISO(activity.date), 'MMM d, yyyy')}
                          {activity.time && ` • ${activity.time}`}
                        </div>
                      )}
                      
                      {activity.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          {activity.location}
                        </div>
                      )}
                      
                      {activity.age_range && (
                        <div className="text-sm text-gray-500 mb-2">
                          Ages: {activity.age_range}
                        </div>
                      )}
                      
                      {activity.cost && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          {activity.cost}
                        </div>
                      )}
                      
                      {activity.description && (
                        <p className="text-sm text-gray-500 mt-3">{activity.description}</p>
                      )}
                      
                      {activity.registration_url && (
                        <a
                          href={activity.registration_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Details <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {upcomingActivities.length === 0 && (
              <Card className="bg-white border-0 shadow-sm p-12 text-center">
                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
                <p className="text-gray-500 mb-4">Add events or find local activities</p>
                <Button
                  onClick={() => generateActivitiesMutation.mutate()}
                  disabled={generateActivitiesMutation.isPending}
                  className="bg-gradient-to-r from-[#0AACFF] to-[#0890D9] text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Find Local Activities
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="important">
            <ImportantDatesTab />
          </TabsContent>
        </Tabs>
      </div>

      <HomeyScanModal
        open={showScanModal}
        onClose={() => setShowScanModal(false)}
        onSaved={() => queryClient.invalidateQueries(['kidsActivities'])}
      />

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingActivity(null);
          setNewActivity({});
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Event title"
              value={newActivity.title || ''}
              onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
            />
            <Select
              value={newActivity.type}
              onValueChange={(value) => setNewActivity({ ...newActivity, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="sports_league">Sports League</SelectItem>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Location"
              value={newActivity.location || ''}
              onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                value={newActivity.date || ''}
                onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
              />
              <Input
                type="time"
                value={newActivity.time || ''}
                onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
              />
            </div>
            <Input
              placeholder="Age range (e.g., 4-9 years)"
              value={newActivity.age_range || ''}
              onChange={(e) => setNewActivity({ ...newActivity, age_range: e.target.value })}
            />
            <Input
              placeholder="Cost (e.g., Free, $25)"
              value={newActivity.cost || ''}
              onChange={(e) => setNewActivity({ ...newActivity, cost: e.target.value })}
            />
            <Input
              placeholder="Registration URL (optional)"
              value={newActivity.registration_url || ''}
              onChange={(e) => setNewActivity({ ...newActivity, registration_url: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={newActivity.description || ''}
              onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
              rows={3}
            />
            <Button
              onClick={() => {
                if (editingActivity) {
                  updateActivityMutation.mutate({ id: editingActivity.id, data: newActivity });
                } else {
                  createActivityMutation.mutate(newActivity);
                }
              }}
              disabled={!newActivity.title || !newActivity.type}
              className="w-full bg-gradient-to-r from-[#0AACFF] to-[#0890D9] text-white"
            >
              {editingActivity ? 'Update Event' : 'Add Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}