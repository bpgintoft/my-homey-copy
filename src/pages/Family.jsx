import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Users, Plus, Phone, Mail, Pencil, Trash2, CheckCircle2, Upload, Loader2, AlertTriangle, ArrowUpDown
} from 'lucide-react';
import FamilyMemberReorderDialog from '@/components/FamilyMemberReorderDialog';
import CharacterCreator from '@/components/CharacterCreator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responsibilityInput, setResponsibilityInput] = useState('');
  const [confirmDeleteMember, setConfirmDeleteMember] = useState(null); // member object
  const [isDeleting, setIsDeleting] = useState(false);

  const [newMember, setNewMember] = useState({
    name: '', role: '', email: '', phone: '', person_type: 'adult',
    color: COLORS[0], responsibilities: [], family_id: ''
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list('display_order'),
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

  const handleCascadeDelete = async () => {
    if (!confirmDeleteMember) return;
    setIsDeleting(true);
    await base44.functions.invoke('deleteFamilyMember', { memberId: confirmDeleteMember.id });
    queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
    queryClient.invalidateQueries({ queryKey: ['chores'] });
    queryClient.invalidateQueries({ queryKey: ['milestones'] });
    queryClient.invalidateQueries({ queryKey: ['links'] });
    setConfirmDeleteMember(null);
    setIsDeleting(false);
  };

  const resetForm = () => {
    setNewMember({ name: '', role: '', email: '', phone: '', person_type: 'adult', color: COLORS[0], responsibilities: [] });
    setResponsibilityInput('');
  };

  const handleSave = async (data, isEdit = false) => {
    setIsSubmitting(true);
    if (isEdit) {
      await updateMemberMutation.mutateAsync({ id: editingMember.id, data });
    } else {
      const maxOrder = members?.length
        ? Math.max(...members.map(m => m.display_order ?? 0))
        : 0;
      await createMemberMutation.mutateAsync({
        ...data,
        family_id: currentUser?.family_id,
        display_order: maxOrder + 1,
      });
    }
    setIsSubmitting(false);
  };

  const getTasksForMember = (memberId) => {
    return tasks?.filter(t => t.assigned_to === memberId && t.status !== 'completed') || [];
  };

  const MemberForm = ({ member, onSave, onCancel, isEdit = false }) => {
    const [formData, setFormData] = useState(member);
    const [respInput, setRespInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handlePhotoUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(f => ({ ...f, photo_url: file_url }));
      setUploading(false);
    };

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
        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-20 h-20 rounded-full overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 hover:border-teal-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
            ) : formData.photo_url ? (
              <img src={formData.photo_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-400">
                <Upload className="w-5 h-5" />
                <span className="text-xs">Photo</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          {formData.photo_url && (
            <button type="button" className="text-xs text-red-400 hover:text-red-600" onClick={() => setFormData(f => ({ ...f, photo_url: '' }))}>Remove</button>
          )}
        </div>

        {/* Name & Role */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label>Name *</Label>
            <Input 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Input 
              value={formData.role || ''}
              onChange={e => setFormData({...formData, role: e.target.value})}
              placeholder="e.g., Parent, Child, Grandparent"
            />
          </div>
        </div>

        {/* Character Creator */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Appearance</p>
          <CharacterCreator
            value={{
              gender: formData.gender,
              age_range: formData.age_range,
              skin_tone: formData.skin_tone,
              hair_color: formData.hair_color,
              eye_color: formData.eye_color,
              facial_hair: formData.facial_hair,
            }}
            onChange={(traits) => setFormData(f => ({ ...f, ...traits }))}
          />
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-1 gap-3">
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

        {/* Color dot */}
        <div>
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2 mt-2">
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
        {/* Can vote toggle */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-700">Can vote on decisions</p>
            <p className="text-xs text-slate-500">Show this member on the Decisions page</p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(f => ({ ...f, can_vote: !f.can_vote }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.can_vote ? 'bg-teal-500' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.can_vote ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
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
        <div className="flex justify-end gap-2 mb-6 -mt-12 relative z-10">
          <Button 
            variant="outline" 
            className="bg-white shadow-lg whitespace-nowrap text-xs md:text-sm px-2 md:px-4 py-1 md:py-2"
            onClick={() => setIsReorderOpen(true)}
            title="Reorder Members"
          >
            <ArrowUpDown className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Reorder Members</span>
            <span className="inline md:hidden">Reorder</span>
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-teal-600 hover:bg-teal-50 shadow-lg whitespace-nowrap text-xs md:text-sm px-2 md:px-4 py-1 md:py-2">
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Add Family Member</span>
                <span className="inline md:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-y-auto max-h-[90vh]">
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
                            {member.photo_url ? (
                              <img src={member.photo_url} alt={member.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                                style={{ backgroundColor: member.color || '#64748b' }}
                              >
                                {member.name?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-lg text-slate-800">{member.name}</h3>
                              {member.role && <p className="text-slate-500">{member.role}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => setEditingMember(member)}>
                              <Pencil className="w-4 h-4 text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteMember(member)}>
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

      {/* Cascade Delete Confirmation */}
      <AlertDialog open={!!confirmDeleteMember} onOpenChange={(open) => !open && setConfirmDeleteMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete {confirmDeleteMember?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will permanently delete <strong>{confirmDeleteMember?.name}</strong> and all of their linked data:</p>
              <ul className="text-sm list-disc list-inside space-y-1 mt-2 text-slate-600">
                <li>All To-Do / Chore records</li>
                <li>Goals & Milestones</li>
                <li>Important Links</li>
                <li>School / Work Programs</li>
                <li>Financial Accounts</li>
                <li>Notifications</li>
                <li>Documents & IDs (metadata only — private files must be removed manually)</li>
              </ul>
              <p className="mt-2 font-medium text-amber-600">Maintenance Tasks will be <em>unassigned</em> (not deleted) since they belong to the house.</p>
              <p className="font-semibold text-red-600 mt-2">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCascadeDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : 'Delete Everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-y-auto max-h-[90vh]">
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

      <FamilyMemberReorderDialog open={isReorderOpen} onOpenChange={setIsReorderOpen} />
    </div>
  );
}