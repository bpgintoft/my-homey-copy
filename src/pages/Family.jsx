import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Users, Plus, Phone, Mail, Pencil, Trash2, CheckCircle2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export default function Family() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responsibilityInput, setResponsibilityInput] = useState('');

  const [newMember, setNewMember] = useState({
    name: '', role: '', email: '', phone: '', person_type: 'adult',
    color: COLORS[0], responsibilities: []
  });

  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: () => base44.entities.MaintenanceTask.list(),
  });

  const createMemberMutation = useMutation({
    mutationFn: (data) => base44.entities.FamilyMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
      setIsAddOpen(false);
      resetForm();
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FamilyMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
      setEditingMember(null);
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id) => base44.entities.FamilyMember.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['familyMembers'] }),
  });

  const resetForm = () => {
    setNewMember({ name: '', role: '', email: '', phone: '', person_type: 'adult', color: COLORS[0], responsibilities: [] });
    setResponsibilityInput('');
  };

  const handleSave = async (data, isEdit = false) => {
    setIsSubmitting(true);
    if (isEdit) {
      await updateMemberMutation.mutateAsync({ id: editingMember.id, data });
    } else {
      await createMemberMutation.mutateAsync(data);
    }
    setIsSubmitting(false);
  };

  const getTasksForMember = (memberId) => {
    return tasks?.filter(t => t.assigned_to === memberId && t.status !== 'completed') || [];
  };

  const MemberForm = ({ member, onSave, onCancel, isEdit = false }) => {
    const [formData, setFormData] = useState(member);
    const [respInput, setRespInput] = useState('');

    const addResponsibility = () => {
      if (respInput.trim() && !formData.responsibilities?.includes(respInput.trim())) {
        setFormData({ 
          ...formData, 
          responsibilities: [...(formData.responsibilities || []), respInput.trim()] 
        });
        setRespInput('');
      }
    };

    const removeResponsibility = (resp) => {
      setFormData({
        ...formData,
        responsibilities: formData.responsibilities.filter(r => r !== resp)
      });
    };

    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Name *</Label>
            <Input 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={formData.person_type || 'adult'} onValueChange={(value) => setFormData({...formData, person_type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kid">Kid</SelectItem>
                <SelectItem value="adult">Adult</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Role</Label>
            <Input 
              value={formData.role || ''}
              onChange={e => setFormData({...formData, role: e.target.value})}
              placeholder="e.g., Parent, Child, Grandparent"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input 
              value={formData.phone || ''}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              placeholder="(555) 555-5555"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input 
              type="email"
              value={formData.email || ''}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
        </div>
        <div>
          <Label>Color</Label>
          <div className="flex gap-2 mt-2">
            {COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({...formData, color})}
                className={`w-8 h-8 rounded-full transition-all ${
                  formData.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>Responsibilities</Label>
          <div className="flex gap-2 mt-2">
            <Input 
              value={respInput}
              onChange={e => setRespInput(e.target.value)}
              placeholder="Add a responsibility"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addResponsibility())}
            />
            <Button type="button" variant="outline" onClick={addResponsibility}>Add</Button>
          </div>
          {formData.responsibilities?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.responsibilities.map(resp => (
                <Badge key={resp} variant="secondary" className="cursor-pointer" onClick={() => removeResponsibility(resp)}>
                  {resp} ×
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button 
            onClick={() => onSave(formData, isEdit)} 
            disabled={!formData.name || isSubmitting}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Member'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-16">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-teal-200 mb-3">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Household</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Family Members</h1>
            <p className="text-teal-100">Manage who's responsible for what</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-end mb-6 -mt-12 relative z-10">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-teal-600 hover:bg-teal-50 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Family Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Family Member</DialogTitle>
              </DialogHeader>
              <MemberForm 
                member={newMember}
                onSave={handleSave}
                onCancel={() => { setIsAddOpen(false); resetForm(); }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <Card key={i} className="border-0 shadow-md animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-slate-200" />
                    <div>
                      <div className="h-5 bg-slate-200 rounded w-32 mb-2" />
                      <div className="h-4 bg-slate-100 rounded w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : members?.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {members.map((member, i) => {
                const memberTasks = getTasksForMember(member.id);
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="border-0 shadow-md hover:shadow-xl transition-all group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                              style={{ backgroundColor: member.color || '#64748b' }}
                            >
                              {member.name?.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-slate-800">{member.name}</h3>
                              {member.role && <p className="text-slate-500">{member.role}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => setEditingMember(member)}>
                              <Pencil className="w-4 h-4 text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteMemberMutation.mutate(member.id)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 mb-4">
                          {member.phone && (
                            <a href={`tel:${member.phone}`} className="flex items-center gap-2 hover:text-teal-600">
                              <Phone className="w-4 h-4" /> {member.phone}
                            </a>
                          )}
                          {member.email && (
                            <a href={`mailto:${member.email}`} className="flex items-center gap-2 hover:text-teal-600">
                              <Mail className="w-4 h-4" /> {member.email}
                            </a>
                          )}
                        </div>

                        {member.responsibilities?.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-slate-500 mb-2">Responsibilities:</p>
                            <div className="flex flex-wrap gap-1">
                              {member.responsibilities.map(resp => (
                                <Badge key={resp} variant="outline" className="text-xs">
                                  {resp}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {memberTasks.length > 0 && (
                          <div className="pt-4 border-t">
                            <p className="text-xs text-slate-500 mb-2">Assigned Tasks:</p>
                            <div className="space-y-1">
                              {memberTasks.slice(0, 3).map(task => (
                                <div key={task.id} className="text-sm flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-slate-300" />
                                  {task.title}
                                </div>
                              ))}
                              {memberTasks.length > 3 && (
                                <p className="text-xs text-slate-400">+{memberTasks.length - 3} more</p>
                              )}
                            </div>
                          </div>
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
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No family members yet</h3>
              <p className="text-slate-500 mb-4">Add your household members to assign tasks</p>
              <Button onClick={() => setIsAddOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" /> Add First Member
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent>
          {editingMember && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Family Member</DialogTitle>
              </DialogHeader>
              <MemberForm 
                member={editingMember}
                onSave={handleSave}
                onCancel={() => setEditingMember(null)}
                isEdit
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}