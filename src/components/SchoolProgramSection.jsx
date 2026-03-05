import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Upload, Loader2, X, ExternalLink, Phone, Mail, GraduationCap, User } from 'lucide-react';
import { motion } from 'framer-motion';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const dayLabels = ['M', 'T', 'W', 'Th', 'F'];

export default function SchoolProgramSection({ memberId, memberName, programTitle = 'Right at School', personType = 'kid', schoolOrWorkName }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editingPasscode, setEditingPasscode] = useState(null);
  const [newPasscode, setNewPasscode] = useState({ name: '', code: '' });
  const [isAddingPasscode, setIsAddingPasscode] = useState(false);
  const [visiblePasscodes, setVisiblePasscodes] = useState([]);
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const fileInputRef = React.useRef(null);
  const [localPhone, setLocalPhone] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localTeacher, setLocalTeacher] = useState('');
  const [localGrade, setLocalGrade] = useState('');

  const { data: program } = useQuery({
    queryKey: ['schoolProgram', memberId],
    queryFn: () => base44.entities.SchoolProgram.filter({ family_member_id: memberId }).then(res => res[0]),
    enabled: !!memberId,
  });

  React.useEffect(() => {
    if (program) {
      setLocalPhone(program.phone || '');
      setLocalEmail(program.email || '');
      setLocalTeacher(program.teacher || '');
      setLocalGrade(program.grade || '');
    }
  }, [program]);

  const isKid = personType === 'kid';
  const sectionLabel = isKid ? 'School' : 'Work';

  const createProgramMutation = useMutation({
    mutationFn: (data) => base44.entities.SchoolProgram.create(data),
    onSuccess: () => queryClient.invalidateQueries(['schoolProgram', memberId]),
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SchoolProgram.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['schoolProgram', memberId]),
  });

  const handleCreateProgram = () => {
    createProgramMutation.mutate({
      family_member_id: memberId,
      title: programTitle,
      url: '',
      schedule: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '' },
      passcodes: [],
      phone: '',
      email: '',
    });
  };

  const handleUpdateTitle = (newTitle) => {
    if (program) { updateProgramMutation.mutate({ id: program.id, data: { title: newTitle } }); setEditingTitle(null); }
  };
  const handleUpdateCell = (day, value) => {
    if (program) { updateProgramMutation.mutate({ id: program.id, data: { schedule: { ...program.schedule, [day]: value } } }); setEditingCell(null); }
  };
  const handleAddPasscode = () => {
    if (program && newPasscode.name && newPasscode.code) {
      updateProgramMutation.mutate({ id: program.id, data: { passcodes: [...(program.passcodes || []), newPasscode] } });
      setNewPasscode({ name: '', code: '' }); setIsAddingPasscode(false);
    }
  };
  const handleDeletePasscode = (index) => {
    if (program) updateProgramMutation.mutate({ id: program.id, data: { passcodes: program.passcodes.filter((_, i) => i !== index) } });
  };
  const handleUpdatePhone = () => { if (program && localPhone !== program.phone) updateProgramMutation.mutate({ id: program.id, data: { phone: localPhone } }); };
  const handleUpdateEmail = () => { if (program && localEmail !== program.email) updateProgramMutation.mutate({ id: program.id, data: { email: localEmail } }); };
  const handleUpdateTeacher = () => { if (program && localTeacher !== program.teacher) updateProgramMutation.mutate({ id: program.id, data: { teacher: localTeacher } }); };
  const handleUpdateGrade = () => { if (program && localGrade !== program.grade) updateProgramMutation.mutate({ id: program.id, data: { grade: localGrade } }); };
  const handleUpdateUrl = (url) => { if (program) updateProgramMutation.mutate({ id: program.id, data: { url } }); };
  const handleUpdateWebsiteTitle = (websiteTitle) => { if (program) updateProgramMutation.mutate({ id: program.id, data: { website_title: websiteTitle } }); };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !program) return;
    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateProgramMutation.mutate({ id: program.id, data: { photos: [...(program.photos || []), file_url] } });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = (index) => {
    if (program) updateProgramMutation.mutate({ id: program.id, data: { photos: program.photos.filter((_, i) => i !== index) } });
  };

  React.useEffect(() => {
    const handlePaste = (e) => {
      if (!isEditing) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) { handlePhotoUploadDirect(blob); e.preventDefault(); }
          return;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [program, isEditing]);

  const handlePhotoUploadDirect = async (file) => {
    if (!file || !program) return;
    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateProgramMutation.mutate({ id: program.id, data: { photos: [...(program.photos || []), file_url] } });
    } finally { setIsUploadingPhoto(false); }
  };

  if (!program) {
    return (
      <Card>
        <CardHeader><CardTitle>{sectionLabel}</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={handleCreateProgram} size="sm">
            <Plus className="w-4 h-4 mr-2" />Add {sectionLabel} Info
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasSchedule = isKid && program.schedule && days.some(d => program.schedule[d]);
  const hasPasscodes = isKid && program.passcodes && program.passcodes.length > 0;
  const hasPhotos = program.photos && program.photos.length > 0;
  const hasAnyInfo = program.grade || program.teacher || program.url || program.phone || program.email || hasSchedule || hasPasscodes || hasPhotos;

  // READ-ONLY VIEW
  if (!isEditing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{schoolOrWorkName || program?.title || sectionLabel}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0">
              <Edit2 className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hasAnyInfo ? (
            <p className="text-sm text-gray-400 italic">No information added yet.</p>
          ) : (
            <div className="space-y-3">
              {isKid && (program.grade || program.teacher) && (
                <div className="flex flex-wrap gap-4 text-sm">
                  {program.grade && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <GraduationCap className="w-4 h-4 text-gray-400" />
                      <span>{program.grade}</span>
                    </div>
                  )}
                  {program.teacher && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{program.teacher}</span>
                    </div>
                  )}
                </div>
              )}

              {program.url && (
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={program.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                    {program.website_title || program.url}
                  </a>
                </div>
              )}

              {program.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400" /><span>{program.phone}</span>
                </div>
              )}
              {program.email && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400" /><span>{program.email}</span>
                </div>
              )}

              {hasSchedule && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{program.title} Schedule</p>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse table-fixed">
                      <thead>
                        <tr>{dayLabels.map(l => <th key={l} className="border border-gray-200 p-1 text-center text-xs font-medium bg-gray-50">{l}</th>)}</tr>
                      </thead>
                      <tbody>
                        <tr>{days.map(d => <td key={d} className="border border-gray-200 p-1 text-center text-[10px] text-gray-600">{program.schedule[d] || '-'}</td>)}</tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hasPasscodes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Passcodes</p>
                  <div className="space-y-1">
                    {program.passcodes.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-700">{p.name}:</span>
                        <span
                          className="font-mono text-gray-500 cursor-pointer select-none"
                          onClick={() => setVisiblePasscodes(v => v.includes(i) ? v.filter(x => x !== i) : [...v, i])}
                        >{visiblePasscodes.includes(i) ? p.code : '••••'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasPhotos && (
                <div className="grid grid-cols-3 gap-2">
                  {program.photos.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                      onClick={() => { setSelectedPhotoIndex(i); setPhotoZoom(1); }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedPhotoIndex !== null && (
            <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setSelectedPhotoIndex(null)}>
              <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={() => setSelectedPhotoIndex(null)}>
                <X className="w-6 h-6" />
              </Button>
              <motion.img src={program.photos[selectedPhotoIndex]} alt="" className="max-w-[90vw] max-h-[90vh] object-contain"
                initial={{ scale: 1 }} animate={{ scale: photoZoom }} transition={{ type: 'spring', damping: 20 }}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => { e.preventDefault(); setPhotoZoom(z => Math.max(1, Math.min(z + (e.deltaY > 0 ? -0.1 : 0.1), 3))); }}
                style={{ touchAction: 'pinch-zoom' }} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // EDIT VIEW
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{schoolOrWorkName || program?.title || sectionLabel}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-xs text-gray-500">Done</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isKid && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Grade</label>
              <Input placeholder="e.g., 3rd Grade" value={localGrade} onChange={(e) => setLocalGrade(e.target.value)} onBlur={handleUpdateGrade} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Teacher</label>
              <Input placeholder="Teacher's name" value={localTeacher} onChange={(e) => setLocalTeacher(e.target.value)} onBlur={handleUpdateTeacher} className="mt-1" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Website</label>
          {program.url ? (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              {editingWebsite ? (
                <div className="flex-1 space-y-2">
                  <Input placeholder="Display title" defaultValue={program.website_title || ''} onBlur={(e) => { handleUpdateWebsiteTitle(e.target.value); setEditingWebsite(false); }} autoFocus className="text-sm" />
                  <Input type="url" placeholder="https://..." defaultValue={program.url} onBlur={(e) => handleUpdateUrl(e.target.value)} className="text-sm" />
                </div>
              ) : (
                <>
                  <a href={program.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-600 hover:underline text-sm truncate">{program.website_title || program.url}</a>
                  <Button variant="ghost" size="sm" onClick={() => setEditingWebsite(true)} className="h-7 w-7 p-0 flex-shrink-0"><Edit2 className="w-3 h-3 text-gray-500" /></Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Input placeholder="Display title (e.g. School Portal)" defaultValue={program.website_title || ''} onBlur={(e) => handleUpdateWebsiteTitle(e.target.value)} className="text-sm" />
              <Input type="url" placeholder="https://..." value={program.url || ''} onChange={(e) => handleUpdateUrl(e.target.value)} onBlur={(e) => handleUpdateUrl(e.target.value)} className="text-sm" />
            </div>
          )}
        </div>

        {isKid && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              {editingTitle === 'title' ? (
                <Input defaultValue={program.title} onBlur={(e) => handleUpdateTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTitle(e.target.value); if (e.key === 'Escape') setEditingTitle(null); }} autoFocus className="text-sm font-semibold" />
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <h3 className="text-sm font-semibold">{program.title}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditingTitle('title')} className="h-6 w-6 p-0"><Edit2 className="w-3 h-3 text-gray-500" /></Button>
                </div>
              )}
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse table-fixed">
                <thead><tr>{dayLabels.map(l => <th key={l} className="border border-gray-300 p-1 sm:p-2 text-center text-xs sm:text-sm font-medium">{l}</th>)}</tr></thead>
                <tbody>
                  <tr>{days.map(d => (
                    <td key={d} className="border border-gray-300 p-1 sm:p-2 text-center text-[10px] sm:text-xs cursor-pointer hover:bg-gray-100 break-words" onClick={() => setEditingCell(d)}>
                      {editingCell === d ? (
                        <Input defaultValue={program.schedule[d] || ''} onBlur={(e) => handleUpdateCell(d, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCell(d, e.target.value); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="text-xs p-1 h-8" placeholder="e.g., 3:20-6pm" />
                      ) : (program.schedule[d] || '-')}
                    </td>
                  ))}</tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isKid && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-semibold">Passcodes</h4>
            <div className="space-y-2">
              {program.passcodes && program.passcodes.map((passcode, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="font-medium">{passcode.name}</div>
                    <div className="text-gray-600 font-mono cursor-pointer select-none" onClick={() => setVisiblePasscodes(v => v.includes(index) ? v.filter(i => i !== index) : [...v, index])}>
                      {visiblePasscodes.includes(index) ? passcode.code : '••••'}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeletePasscode(index)} className="h-7 w-7 p-0 flex-shrink-0"><Trash2 className="w-3 h-3 text-red-500" /></Button>
                </div>
              ))}
            </div>
            {!isAddingPasscode ? (
              <Button variant="outline" size="sm" onClick={() => setIsAddingPasscode(true)}><Plus className="w-4 h-4 mr-2" />Add Passcode</Button>
            ) : (
              <div className="space-y-2 p-2 bg-gray-50 rounded">
                <Input placeholder="Person's name" value={newPasscode.name} onChange={(e) => setNewPasscode({ ...newPasscode, name: e.target.value })} />
                <Input placeholder="4-digit code" value={newPasscode.code} onChange={(e) => setNewPasscode({ ...newPasscode, code: e.target.value })} maxLength="4" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddPasscode} disabled={!newPasscode.name || !newPasscode.code}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => { setIsAddingPasscode(false); setNewPasscode({ name: '', code: '' }); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Photos</h4>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto}>
              {isUploadingPhoto ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Add Photo</>}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </div>
          <Input placeholder="Click here or paste an image..." disabled={isUploadingPhoto} className="text-xs" />
          {program.photos && program.photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {program.photos.map((photoUrl, index) => (
                <div key={index} className="relative group cursor-pointer">
                  <img src={photoUrl} alt="" className="w-full h-24 object-cover rounded-lg hover:opacity-75 transition-opacity" onClick={() => { setSelectedPhotoIndex(index); setPhotoZoom(1); }} />
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePhoto(index)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No photos yet</p>}
        </div>

        <div className="border-t pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Phone Number</label>
            <Input type="tel" placeholder="(123) 456-7890" value={localPhone} onChange={(e) => setLocalPhone(e.target.value)} onBlur={handleUpdatePhone} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" placeholder="email@example.com" value={localEmail} onChange={(e) => setLocalEmail(e.target.value)} onBlur={handleUpdateEmail} className="mt-1" />
          </div>
        </div>

        {selectedPhotoIndex !== null && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setSelectedPhotoIndex(null)}>
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={() => setSelectedPhotoIndex(null)}><X className="w-6 h-6" /></Button>
            <motion.img src={program.photos[selectedPhotoIndex]} alt="" className="max-w-[90vw] max-h-[90vh] object-contain"
              initial={{ scale: 1 }} animate={{ scale: photoZoom }} transition={{ type: 'spring', damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => { e.preventDefault(); setPhotoZoom(z => Math.max(1, Math.min(z + (e.deltaY > 0 ? -0.1 : 0.1), 3))); }}
              style={{ touchAction: 'pinch-zoom' }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}