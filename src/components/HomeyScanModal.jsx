import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ScanLine, Upload, Loader2, CheckCircle2, AlertTriangle,
  Sparkles, Users, ImageIcon, FileText, X, Calendar, Clock,
  MapPin, ChevronRight
} from 'lucide-react';

const STEPS = {
  UPLOAD: 'upload',
  SCANNING: 'scanning',
  REVIEW: 'review',
  SAVING: 'saving',
  DONE: 'done',
};

export default function HomeyScanModal({ open, onClose, onSaved }) {
  const fileRef = useRef();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [missingDate, setMissingDate] = useState(false);

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const reset = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setPreview(null);
    setScanError(null);
    setExtracted(null);
    setSelectedMembers([]);
    setMissingDate(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = (f) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  // Compress image to max 1200px wide and convert to JPEG base64
  const compressImage = (f) => new Promise((resolve, reject) => {
    const MAX_SIZE = 1200;
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        resolve({ base64, type: 'image/jpeg' });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(f);
  });

  const toBase64 = (f) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  const handleScan = async () => {
    if (!file) return;
    setStep(STEPS.SCANNING);
    setScanError(null);

    try {
      // Compress image and get base64 data URI for direct LLM vision call
      let dataUri;
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        dataUri = `data:image/jpeg;base64,${compressed.base64}`;
      } else {
        // PDF: read as base64 data URI
        const b64 = await toBase64(file);
        dataUri = `data:${file.type};base64,${b64}`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Homey, a helpful family assistant. Carefully analyze this image or document (which may be a school flyer, sports schedule, medical appointment card, event poster, sticky note, or similar).

Extract the following details:
- event_name: The name or title of the event
- date: The date in YYYY-MM-DD format. If multiple dates, use the first/main one. If you cannot find a date, return null.
- time: Start time in HH:MM 12-hour format with AM/PM (e.g. "3:30 PM"). If not found, return null.
- end_time: End time if present, same format. If not found, return null.
- location: Physical location or venue name. If not found, return null.
- address: Street address if different from location name. If not found, return null.
- description: A brief 1-2 sentence description summarizing what this event is about.
- event_type: One of: event, sports_league, program, reminder
- age_range: Age range if mentioned (e.g. "5-12 years"). If not found, return null.
- cost: Cost or price if mentioned (e.g. "Free", "$15"). If not found, return null.
- registration_url: Any URL or website mentioned. If not found, return null.
- confidence: Your confidence level (high, medium, low) in the extraction

Be thorough — dates sometimes appear in formats like "Saturday, April 5th", "4/5/26", or "4/1/2026". Always convert to YYYY-MM-DD.`,
        file_urls: [dataUri],
        response_json_schema: {
          type: "object",
          properties: {
            event_name: { type: "string" },
            date: { type: ["string", "null"] },
            time: { type: ["string", "null"] },
            end_time: { type: ["string", "null"] },
            location: { type: ["string", "null"] },
            address: { type: ["string", "null"] },
            description: { type: "string" },
            event_type: { type: "string" },
            age_range: { type: ["string", "null"] },
            cost: { type: ["string", "null"] },
            registration_url: { type: ["string", "null"] },
            confidence: { type: "string" }
          }
        }
      });

      if (!result) {
        setScanError("Homey couldn't read that file. Please try a clearer image.");
        setStep(STEPS.UPLOAD);
        return;
      }

      setExtracted({
        title: result.event_name || '',
        date: result.date || '',
        time: result.time || '',
        end_time: result.end_time || '',
        location: result.location || '',
        address: result.address || '',
        description: result.description || '',
        type: result.event_type || 'event',
        age_range: result.age_range || '',
        cost: result.cost || '',
        registration_url: result.registration_url || '',
        confidence: result.confidence || 'medium',
      });


      setMissingDate(!result.date);
      setStep(STEPS.REVIEW);
    } catch (err) {
      setScanError("Something went wrong while scanning. Please try again.");
      setStep(STEPS.UPLOAD);
    }
  };

  const toggleMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (missingDate && !extracted.date) return; // force date entry
    setStep(STEPS.SAVING);

    const targets = selectedMembers.length > 0
      ? familyMembers.filter(m => selectedMembers.includes(m.id))
      : [null]; // create one record with no assignment

    for (const member of targets) {
      await base44.entities.KidsActivity.create({
        title: extracted.title,
        type: extracted.type,
        date: extracted.date,
        time: extracted.time,
        location: extracted.location,
        address: extracted.address,
        description: extracted.description,
        age_range: extracted.age_range,
        cost: extracted.cost,
        registration_url: extracted.registration_url,
        child_name: member?.name || null,
        source: 'manual',
      });
    }

    queryClient.invalidateQueries(['kidsActivities']);
    setStep(STEPS.DONE);
    setTimeout(() => {
      onSaved?.();
      handleClose();
    }, 1500);
  };

  const confidenceColor = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-red-100 text-red-700',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E91E8C] to-[#0AACFF] flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            Scan to Homey
          </DialogTitle>
        </DialogHeader>

        {/* STEP: UPLOAD */}
        {step === STEPS.UPLOAD && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Upload a school flyer, sports schedule, event poster, or medical appointment card. Homey will extract the details automatically.</p>

            {scanError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {scanError}
              </div>
            )}

            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#0AACFF] hover:bg-blue-50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }}
            >
              {file ? (
                <div className="space-y-2">
                  {preview ? (
                    <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                      <FileText className="w-8 h-8 text-blue-400" />
                      <span className="font-medium">{file.name}</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                    className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 mx-auto"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center gap-4">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                    <FileText className="w-8 h-8 text-gray-300" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Drop a file here or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, PDF</p>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            <Button
              onClick={handleScan}
              disabled={!file}
              className="w-full bg-gradient-to-r from-[#E91E8C] to-[#0AACFF] text-white font-semibold"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Scan with Homey
            </Button>
          </div>
        )}

        {/* STEP: SCANNING */}
        {step === STEPS.SCANNING && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#0AACFF] opacity-20 animate-ping absolute inset-0" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#0AACFF] flex items-center justify-center relative">
                <ScanLine className="w-7 h-7 text-white animate-pulse" />
              </div>
            </div>
            <p className="font-semibold text-gray-800">Homey is scanning...</p>
            <p className="text-sm text-gray-400">Extracting event details from your file</p>
          </div>
        )}

        {/* STEP: REVIEW */}
        {step === STEPS.REVIEW && extracted && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Homey found these details. Look good?</p>
              {extracted.confidence && (
                <Badge className={`text-xs ${confidenceColor[extracted.confidence] || confidenceColor.medium}`}>
                  {extracted.confidence} confidence
                </Badge>
              )}
            </div>

            {/* Missing date warning */}
            {missingDate && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Homey couldn't find a date in this photo.</p>
                  <p className="text-xs text-amber-600 mt-0.5">When should I set this for?</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Event Name</Label>
                <Input value={extracted.title} onChange={e => setExtracted({ ...extracted, title: e.target.value })} className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={`text-xs ${missingDate && !extracted.date ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
                    Date {missingDate && !extracted.date && '← required'}
                  </Label>
                  <Input
                    type="date"
                    value={extracted.date || ''}
                    onChange={e => setExtracted({ ...extracted, date: e.target.value })}
                    className={`mt-1 ${missingDate && !extracted.date ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Time</Label>
                  <Input
                    placeholder="e.g. 3:30 PM"
                    value={extracted.time || ''}
                    onChange={e => setExtracted({ ...extracted, time: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Location</Label>
                <Input value={extracted.location || ''} onChange={e => setExtracted({ ...extracted, location: e.target.value })} className="mt-1" placeholder="Venue or location name" />
              </div>

              <div>
                <Label className="text-xs text-gray-500">Type</Label>
                <Select value={extracted.type} onValueChange={v => setExtracted({ ...extracted, type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="sports_league">Sports League</SelectItem>
                    <SelectItem value="program">Program</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Description</Label>
                <Textarea value={extracted.description || ''} onChange={e => setExtracted({ ...extracted, description: e.target.value })} rows={2} className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Age Range</Label>
                  <Input value={extracted.age_range || ''} onChange={e => setExtracted({ ...extracted, age_range: e.target.value })} className="mt-1" placeholder="e.g. 5-12 years" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Cost</Label>
                  <Input value={extracted.cost || ''} onChange={e => setExtracted({ ...extracted, cost: e.target.value })} className="mt-1" placeholder="e.g. Free, $15" />
                </div>
              </div>
            </div>

            {/* Family member assignment */}
            <div>
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5" />
                Assign to family members (optional)
              </Label>
              <div className="flex flex-wrap gap-2">
                {familyMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                      selectedMembers.includes(member.id)
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                    style={selectedMembers.includes(member.id) ? { backgroundColor: member.color || '#0AACFF' } : {}}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: member.color || '#64748b' }}
                    >
                      {member.name?.charAt(0)}
                    </span>
                    {member.name}
                    {selectedMembers.includes(member.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
              {selectedMembers.length > 1 && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Homey will create a separate calendar entry for each person selected.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={reset} className="flex-1">
                Re-scan
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!extracted.title || (missingDate && !extracted.date)}
                className="flex-1 bg-gradient-to-r from-[#E91E8C] to-[#0AACFF] text-white font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {selectedMembers.length > 1
                  ? `Add for ${selectedMembers.length} people`
                  : 'Add to Calendar'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP: SAVING */}
        {step === STEPS.SAVING && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 text-[#0AACFF] animate-spin" />
            <p className="font-semibold text-gray-800">Saving to Homey...</p>
          </div>
        )}

        {/* STEP: DONE */}
        {step === STEPS.DONE && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-semibold text-gray-800">Added to Calendar!</p>
            {selectedMembers.length > 1 && (
              <p className="text-sm text-gray-500">{selectedMembers.length} entries created</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}