import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Loader2, Trash2, X, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { getThumbnailUrl } from './imageHelpers';

export default function Timeline() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ date_text: '', year: null, month: null, title: '', description: '', category: '', photos: [] });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const fileInputRef = React.useRef(null);
  const editFileInputRef = React.useRef(null);

  const { data: events = [] } = useQuery({
    queryKey: ['timelineEvents'],
    queryFn: () => base44.entities.TimelineEvent.list(),
  });

  const { data: appliances = [] } = useQuery({
    queryKey: ['appliances'],
    queryFn: () => base44.entities.RoomItem.filter({ type: 'appliance', show_on_history_timeline: true }),
  });

  const categoryColors = {
    structure_systems: 'bg-gray-500 border-gray-500',
    renovations_improvements: 'bg-blue-500 border-blue-500',
    maintenance_repairs: 'bg-green-500 border-green-500',
    damage_incidents: 'bg-red-500 border-red-500',
    financial_legal: 'bg-purple-500 border-purple-500',
    family_moments: 'bg-pink-500 border-pink-500',
    exterior_property: 'bg-orange-500 border-orange-500',
  };

  const categoryLabels = {
    structure_systems: 'Structure & Systems',
    renovations_improvements: 'Renovations & Improvements',
    maintenance_repairs: 'Maintenance & Repairs',
    damage_incidents: 'Damage & Incidents',
    financial_legal: 'Financial & Legal',
    family_moments: 'Family Moments',
    exterior_property: 'Exterior & Property',
  };

  const parseDateText = (text) => {
    const yearMatch = text.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : null;
    
    const months = {
      january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
      april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
      august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10,
      november: 11, nov: 11, december: 12, dec: 12,
      spring: 3, summer: 6, fall: 9, autumn: 9, winter: 12
    };
    
    let month = null;
    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(months)) {
      if (lowerText.includes(key)) {
        month = value;
        break;
      }
    }
    
    return { year, month };
  };

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.TimelineEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['timelineEvents']);
      setDialogOpen(false);
      setNewEvent({ date_text: '', year: null, month: null, title: '', description: '', category: '', photos: [] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.TimelineEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['timelineEvents']);
      setSelectedEvent(null);
      setEditingEvent(null);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimelineEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['timelineEvents']);
      setSelectedEvent(null);
      setEditingEvent(null);
    },
  });

  const handlePhotoUpload = async (file, isEditing = false) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (isEditing) {
        setEditingEvent({ ...editingEvent, photos: [...(editingEvent.photos || []), file_url] });
      } else {
        setNewEvent({ ...newEvent, photos: [...newEvent.photos, file_url] });
      }
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  const handlePaste = (e, isEditing = false) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          handlePhotoUpload(blob, isEditing);
          e.preventDefault();
        }
      }
    }
  };

  const removePhoto = (index, isEditing = false) => {
    if (isEditing) {
      setEditingEvent({ ...editingEvent, photos: editingEvent.photos.filter((_, i) => i !== index) });
    } else {
      setNewEvent({ ...newEvent, photos: newEvent.photos.filter((_, i) => i !== index) });
    }
  };

  // Convert appliances to timeline events
  const applianceEvents = appliances
    .filter(a => a.purchase_date)
    .map(appliance => ({
      id: `appliance-${appliance.id}`,
      applianceId: appliance.id,
      title: `Installed ${appliance.name}`,
      description: appliance.history_description || '',
      date_text: new Date(appliance.purchase_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      year: new Date(appliance.purchase_date).getFullYear(),
      month: new Date(appliance.purchase_date).getMonth() + 1,
      category: 'structure_systems',
      photos: appliance.photos && appliance.photos.length > 0 ? [appliance.photos[0]] : [],
      isAppliance: true
    }));

  // Combine regular events and appliance events
  const allEvents = [...events, ...applianceEvents];

  // Filter events based on search query
  const filteredEvents = searchQuery.trim()
    ? allEvents.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allEvents;

  // Group events by year and sort (most recent first)
  const eventsByYear = filteredEvents
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return (b.month || 0) - (a.month || 0);
    })
    .reduce((acc, event) => {
      const year = event.year;
      if (!acc[year]) acc[year] = [];
      acc[year].push(event);
      return acc;
    }, {});

  // Sort years in descending order
  const sortedYears = Object.keys(eventsByYear).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6 gap-2">
          <h2 className="text-xl font-bold text-gray-900 flex-shrink-0">Timeline</h2>
          <div className="flex items-center gap-2 flex-1 justify-end">
            {showSearch ? (
              <>
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSearch(true)}
                >
                  <Search className="w-4 h-4" />
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Event
                    </Button>
                  </DialogTrigger>
              <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Timeline Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Date</label>
                  <Input
                    placeholder="e.g., 'Summer 1927', 'December 1950', '1985'"
                    value={newEvent.date_text}
                    onChange={(e) => {
                      const date_text = e.target.value;
                      const { year, month } = parseDateText(date_text);
                      setNewEvent({ ...newEvent, date_text, year, month });
                    }}
                  />
                  {newEvent.year && (
                    <p className="text-xs text-gray-500 mt-1">
                      Will be sorted as: {newEvent.month ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][newEvent.month - 1]} ` : ''}{newEvent.year}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <Input
                    placeholder="Event title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <Select value={newEvent.category} onValueChange={(value) => setNewEvent({ ...newEvent, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="structure_systems">Structure & Systems</SelectItem>
                      <SelectItem value="renovations_improvements">Renovations & Improvements</SelectItem>
                      <SelectItem value="maintenance_repairs">Maintenance & Repairs</SelectItem>
                      <SelectItem value="damage_incidents">Damage & Incidents</SelectItem>
                      <SelectItem value="financial_legal">Financial & Legal</SelectItem>
                      <SelectItem value="family_moments">Family Moments</SelectItem>
                      <SelectItem value="exterior_property">Exterior & Property</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    placeholder="Event description..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Photos</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                      >
                        {isUploadingPhoto ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" />Upload Photo</>
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                        className="hidden"
                      />
                    </div>
                    <Input
                      placeholder="Or paste an image here (Ctrl+V / Cmd+V)..."
                      onPaste={handlePaste}
                      disabled={isUploadingPhoto}
                      className="text-sm"
                    />
                    {newEvent.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {newEvent.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Event photo ${index + 1}`}
                              className="w-full h-24 object-cover rounded"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removePhoto(index)}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => createEventMutation.mutate(newEvent)}
                  disabled={!newEvent.date_text || !newEvent.year || !newEvent.title}
                  className="w-full"
                >
                  Add Event
                </Button>
                </div>
                </DialogContent>
                  </Dialog>
                </>
                )}
                </div>
                </div>

                {allEvents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No events yet. Add your first event to get started.</p>
            ) : filteredEvents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No events match "{searchQuery}"</p>
            ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[25px] top-0 bottom-0 w-0.5 bg-amber-300" />
            
            <div className="space-y-8">
              {sortedYears.map((year) => {
                const yearEvents = eventsByYear[year];
                return (
                  <div key={year} className="relative">
                    {/* Year badge - centered on timeline */}
                    <div className="flex mb-2">
                      <div className="w-[50px] h-[40px] bg-amber-500 text-white font-bold text-base flex items-center justify-center rounded shadow-md relative z-10 ml-0">
                        {year}
                      </div>
                    </div>

                    {/* Events with circles */}
                    <div className="space-y-2">
                      {yearEvents.map((event) => (
                        <div key={event.id} className="flex items-center">
                          {/* Circle - positioned at the timeline */}
                          <div 
                            className="w-6 h-6 rounded-full cursor-pointer hover:scale-125 transition-transform border-[3px] border-amber-300 bg-white flex items-center justify-center flex-shrink-0 relative z-10 ml-[13px]"
                            onClick={() => {
                              setSelectedEvent(event);
                              setEditingEvent(null);
                            }}
                            title={event.title}
                          >
                            <div className={`w-2.5 h-2.5 rounded-full ${event.category ? categoryColors[event.category].split(' ')[0] : 'bg-amber-500'}`} />
                          </div>

                          {/* Event box */}
                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors cursor-pointer flex-1 ml-6 flex items-center gap-2"
                            onClick={() => {
                              setSelectedEvent(event);
                              setEditingEvent(null);
                            }}
                          >
                            {event.photos && event.photos.length > 0 && (
                              <img 
                                src={getThumbnailUrl(event.photos[0], 100)} 
                                alt=""
                                className="w-10 h-10 rounded object-cover flex-shrink-0"
                                loading="lazy"
                              />
                            )}
                            <h3 className="font-semibold text-gray-900 text-sm">{event.title}</h3>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Event Detail Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
            </DialogHeader>
            {selectedEvent && !editingEvent && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h3>
                    {selectedEvent.category && (
                      <span className={`text-xs px-3 py-1 rounded-full text-white ${categoryColors[selectedEvent.category].replace('border-', 'bg-')}`}>
                        {categoryLabels[selectedEvent.category]}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500">{selectedEvent.date_text}</p>
                </div>
                {selectedEvent.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}
                {selectedEvent.photos && selectedEvent.photos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Photos</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedEvent.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={getThumbnailUrl(photo, 400)}
                          alt={`${selectedEvent.title} photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-90"
                          loading="lazy"
                          onClick={() => {
                            setSelectedPhoto(photo);
                            setPhotoZoom(1);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedEvent.isAppliance ? (
                    <Button 
                      onClick={() => {
                        navigate(createPageUrl('House') + `?tab=appliances&editId=${selectedEvent.applianceId}`);
                        setSelectedEvent(null);
                      }} 
                      className="flex-1"
                    >
                      Edit Appliance
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setEditingEvent({ ...selectedEvent })} className="flex-1">
                        Edit Event
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this event?')) {
                            deleteEventMutation.mutate(selectedEvent.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
            {editingEvent && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Date</label>
                  <Input
                    placeholder="e.g., 'Summer 1927', 'December 1950', '1985'"
                    value={editingEvent.date_text}
                    onChange={(e) => {
                      const date_text = e.target.value;
                      const { year, month } = parseDateText(date_text);
                      setEditingEvent({ ...editingEvent, date_text, year, month });
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <Input
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <Select value={editingEvent.category || ''} onValueChange={(value) => setEditingEvent({ ...editingEvent, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="structure_systems">Structure & Systems</SelectItem>
                      <SelectItem value="renovations_improvements">Renovations & Improvements</SelectItem>
                      <SelectItem value="maintenance_repairs">Maintenance & Repairs</SelectItem>
                      <SelectItem value="damage_incidents">Damage & Incidents</SelectItem>
                      <SelectItem value="financial_legal">Financial & Legal</SelectItem>
                      <SelectItem value="family_moments">Family Moments</SelectItem>
                      <SelectItem value="exterior_property">Exterior & Property</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    value={editingEvent.description || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Photos</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => editFileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                      >
                        {isUploadingPhoto ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" />Upload Photo</>
                        )}
                      </Button>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e.target.files?.[0], true)}
                        className="hidden"
                      />
                    </div>
                    <Input
                      placeholder="Or paste an image here..."
                      onPaste={(e) => handlePaste(e, true)}
                      disabled={isUploadingPhoto}
                      className="text-sm"
                    />
                    {editingEvent.photos && editingEvent.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {editingEvent.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-24 object-cover rounded" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removePhoto(index, true)}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateEventMutation.mutate({ id: editingEvent.id, data: editingEvent })}
                    disabled={!editingEvent.date_text || !editingEvent.year || !editingEvent.title}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditingEvent(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Photo viewer */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" 
            onClick={() => {
              setSelectedPhoto(null);
              setPhotoZoom(1);
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={() => {
                setSelectedPhoto(null);
                setPhotoZoom(1);
              }}
            >
              <X className="w-6 h-6" />
            </Button>
            <motion.img
              src={selectedPhoto}
              alt="Full screen view"
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
      </CardContent>
    </Card>
  );
}