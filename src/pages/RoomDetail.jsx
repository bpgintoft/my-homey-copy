import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft,
  Plus,
  Palette,
  Package,
  Pencil,
  Trash2,
  Calendar,
  Shield,
  FileText,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';

export default function RoomDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('id');

  const [isItemOpen, setIsItemOpen] = useState(false);
  const [isPaintOpen, setIsPaintOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingPaint, setEditingPaint] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '', type: 'appliance', brand: '', model: '', serial_number: '',
    purchase_date: '', warranty_expiration: '', notes: ''
  });

  const [newPaint, setNewPaint] = useState({
    surface: 'walls', brand: '', color_name: '', color_code: '',
    finish: 'eggshell', hex_color: '#ffffff', date_painted: '', notes: ''
  });

  const queryClient = useQueryClient();

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const rooms = await base44.entities.Room.filter({ id: roomId });
      return rooms[0];
    },
    enabled: !!roomId,
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['roomItems', roomId],
    queryFn: () => base44.entities.RoomItem.filter({ room_id: roomId }),
    enabled: !!roomId,
  });

  const { data: paints, isLoading: paintsLoading } = useQuery({
    queryKey: ['paintColors', roomId],
    queryFn: () => base44.entities.PaintColor.filter({ room_id: roomId }),
    enabled: !!roomId,
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.RoomItem.create({ ...data, room_id: roomId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomItems', roomId] });
      setIsItemOpen(false);
      setNewItem({ name: '', type: 'appliance', brand: '', model: '', serial_number: '', purchase_date: '', warranty_expiration: '', notes: '' });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RoomItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomItems', roomId] });
      setEditingItem(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.RoomItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomItems', roomId] }),
  });

  const createPaintMutation = useMutation({
    mutationFn: (data) => base44.entities.PaintColor.create({ ...data, room_id: roomId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paintColors', roomId] });
      setIsPaintOpen(false);
      setNewPaint({ surface: 'walls', brand: '', color_name: '', color_code: '', finish: 'eggshell', hex_color: '#ffffff', date_painted: '', notes: '' });
    },
  });

  const updatePaintMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PaintColor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paintColors', roomId] });
      setEditingPaint(null);
    },
  });

  const deletePaintMutation = useMutation({
    mutationFn: (id) => base44.entities.PaintColor.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paintColors', roomId] }),
  });

  const handleSaveItem = async (data, isEdit = false) => {
    setIsSubmitting(true);
    if (isEdit) {
      await updateItemMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createItemMutation.mutateAsync(data);
    }
    setIsSubmitting(false);
  };

  const handleSavePaint = async (data, isEdit = false) => {
    setIsSubmitting(true);
    if (isEdit) {
      await updatePaintMutation.mutateAsync({ id: editingPaint.id, data });
    } else {
      await createPaintMutation.mutateAsync(data);
    }
    setIsSubmitting(false);
  };

  const typeColors = {
    appliance: 'bg-blue-100 text-blue-700',
    furniture: 'bg-purple-100 text-purple-700',
    fixture: 'bg-amber-100 text-amber-700',
    feature: 'bg-emerald-100 text-emerald-700',
  };

  const surfaceLabels = {
    walls: 'Walls',
    ceiling: 'Ceiling',
    trim: 'Trim',
    accent: 'Accent Wall',
    doors: 'Doors',
    cabinets: 'Cabinets',
  };

  if (roomLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Room not found</h2>
          <Link to={createPageUrl('Rooms')} className="text-blue-600 hover:underline">
            Return to Rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero */}
      <div className="relative h-64 bg-gradient-to-r from-blue-600 to-indigo-600">
        {room.photo_url && (
          <img src={room.photo_url} alt={room.name} className="w-full h-full object-cover absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
        <div className="container mx-auto px-6 relative h-full flex flex-col justify-end pb-6">
          <Link to={createPageUrl('Rooms')} className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Rooms
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-white mb-1">{room.name}</h1>
            <p className="text-white/80">
              {room.floor?.charAt(0).toUpperCase() + room.floor?.slice(1)} Floor
              {room.square_footage && ` • ${room.square_footage} sq ft`}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 -mt-8 relative z-10">
        <Tabs defaultValue="items" className="space-y-6">
          <TabsList className="bg-white shadow-lg border-0 p-1 h-auto">
            <TabsTrigger value="items" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 px-6 py-2.5">
              <Package className="w-4 h-4 mr-2" />
              Items & Appliances
            </TabsTrigger>
            <TabsTrigger value="paint" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 px-6 py-2.5">
              <Palette className="w-4 h-4 mr-2" />
              Paint Colors
            </TabsTrigger>
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-800">Items & Appliances</h2>
              <Dialog open={isItemOpen} onOpenChange={setIsItemOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Name *</Label>
                      <Input 
                        value={newItem.name}
                        onChange={e => setNewItem({...newItem, name: e.target.value})}
                        placeholder="e.g., Samsung Refrigerator"
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newItem.type} onValueChange={v => setNewItem({...newItem, type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appliance">Appliance</SelectItem>
                          <SelectItem value="furniture">Furniture</SelectItem>
                          <SelectItem value="fixture">Fixture</SelectItem>
                          <SelectItem value="feature">Feature</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Brand</Label>
                        <Input 
                          value={newItem.brand}
                          onChange={e => setNewItem({...newItem, brand: e.target.value})}
                          placeholder="e.g., Samsung"
                        />
                      </div>
                      <div>
                        <Label>Model</Label>
                        <Input 
                          value={newItem.model}
                          onChange={e => setNewItem({...newItem, model: e.target.value})}
                          placeholder="Model number"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Serial Number</Label>
                      <Input 
                        value={newItem.serial_number}
                        onChange={e => setNewItem({...newItem, serial_number: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Purchase Date</Label>
                        <Input 
                          type="date"
                          value={newItem.purchase_date}
                          onChange={e => setNewItem({...newItem, purchase_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Warranty Expires</Label>
                        <Input 
                          type="date"
                          value={newItem.warranty_expiration}
                          onChange={e => setNewItem({...newItem, warranty_expiration: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea 
                        value={newItem.notes}
                        onChange={e => setNewItem({...newItem, notes: e.target.value})}
                        placeholder="Any additional notes..."
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setIsItemOpen(false)} className="flex-1">Cancel</Button>
                      <Button 
                        onClick={() => handleSaveItem(newItem)} 
                        disabled={!newItem.name || isSubmitting}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {isSubmitting ? 'Saving...' : 'Add Item'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {itemsLoading ? (
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
            ) : items?.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {items.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <Badge className={typeColors[item.type]}>{item.type}</Badge>
                              <h3 className="font-semibold text-slate-800 mt-2">{item.name}</h3>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                                <Pencil className="w-4 h-4 text-slate-400" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteItemMutation.mutate(item.id)}>
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </div>
                          {(item.brand || item.model) && (
                            <p className="text-sm text-slate-600 mb-2">
                              {item.brand} {item.model}
                            </p>
                          )}
                          {item.serial_number && (
                            <p className="text-xs text-slate-500 mb-2">S/N: {item.serial_number}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            {item.purchase_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Purchased: {new Date(item.purchase_date).toLocaleDateString()}
                              </span>
                            )}
                            {item.warranty_expiration && (
                              <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Warranty: {new Date(item.warranty_expiration).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-sm text-slate-600 mt-3 pt-3 border-t">{item.notes}</p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <Card className="border-0 shadow-md">
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-600 mb-1">No items yet</h3>
                  <p className="text-sm text-slate-500">Add appliances, furniture, and fixtures to track</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Paint Tab */}
          <TabsContent value="paint">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-800">Paint Colors</h2>
              <Dialog open={isPaintOpen} onOpenChange={setIsPaintOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Paint Color
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Paint Color</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Surface</Label>
                      <Select value={newPaint.surface} onValueChange={v => setNewPaint({...newPaint, surface: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="walls">Walls</SelectItem>
                          <SelectItem value="ceiling">Ceiling</SelectItem>
                          <SelectItem value="trim">Trim</SelectItem>
                          <SelectItem value="accent">Accent Wall</SelectItem>
                          <SelectItem value="doors">Doors</SelectItem>
                          <SelectItem value="cabinets">Cabinets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Brand</Label>
                        <Input 
                          value={newPaint.brand}
                          onChange={e => setNewPaint({...newPaint, brand: e.target.value})}
                          placeholder="e.g., Sherwin-Williams"
                        />
                      </div>
                      <div>
                        <Label>Color Name *</Label>
                        <Input 
                          value={newPaint.color_name}
                          onChange={e => setNewPaint({...newPaint, color_name: e.target.value})}
                          placeholder="e.g., Agreeable Gray"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Color Code</Label>
                        <Input 
                          value={newPaint.color_code}
                          onChange={e => setNewPaint({...newPaint, color_code: e.target.value})}
                          placeholder="e.g., SW 7029"
                        />
                      </div>
                      <div>
                        <Label>Hex Color</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color"
                            value={newPaint.hex_color}
                            onChange={e => setNewPaint({...newPaint, hex_color: e.target.value})}
                            className="w-14 h-10 p-1"
                          />
                          <Input 
                            value={newPaint.hex_color}
                            onChange={e => setNewPaint({...newPaint, hex_color: e.target.value})}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Finish</Label>
                        <Select value={newPaint.finish} onValueChange={v => setNewPaint({...newPaint, finish: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">Flat</SelectItem>
                            <SelectItem value="matte">Matte</SelectItem>
                            <SelectItem value="eggshell">Eggshell</SelectItem>
                            <SelectItem value="satin">Satin</SelectItem>
                            <SelectItem value="semi-gloss">Semi-Gloss</SelectItem>
                            <SelectItem value="gloss">Gloss</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Date Painted</Label>
                        <Input 
                          type="date"
                          value={newPaint.date_painted}
                          onChange={e => setNewPaint({...newPaint, date_painted: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea 
                        value={newPaint.notes}
                        onChange={e => setNewPaint({...newPaint, notes: e.target.value})}
                        placeholder="Any notes (primer used, coats applied, etc.)"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setIsPaintOpen(false)} className="flex-1">Cancel</Button>
                      <Button 
                        onClick={() => handleSavePaint(newPaint)} 
                        disabled={!newPaint.color_name || isSubmitting}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {isSubmitting ? 'Saving...' : 'Add Color'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {paintsLoading ? (
              <div className="grid md:grid-cols-3 gap-4">
                {[1,2,3].map(i => (
                  <Card key={i} className="border-0 shadow-md animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-16 bg-slate-200 rounded mb-3" />
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : paints?.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                <AnimatePresence>
                  {paints.map((paint, i) => (
                    <motion.div
                      key={paint.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                        <div 
                          className="h-20 w-full"
                          style={{ backgroundColor: paint.hex_color || '#e2e8f0' }}
                        />
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge variant="outline" className="mb-2">{surfaceLabels[paint.surface]}</Badge>
                              <h3 className="font-semibold text-slate-800">{paint.color_name}</h3>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setEditingPaint(paint)}>
                                <Pencil className="w-4 h-4 text-slate-400" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deletePaintMutation.mutate(paint.id)}>
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </div>
                          {paint.brand && <p className="text-sm text-slate-600">{paint.brand}</p>}
                          {paint.color_code && <p className="text-xs text-slate-500">{paint.color_code}</p>}
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <span className="capitalize">{paint.finish}</span>
                            {paint.date_painted && (
                              <span>• Painted {new Date(paint.date_painted).toLocaleDateString()}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <Card className="border-0 shadow-md">
                <CardContent className="py-12 text-center">
                  <Palette className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-600 mb-1">No paint colors yet</h3>
                  <p className="text-sm text-slate-500">Track wall colors for easy touch-ups and future reference</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editingItem && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Name *</Label>
                  <Input 
                    value={editingItem.name}
                    onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={editingItem.type} onValueChange={v => setEditingItem({...editingItem, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appliance">Appliance</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="fixture">Fixture</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Brand</Label>
                    <Input 
                      value={editingItem.brand || ''}
                      onChange={e => setEditingItem({...editingItem, brand: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input 
                      value={editingItem.model || ''}
                      onChange={e => setEditingItem({...editingItem, model: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Serial Number</Label>
                  <Input 
                    value={editingItem.serial_number || ''}
                    onChange={e => setEditingItem({...editingItem, serial_number: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Purchase Date</Label>
                    <Input 
                      type="date"
                      value={editingItem.purchase_date || ''}
                      onChange={e => setEditingItem({...editingItem, purchase_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Warranty Expires</Label>
                    <Input 
                      type="date"
                      value={editingItem.warranty_expiration || ''}
                      onChange={e => setEditingItem({...editingItem, warranty_expiration: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea 
                    value={editingItem.notes || ''}
                    onChange={e => setEditingItem({...editingItem, notes: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setEditingItem(null)} className="flex-1">Cancel</Button>
                  <Button 
                    onClick={() => handleSaveItem(editingItem, true)} 
                    disabled={!editingItem.name || isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Paint Dialog */}
      <Dialog open={!!editingPaint} onOpenChange={() => setEditingPaint(null)}>
        <DialogContent>
          {editingPaint && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Paint Color</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Surface</Label>
                  <Select value={editingPaint.surface} onValueChange={v => setEditingPaint({...editingPaint, surface: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walls">Walls</SelectItem>
                      <SelectItem value="ceiling">Ceiling</SelectItem>
                      <SelectItem value="trim">Trim</SelectItem>
                      <SelectItem value="accent">Accent Wall</SelectItem>
                      <SelectItem value="doors">Doors</SelectItem>
                      <SelectItem value="cabinets">Cabinets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Brand</Label>
                    <Input 
                      value={editingPaint.brand || ''}
                      onChange={e => setEditingPaint({...editingPaint, brand: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Color Name *</Label>
                    <Input 
                      value={editingPaint.color_name}
                      onChange={e => setEditingPaint({...editingPaint, color_name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Color Code</Label>
                    <Input 
                      value={editingPaint.color_code || ''}
                      onChange={e => setEditingPaint({...editingPaint, color_code: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Hex Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color"
                        value={editingPaint.hex_color || '#ffffff'}
                        onChange={e => setEditingPaint({...editingPaint, hex_color: e.target.value})}
                        className="w-14 h-10 p-1"
                      />
                      <Input 
                        value={editingPaint.hex_color || ''}
                        onChange={e => setEditingPaint({...editingPaint, hex_color: e.target.value})}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Finish</Label>
                    <Select value={editingPaint.finish} onValueChange={v => setEditingPaint({...editingPaint, finish: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat</SelectItem>
                        <SelectItem value="matte">Matte</SelectItem>
                        <SelectItem value="eggshell">Eggshell</SelectItem>
                        <SelectItem value="satin">Satin</SelectItem>
                        <SelectItem value="semi-gloss">Semi-Gloss</SelectItem>
                        <SelectItem value="gloss">Gloss</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date Painted</Label>
                    <Input 
                      type="date"
                      value={editingPaint.date_painted || ''}
                      onChange={e => setEditingPaint({...editingPaint, date_painted: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea 
                    value={editingPaint.notes || ''}
                    onChange={e => setEditingPaint({...editingPaint, notes: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setEditingPaint(null)} className="flex-1">Cancel</Button>
                  <Button 
                    onClick={() => handleSavePaint(editingPaint, true)} 
                    disabled={!editingPaint.color_name || isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}