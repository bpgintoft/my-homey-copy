import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, Edit2, Upload, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const dayLabels = ['M', 'T', 'W', 'Th', 'F'];

export default function SchoolProgramSection({ memberId, memberName, programTitle = 'Right at School', personType = 'kid' }) {
  const queryClient = useQueryClient();
  const [openSections, setOpenSections] = useState({ schoolProgram: false });
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editingPasscode, setEditingPasscode] = useState(null);
  const [newPasscode, setNewPasscode] = useState({ name: '', code: '' });
  const [isAddingPasscode, setIsAddingPasscode] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const fileInputRef = React.useRef(null);

  // Fetch school program data
  const { data: program } = useQuery({
    queryKey: ['schoolProgram', memberId],
    queryFn: () => base44.entities.SchoolProgram.filter({ family_member_id: memberId }).then(res => res[0]),
    enabled: !!memberId,
  });

  const isKid = personType === 'kid';
  const sectionLabel = isKid ? 'School' : 'Work';

  // Mutations
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
    if (program) {
      updateProgramMutation.mutate({
        id: program.id,
        data: { title: newTitle },
      });
      setEditingTitle(null);
    }
  };

  const handleUpdateCell = (day, value) => {
    if (program) {
      const newSchedule = { ...program.schedule, [day]: value };
      updateProgramMutation.mutate({
        id: program.id,
        data: { schedule: newSchedule },
      });
      setEditingCell(null);
    }
  };

  const handleAddPasscode = () => {
    if (program && newPasscode.name && newPasscode.code) {
      const updatedPasscodes = [...(program.passcodes || []), newPasscode];
      updateProgramMutation.mutate({
        id: program.id,
        data: { passcodes: updatedPasscodes },
      });
      setNewPasscode({ name: '', code: '' });
      setIsAddingPasscode(false);
    }
  };

  const handleDeletePasscode = (index) => {
    if (program) {
      const updatedPasscodes = program.passcodes.filter((_, i) => i !== index);
      updateProgramMutation.mutate({
        id: program.id,
        data: { passcodes: updatedPasscodes },
      });
    }
  };

  const handleUpdatePhone = (phone) => {
    if (program) {
      updateProgramMutation.mutate({
        id: program.id,
        data: { phone },
      });
    }
  };

  const handleUpdateEmail = (email) => {
    if (program) {
      updateProgramMutation.mutate({
        id: program.id,
        data: { email },
      });
    }
  };

  const handleUpdateUrl = (url) => {
    if (program) {
      updateProgramMutation.mutate({
        id: program.id,
        data: { url },
      });
    }
  };

  const handleUpdateWebsiteTitle = (websiteTitle) => {
    if (program) {
      updateProgramMutation.mutate({
        id: program.id,
        data: { website_title: websiteTitle },
      });
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !program) return;

    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updatedPhotos = [...(program.photos || []), file_url];
      updateProgramMutation.mutate({
        id: program.id,
        data: { photos: updatedPhotos },
      });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = (index) => {
    if (program) {
      const updatedPhotos = program.photos.filter((_, i) => i !== index);
      updateProgramMutation.mutate({
        id: program.id,
        data: { photos: updatedPhotos },
      });
    }
  };

  React.useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            handlePhotoUploadDirect(blob);
            e.preventDefault();
          }
          return;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [program]);

  const handlePhotoUploadDirect = async (file) => {
    if (!file || !program) return;
    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updatedPhotos = [...(program.photos || []), file_url];
      updateProgramMutation.mutate({
        id: program.id,
        data: { photos: updatedPhotos },
      });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (!program) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{sectionLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateProgram} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add {sectionLabel} Info
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible 
      open={openSections.schoolProgram} 
      onOpenChange={(open) => setOpenSections({ ...openSections, schoolProgram: open })}
    >
      <Card>
        <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center gap-2">
                    {programTitle}
              <ChevronDown className={`w-5 h-5 transition-transform ${openSections.schoolProgram ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Website Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Website</label>
              {program.url ? (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  {editingWebsite ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Display title"
                        defaultValue={program.website_title || ''}
                        onBlur={(e) => {
                          handleUpdateWebsiteTitle(e.target.value);
                          setEditingWebsite(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateWebsiteTitle(e.target.value);
                            setEditingWebsite(false);
                          }
                        }}
                        autoFocus
                        className="text-sm"
                      />
                      <Input
                        type="url"
                        placeholder="https://..."
                        defaultValue={program.url}
                        onBlur={(e) => handleUpdateUrl(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <a
                        href={program.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-blue-600 hover:underline text-sm truncate"
                      >
                        {program.website_title || program.url}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingWebsite(true)}
                        className="h-7 w-7 p-0 flex-shrink-0"
                      >
                        <Edit2 className="w-3 h-3 text-gray-500" />
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <Input
                  type="url"
                  placeholder="https://..."
                  value={program.url || ''}
                  onChange={(e) => handleUpdateUrl(e.target.value)}
                  onBlur={(e) => handleUpdateUrl(e.target.value)}
                  className="mt-1"
                />
              )}
            </div>

            {/* Schedule Table - Kid only */}
            {isKid && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                {editingTitle === 'title' ? (
                  <div className="flex gap-2 flex-1">
                    <Input
                      defaultValue={program.title}
                      onBlur={(e) => handleUpdateTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateTitle(e.target.value);
                        if (e.key === 'Escape') setEditingTitle(null);
                      }}
                      autoFocus
                      className="text-sm font-semibold"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <h3 className="text-sm font-semibold">{program.title}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTitle('title')}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="w-3 h-3 text-gray-500" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr>
                      {dayLabels.map((label) => (
                        <th key={label} className="border border-gray-300 p-1 sm:p-2 text-center text-xs sm:text-sm font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {days.map((day) => (
                        <td
                          key={day}
                          className="border border-gray-300 p-1 sm:p-2 text-center text-[10px] sm:text-xs cursor-pointer hover:bg-gray-100 break-words"
                          onClick={() => setEditingCell(day)}
                        >
                          {editingCell === day ? (
                            <Input
                              defaultValue={program.schedule[day] || ''}
                              onBlur={(e) => handleUpdateCell(day, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateCell(day, e.target.value);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="text-xs p-1 h-8"
                              placeholder="e.g., 3:20 - 6:00 pm"
                            />
                          ) : (
                            program.schedule[day] || '-'
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Passcodes Section - Kid only */}
            {isKid && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold">Passcodes</h4>
              <div className="space-y-2">
                {program.passcodes && program.passcodes.map((passcode, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{passcode.name}</div>
                      <div className="text-gray-600 font-mono">{passcode.code}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePasscode(index)}
                      className="h-7 w-7 p-0 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              {!isAddingPasscode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingPasscode(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Passcode
                </Button>
              ) : (
                <div className="space-y-2 p-2 bg-gray-50 rounded">
                  <Input
                    placeholder="Person's name"
                    value={newPasscode.name}
                    onChange={(e) => setNewPasscode({ ...newPasscode, name: e.target.value })}
                  />
                  <Input
                    placeholder="4-digit code"
                    value={newPasscode.code}
                    onChange={(e) => setNewPasscode({ ...newPasscode, code: e.target.value })}
                    maxLength="4"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddPasscode}
                      disabled={!newPasscode.name || !newPasscode.code}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingPasscode(false);
                        setNewPasscode({ name: '', code: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Photos Section */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Photos</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" />Add Photo</>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <Input
                placeholder="Click here or paste an image..."
                disabled={isUploadingPhoto}
                className="text-xs"
              />
              {program.photos && program.photos.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {program.photos.map((photoUrl, index) => (
                      <div key={index} className="relative group cursor-pointer">
                        <img
                          src={photoUrl}
                          alt={`Program photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg hover:opacity-75 transition-opacity"
                          onClick={() => {
                            setSelectedPhotoIndex(index);
                            setPhotoZoom(1);
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePhoto(index)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {selectedPhotoIndex !== null && (
                    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setSelectedPhotoIndex(null)}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 text-white hover:bg-white/20"
                        onClick={() => setSelectedPhotoIndex(null)}
                      >
                        <X className="w-6 h-6" />
                      </Button>
                      <motion.img
                        src={program.photos[selectedPhotoIndex]}
                        alt="Full screen photo"
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        initial={{ scale: 1 }}
                        animate={{ scale: photoZoom }}
                        transition={{ type: 'spring', damping: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => {
                          e.preventDefault();
                          const newZoom = photoZoom + (e.deltaY > 0 ? -0.1 : 0.1);
                          setPhotoZoom(Math.max(1, Math.min(newZoom, 3)));
                        }}
                        style={{ touchAction: 'pinch-zoom' }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">No photos yet</p>
              )}
            </div>

            {/* Contact Information */}
            <div className="border-t pt-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={program.phone || ''}
                  onChange={(e) => handleUpdatePhone(e.target.value)}
                  onBlur={(e) => handleUpdatePhone(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={program.email || ''}
                  onChange={(e) => handleUpdateEmail(e.target.value)}
                  onBlur={(e) => handleUpdateEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}