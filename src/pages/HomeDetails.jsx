import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Home, Plus, Search, Palette, Ruler, Wrench, 
  Zap, Droplets, Package, Pencil, Trash2, Camera
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';

export default function HomeDetails() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newDetail, setNewDetail] = useState({
    title: '', category: 'other', room_id: '', room_name: '',
    value: '', brand: '', product_name: '', product_code: '', size: '', notes: ''
  });

  const queryClient = useQueryClient();

  const { data: details, isLoading } = useQuery({
    queryKey: ['homeDetails'],
    queryFn: () => base44.entities.HomeDetail.list('-created_date'),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const createDetailMutation = useMutation({
    mutationFn: (data) => base44.entities.HomeDetail.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeDetails'] });
      setIsAddOpen(false);
      resetForm();
    },
  });

  const updateDetailMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HomeDetail.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeDetails'] });
      setEditingDetail(null);
    },
  });

  const deleteDetailMutation = useMutation({
    mutationFn: (id) => base44.entities.HomeDetail.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['homeDetails'] }),
  });

  const resetForm = () => {
    setNewDetail({
      title: '', category: 'other', room_id: '', room_name: '',
      value: '', brand: '', product_name: '', product_code: '', size: '', notes: ''
    });
    setFile(null);
  };

  const handleSave = async (data, isEdit = false) => {
    setIsSubmitting(true);
    let photoUrl = data.photo_url;
    
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      photoUrl = file_url;
    }

    const saveData = {
      ...data,
      photo_url: photoUrl,
      room_name: data.room_id ? rooms?.find(r => r.id === data.room_id)?.name : data.room_name,
    };

    if (isEdit) {
      await updateDetailMutation.mutateAsync({ id: editingDetail.id, data: saveData });
    } else {
      await createDetailMutation.mutateAsync(saveData);
    }
    setFile(null);
    setIsSubmitting(false);
  };

  const categoryLabels = {
    paint: 'Paint Color',
    hardware: 'Hardware',
    measurement: 'Measurement',
    wiring: 'Wiring/Electrical',
    plumbing: 'Plumbing',
    material: 'Material',
    other: 'Other',
  };

  const categoryIcons = {
    paint: Palette,
    hardware: Wrench,
    measurement: Ruler,
    wiring: Zap,
    plumbing: Droplets,
    material: Package,
    other: Home,
  };

  const categoryColors = {
    paint: 'bg-pink-100 text-pink-700 border-pink-200',
    hardware: 'bg-slate-100 text-slate-700 border-slate-200',
    measurement: 'bg-blue-100 text-blue-700 border-blue-200',
    wiring: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    plumbing: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    material: 'bg-amber-100 text-amber-700 border-amber-200',
    other: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  const filteredDetails = details?.filter(detail => {
    const matchesSearch = !searchQuery || 
      detail.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      detail.value?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      detail.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      detail.room_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || detail.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  // Group by category
  const detailsByCategory = details?.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {}) || {};

  const DetailForm = ({ detail, onSave, onCancel, isEdit = false }) => {
    const [formData, setFormData] = useState(detail);

    return (
      <div className="space-y-4 mt-4">
        <div>
          <Label>Title *</Label>
          <Input 
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            placeholder="e.g., Living Room Wall Color, Kitchen Faucet Size"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Room</Label>
            <Select value={formData.room_id || ''} onValueChange={v => setFormData({...formData, room_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {rooms?.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Value / Detail *</Label>
          <Input 
            value={formData.value}
            onChange={e => setFormData({...formData, value: e.target.value})}
            placeholder={
              formData.category === 'paint' ? 'e.g., Agreeable Gray SW 7029' :
              formData.category === 'measurement' ? 'e.g., 36" x 24"' :
              formData.category === 'hardware' ? 'e.g., 3/4" brass fitting' :
              'Enter the main value or detail'
            }
          />
        </div>
        {(formData.category === 'paint' || formData.category === 'material' || formData.category === 'hardware') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Brand</Label>
              <Input 
                value={formData.brand || ''}
                onChange={e => setFormData({...formData, brand: e.target.value})}
                placeholder="e.g., Sherwin-Williams, Delta"
              />
            </div>
            <div>
              <Label>Product Name</Label>
              <Input 
                value={formData.product_name || ''}
                onChange={e => setFormData({...formData, product_name: e.target.value})}
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Product Code</Label>
            <Input 
              value={formData.product_code || ''}
              onChange={e => setFormData({...formData, product_code: e.target.value})}
              placeholder="SKU, color code, part #"
            />
          </div>
          <div>
            <Label>Size</Label>
            <Input 
              value={formData.size || ''}
              onChange={e => setFormData({...formData, size: e.target.value})}
              placeholder="Dimensions, quantity, etc."
            />
          </div>
        </div>
        <div>
          <Label>Photo</Label>
          <Input 
            type="file"
            onChange={e => setFile(e.target.files[0])}
            accept="image/*"
          />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea 
            value={formData.notes || ''}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            placeholder="Additional details, where purchased, tips, etc."
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button 
            onClick={() => onSave(formData, isEdit)} 
            disabled={!formData.title || !formData.value || isSubmitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Detail'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-indigo-200 mb-3">
              <Home className="w-5 h-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Reference</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Home Details Log</h1>
            <p className="text-indigo-100">Track paint colors, hardware sizes, measurements, and more</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search & Add */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6 -mt-12 relative z-10">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search details..."
                className="pl-10 bg-white shadow-lg border-0"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 bg-white shadow-lg border-0">
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

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Detail
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Home Detail</DialogTitle>
              </DialogHeader>
              <DetailForm 
                detail={newDetail}
                onSave={handleSave}
                onCancel={() => { setIsAddOpen(false); resetForm(); }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {Object.entries(categoryLabels).map(([cat, label]) => {
            const Icon = categoryIcons[cat];
            const count = detailsByCategory[cat]?.length || 0;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                className={`p-3 rounded-xl text-center transition-all ${
                  categoryFilter === cat 
                    ? `${categoryColors[cat]} border-2` 
                    : 'bg-white border border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className="w-5 h-5 mx-auto mb-1" />
                <p className="text-xs font-medium truncate">{label}</p>
                <p className="text-lg font-bold">{count}</p>
              </button>
            );
          })}
        </div>

        {/* Details Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <Card key={i} className="border-0 shadow-md animate-pulse">
                <CardContent className="p-4">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDetails.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredDetails.map((detail, i) => {
                const Icon = categoryIcons[detail.category];
                return (
                  <motion.div
                    key={detail.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Card className="border-0 shadow-md hover:shadow-lg transition-all group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={`${categoryColors[detail.category]} border`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {categoryLabels[detail.category]}
                          </Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => setEditingDetail(detail)}>
                              <Pencil className="w-4 h-4 text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteDetailMutation.mutate(detail.id)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-slate-800 mb-1">{detail.title}</h3>
                        
                        {/* Color swatch for paint */}
                        {detail.category === 'paint' && detail.value && (
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-8 h-8 rounded border border-slate-200"
                              style={{ backgroundColor: detail.product_code?.startsWith('#') ? detail.product_code : '#e2e8f0' }}
                            />
                            <span className="font-medium text-slate-700">{detail.value}</span>
                          </div>
                        )}
                        
                        {detail.category !== 'paint' && (
                          <p className="text-lg font-medium text-indigo-600 mb-2">{detail.value}</p>
                        )}
                        
                        <div className="space-y-1 text-sm text-slate-600">
                          {detail.room_name && <p>📍 {detail.room_name}</p>}
                          {detail.brand && <p>🏷️ {detail.brand} {detail.product_name}</p>}
                          {detail.product_code && detail.category !== 'paint' && <p>📋 {detail.product_code}</p>}
                          {detail.size && <p>📐 {detail.size}</p>}
                        </div>
                        
                        {detail.photo_url && (
                          <img 
                            src={detail.photo_url} 
                            alt={detail.title}
                            className="w-full h-32 object-cover rounded-lg mt-3"
                          />
                        )}
                        
                        {detail.notes && (
                          <p className="text-sm text-slate-500 mt-3 pt-3 border-t">{detail.notes}</p>
                        )}
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
              <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No details found</h3>
              <p className="text-slate-500 mb-4">Start logging your home's important details</p>
              <Button onClick={() => setIsAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" /> Add Your First Detail
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingDetail} onOpenChange={() => setEditingDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editingDetail && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Detail</DialogTitle>
              </DialogHeader>
              <DetailForm 
                detail={editingDetail}
                onSave={handleSave}
                onCancel={() => setEditingDetail(null)}
                isEdit
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}