import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Home as HomeIcon, Package, FileText, ExternalLink, Calendar, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function House() {
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showApplianceDialog, setShowApplianceDialog] = useState(false);
  const [newRoom, setNewRoom] = useState({});
  const [newAppliance, setNewAppliance] = useState({});
  const queryClient = useQueryClient();

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const { data: appliances = [] } = useQuery({
    queryKey: ['appliances'],
    queryFn: () => base44.entities.Appliance.list(),
  });

  const createRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.Room.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms']);
      setShowRoomDialog(false);
      setNewRoom({});
    },
  });

  const createApplianceMutation = useMutation({
    mutationFn: (data) => base44.entities.Appliance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appliances']);
      setShowApplianceDialog(false);
      setNewAppliance({});
    },
  });

  const findManualMutation = useMutation({
    mutationFn: async ({ brand, model }) => {
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
      return result;
    },
  });

  const appliancesByRoom = appliances.reduce((acc, appliance) => {
    const room = appliance.room_name || 'Unassigned';
    if (!acc[room]) acc[room] = [];
    acc[room].push(appliance);
    return acc;
  }, {});

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
        <div className="relative h-48 md:h-80 house-banner-bg overflow-hidden">
          <div className="relative z-10 h-full flex items-center justify-between px-4 md:px-12 gap-2 md:gap-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl md:text-5xl font-bold text-gray-800 mb-1 md:mb-2">
                House
              </h1>
              <p className="text-xs md:text-xl text-gray-700">
                Rooms, appliances & organization
              </p>
            </div>
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/e7138b18e_familyappliances.png" 
              alt="Family with appliances"
              className="max-h-40 md:max-h-full w-auto object-contain flex-shrink-0"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="rooms" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="appliances">Appliances</TabsTrigger>
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
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg">{room.name}</h3>
                        {room.floor && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0">
                            {room.floor}
                          </Badge>
                        )}
                      </div>
                      {room.description && (
                        <p className="text-sm text-gray-600 mb-3">{room.description}</p>
                      )}
                      {room.square_footage && (
                        <div className="text-sm text-gray-500">
                          {room.square_footage} sq ft
                        </div>
                      )}
                      <div className="text-sm text-gray-500 mt-2">
                        {appliancesByRoom[room.name]?.length || 0} appliances
                      </div>
                    </CardContent>
                  </Card>
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
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {roomAppliances.map((appliance) => (
                        <Card key={appliance.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-5">
                            <h4 className="font-semibold text-gray-900 mb-2">{appliance.name}</h4>
                            <div className="space-y-1 text-sm text-gray-600 mb-3">
                              <div><span className="font-medium">Brand:</span> {appliance.brand}</div>
                              <div><span className="font-medium">Model:</span> {appliance.model}</div>
                              {appliance.purchase_date && (
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Calendar className="w-3 h-3" />
                                  Purchased {new Date(appliance.purchase_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            {appliance.manual_url ? (
                              <a
                                href={appliance.manual_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                              >
                                <FileText className="w-4 h-4" />
                                View Manual
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const result = await findManualMutation.mutateAsync({
                                    brand: appliance.brand,
                                    model: appliance.model
                                  });
                                  if (result.found && result.manual_url) {
                                    await base44.entities.Appliance.update(appliance.id, {
                                      ...appliance,
                                      manual_url: result.manual_url
                                    });
                                    queryClient.invalidateQueries(['appliances']);
                                  }
                                }}
                                disabled={findManualMutation.isPending}
                                className="text-xs"
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                {findManualMutation.isPending ? 'Finding...' : 'Find Manual'}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
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
        </Tabs>
      </div>

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
        <DialogContent>
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
    </div>
  );
}