import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Phone, Plus, Search, AlertTriangle, Building, Users as UsersIcon,
  Wrench, MapPin, Mail, Pencil, Trash2, Star, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';

// Mobile-friendly modal that allows native touch scrolling
const MobileModal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 sm:relative sm:flex sm:items-center sm:justify-center sm:h-full">
        <div className="relative bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl flex flex-col" style={{maxHeight: '85vh'}}>
          <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div
            className="overflow-y-scroll flex-1 px-5 pb-8"
            style={{WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain'}}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from 'framer-motion';

export default function Contacts() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newContact, setNewContact] = useState({
    name: '', type: 'service', phone: '', phone_secondary: '',
    email: '', address: '', notes: '', is_emergency: false
  });

  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['importantContacts'],
    queryFn: () => base44.entities.ImportantContact.list(),
  });

  const { data: allAppliances } = useQuery({
    queryKey: ['allRoomItems'],
    queryFn: () => base44.entities.RoomItem.list(),
  });

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.ImportantContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importantContacts'] });
      setIsAddOpen(false);
      resetForm();
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ImportantContact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importantContacts'] });
      setEditingContact(null);
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => base44.entities.ImportantContact.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['importantContacts'] }),
  });

  const resetForm = () => {
    setNewContact({
      name: '', type: 'service', phone: '', phone_secondary: '',
      email: '', address: '', notes: '', is_emergency: false
    });
  };

  const handleSave = async (data, isEdit = false) => {
    setIsSubmitting(true);
    if (isEdit) {
      await updateContactMutation.mutateAsync({ id: editingContact.id, data });
    } else {
      await createContactMutation.mutateAsync(data);
    }
    setIsSubmitting(false);
  };

  const typeLabels = {
    emergency: 'Emergency',
    utility: 'Utility',
    neighbor: 'Neighbor',
    family: 'Family',
    service: 'Service Provider',
    other: 'Other',
  };

  const typeIcons = {
    emergency: AlertTriangle,
    utility: Building,
    neighbor: UsersIcon,
    family: UsersIcon,
    service: Wrench,
    other: Phone,
  };

  const typeColors = {
    emergency: 'bg-red-100 text-red-700 border-red-200',
    utility: 'bg-blue-100 text-blue-700 border-blue-200',
    neighbor: 'bg-green-100 text-green-700 border-green-200',
    family: 'bg-purple-100 text-purple-700 border-purple-200',
    service: 'bg-amber-100 text-amber-700 border-amber-200',
    other: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const emergencyContacts = contacts?.filter(c => c.is_emergency) || [];
  const filteredContacts = contacts?.filter(c => {
    const matchesSearch = !searchQuery || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  const ContactForm = ({ contact, onSave, onCancel, isEdit = false }) => {
    const [formData, setFormData] = useState(contact);

    const toggleAppliance = (id) => {
      const current = formData.linked_to_appliance_ids || [];
      const updated = current.includes(id) ? current.filter(a => a !== id) : [...current, id];
      setFormData({ ...formData, linked_to_appliance_ids: updated });
    };

    return (
      <div className="space-y-4 mt-4">
        <div>
          <Label>Name / Company *</Label>
          <Input 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., Police Non-Emergency, John (neighbor)"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch 
              checked={formData.is_emergency}
              onCheckedChange={v => setFormData({...formData, is_emergency: v})}
            />
            <Label>Emergency Contact</Label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Primary Phone *</Label>
            <Input 
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              placeholder="(555) 555-5555"
            />
          </div>
          <div>
            <Label>Secondary Phone</Label>
            <Input 
              value={formData.phone_secondary || ''}
              onChange={e => setFormData({...formData, phone_secondary: e.target.value})}
            />
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <Input 
            type="email"
            value={formData.email || ''}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
        </div>
        <div>
          <Label>Address</Label>
          <Input 
            value={formData.address || ''}
            onChange={e => setFormData({...formData, address: e.target.value})}
          />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea 
            value={formData.notes || ''}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            placeholder="Account numbers, hours, special instructions, etc."
          />
        </div>
        {allAppliances?.length > 0 && (
          <div>
            <Label>Linked Appliances</Label>
            <p className="text-xs text-slate-500 mb-2">This contact will appear on selected appliance records</p>
            <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1">
              {allAppliances.map(item => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded p-1">
                  <input
                    type="checkbox"
                    checked={(formData.linked_to_appliance_ids || []).includes(item.id)}
                    onChange={() => toggleAppliance(item.id)}
                    className="rounded"
                  />
                  <Package className="w-3 h-3 text-slate-400" />
                  <span className="text-sm text-slate-700">{item.name}</span>
                  {item.brand && <span className="text-xs text-slate-400">{item.brand}</span>}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button 
            onClick={() => onSave(formData, isEdit)} 
            disabled={!formData.name || !formData.phone || isSubmitting}
            className="flex-1 bg-rose-600 hover:bg-rose-700"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Contact'}
          </Button>
        </div>
      </div>
    );
  };

  // If adding, show full-page inline form (avoids all iOS modal scroll issues)
  if (isAddOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
        <div className="container mx-auto px-6 py-6 max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setIsAddOpen(false); resetForm(); }} className="p-2 rounded-full hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-xl font-bold text-slate-800">Add New Contact</h1>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5">
            <ContactForm
              contact={newContact}
              onSave={handleSave}
              onCancel={() => { setIsAddOpen(false); resetForm(); }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-rose-600 to-pink-600 text-white py-16">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-rose-200 mb-3">
              <Phone className="w-5 h-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Directory</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Important Contacts</h1>
            <p className="text-rose-100">Emergency numbers, utilities, neighbors, and service providers</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Emergency Contacts Banner */}
        {emergencyContacts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 -mt-12 relative z-10"
          >
            <Card className="border-0 shadow-xl bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <AlertTriangle className="w-5 h-5" />
                  Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {emergencyContacts.map(contact => (
                    <div key={contact.id} className="bg-white/20 rounded-lg p-3">
                      <p className="font-semibold">{contact.name}</p>
                      <a href={`tel:${contact.phone}`} className="text-lg font-bold hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="pl-10 bg-white shadow-md border-0"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44 bg-white shadow-md border-0">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Contacts Grid */}
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
        ) : filteredContacts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredContacts.map((contact, i) => {
                const Icon = typeIcons[contact.type];
                return (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Card className={`border-0 shadow-md hover:shadow-lg transition-all group ${
                      contact.is_emergency ? 'ring-2 ring-red-400' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={`${typeColors[contact.type]} border`}>
                              <Icon className="w-3 h-3 mr-1" />
                              {typeLabels[contact.type]}
                            </Badge>
                            {contact.is_emergency && (
                              <Badge className="bg-red-500 text-white">
                                <Star className="w-3 h-3 mr-1" />
                                Emergency
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => setEditingContact(contact)}>
                              <Pencil className="w-4 h-4 text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteContactMutation.mutate(contact.id)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-lg text-slate-800 mb-3">{contact.name}</h3>
                        
                        <div className="space-y-2 text-sm">
                          <a 
                            href={`tel:${contact.phone}`} 
                            className="flex items-center gap-2 text-slate-600 hover:text-rose-600 font-medium"
                          >
                            <Phone className="w-4 h-4" /> {contact.phone}
                          </a>
                          {contact.phone_secondary && (
                            <a 
                              href={`tel:${contact.phone_secondary}`} 
                              className="flex items-center gap-2 text-slate-500 hover:text-rose-600"
                            >
                              <Phone className="w-4 h-4" /> {contact.phone_secondary}
                            </a>
                          )}
                          {contact.email && (
                            <a 
                              href={`mailto:${contact.email}`} 
                              className="flex items-center gap-2 text-slate-500 hover:text-rose-600"
                            >
                              <Mail className="w-4 h-4" /> {contact.email}
                            </a>
                          )}
                          {contact.address && (
                            <div className="flex items-start gap-2 text-slate-500">
                              <MapPin className="w-4 h-4 mt-0.5" /> {contact.address}
                            </div>
                          )}
                        </div>
                        
                        {contact.notes && (
                          <p className="text-sm text-slate-500 mt-3 pt-3 border-t">{contact.notes}</p>
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
              <Phone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No contacts found</h3>
              <p className="text-slate-500 mb-4">Add important contacts for quick access</p>
              <Button onClick={() => setIsAddOpen(true)} className="bg-rose-600 hover:bg-rose-700">
                <Plus className="w-4 h-4 mr-2" /> Add Your First Contact
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <MobileModal open={!!editingContact} onClose={() => setEditingContact(null)} title="Edit Contact">
        {editingContact && (
          <ContactForm
            contact={editingContact}
            onSave={handleSave}
            onCancel={() => setEditingContact(null)}
            isEdit
          />
        )}
      </MobileModal>
    </div>
  );
}