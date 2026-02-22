import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ExternalLink, CheckCircle2, Circle, Loader2, ChevronDown, Edit2, GripVertical } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function FamilyMemberDetails({ memberId, memberName, color = 'blue' }) {
  const queryClient = useQueryClient();

  const colorMap = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    pink: 'bg-pink-50 border-pink-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
  };

  const itemBg = colorMap[color] || colorMap.blue;
  const [dialogOpen, setDialogOpen] = useState({ chore: false, milestone: false, contact: false, link: false });
  const [newChore, setNewChore] = useState({ title: '', timing: 'short-term' });
  const [editingChoreId, setEditingChoreId] = useState(null);
  const [editingChoreTitle, setEditingChoreTitle] = useState('');
  const [newMilestone, setNewMilestone] = useState({ title: '', date: '', description: '' });
  const [newContact, setNewContact] = useState({ name: '', type: '', phone: '', email: '', address: '', website: '', linked_to_member_ids: ['Everyone'] });
  const [editingContact, setEditingContact] = useState(null);
  const [expandedContactId, setExpandedContactId] = useState(null);
  const [newLink, setNewLink] = useState({ url: '', title: '', category: '' });
  const [quickLinkUrl, setQuickLinkUrl] = useState('');
  const [showTitleDialog, setShowTitleDialog] = useState(false);
  const [categorizingLink, setCategorizingLink] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [personalNotes, setPersonalNotes] = useState('');
  const [openSections, setOpenSections] = useState({
    links: false,
    contacts: false,
    chores: false,
    notes: false,
    milestones: false
  });

  // Fetch data
  const { data: member } = useQuery({
    queryKey: ['familyMember', memberId],
    queryFn: () => base44.entities.FamilyMember.filter({ id: memberId }).then(res => res[0]),
    enabled: !!memberId,
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const { data: chores = [] } = useQuery({
    queryKey: ['chores', memberId],
    queryFn: () => base44.entities.Chore.filter({ assigned_to_member_id: memberId }),
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', memberId],
    queryFn: () => base44.entities.Milestone.filter({ assigned_to_member_id: memberId }),
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.ImportantContact.list(),
  });

  const { data: links = [] } = useQuery({
    queryKey: ['links', memberId],
    queryFn: () => base44.entities.FamilyMemberLink.filter({ assigned_to_member_id: memberId }),
  });

  const contacts = allContacts.filter(c => 
    !c.linked_to_member_ids || 
    c.linked_to_member_ids.length === 0 || 
    c.linked_to_member_ids.includes('Everyone') ||
    c.linked_to_member_ids.includes(memberId)
  );

  // Mutations
  const createChoreMutation = useMutation({
    mutationFn: (data) => base44.entities.Chore.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['chores', memberId]);
      setDialogOpen({ ...dialogOpen, chore: false });
      setNewChore({ title: '', timing: 'short-term' });
    },
  });

  const toggleChoreMutation = useMutation({
    mutationFn: ({ id, is_completed }) => base44.entities.Chore.update(id, { is_completed }),
    onSuccess: () => queryClient.invalidateQueries(['chores', memberId]),
  });

  const updateChoreMutation = useMutation({
    mutationFn: ({ id, title }) => base44.entities.Chore.update(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries(['chores', memberId]);
      setEditingChoreId(null);
    },
  });

  const updateChoreTimingMutation = useMutation({
    mutationFn: ({ id, timing }) => base44.entities.Chore.update(id, { timing }),
    onSuccess: () => queryClient.invalidateQueries(['chores', memberId]),
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceCategory = result.source.droppableId;
    const destCategory = result.destination.droppableId;
    const choreId = result.draggableId;

    // If moved to different category, update timing
    if (sourceCategory !== destCategory) {
      updateChoreTimingMutation.mutate({ id: choreId, timing: destCategory });
    }
  };

  const deleteChoreMutation = useMutation({
    mutationFn: (id) => base44.entities.Chore.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['chores', memberId]),
  });

  const createMilestoneMutation = useMutation({
    mutationFn: (data) => base44.entities.Milestone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['milestones', memberId]);
      setDialogOpen({ ...dialogOpen, milestone: false });
      setNewMilestone({ title: '', date: '', description: '' });
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (id) => base44.entities.Milestone.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['milestones', memberId]),
  });

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.ImportantContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setDialogOpen({ ...dialogOpen, contact: false });
      setNewContact({ name: '', type: '', phone: '', email: '', address: '', website: '', linked_to_member_ids: ['Everyone'] });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ImportantContact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setEditingContact(null);
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => base44.entities.ImportantContact.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['contacts']),
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data) => {
      if (data.category) {
        return base44.entities.FamilyMemberLink.create(data);
      }
      
      setCategorizingLink(true);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Categorize this URL: ${data.url}. Title: ${data.title || 'No title provided'}. Return the most appropriate category from: school, sports_extracurriculars, medical, social, shopping, entertainment, other. Also suggest a title if none was provided.`,
        response_json_schema: {
          type: "object",
          properties: {
            category: { type: "string" },
            suggested_title: { type: "string" }
          }
        }
      });
      setCategorizingLink(false);
      
      return base44.entities.FamilyMemberLink.create({
        ...data,
        category: result.category,
        title: data.title || result.suggested_title,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['links', memberId]);
      setDialogOpen({ ...dialogOpen, link: false });
      setShowTitleDialog(false);
      setNewLink({ url: '', title: '', category: '' });
      setQuickLinkUrl('');
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FamilyMemberLink.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['links', memberId]);
      setEditingLink(null);
    },
  });

  const handleQuickLinkPaste = (e) => {
    const url = e.target.value;
    setQuickLinkUrl(url);
    if (url.trim()) {
      setShowTitleDialog(true);
    }
  };

  const deleteLinkMutation = useMutation({
    mutationFn: (id) => base44.entities.FamilyMemberLink.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['links', memberId]),
  });

  const updateNotesMutation = useMutation({
    mutationFn: (notes) => base44.entities.FamilyMember.update(memberId, { personal_notes: notes }),
    onSuccess: () => queryClient.invalidateQueries(['familyMember', memberId]),
  });

  const updateExpirationDatesMutation = useMutation({
    mutationFn: (data) => base44.entities.FamilyMember.update(memberId, data),
    onSuccess: () => queryClient.invalidateQueries(['familyMember', memberId]),
  });

  React.useEffect(() => {
    if (member?.personal_notes) {
      setPersonalNotes(member.personal_notes);
    }
  }, [member]);

  const choresByTiming = {
    'short-term': chores.filter(c => c.timing === 'short-term'),
    'mid-term': chores.filter(c => c.timing === 'mid-term'),
    'long-term': chores.filter(c => c.timing === 'long-term'),
  };

  const linksByCategory = links.reduce((acc, link) => {
    const cat = link.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(link);
    return acc;
  }, {});

  const contactsByType = contacts.reduce((acc, contact) => {
    const type = contact.type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(contact);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {/* Passport & License */}
      <div className={`grid grid-cols-3 gap-6 p-2.5 rounded-lg ${itemBg} justify-items-start`}>
        <div 
          className="cursor-pointer"
          onClick={() => {
            const newDate = prompt('Enter passport expiration date (MM/DD/YYYY):');
            if (newDate) {
              const date = new Date(newDate);
              if (!isNaN(date)) {
                const formatted = date.toISOString().split('T')[0];
                updateExpirationDatesMutation.mutate({ passport_expiration_date: formatted });
              }
            }
          }}
        >
          <div className="text-xs text-gray-500 mb-1">🛂 Passport Exp:</div>
          <div className="text-sm font-semibold">
            {member?.passport_expiration_date 
              ? new Date(member.passport_expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase().replace(',', ',')
              : 'Not set'}
          </div>
        </div>
        <div 
          className="cursor-pointer"
          onClick={() => {
            const newDate = prompt('Enter license expiration date (MM/DD/YYYY):');
            if (newDate) {
              const date = new Date(newDate);
              if (!isNaN(date)) {
                const formatted = date.toISOString().split('T')[0];
                updateExpirationDatesMutation.mutate({ license_expiration_date: formatted });
              }
            }
          }}
        >
          <div className="text-xs text-gray-500 mb-1">🪪 License Exp:</div>
          <div className="text-sm font-semibold">
            {member?.license_expiration_date 
              ? new Date(member.license_expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase().replace(',', ',')
              : 'Not set'}
          </div>
        </div>
        <div 
          className="cursor-pointer"
          onClick={() => {
            const newPlate = prompt('Enter license plate number:');
            if (newPlate !== null) {
              updateExpirationDatesMutation.mutate({ license_plate_number: newPlate });
            }
          }}
        >
          <div className="text-xs text-gray-500 mb-1">🚗 Plate #</div>
          <div className="text-sm font-semibold">
            {member?.license_plate_number || 'Not set'}
          </div>
        </div>
      </div>

      {/* Important Links */}
      <Collapsible 
        open={openSections.links} 
        onOpenChange={(open) => setOpenSections({ ...openSections, links: open })}
      >
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                Important Links
                <ChevronDown className={`w-5 h-5 transition-transform ${openSections.links ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste a link here..."
                  value={quickLinkUrl}
                  onChange={(e) => setQuickLinkUrl(e.target.value)}
                  onBlur={handleQuickLinkPaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && quickLinkUrl.trim()) {
                      setShowTitleDialog(true);
                    }
                  }}
                />
              </div>

              <Dialog open={showTitleDialog} onOpenChange={setShowTitleDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Link Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter title for this link"
                      value={newLink.title}
                      onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                    />
                    <Input
                      placeholder="Enter category (e.g., school, sports, medical...)"
                      value={newLink.category}
                      onChange={(e) => setNewLink({ ...newLink, category: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Leave category blank for AI to categorize automatically</p>
                    <Button
                      onClick={() => createLinkMutation.mutate({
                        url: quickLinkUrl,
                        title: newLink.title,
                        category: newLink.category,
                        assigned_to_member_id: memberId,
                        assigned_to_name: memberName,
                      })}
                      disabled={categorizingLink}
                    >
                      {categorizingLink ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Categorizing...</> : 'Add Link'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Link</DialogTitle>
                  </DialogHeader>
                  {editingLink && (
                    <div className="space-y-4">
                      <Input
                        placeholder="Title"
                        value={editingLink.title || ''}
                        onChange={(e) => setEditingLink({ ...editingLink, title: e.target.value })}
                      />
                      <Input
                        placeholder="URL"
                        value={editingLink.url || ''}
                        onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                      />
                      <Input
                        placeholder="Category (e.g., school, sports, medical...)"
                        value={editingLink.category || ''}
                        onChange={(e) => setEditingLink({ ...editingLink, category: e.target.value })}
                      />
                      <Button
                        onClick={() => updateLinkMutation.mutate({
                          id: editingLink.id,
                          data: {
                            title: editingLink.title,
                            url: editingLink.url,
                            category: editingLink.category,
                          }
                        })}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {Object.keys(linksByCategory).length === 0 ? (
                <p className="text-sm text-gray-500">No links yet</p>
              ) : (
                Object.entries(linksByCategory).map(([category, categoryLinks]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm text-gray-700 mb-2 capitalize">{category.replace(/_/g, ' ')}</h4>
                    <div className="space-y-2">
                      {categoryLinks.map((link) => (
                        <div key={link.id} className={`flex items-center gap-2 p-2 rounded ${itemBg}`}>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline flex-1 min-w-0">
                            <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{link.title || link.url}</span>
                          </a>
                          <div className="flex gap-0.5 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLink(link)}>
                              <Edit2 className="w-3 h-3 text-gray-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteLinkMutation.mutate(link.id)}>
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Important Contacts */}
      <Collapsible 
        open={openSections.contacts} 
        onOpenChange={(open) => setOpenSections({ ...openSections, contacts: open })}
      >
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                Important Contacts
                <ChevronDown className={`w-5 h-5 transition-transform ${openSections.contacts ? 'rotate-180' : ''}`} />
              </CardTitle>
              {openSections.contacts && (
                <Dialog open={dialogOpen.contact} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, contact: open })}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={(e) => e.stopPropagation()}>
                      <Plus className="w-4 h-4 mr-2" />Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Contact</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Name"
                        value={newContact.name}
                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      />
                      <Input
                        placeholder="Type (e.g., Emergency, Neighbor, Family...)"
                        value={newContact.type}
                        onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                      />
                      <Input
                        placeholder="Phone"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      />
                      <Input
                        placeholder="Email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      />
                      <Input
                        placeholder="Address"
                        value={newContact.address}
                        onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                      />
                      <Input
                        placeholder="Website"
                        value={newContact.website}
                        onChange={(e) => setNewContact({ ...newContact, website: e.target.value })}
                      />
                      <div className="space-y-3">
                        <Label>Link to family members:</Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="everyone"
                            checked={newContact.linked_to_member_ids.includes('Everyone')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewContact({ ...newContact, linked_to_member_ids: ['Everyone'] });
                              } else {
                                setNewContact({ ...newContact, linked_to_member_ids: newContact.linked_to_member_ids.filter(id => id !== 'Everyone') });
                              }
                            }}
                          />
                          <label htmlFor="everyone" className="text-sm font-medium cursor-pointer">Everyone</label>
                        </div>
                        {familyMembers.map((fm) => (
                          <div key={fm.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={fm.id}
                              checked={newContact.linked_to_member_ids.includes(fm.id)}
                              disabled={newContact.linked_to_member_ids.includes('Everyone')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewContact({ 
                                    ...newContact, 
                                    linked_to_member_ids: [...newContact.linked_to_member_ids.filter(id => id !== 'Everyone'), fm.id] 
                                  });
                                } else {
                                  setNewContact({ 
                                    ...newContact, 
                                    linked_to_member_ids: newContact.linked_to_member_ids.filter(id => id !== fm.id) 
                                  });
                                }
                              }}
                            />
                            <label htmlFor={fm.id} className="text-sm cursor-pointer">{fm.name}</label>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={() => createContactMutation.mutate(newContact)}
                        disabled={!newContact.name}
                      >
                        Add Contact
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-500">No contacts yet</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(contactsByType).map(([type, typeContacts]) => (
                    <div key={type}>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">{type}</h4>
                      <div className="space-y-2">
                        {typeContacts.map((contact) => {
                          const isExpanded = expandedContactId === contact.id;

                          return (
                            <div key={contact.id} className={`rounded-lg overflow-hidden ${itemBg}`}>
                              <div 
                                className={`flex items-center gap-2 p-3 cursor-pointer hover:opacity-80 transition-opacity`}
                                onClick={() => setExpandedContactId(isExpanded ? null : contact.id)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{contact.name}</div>
                                </div>
                                <div className="flex gap-0.5 flex-shrink-0">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); setEditingContact(contact); }}
                                  >
                                    <Edit2 className="w-3 h-3 text-gray-500" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); deleteContactMutation.mutate(contact.id); }}
                                  >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </Button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="px-3 pb-3 space-y-2 border-t border-gray-200 pt-2">
                                  {contact.phone && (
                                    <a 
                                      href={`tel:${contact.phone}`}
                                      className="block text-sm text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      📞 {contact.phone}
                                    </a>
                                  )}
                                  {contact.email && (
                                    <a 
                                      href={`mailto:${contact.email}`}
                                      className="block text-sm text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      ✉️ {contact.email}
                                    </a>
                                  )}
                                  {contact.address && (
                                    <a 
                                      href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block text-sm text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      📍 {contact.address}
                                    </a>
                                  )}
                                  {contact.website && (
                                    <a 
                                      href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block text-sm text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      🌐 {contact.website}
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Contact</DialogTitle>
                  </DialogHeader>
                  {editingContact && (
                    <div className="space-y-4">
                      <Input
                        placeholder="Name"
                        value={editingContact.name}
                        onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                      />
                      <Input
                        placeholder="Type (e.g., Emergency, Neighbor, Family...)"
                        value={editingContact.type || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, type: e.target.value })}
                      />
                      <Input
                        placeholder="Phone"
                        value={editingContact.phone || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                      />
                      <Input
                        placeholder="Email"
                        value={editingContact.email || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                      />
                      <Input
                        placeholder="Address"
                        value={editingContact.address || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, address: e.target.value })}
                      />
                      <Input
                        placeholder="Website"
                        value={editingContact.website || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, website: e.target.value })}
                      />
                      <div className="space-y-3">
                        <Label>Link to family members:</Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-everyone"
                            checked={editingContact.linked_to_member_ids?.includes('Everyone')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditingContact({ ...editingContact, linked_to_member_ids: ['Everyone'] });
                              } else {
                                setEditingContact({ ...editingContact, linked_to_member_ids: editingContact.linked_to_member_ids?.filter(id => id !== 'Everyone') || [] });
                              }
                            }}
                          />
                          <label htmlFor="edit-everyone" className="text-sm font-medium cursor-pointer">Everyone</label>
                        </div>
                        {familyMembers.map((fm) => (
                          <div key={fm.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${fm.id}`}
                              checked={editingContact.linked_to_member_ids?.includes(fm.id)}
                              disabled={editingContact.linked_to_member_ids?.includes('Everyone')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setEditingContact({ 
                                    ...editingContact, 
                                    linked_to_member_ids: [...(editingContact.linked_to_member_ids?.filter(id => id !== 'Everyone') || []), fm.id] 
                                  });
                                } else {
                                  setEditingContact({ 
                                    ...editingContact, 
                                    linked_to_member_ids: editingContact.linked_to_member_ids?.filter(id => id !== fm.id) || [] 
                                  });
                                }
                              }}
                            />
                            <label htmlFor={`edit-${fm.id}`} className="text-sm cursor-pointer">{fm.name}</label>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={() => updateContactMutation.mutate({
                          id: editingContact.id,
                          data: {
                            name: editingContact.name,
                            type: editingContact.type,
                            phone: editingContact.phone,
                            email: editingContact.email,
                            address: editingContact.address,
                            website: editingContact.website,
                            linked_to_member_ids: editingContact.linked_to_member_ids,
                          }
                        })}
                        disabled={!editingContact.name}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* To-Do List / Chores */}
      <Collapsible 
        open={openSections.chores} 
        onOpenChange={(open) => setOpenSections({ ...openSections, chores: open })}
      >
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                To-Do List & Chores
                <ChevronDown className={`w-5 h-5 transition-transform ${openSections.chores ? 'rotate-180' : ''}`} />
              </CardTitle>
              {openSections.chores && (
                <Dialog open={dialogOpen.chore} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, chore: open })}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={(e) => e.stopPropagation()}>
                      <Plus className="w-4 h-4 mr-2" />Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Chore</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Chore title"
                        value={newChore.title}
                        onChange={(e) => setNewChore({ ...newChore, title: e.target.value })}
                      />
                      <Select value={newChore.timing} onValueChange={(value) => setNewChore({ ...newChore, timing: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short-term">Short-term</SelectItem>
                          <SelectItem value="mid-term">Mid-term</SelectItem>
                          <SelectItem value="long-term">Long-term</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => createChoreMutation.mutate({
                          title: newChore.title,
                          timing: newChore.timing,
                          assigned_to_member_id: memberId,
                          assigned_to_name: memberName,
                        })}
                        disabled={!newChore.title}
                      >
                        Add Chore
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {chores.length === 0 ? (
                <p className="text-sm text-gray-500">No tasks yet</p>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="space-y-4">
                    {['short-term', 'mid-term', 'long-term'].map((timing) => {
                      const timingChores = choresByTiming[timing];
                      
                      return (
                        <div key={timing}>
                          <h4 className="font-medium text-sm text-gray-700 mb-2 capitalize">
                            {timing === 'mid-term' ? 'Mid-term' : timing === 'short-term' ? 'Short-term' : 'Long-term'}
                          </h4>
                          <Droppable droppableId={timing}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`space-y-2 min-h-[60px] p-2 rounded-lg transition-colors ${
                                  snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300' : 'bg-transparent'
                                }`}
                              >
                                {timingChores.length === 0 && !snapshot.isDraggingOver ? (
                                  <p className="text-xs text-gray-400 text-center py-2">Drop items here</p>
                                ) : (
                                  timingChores.map((chore, index) => (
                                    <Draggable key={chore.id} draggableId={chore.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`flex items-center justify-between p-3 rounded-lg ${itemBg} ${
                                            snapshot.isDragging ? 'shadow-lg opacity-90' : ''
                                          }`}
                                        >
                                          <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                              <GripVertical className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <button onClick={() => toggleChoreMutation.mutate({ id: chore.id, is_completed: !chore.is_completed })}>
                                              {chore.is_completed ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                              ) : (
                                                <Circle className="w-5 h-5 text-gray-400" />
                                              )}
                                            </button>
                                            {editingChoreId === chore.id ? (
                                              <Input
                                                value={editingChoreTitle}
                                                onChange={(e) => setEditingChoreTitle(e.target.value)}
                                                onBlur={() => updateChoreMutation.mutate({ id: chore.id, title: editingChoreTitle })}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') updateChoreMutation.mutate({ id: chore.id, title: editingChoreTitle });
                                                  if (e.key === 'Escape') setEditingChoreId(null);
                                                }}
                                                autoFocus
                                                className="h-8"
                                              />
                                            ) : (
                                              <span 
                                                className={`cursor-pointer hover:text-blue-600 flex-1 ${chore.is_completed ? 'line-through text-gray-500' : ''}`}
                                                onClick={() => {
                                                  setEditingChoreId(chore.id);
                                                  setEditingChoreTitle(chore.title);
                                                }}
                                              >
                                                {chore.title}
                                              </span>
                                            )}
                                          </div>
                                          <Button variant="ghost" size="sm" onClick={() => deleteChoreMutation.mutate(chore.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                          </Button>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))
                                )}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      );
                    })}
                  </div>
                </DragDropContext>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Personal Notes */}
      <Collapsible 
        open={openSections.notes} 
        onOpenChange={(open) => setOpenSections({ ...openSections, notes: open })}
      >
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                Personal Notes & Reminders
                <ChevronDown className={`w-5 h-5 transition-transform ${openSections.notes ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Textarea
                placeholder="Add personal notes or reminders..."
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                onBlur={() => updateNotesMutation.mutate(personalNotes)}
                rows={6}
                className="w-full"
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Goals & Milestones */}
      <Collapsible 
        open={openSections.milestones} 
        onOpenChange={(open) => setOpenSections({ ...openSections, milestones: open })}
      >
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                Goals & Milestones
                <ChevronDown className={`w-5 h-5 transition-transform ${openSections.milestones ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="mb-4">
                <Dialog open={dialogOpen.milestone} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, milestone: open })}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Milestone</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Milestone</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Milestone title"
                        value={newMilestone.title}
                        onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                      />
                      <Input
                        type="date"
                        value={newMilestone.date}
                        onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                      />
                      <Textarea
                        placeholder="Brief description"
                        value={newMilestone.description}
                        onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                      />
                      <Button
                        onClick={() => createMilestoneMutation.mutate({
                          ...newMilestone,
                          assigned_to_member_id: memberId,
                          assigned_to_name: memberName,
                        })}
                        disabled={!newMilestone.title}
                      >
                        Add Milestone
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-3">
                {milestones.length === 0 ? (
                  <p className="text-sm text-gray-500">No milestones yet</p>
                ) : (
                  milestones.map((milestone) => (
                    <details key={milestone.id} className={`rounded-lg p-3 ${itemBg}`}>
                      <summary className="cursor-pointer font-medium flex justify-between items-center">
                        <span>{milestone.title}</span>
                        <div className="flex items-center gap-2">
                          {milestone.date && <span className="text-sm text-gray-500">{new Date(milestone.date).toLocaleDateString()}</span>}
                          <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); deleteMilestoneMutation.mutate(milestone.id); }}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </summary>
                      {milestone.description && <p className="mt-2 text-sm text-gray-600">{milestone.description}</p>}
                    </details>
                  ))
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}