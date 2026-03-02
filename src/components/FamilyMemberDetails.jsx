import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ExternalLink, CheckCircle2, Circle, Loader2, Edit2, GripVertical, GraduationCap, Briefcase, Link2, Users, ListTodo, Lightbulb, Target, X, Wrench, CalendarPlus } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import SchoolProgramSection from './SchoolProgramSection';
import LinkedMaintenancePanel from './house/LinkedMaintenancePanel';
import CoAssignedChorePanel from './CoAssignedChorePanel';
import RescheduleDialog from './house/RescheduleDialog';
import SyncChoreToCalendarDialog from './SyncChoreToCalendarDialog';

export default function FamilyMemberDetails({ memberId, memberName, color = 'blue' }) {
  const queryClient = useQueryClient();

  const colorMap = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    pink: 'bg-pink-50 border-pink-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
  };

  const iconColorMap = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    pink: 'text-pink-700',
    purple: 'text-purple-700',
    orange: 'text-orange-700',
  };

  const itemBg = colorMap[color] || colorMap.blue;
  const iconColor = iconColorMap[color] || iconColorMap.blue;
  const [dialogOpen, setDialogOpen] = useState({ chore: false, milestone: false, contact: false, link: false });
  const [newChore, setNewChore] = useState({ title: '', timing: 'short-term', next_due: '' });
  const [newChoreCoAssignees, setNewChoreCoAssignees] = useState([]);
  const [editingChoreId, setEditingChoreId] = useState(null);
  const [editingChoreTitle, setEditingChoreTitle] = useState('');
  const [editingChoreRef, setEditingChoreRef] = useState(null);
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
  const [expandedSection, setExpandedSection] = useState(null);
  const [linkedMaintenanceSheetChore, setLinkedMaintenanceSheetChore] = useState(null);
  const [coAssignedSheetChore, setCoAssignedSheetChore] = useState(null);
  const [rescheduleChore, setRescheduleChore] = useState(null);
  const [syncCalendarChore, setSyncCalendarChore] = useState(null);

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

  const { data: maintenanceTasks = [] } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: () => base44.entities.MaintenanceTask.list(),
  });

  const contacts = allContacts.filter(c => 
    !c.linked_to_member_ids || 
    c.linked_to_member_ids.length === 0 || 
    c.linked_to_member_ids.includes('Everyone') ||
    c.linked_to_member_ids.includes(memberId)
  );

  // Mutations
  const createChoreMutation = useMutation({
    mutationFn: async ({ choreData, coAssignees }) => {
      // Create the chore for the current member
      const primaryChore = await base44.entities.Chore.create(choreData);
      
      if (coAssignees.length === 0) return primaryChore;

      // Create chores for co-assignees
      const coChores = await Promise.all(
        coAssignees.map(member =>
          base44.entities.Chore.create({
            ...choreData,
            assigned_to_member_id: member.id,
            assigned_to_name: member.name,
          })
        )
      );

      // Link siblings together
      const allChores = [primaryChore, ...coChores];
      await Promise.all(
        allChores.map(chore => {
          const sibIds = allChores.filter(c => c.id !== chore.id).map(c => c.id);
          return base44.entities.Chore.update(chore.id, { linked_chore_ids: sibIds });
        })
      );
      return primaryChore;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chores']);
      setDialogOpen({ ...dialogOpen, chore: false });
      setNewChore({ title: '', timing: 'short-term', next_due: '' });
      setNewChoreCoAssignees([]);
    },
  });

  const completeLinkedChoreMutation = useMutation({
    mutationFn: async ({ choreId, maintenanceTaskId, nextDueDate, choreData }) => {
      const today = new Date().toISOString().split('T')[0];

      // Fetch all sibling chores (co-assigned members)
      const siblingIds = choreData.linked_chore_ids || [];
      const allChoreIds = [choreId, ...siblingIds];

      // Fetch sibling chore data if we need to recreate them
      let siblingChores = [];
      if (siblingIds.length > 0) {
        const allChores = await base44.entities.Chore.list();
        siblingChores = allChores.filter(c => siblingIds.includes(c.id));
      }

      let newChoreIds = [];
      if (nextDueDate) {
        // Recreate chores for all assigned members
        const allMemberChores = [choreData, ...siblingChores];
        const newChores = await Promise.all(
          allMemberChores.map(c =>
            base44.entities.Chore.create({
              title: c.title,
              timing: c.timing || 'short-term',
              assigned_to_member_id: c.assigned_to_member_id,
              assigned_to_name: c.assigned_to_name,
              next_due: nextDueDate,
              maintenance_task_id: maintenanceTaskId,
            })
          )
        );
        newChoreIds = newChores.map(c => c.id);

        // Link siblings together
        if (newChores.length > 1) {
          await Promise.all(
            newChores.map(chore => {
              const sibIds = newChores.filter(c => c.id !== chore.id).map(c => c.id);
              return base44.entities.Chore.update(chore.id, { linked_chore_ids: sibIds });
            })
          );
        }
      }

      await base44.entities.MaintenanceTask.update(maintenanceTaskId, {
        status: nextDueDate ? 'pending' : 'completed',
        last_completed: today,
        next_due: nextDueDate || null,
        synced_chore_id: newChoreIds[0] || null,
        synced_chore_ids: newChoreIds.length ? newChoreIds : null,
      });

      // Delete all old chores (this one + siblings)
      await Promise.all(allChoreIds.map(id => base44.entities.Chore.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chores', memberId]);
      queryClient.invalidateQueries(['maintenanceTasks']);
      setRescheduleChore(null);
    },
  });

  const toggleChoreMutation = useMutation({
    mutationFn: async ({ id, is_completed, maintenance_task_id, linked_chore_ids, chore_title }) => {
      if (!is_completed || !maintenance_task_id) {
        // Normal chore toggle — also toggle all sibling chores
        await base44.entities.Chore.update(id, { is_completed });
        if (linked_chore_ids?.length) {
          await Promise.all(linked_chore_ids.map(sibId => base44.entities.Chore.update(sibId, { is_completed })));

          // If marking complete, create notifications for co-assigned members
          if (is_completed) {
            const allChores = await base44.entities.Chore.list();
            const siblingChores = allChores.filter(c => linked_chore_ids.includes(c.id));
            await Promise.all(
              siblingChores.map(sib =>
                base44.entities.Notification.create({
                  recipient_member_id: sib.assigned_to_member_id,
                  triggering_member_name: memberName,
                  chore_title: chore_title,
                  chore_id: id,
                  is_read: false,
                })
              )
            );
          }
        }
      }
      // For linked maintenance chores being completed, we handle via reschedule dialog
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chores']);
    },
  });

  const updateChoreMutation = useMutation({
    mutationFn: async ({ id, title, linked_chore_ids, chore }) => {
      await base44.entities.Chore.update(id, { title });
      if (linked_chore_ids?.length) {
        await Promise.all(linked_chore_ids.map(sibId => base44.entities.Chore.update(sibId, { title })));
      }
      // Auto-sync to Google Calendar if linked
      if (chore?.synced_google_calendar_id && chore?.synced_google_event_id) {
        await base44.functions.invoke('updateGoogleCalendarEvent', {
          calendarId: chore.synced_google_calendar_id,
          eventId: chore.synced_google_event_id,
          summary: title,
          description: `Family to-do: ${title}`,
          start: chore.next_due || null,
          end: chore.next_due || null,
          isAllDay: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chores']);
      setEditingChoreId(null);
    },
  });

  const updateChoreTimingMutation = useMutation({
    mutationFn: async ({ id, timing, linked_chore_ids }) => {
      await base44.entities.Chore.update(id, { timing });
      if (linked_chore_ids?.length) {
        await Promise.all(linked_chore_ids.map(sibId => base44.entities.Chore.update(sibId, { timing })));
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['chores']),
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const sourceCategory = result.source.droppableId;
    const destCategory = result.destination.droppableId;
    const destIndex = result.destination.index;
    const choreId = result.draggableId;
    const chore = chores.find(c => c.id === choreId);

    // Optimistically reorder locally
    setLocalChores(prev => {
      const sourceList = [...(prev[sourceCategory] || [])];
      const destList = sourceCategory === destCategory ? sourceList : [...(prev[destCategory] || [])];
      const itemIdx = sourceList.findIndex(c => c.id === choreId);
      const [removed] = sourceList.splice(itemIdx, 1);
      const updatedItem = { ...removed, timing: destCategory };
      if (sourceCategory === destCategory) {
        sourceList.splice(destIndex, 0, updatedItem);
        return { ...prev, [sourceCategory]: sourceList };
      } else {
        destList.splice(destIndex, 0, updatedItem);
        return { ...prev, [sourceCategory]: sourceList, [destCategory]: destList };
      }
    });

    // Persist timing change if moved between categories
    if (sourceCategory !== destCategory) {
      updateChoreTimingMutation.mutate({ id: choreId, timing: destCategory, linked_chore_ids: chore?.linked_chore_ids });
    }

    // Persist sort order for all items in the destination list after reorder
    setTimeout(() => {
      setLocalChores(prev => {
        const list = prev[destCategory] || [];
        list.forEach((c, idx) => {
          if (c.sort_order !== idx) {
            base44.entities.Chore.update(c.id, { sort_order: idx });
          }
        });
        return prev;
      });
    }, 0);
  };

  const deleteChoreMutation = useMutation({
    mutationFn: async ({ id, linked_chore_ids, chore_title }) => {
      if (linked_chore_ids?.length) {
        // Fetch sibling chores to get their assigned member info
        const allChores = await base44.entities.Chore.list();
        const siblingChores = allChores.filter(c => linked_chore_ids.includes(c.id));

        // Notify co-assigned members
        await Promise.all(
          siblingChores.map(sib =>
            base44.entities.Notification.create({
              recipient_member_id: sib.assigned_to_member_id,
              triggering_member_name: memberName,
              chore_title: chore_title,
              chore_id: id,
              is_read: false,
            })
          )
        );

        await Promise.all(linked_chore_ids.map(sibId => base44.entities.Chore.delete(sibId)));
      }
      await base44.entities.Chore.delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries(['chores']),
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

  const sortChores = (choreList) => {
    return [...choreList].sort((a, b) => {
      // Maintenance chores sink to bottom within their group
      if (a.maintenance_task_id && !b.maintenance_task_id) return 1;
      if (!a.maintenance_task_id && b.maintenance_task_id) return -1;
      // Maintenance-linked chores: sort by next_due date
      if (a.maintenance_task_id && b.maintenance_task_id) {
        const aDate = a.next_due ? new Date(a.next_due) : new Date('9999-01-01');
        const bDate = b.next_due ? new Date(b.next_due) : new Date('9999-01-01');
        return aDate - bDate;
      }
      // Manual sort order
      const aOrder = a.sort_order ?? 999999;
      const bOrder = b.sort_order ?? 999999;
      return aOrder - bOrder;
    });
  };

  const [localChores, setLocalChores] = React.useState({});

  React.useEffect(() => {
    const grouped = {
      'short-term': sortChores(chores.filter(c => c.timing === 'short-term')),
      'mid-term': sortChores(chores.filter(c => c.timing === 'mid-term')),
      'long-term': sortChores(chores.filter(c => c.timing === 'long-term')),
    };
    setLocalChores(grouped);
  }, [chores]);

  const choresByTiming = localChores['short-term'] ? localChores : {
    'short-term': sortChores(chores.filter(c => c.timing === 'short-term')),
    'mid-term': sortChores(chores.filter(c => c.timing === 'mid-term')),
    'long-term': sortChores(chores.filter(c => c.timing === 'long-term')),
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
    <div className="space-y-4">
      {/* Passport & License/Student # */}
      <div className={`grid grid-cols-[1.2fr_1.3fr_1fr] gap-x-2 p-2.5 rounded-lg ${itemBg}`}>
        <div 
          className="cursor-pointer flex flex-col items-center text-center"
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
          <div className="text-xs text-gray-500 mb-1 whitespace-nowrap">🛂 Passport Exp:</div>
          <div className="text-sm font-semibold">
            {member?.passport_expiration_date 
            ? new Date(member.passport_expiration_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase().replace(',', ',')
            : 'Not set'}
          </div>
        </div>
        {member?.person_type === 'kid' ? (
          <div 
            className="cursor-pointer flex flex-col items-center text-center ml-4"
            onClick={() => {
              const newStudent = prompt('Enter student number:');
              if (newStudent !== null) {
                updateExpirationDatesMutation.mutate({ student_number: newStudent });
              }
            }}
          >
            <div className="text-xs text-gray-500 mb-1 whitespace-nowrap">📚 Student #:</div>
            <div className="text-sm font-semibold whitespace-nowrap">
              {member?.student_number || 'Not set'}
            </div>
          </div>
        ) : (
          <div 
            className="cursor-pointer flex flex-col items-center text-center ml-4"
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
            <div className="text-xs text-gray-500 mb-1 whitespace-nowrap">🪪 License Exp:</div>
            <div className="text-sm font-semibold whitespace-nowrap">
              {member?.license_expiration_date 
                ? new Date(member.license_expiration_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase().replace(',', ',')
                : 'Not set'}
            </div>
          </div>
        )}
        {member?.person_type === 'kid' ? (
          <div 
            className="cursor-pointer flex flex-col items-center text-center ml-5"
            onClick={() => {
              const newSize = prompt('Enter shoe size:');
              if (newSize !== null) {
                updateExpirationDatesMutation.mutate({ shoe_size: newSize });
              }
            }}
          >
            <div className="text-xs text-gray-500 mb-1 whitespace-nowrap">👟 Shoe Size</div>
            <div className="text-sm font-semibold">
              {member?.shoe_size || 'Not set'}
            </div>
          </div>
        ) : (
          <div 
            className="cursor-pointer flex flex-col items-center text-center ml-5"
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
        )}
      </div>

      {/* 2-Column Grid for Sections */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow flex items-center" onClick={() => setExpandedSection('chores')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3"><ListTodo className={`w-8 h-8 flex-shrink-0 ${iconColor}`} />To-Do List & Chores</CardTitle>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow flex items-center" onClick={() => setExpandedSection('schoolProgram')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3"><Briefcase className={`w-8 h-8 flex-shrink-0 ${member?.person_type !== 'adult' ? 'hidden' : ''} ${iconColor}`} /><GraduationCap className={`w-8 h-8 flex-shrink-0 ${member?.person_type === 'adult' ? 'hidden' : ''} ${iconColor}`} />{member?.school_or_work_name || 'School & Work'}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow flex items-center" onClick={() => setExpandedSection('links')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3"><Link2 className={`w-8 h-8 flex-shrink-0 ${iconColor}`} />Important Links</CardTitle>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow flex items-center" onClick={() => setExpandedSection('contacts')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3"><Users className={`w-8 h-8 flex-shrink-0 ${iconColor}`} />Important Contacts</CardTitle>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow flex items-center" onClick={() => setExpandedSection('notes')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3"><Lightbulb className={`w-8 h-8 flex-shrink-0 ${iconColor}`} />Personal Notes & Reminders</CardTitle>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow flex items-center" onClick={() => setExpandedSection('milestones')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3"><Target className={`w-8 h-8 flex-shrink-0 ${iconColor}`} />Goals & Milestones</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Links Dialog */}
      <Dialog open={expandedSection === 'links'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0">
          <DialogHeader>
            <DialogTitle>Important Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Contacts Dialog */}
      <Dialog open={expandedSection === 'contacts'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Important Contacts</span>
              <Dialog open={dialogOpen.contact} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, contact: open })}>
                <DialogTrigger asChild>
                  <Button size="sm" className="mr-10">
                    <Plus className="w-4 h-4 mr-2" />Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
                    <Input placeholder="Type (e.g., Emergency, Neighbor, Family...)" value={newContact.type} onChange={(e) => setNewContact({ ...newContact, type: e.target.value })} />
                    <Input placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
                    <Input placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                    <Input placeholder="Address" value={newContact.address} onChange={(e) => setNewContact({ ...newContact, address: e.target.value })} />
                    <Input placeholder="Website" value={newContact.website} onChange={(e) => setNewContact({ ...newContact, website: e.target.value })} />
                    <div className="space-y-3">
                      <Label>Link to family members:</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="everyone" checked={newContact.linked_to_member_ids.includes('Everyone')} onCheckedChange={(checked) => {
                          if (checked) {
                            setNewContact({ ...newContact, linked_to_member_ids: ['Everyone'] });
                          } else {
                            setNewContact({ ...newContact, linked_to_member_ids: newContact.linked_to_member_ids.filter(id => id !== 'Everyone') });
                          }
                        }} />
                        <label htmlFor="everyone" className="text-sm font-medium cursor-pointer">Everyone</label>
                      </div>
                      {familyMembers.map((fm) => (
                        <div key={fm.id} className="flex items-center space-x-2">
                          <Checkbox id={fm.id} checked={newContact.linked_to_member_ids.includes(fm.id)} disabled={newContact.linked_to_member_ids.includes('Everyone')} onCheckedChange={(checked) => {
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
                          }} />
                          <label htmlFor={fm.id} className="text-sm cursor-pointer">{fm.name}</label>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => createContactMutation.mutate(newContact)} disabled={!newContact.name}>Add Contact</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </DialogTitle>
          </DialogHeader>
          <div>
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
                            <div className={`flex items-center gap-2 p-3 cursor-pointer hover:opacity-80 transition-opacity`} onClick={() => setExpandedContactId(isExpanded ? null : contact.id)}>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{contact.name}</div>
                              </div>
                              <div className="flex gap-0.5 flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingContact(contact); }}>
                                  <Edit2 className="w-3 h-3 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteContactMutation.mutate(contact.id); }}>
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-2 border-t border-gray-200 pt-2">
                                {contact.phone && <a href={`tel:${contact.phone}`} className="block text-sm text-blue-600 hover:underline">📞 {contact.phone}</a>}
                                {contact.email && <a href={`mailto:${contact.email}`} className="block text-sm text-blue-600 hover:underline">✉️ {contact.email}</a>}
                                {contact.address && <a href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 hover:underline">📍 {contact.address}</a>}
                                {contact.website && <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 hover:underline">🌐 {contact.website}</a>}
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
                    <Input placeholder="Name" value={editingContact.name} onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })} />
                    <Input placeholder="Type" value={editingContact.type || ''} onChange={(e) => setEditingContact({ ...editingContact, type: e.target.value })} />
                    <Input placeholder="Phone" value={editingContact.phone || ''} onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })} />
                    <Input placeholder="Email" value={editingContact.email || ''} onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })} />
                    <Input placeholder="Address" value={editingContact.address || ''} onChange={(e) => setEditingContact({ ...editingContact, address: e.target.value })} />
                    <Input placeholder="Website" value={editingContact.website || ''} onChange={(e) => setEditingContact({ ...editingContact, website: e.target.value })} />
                    <div className="space-y-3">
                      <Label>Link to family members:</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="edit-everyone" checked={editingContact.linked_to_member_ids?.includes('Everyone')} onCheckedChange={(checked) => {
                          if (checked) {
                            setEditingContact({ ...editingContact, linked_to_member_ids: ['Everyone'] });
                          } else {
                            setEditingContact({ ...editingContact, linked_to_member_ids: editingContact.linked_to_member_ids?.filter(id => id !== 'Everyone') || [] });
                          }
                        }} />
                        <label htmlFor="edit-everyone" className="text-sm font-medium cursor-pointer">Everyone</label>
                      </div>
                      {familyMembers.map((fm) => (
                        <div key={fm.id} className="flex items-center space-x-2">
                          <Checkbox id={`edit-${fm.id}`} checked={editingContact.linked_to_member_ids?.includes(fm.id)} disabled={editingContact.linked_to_member_ids?.includes('Everyone')} onCheckedChange={(checked) => {
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
                          }} />
                          <label htmlFor={`edit-${fm.id}`} className="text-sm cursor-pointer">{fm.name}</label>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => updateContactMutation.mutate({ id: editingContact.id, data: { name: editingContact.name, type: editingContact.type, phone: editingContact.phone, email: editingContact.email, address: editingContact.address, website: editingContact.website, linked_to_member_ids: editingContact.linked_to_member_ids } })} disabled={!editingContact.name}>Save Changes</Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chores Dialog */}
      <Dialog open={expandedSection === 'chores'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>To-Do List & Chores</span>
              <Dialog open={dialogOpen.chore} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, chore: open })}>
                <DialogTrigger asChild>
                  <Button size="sm" className="mr-10">
                    <Plus className="w-4 h-4 mr-2" />Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Chore</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Chore title" value={newChore.title} onChange={(e) => setNewChore({ ...newChore, title: e.target.value })} />
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
                    <div>
                      <Input
                        type="date"
                        value={newChore.next_due}
                        onChange={(e) => setNewChore({ ...newChore, next_due: e.target.value })}
                        placeholder="Enter date (optional)"
                        className="text-gray-700 [&:not([value]):before]:content-['Enter_date_(optional)'] [&:not([value]):before]:text-gray-400"
                        onFocus={(e) => e.target.showPicker?.()}
                        style={!newChore.next_due ? { color: 'transparent' } : {}}
                        onBlur={(e) => { if (!e.target.value) e.target.style.color = 'transparent'; else e.target.style.color = ''; }}
                        onInput={(e) => { e.target.style.color = e.target.value ? '' : 'transparent'; }}
                      />
                      {!newChore.next_due && (
                        <div className="relative -mt-9 ml-3 pointer-events-none">
                          <span className="text-gray-400 text-sm">Enter date (optional)</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="mb-2 block text-sm text-gray-600">Also assign to other family members:</Label>
                      <div className="space-y-1">
                        {familyMembers.filter(m => m.id !== memberId).map(m => (
                          <div key={m.id} className="flex items-center gap-2 cursor-pointer" onClick={() => setNewChoreCoAssignees(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}>
                            <Checkbox checked={newChoreCoAssignees.includes(m.id)} onCheckedChange={(checked) => setNewChoreCoAssignees(prev => checked ? [...prev, m.id] : prev.filter(id => id !== m.id))} onClick={(e) => e.stopPropagation()} />
                            <span className="text-sm">{m.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => createChoreMutation.mutate({
                        choreData: { title: newChore.title, timing: newChore.timing, assigned_to_member_id: memberId, assigned_to_name: memberName, ...(newChore.next_due ? { next_due: newChore.next_due } : {}) },
                        coAssignees: familyMembers.filter(m => newChoreCoAssignees.includes(m.id)),
                      })}
                      disabled={!newChore.title}
                    >
                      Add Chore{newChoreCoAssignees.length > 0 ? ` for ${newChoreCoAssignees.length + 1} members` : ''}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </DialogTitle>
          </DialogHeader>
          <div>
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
                            <div ref={provided.innerRef} {...provided.droppableProps} className={`space-y-2 min-h-[60px] p-2 rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300' : 'bg-transparent'}`}>
                              {timingChores.length === 0 && !snapshot.isDraggingOver ? (
                                <p className="text-xs text-gray-400 text-center py-2">Drop items here</p>
                              ) : (
                                timingChores.map((chore, index) => {
                                  const choreEl = (provided, snapshot) => {
                                    const child = (
                                      <div ref={provided.innerRef} {...provided.draggableProps} className={`rounded-lg ${itemBg} ${snapshot.isDragging ? 'shadow-lg opacity-90' : ''}`}>
                                        <div className="flex items-center gap-3 p-3">
                                          <div {...(!chore.maintenance_task_id ? provided.dragHandleProps : {})} className={`flex-shrink-0 ${chore.maintenance_task_id ? 'opacity-0 pointer-events-none' : 'cursor-grab active:cursor-grabbing'}`}>
                                            <GripVertical className="w-4 h-4 text-gray-400" />
                                          </div>
                                          <button className="flex-shrink-0" onClick={() => {
                                            if (!chore.is_completed && chore.maintenance_task_id) {
                                              setRescheduleChore(chore);
                                            } else {
                                              toggleChoreMutation.mutate({ id: chore.id, is_completed: !chore.is_completed, maintenance_task_id: chore.maintenance_task_id, linked_chore_ids: chore.linked_chore_ids, chore_title: chore.title });
                                            }
                                          }}>
                                            {chore.is_completed ? (
                                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            ) : (
                                              <Circle className="w-5 h-5 text-gray-400" />
                                            )}
                                          </button>
                                          <div className="flex-1 min-w-0">
                                            {editingChoreId === chore.id ? (
                                              <Input value={editingChoreTitle} onChange={(e) => setEditingChoreTitle(e.target.value)} onBlur={() => updateChoreMutation.mutate({ id: chore.id, title: editingChoreTitle, linked_chore_ids: chore.linked_chore_ids, chore: editingChoreRef })} onKeyDown={(e) => { if (e.key === 'Enter') updateChoreMutation.mutate({ id: chore.id, title: editingChoreTitle, linked_chore_ids: chore.linked_chore_ids, chore: editingChoreRef }); if (e.key === 'Escape') setEditingChoreId(null); }} autoFocus className="h-8" />
                                            ) : (
                                              <div>
                                                <span className={`cursor-pointer hover:text-blue-600 ${chore.is_completed ? 'line-through text-gray-500' : ''}`} onClick={() => { if (!chore.maintenance_task_id) { if (chore.linked_chore_ids?.length > 0) { setCoAssignedSheetChore(chore); } else { setEditingChoreId(chore.id); setEditingChoreTitle(chore.title); setEditingChoreRef(chore); } } }}>
                                                  {chore.title}
                                                </span>
                                                {chore.next_due && !chore.maintenance_task_id && (
                                                  <div className="text-xs text-gray-400 mt-0.5">
                                                    Due {new Date(chore.next_due + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-shrink-0 flex items-center gap-0.5">
                                            <button
                                              className="p-1 rounded hover:bg-blue-50 transition-colors"
                                              title={chore.synced_google_calendar_id ? "Synced to Google Calendar" : "Sync to Google Calendar"}
                                              onClick={() => setSyncCalendarChore(chore)}
                                            >
                                              <CalendarPlus className={`w-4 h-4 ${chore.synced_google_calendar_id ? 'text-green-500' : 'text-blue-400'}`} />
                                            </button>
                                            {chore.maintenance_task_id ? (
                                              <button
                                                onClick={() => setLinkedMaintenanceSheetChore(chore)}
                                                className="p-1 rounded hover:bg-orange-100 transition-colors"
                                                title="View linked maintenance task"
                                              >
                                                <Wrench className="w-4 h-4 text-orange-500" />
                                              </button>
                                            ) : (
                                              <button className="p-1 rounded hover:bg-red-50 transition-colors" onClick={() => deleteChoreMutation.mutate({ id: chore.id, linked_chore_ids: chore.linked_chore_ids, chore_title: chore.title })}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                    return snapshot.isDragging ? createPortal(child, document.body) : child;
                                  };
                                  return (
                                    <Draggable key={chore.id} draggableId={chore.id} index={index} isDragDisabled={!!chore.maintenance_task_id}>
                                      {choreEl}
                                    </Draggable>
                                  );
                                })
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog for linked maintenance chores */}
      <RescheduleDialog
        open={!!rescheduleChore}
        onOpenChange={(open) => !open && setRescheduleChore(null)}
        task={rescheduleChore}
        onConfirm={(nextDueDate) => {
          completeLinkedChoreMutation.mutate({
            choreId: rescheduleChore.id,
            maintenanceTaskId: rescheduleChore.maintenance_task_id,
            nextDueDate,
            choreData: rescheduleChore,
          });
        }}
      />

      {/* Co-Assigned Chore Side Sheet */}
      <Sheet open={!!coAssignedSheetChore} onOpenChange={(open) => !open && setCoAssignedSheetChore(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Co-Assigned Task
            </SheetTitle>
          </SheetHeader>
          {coAssignedSheetChore && (
            <div className="mt-4">
              <CoAssignedChorePanel
                chore={coAssignedSheetChore}
                onEdit={() => {
                  setCoAssignedSheetChore(null);
                  setEditingChoreId(coAssignedSheetChore.id);
                  setEditingChoreTitle(coAssignedSheetChore.title);
                  setExpandedSection('chores');
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sync Chore to Google Calendar */}
      <SyncChoreToCalendarDialog
        open={!!syncCalendarChore}
        onOpenChange={(open) => !open && setSyncCalendarChore(null)}
        chore={syncCalendarChore}
      />

      {/* Linked Maintenance Task Side Sheet */}
      <Sheet open={!!linkedMaintenanceSheetChore} onOpenChange={(open) => !open && setLinkedMaintenanceSheetChore(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" />
              Linked Maintenance Task
            </SheetTitle>
          </SheetHeader>
          {linkedMaintenanceSheetChore && (
            <div className="mt-4">
              <LinkedMaintenancePanel
                maintenanceTaskId={linkedMaintenanceSheetChore.maintenance_task_id}
                choreId={linkedMaintenanceSheetChore.id}
                defaultExpanded={true}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Notes Dialog */}
      <Dialog open={expandedSection === 'notes'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0">
          <DialogHeader>
            <DialogTitle>Personal Notes & Reminders</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Add personal notes or reminders..." value={personalNotes} onChange={(e) => setPersonalNotes(e.target.value)} onBlur={() => updateNotesMutation.mutate(personalNotes)} rows={6} className="w-full" />
        </DialogContent>
      </Dialog>

      {/* Milestones Dialog */}
      <Dialog open={expandedSection === 'milestones'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Goals & Milestones</span>
              <Dialog open={dialogOpen.milestone} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, milestone: open })}>
                <DialogTrigger asChild>
                  <Button size="sm" className="mr-10"><Plus className="w-4 h-4 mr-2" />Add</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Milestone</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Milestone title" value={newMilestone.title} onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })} />
                    <Input type="date" value={newMilestone.date} onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })} />
                    <Textarea placeholder="Brief description" value={newMilestone.description} onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })} />
                    <Button onClick={() => createMilestoneMutation.mutate({ ...newMilestone, assigned_to_member_id: memberId, assigned_to_name: memberName })} disabled={!newMilestone.title}>Add Milestone</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      {/* School Program Dialog */}
      <Dialog open={expandedSection === 'schoolProgram'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0">
          <SchoolProgramSection memberId={memberId} memberName={memberName} personType={member?.person_type || 'kid'} schoolOrWorkName={member?.school_or_work_name} />
        </DialogContent>
      </Dialog>
    </div>
  );
}