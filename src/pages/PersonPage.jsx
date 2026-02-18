import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar, Target, StickyNote, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PersonPage({ personName }) {
  const queryClient = useQueryClient();
  const [showChoreDialog, setShowChoreDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [expandedMilestone, setExpandedMilestone] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);

  const [newChore, setNewChore] = useState({ task_name: '', frequency: 'daily' });
  const [newMilestone, setNewMilestone] = useState({ title: '', target_date: '', description: '' });
  const [newContact, setNewContact] = useState({ name: '', type: 'other', phone: '', email: '', linked_to: ['Everyone'] });

  // Fetch family member
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });
  const person = familyMembers.find(m => m.name === personName);

  // Fetch chores
  const { data: chores = [] } = useQuery({
    queryKey: ['chores', personName],
    queryFn: () => base44.entities.Chore.filter({ assigned_to: personName }),
  });

  // Fetch milestones
  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', personName],
    queryFn: () => base44.entities.Milestone.filter({ assigned_to: personName }),
  });

  // Fetch contacts
  const { data: allContacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.ImportantContact.list(),
  });
  const contacts = allContacts.filter(c => 
    !c.linked_to || c.linked_to.length === 0 || c.linked_to.includes('Everyone') || c.linked_to.includes(personName)
  );

  // Mutations
  const createChoreMutation = useMutation({
    mutationFn: (data) => base44.entities.Chore.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['chores', personName]);
      setShowChoreDialog(false);
      setNewChore({ task_name: '', frequency: 'daily' });
      toast.success('Chore added');
    },
  });

  const updateChoreMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Chore.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['chores', personName]);
    },
  });

  const deleteChoreMutation = useMutation({
    mutationFn: (id) => base44.entities.Chore.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['chores', personName]);
      toast.success('Chore deleted');
    },
  });

  const createMilestoneMutation = useMutation({
    mutationFn: (data) => base44.entities.Milestone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['milestones', personName]);
      setShowMilestoneDialog(false);
      setNewMilestone({ title: '', target_date: '', description: '' });
      toast.success('Milestone added');
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (id) => base44.entities.Milestone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['milestones', personName]);
      toast.success('Milestone deleted');
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: (notes) => base44.entities.FamilyMember.update(person.id, { personal_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyMembers']);
      setEditingNotes(false);
      toast.success('Notes saved');
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.ImportantContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setShowContactDialog(false);
      setNewContact({ name: '', type: 'other', phone: '', email: '', linked_to: ['Everyone'] });
      toast.success('Contact added');
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => base44.entities.ImportantContact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      toast.success('Contact deleted');
    },
  });

  const choresByFrequency = {
    daily: chores.filter(c => c.frequency === 'daily'),
    weekly: chores.filter(c => c.frequency === 'weekly'),
    monthly: chores.filter(c => c.frequency === 'monthly'),
    yearly: chores.filter(c => c.frequency === 'yearly'),
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#E91E8C] to-[#0AACFF] rounded-2xl p-8 text-white">
          <h1 className="text-4xl font-bold">{personName}</h1>
          <p className="text-white/80 mt-2">Personal Dashboard</p>
        </div>

        {/* Chores Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Checkbox className="w-5 h-5" />
              To-Do List & Chores
            </CardTitle>
            <Dialog open={showChoreDialog} onOpenChange={setShowChoreDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Chore</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Chore</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Task name"
                    value={newChore.task_name}
                    onChange={(e) => setNewChore({ ...newChore, task_name: e.target.value })}
                  />
                  <Select value={newChore.frequency} onValueChange={(v) => setNewChore({ ...newChore, frequency: v })}>
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
                  <Button onClick={() => createChoreMutation.mutate({ ...newChore, assigned_to: personName })} className="w-full">
                    Add Chore
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
              {Object.entries(choresByFrequency).map(([freq, choreList]) => (
                <TabsContent key={freq} value={freq} className="space-y-2">
                  {choreList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No {freq} chores yet</p>
                  ) : (
                    choreList.map((chore) => (
                      <motion.div
                        key={chore.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={chore.is_completed}
                            onCheckedChange={(checked) => 
                              updateChoreMutation.mutate({ id: chore.id, data: { is_completed: checked } })
                            }
                          />
                          <span className={chore.is_completed ? 'line-through text-gray-400' : ''}>{chore.task_name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteChoreMutation.mutate(chore.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </motion.div>
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Milestones Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Goals & Milestones
            </CardTitle>
            <Dialog open={showMilestoneDialog} onOpenChange={setShowMilestoneDialog}>
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
                    value={newMilestone.target_date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, target_date: e.target.value })}
                  />
                  <Textarea
                    placeholder="Description"
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                  />
                  <Button onClick={() => createMilestoneMutation.mutate({ ...newMilestone, assigned_to: personName })} className="w-full">
                    Add Milestone
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-2">
            {milestones.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No milestones yet</p>
            ) : (
              milestones.map((milestone) => (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedMilestone(expandedMilestone === milestone.id ? null : milestone.id)}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{milestone.title}</h3>
                      {milestone.target_date && (
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                        </p>
                      )}
                      {expandedMilestone === milestone.id && milestone.description && (
                        <p className="text-sm text-gray-700 mt-2">{milestone.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMilestoneMutation.mutate(milestone.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5" />
              Important Notes & Reminders
            </CardTitle>
            <Button size="sm" onClick={() => setEditingNotes(!editingNotes)}>
              {editingNotes ? 'Cancel' : 'Edit'}
            </Button>
          </CardHeader>
          <CardContent>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add notes and reminders here..."
                  value={person?.personal_notes || ''}
                  onChange={(e) => {
                    const updatedPerson = { ...person, personal_notes: e.target.value };
                    queryClient.setQueryData(['familyMembers'], (old) =>
                      old.map(m => m.id === person.id ? updatedPerson : m)
                    );
                  }}
                  rows={8}
                />
                <Button onClick={() => updateNotesMutation.mutate(person?.personal_notes || '')}>
                  Save Notes
                </Button>
              </div>
            ) : (
              <div className="min-h-[100px] text-gray-700 whitespace-pre-wrap">
                {person?.personal_notes || 'No notes yet. Click Edit to add.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Important Contacts
            </CardTitle>
            <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Contact name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  />
                  <Select value={newContact.type} onValueChange={(v) => setNewContact({ ...newContact, type: v })}>
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
                    value={newContact.linked_to[0] || 'Everyone'} 
                    onValueChange={(v) => setNewContact({ ...newContact, linked_to: [v] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Link to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Everyone">Everyone</SelectItem>
                      <SelectItem value="Bryan">Bryan</SelectItem>
                      <SelectItem value="Kate">Kate</SelectItem>
                      <SelectItem value="Phoenix">Phoenix</SelectItem>
                      <SelectItem value="Mara">Mara</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => createContactMutation.mutate(newContact)} className="w-full">
                    Add Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No contacts yet</p>
            ) : (
              contacts.map((contact) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{contact.name}</h3>
                    <p className="text-sm text-gray-600">{contact.type}</p>
                    {contact.phone && <p className="text-sm text-gray-700 mt-1">📞 {contact.phone}</p>}
                    {contact.email && <p className="text-sm text-gray-700">✉️ {contact.email}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteContactMutation.mutate(contact.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}