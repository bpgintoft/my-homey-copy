import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Package, Plus, Search, FileText, Wrench, Calendar,
  ExternalLink, Loader2, Youtube, Book, Pencil, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, isBefore } from 'date-fns';

export default function Appliances() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingManual, setSearchingManual] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '', brand: '', model: '', serial_number: '', room_id: '',
    purchase_date: '', warranty_expiration: '', maintenance_interval_months: '',
    last_maintenance_date: '', maintenance_notes: '', notes: ''
  });

  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['appliances'],
    queryFn: () => base44.entities.RoomItem.filter({ type: 'appliance' }),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.RoomItem.create({ ...data, type: 'appliance' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appliances'] });
      setIsAddOpen(false);
      resetForm();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RoomItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appliances'] });
      setEditingItem(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.RoomItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appliances'] }),
  });

  const resetForm = () => {
    setNewItem({
      name: '', brand: '', model: '', serial_number: '', room_id: '',
      purchase_date: '', warranty_expiration: '', maintenance_interval_months: '',
      last_maintenance_date: '', maintenance_notes: '', notes: ''
    });
  };

  const handleSave = async (data, isEdit = false) => {
    setIsSubmitting(true);
    const saveData = {
      ...data,
      maintenance_interval_months: data.maintenance_interval_months ? parseInt(data.maintenance_interval_months) : null,
    };
    if (isEdit) {
      await updateItemMutation.mutateAsync({ id: editingItem.id, data: saveData });
    } else {
      await createItemMutation.mutateAsync(saveData);
    }
    setIsSubmitting(false);
  };

  const searchForManual = async (item) => {
    setSearchingManual(item.id);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the official user manual PDF download link for: ${item.brand} ${item.model} ${item.name}. Return the direct URL to the manual if found.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          manual_url: { type: "string" },
          manual_title: { type: "string" },
          found: { type: "boolean" }
        }
      }
    });
    
    if (result.found && result.manual_url) {
      await updateItemMutation.mutateAsync({
        id: item.id,
        data: { manual_url: result.manual_url }
      });
    }
    setSearchingManual(null);
  };

  const getMaintenanceStatus = (item) => {
    if (!item.maintenance_interval_months || !item.last_maintenance_date) return null;
    const nextDue = addMonths(new Date(item.last_maintenance_date), item.maintenance_interval_months);
    const today = new Date();
    if (isBefore(nextDue, today)) return { status: 'overdue', date: nextDue };
    if (isBefore(nextDue, addMonths(today, 1))) return { status: 'due-soon', date: nextDue };
    return { status: 'ok', date: nextDue };
  };

  const filteredItems = items?.filter(item => 
    !searchQuery || 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const roomMap = rooms?.reduce((acc, r) => ({ ...acc, [r.id]: r.name }), {}) || {};

  const ApplianceForm = ({ item, onSave, onCancel, isEdit = false }) => {
    const [formData, setFormData] = useState(item);

    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Appliance Name *</Label>
            <Input 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Refrigerator, Dishwasher"
            />
          </div>
          <div>
            <Label>Brand</Label>
            <Input 
              value={formData.brand || ''}
              onChange={e => setFormData({...formData, brand: e.target.value})}
              placeholder="e.g., Samsung, LG"
            />
          </div>
          <div>
            <Label>Model Number</Label>
            <Input 
              value={formData.model || ''}
              onChange={e => setFormData({...formData, model: e.target.value})}
              placeholder="Model #"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Serial Number</Label>
            <Input 
              value={formData.serial_number || ''}
              onChange={e => setFormData({...formData, serial_number: e.target.value})}
            />
          </div>
          <div>
            <Label>Room</Label>
            <Select value={formData.room_id || ''} onValueChange={v => setFormData({...formData, room_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                {rooms?.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Purchase Date</Label>
            <Input 
              type="date"
              value={formData.purchase_date || ''}
              onChange={e => setFormData({...formData, purchase_date: e.target.value})}
            />
          </div>
          <div>
            <Label>Warranty Expires</Label>
            <Input 
              type="date"
              value={formData.warranty_expiration || ''}
              onChange={e => setFormData({...formData, warranty_expiration: e.target.value})}
            />
          </div>
        </div>
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Maintenance Schedule</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Maintenance Interval (months)</Label>
              <Input 
                type="number"
                value={formData.maintenance_interval_months || ''}
                onChange={e => setFormData({...formData, maintenance_interval_months: e.target.value})}
                placeholder="e.g., 6, 12"
              />
            </div>
            <div>
              <Label>Last Maintenance</Label>
              <Input 
                type="date"
                value={formData.last_maintenance_date || ''}
                onChange={e => setFormData({...formData, last_maintenance_date: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-3">
            <Label>Maintenance Notes</Label>
            <Textarea 
              value={formData.maintenance_notes || ''}
              onChange={e => setFormData({...formData, maintenance_notes: e.target.value})}
              placeholder="What maintenance is needed? Filter changes, cleaning, etc."
            />
          </div>
        </div>
        <div>
          <Label>General Notes</Label>
          <Textarea 
            value={formData.notes || ''}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button 
            onClick={() => onSave(formData, isEdit)} 
            disabled={!formData.name || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Appliance'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-blue-200 mb-3">
              <Package className="w-5 h-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Inventory</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Appliances</h1>
            <p className="text-blue-100">Track all your home appliances with manuals and maintenance schedules</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search & Add */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6 -mt-12 relative z-10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search appliances..."
              className="pl-10 bg-white shadow-lg border-0"
            />
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Appliance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Appliance</DialogTitle>
              </DialogHeader>
              <ApplianceForm 
                item={newItem}
                onSave={handleSave}
                onCancel={() => { setIsAddOpen(false); resetForm(); }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Appliances Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <Card key={i} className="border-0 shadow-md animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-slate-100 rounded w-1/2 mb-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredItems.map((item, i) => {
                const maintenanceStatus = getMaintenanceStatus(item);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="border-0 shadow-md hover:shadow-xl transition-all group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-slate-800">{item.name}</h3>
                            {item.brand && (
                              <p className="text-slate-600">{item.brand} {item.model}</p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                              <Pencil className="w-4 h-4 text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteItemMutation.mutate(item.id)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>

                        {item.room_id && roomMap[item.room_id] && (
                          <Badge variant="outline" className="mb-3">{roomMap[item.room_id]}</Badge>
                        )}

                        {/* Maintenance Status */}
                        {maintenanceStatus && (
                          <div className={`p-3 rounded-lg mb-3 ${
                            maintenanceStatus.status === 'overdue' ? 'bg-red-50 border border-red-200' :
                            maintenanceStatus.status === 'due-soon' ? 'bg-amber-50 border border-amber-200' :
                            'bg-green-50 border border-green-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Wrench className={`w-4 h-4 ${
                                maintenanceStatus.status === 'overdue' ? 'text-red-600' :
                                maintenanceStatus.status === 'due-soon' ? 'text-amber-600' :
                                'text-green-600'
                              }`} />
                              <span className="text-sm font-medium">
                                {maintenanceStatus.status === 'overdue' ? 'Maintenance Overdue' :
                                 maintenanceStatus.status === 'due-soon' ? 'Maintenance Due Soon' :
                                 'Next Maintenance'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              {format(maintenanceStatus.date, 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}

                        {/* Quick Info */}
                        <div className="space-y-2 text-sm text-slate-600 mb-4">
                          {item.serial_number && (
                            <p>S/N: {item.serial_number}</p>
                          )}
                          {item.warranty_expiration && (
                            <p className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Warranty: {format(new Date(item.warranty_expiration), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 pt-3 border-t">
                          {item.manual_url ? (
                            <a href={item.manual_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <Book className="w-3 h-3 mr-1" /> Manual
                              </Button>
                            </a>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => searchForManual(item)}
                              disabled={searchingManual === item.id}
                            >
                              {searchingManual === item.id ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Search className="w-3 h-3 mr-1" />
                              )}
                              Find Manual
                            </Button>
                          )}
                          <a 
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.brand} ${item.model} maintenance`)}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              <Youtube className="w-3 h-3 mr-1 text-red-600" /> How-To
                            </Button>
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No appliances found</h3>
              <p className="text-slate-500 mb-4">Start tracking your home appliances</p>
              <Button onClick={() => setIsAddOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Add Your First Appliance
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editingItem && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Appliance</DialogTitle>
              </DialogHeader>
              <ApplianceForm 
                item={editingItem}
                onSave={handleSave}
                onCancel={() => setEditingItem(null)}
                isEdit
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}