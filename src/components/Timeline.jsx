import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Upload, Loader2, Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Timeline() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ date: '', title: '', description: '', photos: [] });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const fileInputRef = React.useRef(null);

  const { data: events = [] } = useQuery({
    queryKey: ['timelineEvents'],
    queryFn: () => base44.entities.TimelineEvent.list(),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.TimelineEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['timelineEvents']);
      setDialogOpen(false);
      setNewEvent({ date: '', title: '', description: '', photos: [] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.TimelineEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['timelineEvents']),
  });

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewEvent({ ...newEvent, photos: [...newEvent.photos, file_url] });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          handlePhotoUpload(blob);
          e.preventDefault();
        }
      }
    }
  };

  const removePhoto = (index) => {
    setNewEvent({ ...newEvent, photos: newEvent.photos.filter((_, i) => i !== index) });
  };

  // Group events by year
  const eventsByYear = events
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .reduce((acc, event) => {
      const year = new Date(event.date).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(event);
      return acc;
    }, {});

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Timeline</h2>
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
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
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
                  disabled={!newEvent.date || !newEvent.title}
                  className="w-full"
                >
                  Add Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No events yet. Add your first event to get started.</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[30px] top-8 bottom-8 w-0.5 bg-amber-200" />

            <div className="space-y-8">
              {Object.entries(eventsByYear).map(([year, yearEvents]) => (
                <div key={year} className="relative">
                  {/* Year badge */}
                  <div className="absolute left-0 top-0 w-[60px] h-[50px] bg-amber-500 text-white font-bold text-xl flex items-center justify-center rounded shadow-md z-10">
                    {year}
                  </div>

                  <div className="ml-[80px] space-y-6">
                    {yearEvents.map((event) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative"
                      >
                        {/* Connection dot */}
                        <div className="absolute -left-[59px] top-3 w-4 h-4 bg-white border-4 border-amber-500 rounded-full" />

                        <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-lg">{event.title}</h3>
                              <p className="text-sm text-gray-500">
                                {new Date(event.date).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric',
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEventMutation.mutate(event.id)}
                              className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {event.description && (
                            <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{event.description}</p>
                          )}

                          {event.photos && event.photos.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                              {event.photos.map((photo, index) => (
                                <img
                                  key={index}
                                  src={photo}
                                  alt={`${event.title} photo ${index + 1}`}
                                  className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setSelectedPhoto(photo)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo viewer */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" 
            onClick={() => setSelectedPhoto(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={selectedPhoto}
              alt="Full screen view"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}