import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Home, 
  Plus, 
  Bed,
  Bath,
  ChefHat,
  Sofa,
  Car,
  TreeDeciduous,
  Warehouse,
  LayoutGrid,
  ArrowRight,
  Edit2,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { motion } from 'framer-motion';

export default function Rooms() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [newRoom, setNewRoom] = useState({
    name: '',
    floor: 'first',
    description: '',
    square_footage: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const createRoomMutation = useMutation({
    mutationFn: (roomData) => base44.entities.Room.create(roomData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsAddOpen(false);
      setNewRoom({ name: '', floor: 'first', description: '', square_footage: '' });
      setPhotoFile(null);
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Room.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setEditingRoom(null);
      setPhotoFile(null);
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id) => base44.entities.Room.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });

  const handleCreateRoom = async () => {
    setIsCreating(true);
    let photoUrl = null;
    
    if (photoFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
      photoUrl = file_url;
    }

    await createRoomMutation.mutateAsync({
      ...newRoom,
      square_footage: newRoom.square_footage ? parseInt(newRoom.square_footage) : null,
      photo_url: photoUrl,
    });
    setIsCreating(false);
  };

  const handleUpdateRoom = async () => {
    setIsCreating(true);
    let photoUrl = editingRoom.photo_url;
    
    if (photoFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
      photoUrl = file_url;
    }

    await updateRoomMutation.mutateAsync({
      id: editingRoom.id,
      data: {
        name: editingRoom.name,
        floor: editingRoom.floor,
        description: editingRoom.description,
        square_footage: editingRoom.square_footage ? parseInt(editingRoom.square_footage) : null,
        photo_url: photoUrl,
      }
    });
    setIsCreating(false);
  };

  const getRoomIcon = (name) => {
    const n = name?.toLowerCase() || '';
    if (n.includes('bedroom') || n.includes('master')) return Bed;
    if (n.includes('bath')) return Bath;
    if (n.includes('kitchen')) return ChefHat;
    if (n.includes('living') || n.includes('family') || n.includes('den')) return Sofa;
    if (n.includes('garage')) return Car;
    if (n.includes('yard') || n.includes('patio') || n.includes('garden')) return TreeDeciduous;
    if (n.includes('basement') || n.includes('attic') || n.includes('storage')) return Warehouse;
    return LayoutGrid;
  };

  const floorLabels = {
    basement: 'Basement',
    first: 'First Floor',
    second: 'Second Floor',
    attic: 'Attic',
    garage: 'Garage',
    outdoor: 'Outdoor',
  };

  const floorColors = {
    basement: 'from-slate-500 to-slate-600',
    first: 'from-blue-500 to-indigo-600',
    second: 'from-purple-500 to-violet-600',
    attic: 'from-amber-500 to-orange-600',
    garage: 'from-slate-600 to-slate-700',
    outdoor: 'from-emerald-500 to-green-600',
  };

  // Group rooms by floor
  const roomsByFloor = rooms?.reduce((acc, room) => {
    const floor = room.floor || 'first';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {}) || {};

  const floorOrder = ['basement', 'first', 'second', 'attic', 'garage', 'outdoor'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-blue-200 mb-3">
              <Home className="w-5 h-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Spaces</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Rooms & Spaces</h1>
            <p className="text-blue-100">Manage every corner of your home</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Add Room Button */}
        <div className="flex justify-end mb-6 -mt-12 relative z-10">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Room Name *</Label>
                  <Input 
                    value={newRoom.name}
                    onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                    placeholder="e.g., Master Bedroom, Kitchen"
                  />
                </div>
                <div>
                  <Label>Floor</Label>
                  <Select value={newRoom.floor} onValueChange={v => setNewRoom({...newRoom, floor: v})}>
                    <SelectTrigger>
                      <SelectValue />
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
                </div>
                <div>
                  <Label>Square Footage</Label>
                  <Input 
                    type="number"
                    value={newRoom.square_footage}
                    onChange={e => setNewRoom({...newRoom, square_footage: e.target.value})}
                    placeholder="e.g., 200"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={newRoom.description}
                    onChange={e => setNewRoom({...newRoom, description: e.target.value})}
                    placeholder="Any notes about this room..."
                  />
                </div>
                <div>
                  <Label>Photo</Label>
                  <Input 
                    type="file"
                    onChange={e => setPhotoFile(e.target.files[0])}
                    accept="image/*"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateRoom} 
                    disabled={!newRoom.name || isCreating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreating ? 'Creating...' : 'Create Room'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Room Dialog */}
        <Dialog open={!!editingRoom} onOpenChange={(open) => !open && setEditingRoom(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
            </DialogHeader>
            {editingRoom && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Room Name *</Label>
                  <Input 
                    value={editingRoom.name}
                    onChange={e => setEditingRoom({...editingRoom, name: e.target.value})}
                    placeholder="e.g., Master Bedroom, Kitchen"
                  />
                </div>
                <div>
                  <Label>Floor</Label>
                  <Select value={editingRoom.floor} onValueChange={v => setEditingRoom({...editingRoom, floor: v})}>
                    <SelectTrigger>
                      <SelectValue />
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
                </div>
                <div>
                  <Label>Square Footage</Label>
                  <Input 
                    type="number"
                    value={editingRoom.square_footage || ''}
                    onChange={e => setEditingRoom({...editingRoom, square_footage: e.target.value})}
                    placeholder="e.g., 200"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={editingRoom.description || ''}
                    onChange={e => setEditingRoom({...editingRoom, description: e.target.value})}
                    placeholder="Any notes about this room..."
                  />
                </div>
                <div>
                  <Label>Photo</Label>
                  <Input 
                    type="file"
                    onChange={e => setPhotoFile(e.target.files[0])}
                    accept="image/*"
                  />
                  {editingRoom.photo_url && !photoFile && (
                    <p className="text-xs text-slate-500 mt-1">Current photo will be kept unless you upload a new one</p>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setEditingRoom(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateRoom} 
                    disabled={!editingRoom.name || isCreating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rooms by Floor */}
        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <Card key={i} className="border-0 shadow-md animate-pulse">
                <CardContent className="p-0">
                  <div className="h-32 bg-slate-200" />
                  <div className="p-4">
                    <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rooms?.length > 0 ? (
          <div className="space-y-10">
            {floorOrder.filter(f => roomsByFloor[f]?.length > 0).map((floor, fi) => (
              <motion.div
                key={floor}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: fi * 0.1 }}
              >
                <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${floorColors[floor]}`} />
                  {floorLabels[floor]}
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {roomsByFloor[floor].map((room, i) => {
                    const Icon = getRoomIcon(room.name);
                    return (
                      <motion.div
                       key={room.id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: fi * 0.1 + i * 0.05 }}
                      >
                       <Card className="border-0 shadow-md hover:shadow-xl transition-all group overflow-hidden">
                         <CardContent className="p-0">
                           <Link to={createPageUrl(`RoomDetail?id=${room.id}`)}>
                             <div className={`h-32 bg-gradient-to-br ${floorColors[floor]} flex items-center justify-center relative overflow-hidden cursor-pointer`}>
                               {room.photo_url ? (
                                 <img src={room.photo_url} alt={room.name} className="w-full h-full object-cover" />
                               ) : (
                                 <Icon className="w-12 h-12 text-white/80" />
                               )}
                               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                             </div>
                           </Link>
                           <div className="p-4">
                             <div className="flex items-center justify-between">
                               <Link to={createPageUrl(`RoomDetail?id=${room.id}`)} className="flex-1">
                                 <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                   {room.name}
                                 </h3>
                               </Link>
                               <div className="flex gap-1">
                                 <Button 
                                   variant="ghost" 
                                   size="sm"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     setEditingRoom(room);
                                   }}
                                 >
                                   <Edit2 className="w-4 h-4 text-slate-500" />
                                 </Button>
                                 <Button 
                                   variant="ghost" 
                                   size="sm"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     if (confirm(`Delete ${room.name}?`)) {
                                       deleteRoomMutation.mutate(room.id);
                                     }
                                   }}
                                 >
                                   <Trash2 className="w-4 h-4 text-red-500" />
                                 </Button>
                               </div>
                             </div>
                             {room.square_footage && (
                               <p className="text-sm text-slate-500 mt-1">{room.square_footage} sq ft</p>
                             )}
                           </div>
                         </CardContent>
                       </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No rooms added yet</h3>
              <p className="text-slate-500 mb-4">
                Start by adding the rooms and spaces in your home
              </p>
              <Button onClick={() => setIsAddOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Room
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}