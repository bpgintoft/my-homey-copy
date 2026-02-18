import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ExternalLink, CheckCircle2, Circle, Loader2, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FamilyMemberDetails({ memberId, memberName, color = 'blue' }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState({ chore: false, milestone: false, contact: false, link: false });
  const [newChore, setNewChore] = useState({ title: '', frequency: 'daily' });
  const [newMilestone, setNewMilestone] = useState({ title: '', date: '', description: '' });
  const [newContact, setNewContact] = useState({ name: '', type: 'other', phone: '', email: '', linked_to_member_ids: ['Everyone'] });
  const [newLink, setNewLink] = useState({ url: '', title: '' });
  const [quickLinkUrl, setQuickLinkUrl] = useState('');
  const [showTitleDialog, setShowTitleDialog] = useState(false);
  const [categorizingLink, setCategorizingLink] = useState(false);
  const [personalNotes, setPersonalNotes] = useState('');
  const [openSections, setOpenSections] = useState({
    links: true,
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
      setNewChore({ title: '', frequency: 'daily' });
    },
  });

  const toggleChoreMutation = useMutation({
    mutationFn: ({ id, is_completed }) => base44.entities.Chore.update(id, { is_completed }),
    onSuccess: () => queryClient.invalidateQueries(['chores', memberId]),
  });

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
      setNewContact({ name: '', type: 'other', phone: '', email: '', linked_to_member_ids: ['Everyone'] });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => base44.entities.ImportantContact.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['contacts']),
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data) => {
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
      setNewLink({ url: '', title: '' });
      setQuickLinkUrl('');
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

  React.useEffect(() => {
    if (member?.personal_notes) {
      setPersonalNotes(member.personal_notes);
    }
  }, [member]);

  const choresByFrequency = {
    daily: chores.filter(c => c.frequency === 'daily'),
    weekly: chores.filter(c => c.frequency === 'weekly'),
    monthly: chores.filter(c => c.frequency === 'monthly'),
    yearly: chores.filter(c => c.frequency === 'yearly'),
  };

  const linksByCategory = links.reduce((acc, link) => {
    const cat = link.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(link);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-6">
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
                    <DialogTitle>Add Link Title</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter title for this link"
                      value={newLink.title}
                      onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                    />
                    <Button
                      onClick={() => createLinkMutation.mutate({
                        url: quickLinkUrl,
                        title: newLink.title,
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

              {Object.keys(linksByCategory).length === 0 ? (
                <p className="text-sm text-gray-500">No links yet</p>
              ) : (
                Object.entries(linksByCategory).map(([category, categoryLinks]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm text-gray-700 mb-2 capitalize">{category.replace(/_/g, ' ')}</h4>
                    <div className="space-y-2">
                      {categoryLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                            <ExternalLink className="w-4 h-4" />
                            {link.title || link.url}
                          </a>
                          <Button variant="ghost" size="sm" onClick={() => deleteLinkMutation.mutate(link.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
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
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="mb-4">
                <Dialog open={dialogOpen.contact} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, contact: open })}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
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
                      <Select value={newContact.type} onValueChange={(value) => setNewContact({ ...newContact, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="utility">Utility</SelectItem>
                          <SelectItem value="neighbor">Neighbor</SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Select
                        value={newContact.linked_to_member_ids[0]}
                        onValueChange={(value) => setNewContact({ ...newContact, linked_to_member_ids: [value] })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Link to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Everyone">Everyone</SelectItem>
                          <SelectItem value={memberId}>{memberName}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => createContactMutation.mutate(newContact)}
                        disabled={!newContact.name}
                      >
                        Add Contact
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-sm text-gray-500">No contacts yet</p>
                ) : (
                  contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-gray-600">{contact.phone}</div>
                        {contact.email && <div className="text-sm text-gray-500">{contact.email}</div>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteContactMutation.mutate(contact.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
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
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="mb-4">
                <Dialog open={dialogOpen.chore} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, chore: open })}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Chore</Button>
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
                      <Select value={newChore.frequency} onValueChange={(value) => setNewChore({ ...newChore, frequency: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => createChoreMutation.mutate({
                          title: newChore.title,
                          frequency: newChore.frequency,
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
              </div>
              <Tabs defaultValue="daily">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
                {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                  <TabsContent key={freq} value={freq}>
                    <div className="space-y-2">
                      {choresByFrequency[freq].length === 0 ? (
                        <p className="text-sm text-gray-500">No {freq} chores</p>
                      ) : (
                        choresByFrequency[freq].map((chore) => (
                          <div key={chore.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <button onClick={() => toggleChoreMutation.mutate({ id: chore.id, is_completed: !chore.is_completed })}>
                                {chore.is_completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                  <Circle className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                              <span className={chore.is_completed ? 'line-through text-gray-500' : ''}>{chore.title}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => deleteChoreMutation.mutate(chore.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>To-Do List & Chores</CardTitle>
          <Dialog open={dialogOpen.chore} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, chore: open })}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Chore</Button>
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
                <Select value={newChore.frequency} onValueChange={(value) => setNewChore({ ...newChore, frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => createChoreMutation.mutate({
                    title: newChore.title,
                    frequency: newChore.frequency,
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
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
            {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
              <TabsContent key={freq} value={freq}>
                <div className="space-y-2">
                  {choresByFrequency[freq].length === 0 ? (
                    <p className="text-sm text-gray-500">No {freq} chores</p>
                  ) : (
                    choresByFrequency[freq].map((chore) => (
                      <div key={chore.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <button onClick={() => toggleChoreMutation.mutate({ id: chore.id, is_completed: !chore.is_completed })}>
                            {chore.is_completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                          <span className={chore.is_completed ? 'line-through text-gray-500' : ''}>{chore.title}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteChoreMutation.mutate(chore.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

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
                    <details key={milestone.id} className="bg-gray-50 rounded-lg p-3">
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