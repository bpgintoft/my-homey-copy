import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useSwipe } from '../components/useSwipe';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Plus, Home as HomeIcon, Package, FileText, ExternalLink, Calendar, Sparkles, Upload, Loader2, X, Wrench, ShoppingCart } from 'lucide-react';
import HardwareList from '../components/house/HardwareList';

import { motion, AnimatePresence } from 'framer-motion';
import { getThumbnailUrl } from '../components/imageHelpers';
import MaintenanceTips from '../components/house/MaintenanceTips';
import MaintenanceTaskCard from '../components/house/MaintenanceTaskCard';
import SyncToChoreDialog from '../components/house/SyncToChoreDialog';
import SyncToCalendarDialog from '../components/house/SyncToCalendarDialog';
import RescheduleDialog from '../components/house/RescheduleDialog';

export default function House() {
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  
  useSwipe((direction) => {
    if (direction === 'left') {
      navigate(createPageUrl('History'));
    } else if (direction === 'right') {
      navigate(createPageUrl('Kids'));
    }
  }, bannerRef);

  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showApplianceDialog, setShowApplianceDialog] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState(null);
  const [activeTab, setActiveTab] = useState('rooms');
  const [newRoom, setNewRoom] = useState({});
  const [newAppliance, setNewAppliance] = useState({ photos: [] });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingRoomPhoto, setIsUploadingRoomPhoto] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncType, setSyncType] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [taskToReschedule, setTaskToReschedule] = useState(null);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [newMaintenanceTask, setNewMaintenanceTask] = useState({});
  const [newTaskAssignees, setNewTaskAssignees] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef(null);
  const roomPhotoInputRef = React.useRef(null);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const { data: roomItems = [] } = useQuery({
    queryKey: ['roomItems'],
    queryFn: () => base44.entities.RoomItem.list(),
  });

  const { data: appliances = [] } = useQuery({
    queryKey: ['appliances'],
    queryFn: () => base44.entities.RoomItem.filter({ type: 'appliance' }),
  });

  const { data: maintenanceTasks = [] } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: () => base44.entities.MaintenanceTask.list(),
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  // Handle URL params for direct editing
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const editId = params.get('editId');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (editId && appliances.length > 0) {
      const applianceToEdit = appliances.find(a => a.id === editId);
      if (applianceToEdit) {
        setEditingAppliance(applianceToEdit);
      }
    }
  }, [appliances]);

  const createRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.Room.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms']);
      setShowRoomDialog(false);
      setNewRoom({});
    },
  });

  const createApplianceMutation = useMutation({
    mutationFn: (data) => base44.entities.RoomItem.create({ ...data, type: 'appliance' }),
    onSuccess: (createdAppliance) => {
      queryClient.invalidateQueries(['appliances']);
      queryClient.invalidateQueries(['roomItems']);
      setShowApplianceDialog(false);
      setNewAppliance({ photos: [] });

      // Auto-fetch manual if brand and model are available
      if (createdAppliance.brand && createdAppliance.model) {
        findManualMutation.mutate({
          brand: createdAppliance.brand,
          model: createdAppliance.model,
          itemId: createdAppliance.id
        });
      }
    },
  });

  const updateApplianceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RoomItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appliances']);
      queryClient.invalidateQueries(['roomItems']);
      setEditingAppliance(null);
    },
  });

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewAppliance({ ...newAppliance, photos: [...(newAppliance.photos || []), file_url] });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          handlePhotoUpload(blob);
          e.preventDefault();
        }
      }
    }
  };

  const removePhoto = (index) => {
    setNewAppliance({ ...newAppliance, photos: newAppliance.photos.filter((_, i) => i !== index) });
  };

  const handleRoomPhotoUpload = async (file) => {
    if (!file) return;
    setIsUploadingRoomPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewRoom({ ...newRoom, photo_url: file_url });
    } finally {
      setIsUploadingRoomPhoto(false);
      if (roomPhotoInputRef.current) roomPhotoInputRef.current.value = '';
    }
  };

  const handleRoomPhotoPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          handleRoomPhotoUpload(blob);
          e.preventDefault();
        }
      }
    }
  };

  const [expandedApplianceId, setExpandedApplianceId] = React.useState(null);

  const findManualMutation = useMutation({
    mutationFn: async ({ brand, model, itemId }) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find the official online user manual PDF link for ${brand} ${model}. Search the manufacturer's website and return the direct PDF URL or support page URL.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            manual_url: { type: "string" },
            found: { type: "boolean" }
          }
        }
      });
      if (result.found && result.manual_url) {
        await base44.entities.RoomItem.update(itemId, {
          manual_url: result.manual_url
        });
        queryClient.invalidateQueries(['appliances']);
      }
      return result;
    },
  });

  const fetchSpecsMutation = useMutation({
    mutationFn: async ({ brand, model, serial_number, itemId }) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find detailed product specifications for the ${brand} ${model}${serial_number ? ` (Serial: ${serial_number})` : ''}. Search for official product dimensions and technical specifications. Return dimensions in a standard format (W x D x H) and specs as a detailed description.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            dimensions: { type: "string" },
            specs: { type: "string" },
            found: { type: "boolean" }
          }
        }
      });
      
      if (result.found && (result.dimensions || result.specs)) {
        await base44.entities.RoomItem.update(itemId, {
          dimensions: result.dimensions,
          specs: result.specs
        });
        queryClient.invalidateQueries(['appliances']);
      }
      return result;
    },
  });

  const itemsByRoomId = roomItems.reduce((acc, item) => {
    if (!acc[item.room_id]) acc[item.room_id] = [];
    acc[item.room_id].push(item);
    return acc;
  }, {});

  const appliancesByRoom = appliances.reduce((acc, appliance) => {
    const roomObj = rooms.find(r => r.id === appliance.room_id);
    const room = roomObj?.name || 'Unassigned';
    if (!acc[room]) acc[room] = [];
    acc[room].push(appliance);
    return acc;
  }, {});

  const handleSyncTask = (task, type) => {
    setSelectedTask(task);
    setSyncType(type);
    setSyncDialogOpen(true);
  };

  const handleSyncToChore = async (selectedMembers) => {
    // Calculate timing based on next_due date
    let timing = 'short-term';
    if (selectedTask.next_due) {
      const dueDate = new Date(selectedTask.next_due);
      const now = new Date();
      const daysUntil = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7) timing = 'short-term';
      else if (daysUntil <= 30) timing = 'mid-term';
      else timing = 'long-term';
    }

    // Create a chore for each selected member
    const createdChores = await Promise.all(
      selectedMembers.map(member =>
        base44.entities.Chore.create({
          title: selectedTask.title,
          assigned_to_member_id: member.id,
          assigned_to_name: member.name,
          timing,
          next_due: selectedTask.next_due,
          is_completed: false,
          maintenance_task_id: selectedTask.id,
        })
      )
    );

    // Link sibling chore IDs on each chore
    if (createdChores.length > 1) {
      await Promise.all(
        createdChores.map(chore => {
          const siblingIds = createdChores.filter(c => c.id !== chore.id).map(c => c.id);
          return base44.entities.Chore.update(chore.id, { linked_chore_ids: siblingIds });
        })
      );
    }

    const choreIds = createdChores.map(c => c.id);
    await base44.entities.MaintenanceTask.update(selectedTask.id, {
      synced_chore_id: choreIds[0],
      synced_chore_ids: choreIds,
    });

    queryClient.invalidateQueries(['maintenanceTasks']);
    setSyncDialogOpen(false);
    setSelectedTask(null);
  };

  const handleSyncToCalendar = async (calendarId, calendarName) => {
    const response = await base44.functions.invoke('syncMaintenanceToCalendar', {
      task: selectedTask,
      calendarId: calendarId
    });

    if (response.data?.event?.id) {
      await base44.entities.MaintenanceTask.update(selectedTask.id, {
        synced_google_calendar_id: calendarId,
        synced_google_event_id: response.data.event.id
      });

      queryClient.invalidateQueries(['maintenanceTasks']);
    }

    setSyncDialogOpen(false);
    setSelectedTask(null);
  };

  const handleCompleteTask = (task) => {
    setTaskToReschedule(task);
    setRescheduleDialogOpen(true);
  };

  const handleReschedule = async (nextDueDate) => {
    const today = new Date().toISOString().split('T')[0];
    const task = taskToReschedule;

    // Delete all existing synced chores
    const choreIds = task.synced_chore_ids?.length ? task.synced_chore_ids : (task.synced_chore_id ? [task.synced_chore_id] : []);
    if (choreIds.length > 0) {
      const allChores = await base44.entities.Chore.list();
      const choresToDelete = allChores.filter(c => choreIds.includes(c.id));
      await Promise.all(choresToDelete.map(c => base44.entities.Chore.delete(c.id)));
    }

    await base44.entities.MaintenanceTask.update(task.id, {
      status: 'pending',
      last_completed: today,
      next_due: nextDueDate,
      synced_chore_id: null,
      synced_chore_ids: null,
    });

    queryClient.invalidateQueries(['maintenanceTasks']);
    queryClient.invalidateQueries(['chores']);
    setRescheduleDialogOpen(false);
    setTaskToReschedule(null);
  };

  const handleAddTaskFromTip = (tip) => {
    setNewMaintenanceTask({
      title: tip.task,
      description: tip.description,
      category: tip.category,
      frequency: tip.frequency.toLowerCase().includes('annual') ? 'annually' : 
                 tip.frequency.toLowerCase().includes('seasonal') ? 'quarterly' :
                 tip.frequency.toLowerCase().includes('monthly') ? 'monthly' :
                 tip.frequency.toLowerCase().includes('weekly') ? 'weekly' : 'as-needed',
      status: 'pending',
      priority: 'medium'
    });
    setNewTaskAssignees([]);
    setShowAddTaskDialog(true);
  };

  const createMaintenanceTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenanceTasks']);
      setShowAddTaskDialog(false);
      setNewMaintenanceTask({});
    },
  });



  const updateMaintenanceTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenanceTasks']);
      setEditingTask(null);
    },
  });

  const deleteMaintenanceTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenanceTasks']);
      setEditingTask(null);
    },
  });

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="relative overflow-hidden">
        <style>{`
          .house-banner-bg {
            background: linear-gradient(135deg, #E8F5F0 0%, #D4EFE8 50%, #C0E9E0 100%);
            background-size: 400% 400%;
            position: relative;
          }
          .house-banner-bg::before {
            content: '';
            position: absolute;
            inset: 0;
            background: 
              repeating-linear-gradient(
                45deg,
                rgba(212, 239, 232, 0.6) 0px,
                rgba(212, 239, 232, 0.6) 10px,
                rgba(160, 210, 200, 0.4) 10px,
                rgba(160, 210, 200, 0.4) 20px,
                rgba(212, 239, 232, 0.6) 20px,
                rgba(212, 239, 232, 0.6) 25px,
                rgba(230, 245, 240, 0.3) 25px,
                rgba(230, 245, 240, 0.3) 30px
              ),
              radial-gradient(circle, rgba(160, 210, 200, 0.4) 2px, transparent 2px);
            background-size: 100% 100%, 15px 15px;
            background-position: 0 0, 7px 7px;
          }
        `}</style>
        <div ref={bannerRef} className="relative h-40 md:h-48 house-banner-bg cursor-grab active:cursor-grabbing">
          <div className="relative z-10 flex items-center justify-between px-4 md:px-12 gap-0 h-full">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-1 md:mb-2">
                House
              </h1>
              <p className="text-sm md:text-lg text-gray-700">
                Rooms, appliances&nbsp;& organization
              </p>
            </div>
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/ef7839afa_familyhottub.png" 
              alt="Family in hot tub"
              className="hidden md:block h-40 md:h-56 w-auto object-cover flex-shrink-0"
            />
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/e7138b18e_familyappliances.png" 
              alt="Family with appliances"
              className="h-40 md:h-56 w-auto object-cover flex-shrink-0"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-sm border-b-2 border-gray-200 rounded-none w-full flex justify-around p-0 h-auto">
            <TabsTrigger value="rooms" className="border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent rounded-none text-xs sm:text-sm py-3 px-3">Rooms</TabsTrigger>
            <TabsTrigger value="appliances" className="border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent rounded-none text-xs sm:text-sm py-3 px-3">Appliances</TabsTrigger>
            <TabsTrigger value="maintenance" className="border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent rounded-none text-xs sm:text-sm py-3 px-3">Maintenance</TabsTrigger>
            <TabsTrigger value="hardware" className="border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent rounded-none text-xs sm:text-sm py-3 px-3">
              <ShoppingCart className="w-3 h-3 mr-1" />Shop
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rooms" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {rooms.length} Rooms
              </h2>
              <Button
                onClick={() => setShowRoomDialog(true)}
                className="bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Link to={createPageUrl(`RoomDetail?id=${room.id}`)}>
                    <Card className="bg-white/80 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden relative">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 pr-32">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">{room.name}</h3>
                            {room.floor && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 mb-3">
                                {room.floor} floor
                              </Badge>
                            )}
                            {room.description && (
                              <p className="text-sm text-gray-600 mb-3">{room.description}</p>
                            )}
                            {room.square_footage && (
                              <div className="text-sm text-gray-500">
                                {room.square_footage} sq ft
                              </div>
                            )}
                            <div className="text-sm text-gray-500 mt-2">
                              {itemsByRoomId[room.id]?.length || 0} {(itemsByRoomId[room.id]?.length || 0) === 1 ? 'item' : 'items'}
                            </div>
                          </div>
                          {room.photo_url && (
                            <img 
                              src={room.photo_url} 
                              alt={room.name}
                              className="absolute top-2 right-[calc(1.25rem-2mm)] bottom-2 w-40 h-[calc(100%-16px)] object-cover rounded-2xl"
                              loading="lazy"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>

            {rooms.length === 0 && (
              <Card className="bg-white border-0 shadow-sm p-12 text-center">
                <HomeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No rooms yet</h3>
                <p className="text-gray-500">Start organizing your home by adding rooms</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="appliances" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {appliances.length} Appliances
              </h2>
              <Button
                onClick={() => setShowApplianceDialog(true)}
                className="bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Appliance
              </Button>
            </div>

            {Object.keys(appliancesByRoom).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(appliancesByRoom).map(([roomName, roomAppliances]) => (
                  <div key={roomName}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{roomName}</h3>
                    <div className="space-y-4">
                      {roomAppliances.map((appliance) => {
                        const isExpanded = expandedApplianceId === appliance.id;
                        return (
                          <Card 
                            key={appliance.id} 
                            className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <CardContent className="p-4">
                              <div 
                                className="flex gap-3 items-start cursor-pointer"
                                onClick={() => setExpandedApplianceId(isExpanded ? null : appliance.id)}
                              >
                                {appliance.photos && appliance.photos.length > 0 && (
                                  <img 
                                    src={getThumbnailUrl(appliance.photos[0], 100)} 
                                    alt=""
                                    className="w-20 h-20 rounded object-cover flex-shrink-0"
                                    loading="lazy"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 text-base mb-1">{appliance.name}</h4>
                                  {(appliance.brand || appliance.model) && (
                                    <p className="text-sm text-gray-600">
                                      {appliance.brand} {appliance.model}
                                    </p>
                                  )}
                                </div>
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
                                    <div className="mt-4 pt-4 border-t space-y-4">
                                      {appliance.serial_number && (
                                        <div>
                                          <Label className="text-xs text-gray-500">Serial Number</Label>
                                          <p className="text-sm text-gray-800">{appliance.serial_number}</p>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-2 gap-4">
                                        {appliance.purchase_date && (
                                          <div>
                                            <Label className="text-xs text-gray-500">Purchase Date</Label>
                                            <p className="text-sm text-gray-800 flex items-center gap-1">
                                              <Calendar className="w-3 h-3" />
                                              {new Date(appliance.purchase_date).toLocaleDateString()}
                                            </p>
                                          </div>
                                        )}
                                        {appliance.warranty_expiration && (
                                          <div>
                                            <Label className="text-xs text-gray-500">Warranty Expires</Label>
                                            <p className="text-sm text-gray-800 flex items-center gap-1">
                                              {new Date(appliance.warranty_expiration).toLocaleDateString()}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {appliance.notes && (
                                        <div>
                                          <Label className="text-xs text-gray-500">Notes</Label>
                                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{appliance.notes}</p>
                                        </div>
                                      )}

                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            await findManualMutation.mutateAsync({
                                              brand: appliance.brand,
                                              model: appliance.model,
                                              itemId: appliance.id
                                            });
                                          }}
                                          disabled={findManualMutation.isPending || !appliance.brand || !appliance.model}
                                          className="text-xs"
                                        >
                                          <Sparkles className="w-3 h-3 mr-1" />
                                          {findManualMutation.isPending ? 'Finding...' : 'Find Manual'}
                                        </Button>
                                        {appliance.manual_url && (
                                          <a
                                            href={appliance.manual_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 px-2 py-1"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <FileText className="w-4 h-4" />
                                            View Manual
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        )}
                                      </div>

                                      {(appliance.dimensions || appliance.specs) && (
                                        <div className="pt-3 border-t">
                                          {appliance.dimensions && (
                                            <div className="mb-2">
                                              <Label className="text-xs text-gray-500">Dimensions</Label>
                                              <p className="text-sm text-gray-700">{appliance.dimensions}</p>
                                            </div>
                                          )}
                                          {appliance.specs && (
                                            <div>
                                              <Label className="text-xs text-gray-500">Specifications</Label>
                                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{appliance.specs}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {!appliance.dimensions && !appliance.specs && appliance.brand && appliance.model && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            await fetchSpecsMutation.mutateAsync({
                                              brand: appliance.brand,
                                              model: appliance.model,
                                              serial_number: appliance.serial_number,
                                              itemId: appliance.id
                                            });
                                          }}
                                          disabled={fetchSpecsMutation.isPending}
                                          className="text-xs w-full"
                                        >
                                          <Sparkles className="w-3 h-3 mr-1" />
                                          {fetchSpecsMutation.isPending ? 'Finding Specs...' : 'Fetch Dimensions & Specs'}
                                        </Button>
                                      )}

                                      {appliance.photos && appliance.photos.length > 1 && (
                                        <div>
                                          <Label className="text-xs text-gray-500 mb-2 block">Photos ({appliance.photos.length})</Label>
                                          <div className="grid grid-cols-4 gap-2">
                                            {appliance.photos.map((photo, idx) => (
                                              <img
                                                key={idx}
                                                src={getThumbnailUrl(photo, 150)}
                                                alt={`${appliance.name} ${idx + 1}`}
                                                className="w-full h-20 object-cover rounded"
                                                loading="lazy"
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingAppliance(appliance);
                                        }}
                                        className="text-xs w-full"
                                      >
                                        Edit Appliance
                                      </Button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="bg-white border-0 shadow-sm p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No appliances yet</h3>
                <p className="text-gray-500">Track your appliances with brand, model & manuals</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Home Maintenance
              </h2>
              <Button
                onClick={() => { setNewMaintenanceTask({}); setNewTaskAssignees([]); setShowAddTaskDialog(true); }}
                className="bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>

            <MaintenanceTips onAddTask={handleAddTaskFromTip} />

            {maintenanceTasks.length > 0 ? (
              <div className="space-y-4">
                {maintenanceTasks.map((task) => (
                  <MaintenanceTaskCard
                    key={task.id}
                    task={task}
                    onSync={handleSyncTask}
                    onComplete={handleCompleteTask}
                    onEdit={setEditingTask}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-white border-0 shadow-sm p-12 text-center">
                <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No maintenance tasks yet</h3>
                <p className="text-gray-500">Add tasks to keep your home in top condition</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="hardware" className="space-y-6">
            <HardwareList />
          </TabsContent>
        </Tabs>
      </div>

      {syncType === 'chore' && (
        <SyncToChoreDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          task={selectedTask}
          familyMembers={familyMembers}
          onConfirm={handleSyncToChore}
        />
      )}

      {syncType === 'calendar' && (
        <SyncToCalendarDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          task={selectedTask}
          onConfirm={handleSyncToCalendar}
        />
      )}

      <RescheduleDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        task={taskToReschedule}
        onConfirm={handleReschedule}
      />

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Task title"
              value={editingTask?.title || ''}
              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={editingTask?.description || ''}
              onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
              rows={3}
            />
            <Select
              value={editingTask?.category}
              onValueChange={(value) => setEditingTask({ ...editingTask, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hvac">HVAC</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="exterior">Exterior</SelectItem>
                <SelectItem value="interior">Interior</SelectItem>
                <SelectItem value="appliances">Appliances</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
                <SelectItem value="landscaping">Landscaping</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={editingTask?.priority}
              onValueChange={(value) => setEditingTask({ ...editingTask, priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Next due date"
              value={editingTask?.next_due || ''}
              onChange={(e) => setEditingTask({ ...editingTask, next_due: e.target.value })}
            />
            <Select
              value={editingTask?.frequency}
              onValueChange={(value) => setEditingTask({ ...editingTask, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="semi-annually">Semi-annually</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
                <SelectItem value="as-needed">As Needed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => updateMaintenanceTaskMutation.mutate({ 
                id: editingTask.id, 
                data: editingTask 
              })}
              disabled={!editingTask?.title || !editingTask?.category}
              className="w-full bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
            >
              Save Changes
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Delete this maintenance task?')) {
                  deleteMaintenanceTaskMutation.mutate(editingTask.id);
                }
              }}
              className="w-full"
            >
              Delete Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTaskDialog} onOpenChange={(v) => { setShowAddTaskDialog(v); if (!v) setNewTaskAssignees([]); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Maintenance Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Task title"
              value={newMaintenanceTask.title || ''}
              onChange={(e) => setNewMaintenanceTask({ ...newMaintenanceTask, title: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={newMaintenanceTask.description || ''}
              onChange={(e) => setNewMaintenanceTask({ ...newMaintenanceTask, description: e.target.value })}
              rows={3}
            />
            <Select
              value={newMaintenanceTask.category}
              onValueChange={(value) => setNewMaintenanceTask({ ...newMaintenanceTask, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hvac">HVAC</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="exterior">Exterior</SelectItem>
                <SelectItem value="interior">Interior</SelectItem>
                <SelectItem value="appliances">Appliances</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
                <SelectItem value="landscaping">Landscaping</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={newMaintenanceTask.priority}
              onValueChange={(value) => setNewMaintenanceTask({ ...newMaintenanceTask, priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Next due date"
              value={newMaintenanceTask.next_due || ''}
              onChange={(e) => setNewMaintenanceTask({ ...newMaintenanceTask, next_due: e.target.value })}
            />
            <Select
              value={newMaintenanceTask.frequency}
              onValueChange={(value) => setNewMaintenanceTask({ ...newMaintenanceTask, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="semi-annually">Semi-annually</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
                <SelectItem value="as-needed">As Needed</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <Label className="mb-2 block text-sm text-gray-600">Assign to family members' to-do lists:</Label>
              <div className="space-y-1">
                {familyMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-2 cursor-pointer" onClick={() => setNewTaskAssignees(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}>
                    <input type="checkbox" checked={newTaskAssignees.includes(m.id)} onChange={() => {}} className="w-4 h-4 pointer-events-none" />
                    <span className="text-sm">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button
              onClick={async () => {
                const task = await createMaintenanceTaskMutation.mutateAsync(newMaintenanceTask);
                if (newTaskAssignees.length > 0 && task) {
                  const selectedMembers = familyMembers.filter(m => newTaskAssignees.includes(m.id));
                  let timing = 'short-term';
                  if (newMaintenanceTask.next_due) {
                    const days = Math.floor((new Date(newMaintenanceTask.next_due) - new Date()) / (1000 * 60 * 60 * 24));
                    if (days > 30) timing = 'long-term';
                    else if (days > 7) timing = 'mid-term';
                  }
                  const chores = await Promise.all(
                    selectedMembers.map(member =>
                      base44.entities.Chore.create({
                        title: newMaintenanceTask.title,
                        assigned_to_member_id: member.id,
                        assigned_to_name: member.name,
                        timing,
                        next_due: newMaintenanceTask.next_due,
                        is_completed: false,
                        maintenance_task_id: task.id,
                      })
                    )
                  );
                  if (chores.length > 1) {
                    await Promise.all(chores.map(c => base44.entities.Chore.update(c.id, { linked_chore_ids: chores.filter(x => x.id !== c.id).map(x => x.id) })));
                  }
                  await base44.entities.MaintenanceTask.update(task.id, {
                    synced_chore_id: chores[0].id,
                    synced_chore_ids: chores.map(c => c.id),
                  });
                  queryClient.invalidateQueries(['chores']);
                  queryClient.invalidateQueries(['maintenanceTasks']);
                }
                setNewTaskAssignees([]);
              }}
              disabled={!newMaintenanceTask.title || !newMaintenanceTask.category}
              className="w-full bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
            >
              {newTaskAssignees.length > 0 ? `Add Task & Assign to ${newTaskAssignees.length} member${newTaskAssignees.length > 1 ? 's' : ''}` : 'Add Task'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Room name"
              value={newRoom.name || ''}
              onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            />
            <Select
              value={newRoom.floor}
              onValueChange={(value) => setNewRoom({ ...newRoom, floor: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Floor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basement">Basement</SelectItem>
                <SelectItem value="first">First Floor</SelectItem>
                <SelectItem value="second">Second Floor</SelectItem>
                <SelectItem value="attic">Attic</SelectItem>
                <SelectItem value="garage">Garage</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Description"
              value={newRoom.description || ''}
              onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
              rows={3}
            />
            <Input
              type="number"
              placeholder="Square footage"
              value={newRoom.square_footage || ''}
              onChange={(e) => setNewRoom({ ...newRoom, square_footage: parseFloat(e.target.value) })}
            />
            <div>
              <label className="text-sm font-medium mb-2 block">Room Photo</label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => roomPhotoInputRef.current?.click()}
                    disabled={isUploadingRoomPhoto}
                  >
                    {isUploadingRoomPhoto ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Upload Photo</>
                    )}
                  </Button>
                  <input
                    ref={roomPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleRoomPhotoUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                </div>
                <Input
                  placeholder="Or paste an image here (Ctrl+V / Cmd+V)..."
                  onPaste={handleRoomPhotoPaste}
                  disabled={isUploadingRoomPhoto}
                  className="text-sm"
                />
                {newRoom.photo_url && (
                  <div className="relative group">
                    <img
                      src={newRoom.photo_url}
                      alt="Room preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setNewRoom({ ...newRoom, photo_url: null })}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={() => createRoomMutation.mutate(newRoom)}
              disabled={!newRoom.name}
              className="w-full bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
            >
              Add Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showApplianceDialog} onOpenChange={setShowApplianceDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Appliance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Appliance name"
              value={newAppliance.name || ''}
              onChange={(e) => setNewAppliance({ ...newAppliance, name: e.target.value })}
            />
            <Input
              placeholder="Brand"
              value={newAppliance.brand || ''}
              onChange={(e) => setNewAppliance({ ...newAppliance, brand: e.target.value })}
            />
            <Input
              placeholder="Model number"
              value={newAppliance.model || ''}
              onChange={(e) => setNewAppliance({ ...newAppliance, model: e.target.value })}
            />
            <Select
              value={newAppliance.room_id}
              onValueChange={(value) => {
                const room = rooms.find(r => r.id === value);
                setNewAppliance({ ...newAppliance, room_id: value, room_name: room?.name });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Purchase date"
              value={newAppliance.purchase_date || ''}
              onChange={(e) => setNewAppliance({ ...newAppliance, purchase_date: e.target.value })}
            />
            <Input
              placeholder="Serial number (optional)"
              value={newAppliance.serial_number || ''}
              onChange={(e) => setNewAppliance({ ...newAppliance, serial_number: e.target.value })}
            />
            <Textarea
              placeholder="Notes"
              value={newAppliance.notes || ''}
              onChange={(e) => setNewAppliance({ ...newAppliance, notes: e.target.value })}
              rows={3}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-on-timeline"
                checked={newAppliance.show_on_history_timeline || false}
                onChange={(e) => setNewAppliance({ ...newAppliance, show_on_history_timeline: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="show-on-timeline" className="text-sm font-medium">
                Show on Property History Timeline
              </label>
            </div>
            <Textarea
              placeholder="Description for Property History timeline"
              value={newAppliance.history_description || ''}
              onChange={(e) => setNewAppliance({ ...newAppliance, history_description: e.target.value })}
              rows={3}
            />
            <div>
              <label className="text-sm font-medium mb-2 block">Photos</label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Upload Photo</>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                </div>
                <Input
                  placeholder="Or paste an image here (Ctrl+V / Cmd+V)..."
                  onPaste={handlePaste}
                  disabled={isUploadingPhoto}
                  className="text-sm"
                />
                {newAppliance.photos && newAppliance.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {newAppliance.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Appliance photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={() => createApplianceMutation.mutate(newAppliance)}
              disabled={!newAppliance.name || !newAppliance.brand || !newAppliance.model}
              className="w-full bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
            >
              Add Appliance
            </Button>
          </div>
          </DialogContent>
          </Dialog>

          <Dialog open={!!editingAppliance} onOpenChange={(open) => !open && setEditingAppliance(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Appliance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Appliance name"
              value={editingAppliance?.name || ''}
              onChange={(e) => setEditingAppliance({ ...editingAppliance, name: e.target.value })}
            />
            <Input
              placeholder="Brand"
              value={editingAppliance?.brand || ''}
              onChange={(e) => setEditingAppliance({ ...editingAppliance, brand: e.target.value })}
            />
            <Input
              placeholder="Model number"
              value={editingAppliance?.model || ''}
              onChange={(e) => setEditingAppliance({ ...editingAppliance, model: e.target.value })}
            />
            <Select
              value={editingAppliance?.room_id || ''}
              onValueChange={(value) => {
                const room = rooms.find(r => r.id === value);
                setEditingAppliance({ ...editingAppliance, room_id: value, room_name: room?.name });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Purchase date"
              value={editingAppliance?.purchase_date || ''}
              onChange={(e) => setEditingAppliance({ ...editingAppliance, purchase_date: e.target.value })}
            />
            <Input
              placeholder="Serial number (optional)"
              value={editingAppliance?.serial_number || ''}
              onChange={(e) => setEditingAppliance({ ...editingAppliance, serial_number: e.target.value })}
            />
            <Textarea
              placeholder="Notes"
              value={editingAppliance?.notes || ''}
              onChange={(e) => setEditingAppliance({ ...editingAppliance, notes: e.target.value })}
              rows={3}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-show-on-timeline"
                checked={editingAppliance?.show_on_history_timeline || false}
                onChange={(e) => setEditingAppliance({ ...editingAppliance, show_on_history_timeline: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="edit-show-on-timeline" className="text-sm font-medium">
                Show on Property History Timeline
              </label>
            </div>
            <Textarea
              placeholder="Description for Property History timeline"
              value={editingAppliance?.history_description || ''}
              onChange={(e) => setEditingAppliance({ ...editingAppliance, history_description: e.target.value })}
              rows={3}
            />
            <Button
              onClick={() => updateApplianceMutation.mutate({ 
                id: editingAppliance.id, 
                data: editingAppliance 
              })}
              disabled={!editingAppliance?.name || !editingAppliance?.brand || !editingAppliance?.model}
              className="w-full bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
            >
              Save Changes
            </Button>
          </div>
          </DialogContent>
          </Dialog>
          </div>
          );
          }