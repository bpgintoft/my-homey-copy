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
import { Plus, Trash2, ExternalLink, CheckCircle2, Circle, Loader2, Edit2, GripVertical, GraduationCap, Briefcase, Link2, Users, ListTodo, Lightbulb, Target, X, Wrench, CalendarPlus, HeartPulse, FolderOpen, Car, User, Settings2, Check, Activity, Wallet, MessageCircle, Archive } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import SchoolProgramSection from './SchoolProgramSection';
import ActivitiesDialog from './ActivitiesDialog';
import FinancialsDialog from './FinancialsDialog';
import PersonalInfoSection from './PersonalInfoSection';
import HealthMedicalSection from './HealthMedicalSection';
import VehiclesTravelSection from './VehiclesTravelSection';
import DocumentsIDsSection from './DocumentsIDsSection';
import LinkedMaintenancePanel from './house/LinkedMaintenancePanel';
import CoAssignedChorePanel from './CoAssignedChorePanel';
import RescheduleDialog from './house/RescheduleDialog';
import SyncChoreToCalendarDialog from './SyncChoreToCalendarDialog';
import ChoreCommentsSheet from './ChoreCommentsSheet';

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
  const [addLinkType, setAddLinkType] = useState('link'); // 'link' or 'app'
  const [newAppEntry, setNewAppEntry] = useState({ title: '', category: '' });
  const [showAppDialog, setShowAppDialog] = useState(false);
  const [categorizingLink, setCategorizingLink] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [personalNotes, setPersonalNotes] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);
  const [linkedMaintenanceSheetChore, setLinkedMaintenanceSheetChore] = useState(null);
  const [coAssignedSheetChore, setCoAssignedSheetChore] = useState(null);
  const [rescheduleChore, setRescheduleChore] = useState(null);
  const [syncCalendarChore, setSyncCalendarChore] = useState(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);
  const isChildUser = currentUser?.role === 'child';
  const [customSectionOrder, setCustomSectionOrder] = useState(null); // null = use saved/default
  const [showActivities, setShowActivities] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  const [commentingChore, setCommentingChore] = useState(null);
  const [isReorderingChores, setIsReorderingChores] = useState(false);
  const [showArchive, setShowArchive] = useState(false);



  const DEFAULT_SECTIONS = [
    { key: 'chores', label: 'To-Do List' },
    { key: 'schoolProgram', label: 'School & Work' },
    { key: 'links', label: 'Important Links' },
    { key: 'contacts', label: 'Important Contacts' },
    { key: 'milestones', label: 'Goals & Milestones' },
    { key: 'health', label: 'Health & Medical' },
    { key: 'personalInfo', label: 'Personal Info Hub' },
    { key: 'vehicles', label: 'Vehicles & Travel' },
    { key: 'notes', label: 'Personal Notes' },
    { key: 'documents', label: 'Documents & IDs' },
  ];

  React.useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const savedOrder = currentUser?.family_member_page_layouts?.[memberId];
  const activeSectionKeys = customSectionOrder || savedOrder || DEFAULT_SECTIONS.map(s => s.key);

  const handleCustomizeDragEnd = (result) => {
    if (!result.destination) return;
    const newOrder = [...activeSectionKeys];
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setCustomSectionOrder(newOrder);
  };

  const handleSaveLayout = async () => {
    const updated = {
      family_member_page_layouts: {
        ...(currentUser?.family_member_page_layouts || {}),
        [memberId]: activeSectionKeys,
      }
    };
    await base44.auth.updateMe(updated);
    setCurrentUser(prev => ({ ...prev, ...updated }));
    setIsCustomizing(false);
    setCustomSectionOrder(null);
  };

  const handleCancelCustomize = () => {
    setIsCustomizing(false);
    setCustomSectionOrder(null);
  };

  // Fetch data
  const { data: member } = useQuery({
    queryKey: ['familyMember', memberId],
    queryFn: () => base44.entities.FamilyMember.filter({ id: memberId }).then(res => res[0]),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: chores = [] } = useQuery({
    queryKey: ['chores', memberId],
    queryFn: () => base44.entities.Chore.filter({ assigned_to_member_id: memberId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!memberId,
  });

  // Open chores section directly if ?chore=<id> param is present (consumed once)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const choreId = params.get('chore');
    if (choreId && chores.length > 0) {
      const target = chores.find(c => c.id === choreId);
      if (target) {
        setExpandedSection('chores');
        setEditingChoreId(choreId);
        setEditingChoreTitle(target.title);
        setEditingChoreRef(target);
        // Clear the param so closing the dialog doesn't reopen it
        const newUrl = window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [chores]);

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', memberId],
    queryFn: () => base44.entities.Milestone.filter({ assigned_to_member_id: memberId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!memberId,
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.ImportantContact.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allAppliances = [] } = useQuery({
    queryKey: ['allRoomItems'],
    queryFn: () => base44.entities.RoomItem.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: links = [] } = useQuery({
    queryKey: ['links', memberId],
    queryFn: () => base44.entities.FamilyMemberLink.filter({ assigned_to_member_id: memberId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!memberId,
  });

  const { data: maintenanceTasks = [] } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: () => base44.entities.MaintenanceTask.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allChoreComments = [] } = useQuery({
    queryKey: ['choreCommentCounts'],
    queryFn: () => base44.entities.ChoreComment.list(),
    staleTime: 5 * 60 * 1000,
  });

  const commentCountByChoreId = React.useMemo(() => {
    const counts = {};
    allChoreComments.forEach(c => {
      counts[c.chore_id] = (counts[c.chore_id] || 0) + 1;
    });
    // For each chore, also count comments from linked chores
    chores.forEach(chore => {
      if (chore.linked_chore_ids?.length) {
        const linkedCount = chore.linked_chore_ids.reduce((sum, linkedId) => sum + (counts[linkedId] || 0), 0);
        counts[chore.id] = (counts[chore.id] || 0) + linkedCount;
      }
    });
    return counts;
  }, [allChoreComments, chores]);

  const contacts = allContacts.filter(c => 
    !c.linked_to_member_ids || 
    c.linked_to_member_ids.length === 0 || 
    c.linked_to_member_ids.includes('Everyone') ||
    c.linked_to_member_ids.includes(memberId)
  );

  // Mutations
  const createChoreMutation = useMutation({
    mutationFn: async ({ choreData, coAssignees }) => {
      // If no date is set, assign sort_order of 0 to place at top
      if (!choreData.next_due) {
        choreData.sort_order = 0;
      }
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

      // Notify all other adult family members of the completed maintenance task
      const allMembers = await base44.entities.FamilyMember.list();
      const otherAdults = allMembers.filter(m => m.id !== memberId && m.person_type === 'adult');
      await Promise.all(
        otherAdults.map(adult =>
          base44.entities.Notification.create({
            recipient_member_id: adult.id,
            triggering_member_name: memberName,
            triggering_member_id: memberId,
            chore_title: choreData.title,
            chore_id: choreId,
            completed_date: new Date().toISOString(),
            is_read: false,
          })
        )
      );
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
        }

        // If marking complete, notify ALL other adult family members
        if (is_completed) {
          const allMembers = await base44.entities.FamilyMember.list();
          const otherAdults = allMembers.filter(m => m.id !== memberId && m.person_type === 'adult');
          await Promise.all(
            otherAdults.map(adult =>
              base44.entities.Notification.create({
                recipient_member_id: adult.id,
                triggering_member_name: memberName,
                triggering_member_id: memberId,
                chore_title: chore_title,
                chore_id: id,
                completed_date: new Date().toISOString(),
                is_read: false,
              })
            )
          );
        }
      }
      // For linked maintenance chores being completed, we handle via reschedule dialog
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chores']);
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, progress, linked_chore_ids }) => {
      const is_completed = progress === 100;
      await base44.entities.Chore.update(id, { progress, is_completed });
      if (linked_chore_ids?.length) {
        await Promise.all(linked_chore_ids.map(sibId => base44.entities.Chore.update(sibId, { progress, is_completed })));
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['chores']),
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
      'next-year': sortChores(chores.filter(c => c.timing === 'next-year')),
    };
    setLocalChores(grouped);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(chores)]);

  const choresByTiming = localChores['short-term'] ? localChores : {
    'short-term': sortChores(chores.filter(c => c.timing === 'short-term')),
    'mid-term': sortChores(chores.filter(c => c.timing === 'mid-term')),
    'long-term': sortChores(chores.filter(c => c.timing === 'long-term')),
    'next-year': sortChores(chores.filter(c => c.timing === 'next-year')),
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

  const sortedContactTypes = Object.keys(contactsByType).sort((a, b) => {
    const priority = (key) => {
      const lower = key.toLowerCase();
      if (lower.includes('emergency')) return 0;
      if (lower.includes('health') || lower.includes('medical') || lower.includes('doctor') || lower.includes('healthcare')) return 1;
      return 2;
    };
    return priority(a) - priority(b);
  });

  return (
    <div className="space-y-4">
      {/* 2-Column Grid for Sections */}
      <div className="relative">

        {(() => {
          const sectionIconMap = {
            chores: <span className="text-lg flex-shrink-0">✅</span>,
            schoolProgram: member?.person_type !== 'adult' ? <span className="text-lg flex-shrink-0">🎓</span> : <span className="text-lg flex-shrink-0">💼</span>,
            links: <span className="text-lg flex-shrink-0">🔗</span>,
            contacts: <span className="text-lg flex-shrink-0">👥</span>,
            notes: <span className="text-lg flex-shrink-0">💡</span>,
            milestones: <span className="text-lg flex-shrink-0">🎯</span>,
            health: <span className="text-lg flex-shrink-0">❤️</span>,
            documents: <span className="text-lg flex-shrink-0">📁</span>,
            vehicles: <span className="text-lg flex-shrink-0">🚗</span>,
            personalInfo: <span className="text-lg flex-shrink-0">👤</span>,
          };
          const sectionLabelMap = {
            chores: 'To-Do List',
            schoolProgram: member?.school_or_work_name || 'School & Work',
            links: 'Important Links',
            contacts: 'Important Contacts',
            notes: 'Personal Notes',
            milestones: 'Goals & Milestones',
            health: 'Health & Medical',
            documents: 'Documents & IDs',
            vehicles: 'Vehicles & Travel',
            personalInfo: 'Personal Info Hub',
          };

          const orderedSections = activeSectionKeys.map(key => ({ key, icon: sectionIconMap[key], label: sectionLabelMap[key] }));

          if (isCustomizing) {
            return (
              <>
              <div className="flex justify-end gap-2 mb-1.5">
                <button onClick={handleSaveLayout} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium">
                  <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={handleCancelCustomize} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium">
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
              <DragDropContext onDragEnd={handleCustomizeDragEnd}>
                <Droppable droppableId="section-list" direction="vertical">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-col gap-2"
                    >
                      {orderedSections.map(({ key, icon, label }, index) => (
                        <Draggable key={key} draggableId={key} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-3 p-3 rounded-lg border bg-white text-left w-full cursor-grab active:cursor-grabbing select-none ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-300 opacity-90' : 'shadow-sm'}`}
                            >
                              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              {icon}
                              <span className="font-semibold text-sm text-gray-800 leading-tight">{label}</span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                </DragDropContext>
                </>
                );
                }

                return (
                <div className="relative">
                <button
                onClick={() => setIsCustomizing(true)}
                className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                title="Customize section order"
                >
                <Settings2 className="w-3 h-3 text-gray-500" />
                </button>
                <div className="grid grid-cols-2 gap-2">
                {orderedSections.filter(s => !(isChildUser && s.key === 'documents')).map(({ key, icon, label }) => (
                <button
                key={key}
                onClick={() => setExpandedSection(key)}
                className="relative flex items-center gap-2 p-3 rounded-lg border bg-white hover:shadow-md transition-shadow text-left w-full overflow-hidden"
                >

                {icon}
                <span className="font-semibold text-sm text-gray-800 leading-tight">{label}</span>
                </button>
                ))}
                <button
                  onClick={() => setShowActivities(true)}
                  className="relative flex items-center gap-2 p-3 rounded-lg border bg-white hover:shadow-md transition-shadow text-left w-full overflow-hidden"
                >

                  <span className="text-lg flex-shrink-0">📊</span>
                  <span className="font-semibold text-sm text-gray-800 leading-tight">Activities</span>
                </button>
                {!isChildUser && (
                <button
                  onClick={() => setShowFinancials(true)}
                  className="relative flex items-center gap-2 p-3 rounded-lg border bg-white hover:shadow-md transition-shadow text-left w-full overflow-hidden"
                >
                  <span className="text-lg flex-shrink-0">💰</span>
                  <span className="font-semibold text-sm text-gray-800 leading-tight">Financials</span>
                </button>
                )}
                </div>
                </div>
                );
                })()}
                </div>

      {/* Links Dialog */}
      <Dialog open={expandedSection === 'links'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0">
          <DialogHeader>
            <DialogTitle>Important Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Toggle: Link vs App */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${addLinkType === 'link' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setAddLinkType('link')}
              >
                🔗 Link / Website
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${addLinkType === 'app' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setAddLinkType('app')}
              >
                📱 App
              </button>
            </div>

            {addLinkType === 'link' ? (
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
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="App name (e.g., Duolingo)"
                  value={newAppEntry.title}
                  onChange={(e) => setNewAppEntry({ ...newAppEntry, title: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newAppEntry.title.trim()) setShowAppDialog(true); }}
                />
                <Button
                  size="sm"
                  disabled={!newAppEntry.title.trim()}
                  onClick={() => setShowAppDialog(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* App details dialog */}
            <Dialog open={showAppDialog} onOpenChange={setShowAppDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add App</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="App name"
                    value={newAppEntry.title}
                    onChange={(e) => setNewAppEntry({ ...newAppEntry, title: e.target.value })}
                  />
                  <Input
                    placeholder="Category (e.g., school, entertainment, medical...)"
                    value={newAppEntry.category}
                    onChange={(e) => setNewAppEntry({ ...newAppEntry, category: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Leave category blank for AI to categorize automatically</p>
                  <Button
                    onClick={() => {
                      createLinkMutation.mutate({
                        url: '',
                        title: newAppEntry.title,
                        category: newAppEntry.category,
                        assigned_to_member_id: memberId,
                        assigned_to_name: memberName,
                      });
                      setNewAppEntry({ title: '', category: '' });
                      setShowAppDialog(false);
                    }}
                    disabled={!newAppEntry.title.trim() || categorizingLink}
                  >
                    {categorizingLink ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Categorizing...</> : 'Add App'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
                        {link.url ? (
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline flex-1 min-w-0">
                            <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{link.title || link.url}</span>
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-base flex-shrink-0">📱</span>
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-gray-800 font-medium">{link.title}</span>
                          </div>
                        )}
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
              <Button size="sm" className="mr-10" onClick={() => setDialogOpen({ ...dialogOpen, contact: true })}>
                <Plus className="w-4 h-4 mr-2" />Add
              </Button>
              <Sheet open={dialogOpen.contact} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, contact: open })}>
                <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
                  <SheetHeader>
                    <SheetTitle>Add New Contact</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 mt-4 pb-8">
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
                              setNewContact({ ...newContact, linked_to_member_ids: [...newContact.linked_to_member_ids.filter(id => id !== 'Everyone'), fm.id] });
                            } else {
                              setNewContact({ ...newContact, linked_to_member_ids: newContact.linked_to_member_ids.filter(id => id !== fm.id) });
                            }
                          }} />
                          <label htmlFor={fm.id} className="text-sm cursor-pointer">{fm.name}</label>
                        </div>
                      ))}
                    </div>
                    {allAppliances.length > 0 && (
                      <div className="space-y-2">
                        <Label>Link to appliances:</Label>
                        <p className="text-xs text-gray-500">This contact will show up on those appliance records</p>
                        <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
                          {allAppliances.map((item) => {
                            const selected = (newContact.linked_to_appliance_ids || []).includes(item.id);
                            return (
                              <div key={item.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-50" onClick={() => {
                                const current = newContact.linked_to_appliance_ids || [];
                                setNewContact({ ...newContact, linked_to_appliance_ids: selected ? current.filter(i => i !== item.id) : [...current, item.id] });
                              }}>
                                <Checkbox checked={selected} onCheckedChange={() => {}} onClick={(e) => e.stopPropagation()} />
                                <span className="text-sm">{item.name}{item.brand ? ` — ${item.brand}` : ''}</span>
                              </div>
                            );
                          })}
                        </div>
                        {(newContact.linked_to_appliance_ids || []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(newContact.linked_to_appliance_ids || []).map(id => {
                              const a = allAppliances.find(x => x.id === id);
                              return a ? <span key={id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs rounded px-2 py-1">{a.name}<button onClick={() => setNewContact({ ...newContact, linked_to_appliance_ids: (newContact.linked_to_appliance_ids || []).filter(i => i !== id) })}>×</button></span> : null;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    <Button onClick={() => createContactMutation.mutate(newContact)} disabled={!newContact.name}>Add Contact</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </DialogTitle>
          </DialogHeader>
          <div>
            {contacts.length === 0 ? (
              <p className="text-sm text-gray-500">No contacts yet</p>
            ) : (
              <div className="space-y-4">
                {sortedContactTypes.map((type) => (
                  <div key={type}>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">{type}</h4>
                    <div className="space-y-2">
                      {contactsByType[type].map((contact) => (
                        <div key={contact.id} className={`rounded-lg overflow-hidden ${itemBg}`}>
                          <div className="flex items-center gap-2 p-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setExpandedContactId(expandedContactId === contact.id ? null : contact.id)}>
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
                          {expandedContactId === contact.id && (
                            <div className="px-3 pb-3 space-y-2 border-t border-gray-200 pt-2">
                              {contact.phone && <a href={`tel:${contact.phone}`} className="block text-sm text-blue-600 hover:underline">📞 {contact.phone}</a>}
                              {contact.email && <a href={`mailto:${contact.email}`} className="block text-sm text-blue-600 hover:underline">✉️ {contact.email}</a>}
                              {contact.address && <a href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 hover:underline">📍 {contact.address}</a>}
                              {contact.website && <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 hover:underline">🌐 {contact.website}</a>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                    {allAppliances.length > 0 && (
                      <div className="space-y-2">
                        <Label>Link to appliances:</Label>
                        <p className="text-xs text-gray-500">This contact will show up on those appliance records</p>
                        <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                          {allAppliances.map((item) => (
                            <div key={item.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-appliance-${item.id}`}
                                checked={(editingContact.linked_to_appliance_ids || []).includes(item.id)}
                                onCheckedChange={(checked) => {
                                  const current = editingContact.linked_to_appliance_ids || [];
                                  setEditingContact({ ...editingContact, linked_to_appliance_ids: checked ? [...current, item.id] : current.filter(id => id !== item.id) });
                                }}
                              />
                              <label htmlFor={`edit-appliance-${item.id}`} className="text-sm cursor-pointer">{item.name}{item.brand ? ` — ${item.brand}` : ''}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button onClick={() => updateContactMutation.mutate({ id: editingContact.id, data: { name: editingContact.name, type: editingContact.type, phone: editingContact.phone, email: editingContact.email, address: editingContact.address, website: editingContact.website, linked_to_member_ids: editingContact.linked_to_member_ids, linked_to_appliance_ids: editingContact.linked_to_appliance_ids } })} disabled={!editingContact.name}>Save Changes</Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chores Dialog */}
      <Dialog open={expandedSection === 'chores'} onOpenChange={(open) => { if (!open) { setExpandedSection(null); setIsReorderingChores(false); } }}>
        <DialogContent className={`max-w-3xl w-[95vw] top-4 translate-y-0 px-3 sm:px-6 ${isReorderingChores ? 'overflow-y-hidden max-h-[85vh]' : 'overflow-y-auto max-h-[85vh]'}`} style={editingChoreId ? { top: '2rem', transform: 'translateX(-50%)' } : {}}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>To-Do List</span>
              <div className="flex items-center gap-2 mr-10">
                <button
                  onClick={() => setIsReorderingChores(prev => !prev)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors font-medium ${isReorderingChores ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Reorder items"
                >
                  {isReorderingChores ? <><Check className="w-3 h-3" /> Done</> : <><GripVertical className="w-3 h-3" /> Rearrange</>}
                </button>
                <button
                  onClick={() => setShowArchive(true)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
                  title="View completed tasks"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <Dialog open={dialogOpen.chore} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, chore: open })}>
                <DialogTrigger asChild>
                  <Button size="sm">
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
                        <SelectItem value="next-year">Next Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <div>
                      <Input
                        type="date"
                        value={newChore.next_due}
                        onChange={(e) => setNewChore({ ...newChore, next_due: e.target.value })}
                        placeholder="Enter date (optional)"
                        className="text-gray-700 [&:not([value]):before]:content-['Enter_date_(optional)'] [&:not([value]):before]:text-gray-400"
                        onFocus={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
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
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(85vh-8rem)]" style={isReorderingChores ? { touchAction: 'none', overflowY: 'auto' } : {}}>
            {chores.filter(c => !c.is_completed).length === 0 ? (
              <p className="text-sm text-gray-500">No tasks yet</p>
            ) : (
              <DragDropContext onDragStart={() => setIsReorderingChores(true)} onDragEnd={handleDragEnd}>
                <div className="space-y-4">
                  {['short-term', 'mid-term', 'long-term', 'next-year'].map((timing) => {
                    const timingChores = choresByTiming[timing].filter(c => !c.is_completed);
                    return (
                      <div key={timing}>
                        <h4 className="font-medium text-sm text-gray-700 mb-2 capitalize">
                          {timing === 'short-term' ? 'Short-term' : timing === 'mid-term' ? 'Mid-term' : timing === 'long-term' ? 'Long-term' : 'Next Year'}
                        </h4>
                        <Droppable droppableId={timing}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className={`space-y-2 min-h-[60px] rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300 p-1' : 'bg-transparent'}`}>
                              {timingChores.length === 0 && !snapshot.isDraggingOver ? (
                                <p className="text-xs text-gray-400 text-center py-2">Drop items here</p>
                              ) : (
                                timingChores.map((chore, index) => {
                                  const choreEl = (provided, snapshot) => {
                                   const choreProgress = chore.progress ?? 0;
                                   const showProgress = choreProgress > 0 && !chore.is_completed;
                                   const child = (
                                     <div
                                       ref={provided.innerRef}
                                       {...provided.draggableProps}
                                       {...(!chore.maintenance_task_id && isReorderingChores ? provided.dragHandleProps : {})}
                                       className={`relative rounded-lg ${itemBg} transition-shadow`}
                                       style={{
                                         ...provided.draggableProps.style,
                                         touchAction: (!chore.maintenance_task_id && isReorderingChores) ? 'none' : undefined,
                                         ...(snapshot.isDragging ? {
                                           boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                           transform: `${provided.draggableProps.style?.transform || ''} scale(1.02)`,
                                           zIndex: 9999,
                                           opacity: 1,
                                         } : {}),
                                       }}
                                     >
                                         <div className="flex items-center gap-3 p-3">
                                         {!chore.maintenance_task_id && isReorderingChores && (
                                           <div className="flex-shrink-0 w-5 opacity-40">
                                             <GripVertical className="w-4 h-4 text-gray-400" />
                                           </div>
                                         )}
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
                                              <div className="space-y-2">
                                                <Input value={editingChoreTitle} onChange={(e) => setEditingChoreTitle(e.target.value)} onBlur={() => updateChoreMutation.mutate({ id: chore.id, title: editingChoreTitle, linked_chore_ids: chore.linked_chore_ids, chore: editingChoreRef })} onKeyDown={(e) => { if (e.key === 'Enter') updateChoreMutation.mutate({ id: chore.id, title: editingChoreTitle, linked_chore_ids: chore.linked_chore_ids, chore: editingChoreRef }); if (e.key === 'Escape') setEditingChoreId(null); }} autoFocus className="h-8" onFocus={(e) => { setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }} />
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs text-gray-500 shrink-0">Progress</span>
                                                  <Slider
                                                    value={[choreProgress]}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="flex-1"
                                                    onValueChange={([val]) => {
                                                      updateProgressMutation.mutate({ id: chore.id, progress: val, linked_chore_ids: chore.linked_chore_ids });
                                                    }}
                                                  />
                                                  <span className="text-xs text-gray-500 shrink-0 w-8 text-right">{choreProgress}%</span>
                                                </div>
                                              </div>
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
                                            {showProgress && editingChoreId !== chore.id && (
                                              <span className="text-[10px] text-gray-400 font-medium mr-0.5">{choreProgress}%</span>
                                            )}
                                            <button
                                              className="p-1 rounded hover:bg-gray-100 transition-colors relative"
                                              title="Comments"
                                              onClick={() => setCommentingChore(chore)}
                                            >
                                              <MessageCircle className={`w-4 h-4 ${commentCountByChoreId[chore.id] ? 'text-blue-500' : 'text-gray-300'}`} />
                                              {commentCountByChoreId[chore.id] > 0 && (
                                                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                                                  {commentCountByChoreId[chore.id] > 9 ? '9+' : commentCountByChoreId[chore.id]}
                                                </span>
                                              )}
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
                                            {editingChoreId === chore.id && (
                                              <button
                                                className="p-1 rounded hover:bg-blue-50 transition-colors"
                                                title={chore.synced_google_calendar_id ? "Synced to Google Calendar" : "Set due date / sync to calendar"}
                                                onClick={() => setSyncCalendarChore(chore)}
                                              >
                                                <CalendarPlus className={`w-4 h-4 ${chore.synced_google_calendar_id ? 'text-green-500' : 'text-blue-400'}`} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        {/* Progress bar at bottom edge */}
                                        {showProgress && (
                                          <div className="h-[3px] w-full bg-gray-200">
                                            <div
                                              className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-r-full transition-all duration-300"
                                              style={{ width: `${choreProgress}%` }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                    return child;
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
            <DialogTitle>Personal Notes</DialogTitle>
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

      {/* Health & Medical Dialog */}
      <Dialog open={expandedSection === 'health'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Health & Medical</DialogTitle>
          </DialogHeader>
          {member && <HealthMedicalSection member={member} color={color} isReadOnly={isChildUser} />}
        </DialogContent>
      </Dialog>

      {/* Documents & IDs Dialog */}
      {!isChildUser && (
      <Dialog open={expandedSection === 'documents'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden top-4 translate-y-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Documents & IDs</DialogTitle>
          </DialogHeader>
          {member && <DocumentsIDsSection member={member} color={color} isReadOnly={isChildUser} />}
        </DialogContent>
      </Dialog>
      )}

      {/* Vehicles & Travel Dialog */}
      <Dialog open={expandedSection === 'vehicles'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Vehicles & Travel</DialogTitle>
          </DialogHeader>
          {member && <VehiclesTravelSection member={member} color={color} />}
        </DialogContent>
      </Dialog>

      {/* Personal Info Hub Dialog */}
      <Dialog open={expandedSection === 'personalInfo'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Personal Info Hub</DialogTitle>
          </DialogHeader>
          {member && <PersonalInfoSection member={member} color={color} isReadOnly={isChildUser} />}
        </DialogContent>
      </Dialog>

      {/* School Program Dialog */}
      <Dialog open={expandedSection === 'schoolProgram'} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-4 translate-y-0">
          <SchoolProgramSection memberId={memberId} memberName={memberName} personType={member?.person_type || 'kid'} schoolOrWorkName={member?.school_or_work_name} />
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={showArchive} onOpenChange={setShowArchive}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completed Tasks</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-400 -mt-2">Uncheck an item to move it back to your to-do list</p>
          <div className="space-y-2">
            {chores.filter(c => c.is_completed).length === 0 ? (
              <p className="text-sm text-gray-500">No completed tasks yet</p>
            ) : (
              chores.filter(c => c.is_completed).sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)).map((chore) => (
                <div key={chore.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggleChoreMutation.mutate({ id: chore.id, is_completed: false, maintenance_task_id: chore.maintenance_task_id, linked_chore_ids: chore.linked_chore_ids, chore_title: chore.title })}
                    className="w-5 h-5 rounded border-gray-300 cursor-pointer flex-shrink-0 accent-gray-400"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-400 line-through">{chore.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Completed {new Date(chore.updated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chore Comments Sheet */}
      <ChoreCommentsSheet
        chore={commentingChore}
        open={!!commentingChore}
        onOpenChange={(open) => !open && setCommentingChore(null)}
      />

      {/* Activities Dialog */}
      <ActivitiesDialog
        open={showActivities}
        onClose={() => setShowActivities(false)}
        memberId={memberId}
        memberName={memberName}
        color={color}
      />

      {/* Financials Dialog */}
      <FinancialsDialog
        open={showFinancials}
        onClose={() => setShowFinancials(false)}
        memberId={memberId}
        memberName={memberName}
        color={color}
      />
    </div>
  );
}