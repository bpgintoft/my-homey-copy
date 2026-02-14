import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Users,
  Plus,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Pencil,
  Trash2,
  Search
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';

export default function Vendors() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newVendor, setNewVendor] = useState({
    name: '', category: 'general_contractor', contact_name: '',
    phone: '', email: '', website: '', address: '', rating: 5, notes: ''
  });

  const queryClient = useQueryClient();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const createVendorMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setIsAddOpen(false);
      setNewVendor({
        name: '', category: 'general_contractor', contact_name: '',
        phone: '', email: '', website: '', address: '', rating: 5, notes: ''
      });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vendor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setEditingVendor(null);
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendors'] }),
  });

  const handleSaveVendor = async (data, isEdit = false) => {
    setIsSubmitting(true);
    if (isEdit) {
      await updateVendorMutation.mutateAsync({ id: editingVendor.id, data });
    } else {
      await createVendorMutation.mutateAsync(data);
    }
    setIsSubmitting(false);
  };

  const filteredVendors = vendors?.filter(vendor => {
    const matchesSearch = !searchQuery || 
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || vendor.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const categoryLabels = {
    plumbing: 'Plumbing',
    electrical: 'Electrical',
    hvac: 'HVAC',
    flooring: 'Flooring',
    windows: 'Windows',
    roofing: 'Roofing',
    painting: 'Painting',
    landscaping: 'Landscaping',
    cleaning: 'Cleaning',
    general_contractor: 'General Contractor',
    appliance_repair: 'Appliance Repair',
    pest_control: 'Pest Control',
    other: 'Other',
  };

  const categoryColors = {
    plumbing: 'bg-blue-100 text-blue-700',
    electrical: 'bg-yellow-100 text-yellow-700',
    hvac: 'bg-cyan-100 text-cyan-700',
    flooring: 'bg-amber-100 text-amber-700',
    windows: 'bg-sky-100 text-sky-700',
    roofing: 'bg-orange-100 text-orange-700',
    painting: 'bg-pink-100 text-pink-700',
    landscaping: 'bg-green-100 text-green-700',
    cleaning: 'bg-purple-100 text-purple-700',
    general_contractor: 'bg-slate-100 text-slate-700',
    appliance_repair: 'bg-indigo-100 text-indigo-700',
    pest_control: 'bg-red-100 text-red-700',
    other: 'bg-gray-100 text-gray-700',
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
      />
    ));
  };

  const VendorForm = ({ vendor, onSave, onCancel, isEdit = false }) => {
    const [formData, setFormData] = useState(vendor);

    return (
      <div className="space-y-4 mt-4">
        <div>
          <Label>Company/Vendor Name *</Label>
          <Input 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., ABC Plumbing"
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
            <Label>Contact Person</Label>
            <Input 
              value={formData.contact_name}
              onChange={e => setFormData({...formData, contact_name: e.target.value})}
              placeholder="Name"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <Input 
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              placeholder="(555) 555-5555"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input 
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="email@example.com"
            />
          </div>
        </div>
        <div>
          <Label>Website</Label>
          <Input 
            value={formData.website}
            onChange={e => setFormData({...formData, website: e.target.value})}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label>Address</Label>
          <Input 
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
            placeholder="Business address"
          />
        </div>
        <div>
          <Label>Your Rating</Label>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData({...formData, rating: star})}
                className="focus:outline-none"
              >
                <Star 
                  className={`w-6 h-6 transition-colors ${star <= formData.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-300'}`} 
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea 
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            placeholder="Any notes about this vendor..."
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button 
            onClick={() => onSave(formData, isEdit)} 
            disabled={!formData.name || isSubmitting}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Vendor'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-purple-200 mb-3">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Contacts</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Trusted Vendors</h1>
            <p className="text-purple-100">Your go-to professionals for home services</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search & Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6 -mt-12 relative z-10">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search vendors..."
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
              <Button className="bg-white text-purple-600 hover:bg-purple-50 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
              </DialogHeader>
              <VendorForm 
                vendor={newVendor}
                onSave={handleSaveVendor}
                onCancel={() => setIsAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Vendors Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <Card key={i} className="border-0 shadow-md animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-slate-100 rounded w-1/2 mb-4" />
                  <div className="h-4 bg-slate-100 rounded w-full mb-2" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredVendors.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredVendors.map((vendor, i) => (
                <motion.div
                  key={vendor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="border-0 shadow-md hover:shadow-xl transition-all group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={categoryColors[vendor.category]}>
                          {categoryLabels[vendor.category]}
                        </Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => setEditingVendor(vendor)}>
                            <Pencil className="w-4 h-4 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteVendorMutation.mutate(vendor.id)}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-lg text-slate-800 mb-1">{vendor.name}</h3>
                      {vendor.contact_name && (
                        <p className="text-sm text-slate-500 mb-3">{vendor.contact_name}</p>
                      )}
                      <div className="flex mb-3">
                        {renderStars(vendor.rating)}
                      </div>
                      <div className="space-y-2 text-sm text-slate-600">
                        {vendor.phone && (
                          <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 hover:text-purple-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {vendor.phone}
                          </a>
                        )}
                        {vendor.email && (
                          <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 hover:text-purple-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {vendor.email}
                          </a>
                        )}
                        {vendor.website && (
                          <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-purple-600">
                            <Globe className="w-4 h-4 text-slate-400" />
                            Website
                          </a>
                        )}
                        {vendor.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                            <span>{vendor.address}</span>
                          </div>
                        )}
                      </div>
                      {vendor.notes && (
                        <p className="text-sm text-slate-500 mt-4 pt-4 border-t">{vendor.notes}</p>
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
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No vendors found</h3>
              <p className="text-slate-500 mb-4">
                {searchQuery || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start building your trusted vendor directory'}
              </p>
              <Button onClick={() => setIsAddOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Vendor
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Vendor Dialog */}
      <Dialog open={!!editingVendor} onOpenChange={() => setEditingVendor(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editingVendor && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Vendor</DialogTitle>
              </DialogHeader>
              <VendorForm 
                vendor={editingVendor}
                onSave={handleSaveVendor}
                onCancel={() => setEditingVendor(null)}
                isEdit
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}