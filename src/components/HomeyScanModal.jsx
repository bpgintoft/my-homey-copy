import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ScanLine, Loader2, CheckCircle2, AlertTriangle,
  Sparkles, ImageIcon, FileText, X, Shield, Plus, GripVertical,
} from 'lucide-react';
import jsPDF from 'jspdf';
import EventReviewForm from './scan/EventReviewForm';
import MaintenanceReviewForm from './scan/MaintenanceReviewForm';
import VaultReviewForm from './scan/VaultReviewForm';

const STEPS = {
  UPLOAD: 'upload',
  SCANNING: 'scanning',
  REVIEW: 'review',
  SAVING: 'saving',
  DONE: 'done',
};

// contextHint -> likely doc type label shown to user
const HINT_LABELS = {
  maintenance_task: 'Maintenance / Service',
  personal_id: 'Personal ID / Vault',
  house_doc: 'House Document',
  calendar_event: 'Calendar Event',
};

export default function HomeyScanModal({ open, onClose, onSaved, contextHint }) {
  const fileRef = useRef();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(STEPS.UPLOAD);
  const [files, setFiles] = useState([]);
  const [scanError, setScanError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [docType, setDocType] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

  // Event-specific state
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [missingDate, setMissingDate] = useState(false);

  // Vault-specific state (personal_id)
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const { data: calendarsData } = useQuery({
    queryKey: ['googleCalendars'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getGoogleCalendars');
      return data;
    },
    enabled: open,
  });
  const calendars = calendarsData?.calendars || [];

  const reset = () => {
    setStep(STEPS.UPLOAD);
    setFiles([]);
    setScanError(null);
    setExtracted(null);
    setDocType(null);
    setFileUrl(null);
    setSelectedMembers([]);
    setSelectedCalendarId('');
    setMissingDate(false);
    setSelectedMemberIds([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFileSelect = (f) => {
    if (!f) return;
    setFiles(prev => [...prev, { id: Date.now() + Math.random(), file: f, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null }]);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(item => item.id !== id));
  };

  const compileToPdf = async () => {
    const imageFiles = files.filter(item => item.file.type.startsWith('image/'));
    if (imageFiles.length === 0) return null;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let isFirst = true;

    for (const item of imageFiles) {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => {
          if (!isFirst) pdf.addPage();
          const imgWidth = pageWidth;
          const imgHeight = (img.height / img.width) * pageWidth;
          const yPos = imgHeight > pageHeight ? 0 : (pageHeight - imgHeight) / 2;
          pdf.addImage(img, 'JPEG', 0, yPos, imgWidth, Math.min(imgHeight, pageHeight));
          isFirst = false;
          resolve();
        };
        img.onerror = reject;
        img.src = item.preview;
      });
    }

    const pdfBlob = pdf.output('blob');
    return new File([pdfBlob], 'scan.pdf', { type: 'application/pdf' });
  };

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

  const handleScan = async () => {
    if (files.length === 0) return;
    setStep(STEPS.SCANNING);
    setScanError(null);

    try {
      let uploadFile;
      
      if (files.length === 1) {
        const f = files[0].file;
        if (f.type.startsWith('image/')) {
          const compressed = await compressImage(f);
          const byteChars = atob(compressed.base64);
          const byteArr = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
          uploadFile = new File([byteArr], 'scan.jpg', { type: 'image/jpeg' });
        } else {
          uploadFile = f;
        }
      } else {
        uploadFile = await compileToPdf();
        if (!uploadFile) {
          setScanError('No images found to compile. Please add image files.');
          setStep(STEPS.UPLOAD);
          return;
        }
      }

      const response = await base44.functions.invoke('homeyScan', { file: uploadFile });
      const result = response.data?.result;
      const returnedFileUrl = response.data?.file_url;

      if (!result) {
        setScanError(response.data?.error || "Homey couldn't read that file. Please try a clearer image.");
        setStep(STEPS.UPLOAD);
        return;
      }

      const type = result.document_type || 'calendar_event';
      setDocType(type);
      setFileUrl(returnedFileUrl || null);

      // Normalize extracted data into a single object regardless of type
      setExtracted({
        // common
        confidence: result.confidence,
        description: result.description || '',
        cost: result.cost || '',
        // calendar_event
        title: result.event_name || result.title || '',
        date: result.date || '',
        time: result.time || '',
        end_time: result.end_time || '',
        location: result.location || '',
        address: result.address || '',
        type: result.event_type || 'event',
        age_range: result.age_range || '',
        registration_url: result.registration_url || '',
        assignee_name: result.assignee_name || '',
        // maintenance_task
        task_title: result.task_title || '',
        appliance_name: result.appliance_name || '',
        next_due_date: result.next_due_date || '',
        category: result.category || '',
        // personal_id
        doc_label: result.doc_label || '',
        doc_type: result.doc_type || '',
        expiry_date: result.expiry_date || '',
        member_name: result.member_name || '',
        id_category: result.category || 'identity',
        license_number: result.license_number || '',
        insurance_provider: result.insurance_provider || '',
        policy_number: result.policy_number || '',
        insurance_type: result.insurance_type || '',
        card_number: result.card_number || '',
        // house_doc
        doc_category: result.doc_category || 'other',
        related_item_name: result.related_item_name || '',
        expiration_date: result.expiration_date || '',
        purchase_date: result.purchase_date || '',
        purchase_price: result.purchase_price || null,
        notes: result.notes || '',
      });

      // Auto-pre-select family members for personal_id if AI detected names
      if (type === 'personal_id' && result.member_name) {
        const detectedName = result.member_name.toLowerCase();
        const matches = familyMembers
          .filter(m => detectedName.includes(m.name?.toLowerCase()))
          .map(m => m.id);
        if (matches.length > 0) setSelectedMemberIds(matches);
      }

      // Auto-pre-select family member for calendar events
      if (type === 'calendar_event' && result.assignee_name) {
        const match = familyMembers.find(m =>
          result.assignee_name?.toLowerCase().includes(m.name?.toLowerCase())
        );
        if (match) setSelectedMembers([match.id]);
      }

      setMissingDate(type === 'calendar_event' && !result.date);
      setStep(STEPS.REVIEW);
    } catch (err) {
      console.error('HomeyScan error:', err?.message || err);
      setScanError(err?.message || "Something went wrong. Please try again.");
      setStep(STEPS.UPLOAD);
    }
  };

  const toggleMember = (id) => setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  const parseTo24h = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  };

  const handleConfirm = async () => {
    setStep(STEPS.SAVING);

    try {
      if (docType === 'calendar_event') {
        await saveCalendarEvent();
      } else if (docType === 'maintenance_task') {
        await saveMaintenanceTask();
      } else if (docType === 'personal_id') {
        await savePersonalId();
      } else if (docType === 'house_doc') {
        await saveHouseDoc();
      }
    } catch (err) {
      console.error('Save error:', err);
      setScanError(err?.message || 'Failed to save. Please try again.');
      setStep(STEPS.UPLOAD);
      return;
    }

    setStep(STEPS.DONE);
    setTimeout(() => { onSaved?.(); handleClose(); }, 1500);
  };

  const saveCalendarEvent = async () => {
    const time24 = parseTo24h(extracted.time);
    const endTime24 = parseTo24h(extracted.end_time);
    const isAllDay = !time24;

    let start, end;
    if (isAllDay) {
      start = extracted.date;
      end = extracted.date;
    } else {
      start = `${extracted.date}T${time24}:00`;
      if (endTime24) {
        end = `${extracted.date}T${endTime24}:00`;
      } else {
        const [h, m] = time24.split(':').map(Number);
        const endH = String(h + 1).padStart(2, '0');
        end = `${extracted.date}T${endH}:${String(m).padStart(2, '0')}:00`;
      }
    }

    if (selectedCalendarId) {
      await base44.functions.invoke('createGoogleCalendarEvent', {
        summary: extracted.title,
        description: extracted.description || '',
        location: extracted.location || '',
        calendarId: selectedCalendarId,
        start, end, isAllDay,
      });
      queryClient.invalidateQueries({ queryKey: ['cachedCalendarEvents'] });
    }

    const targets = selectedMembers.length > 0
      ? familyMembers.filter(m => selectedMembers.includes(m.id))
      : [];

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
    queryClient.invalidateQueries({ queryKey: ['kidsActivities'] });
  };

  const saveMaintenanceTask = async () => {
    await base44.entities.MaintenanceTask.create({
      title: extracted.task_title,
      appliance_name: extracted.appliance_name || null,
      next_due: extracted.next_due_date || null,
      description: extracted.description || null,
      category: extracted.category || 'interior',
      status: 'pending',
      priority: 'medium',
    });
    queryClient.invalidateQueries({ queryKey: ['maintenanceTasks'] });
  };

  const savePersonalId = async () => {
    if (!selectedMemberIds.length) return;

    for (const memberId of selectedMemberIds) {
      // Fetch each member to safely append (never overwrite)
      const members = await base44.entities.FamilyMember.filter({ id: memberId });
      const current = members?.[0];
      if (!current) continue;

      const existingDocs = Array.isArray(current.documents_ids) ? current.documents_ids : [];

      const newDoc = {
        id: `doc_${Date.now()}_${memberId}`,
        type: extracted.doc_type || 'other',
        category: extracted.id_category || 'identity',
        label: extracted.doc_label || 'Document',
        value: extracted.card_number || '',
        expiry_date: extracted.expiry_date || null,
        file_uri: fileUrl || null,
        created_at: new Date().toISOString(),
      };

      const updatePayload = { documents_ids: [...existingDocs, newDoc] };

      if (extracted.doc_type === 'drivers_license') {
        if (extracted.license_number) updatePayload.license_number = extracted.license_number;
        if (extracted.expiry_date) updatePayload.license_expiration_date = extracted.expiry_date;
      }

      if (extracted.insurance_provider && extracted.insurance_type === 'vehicle') {
        if (extracted.insurance_provider) updatePayload.vehicle_insurance_provider = extracted.insurance_provider;
        if (extracted.policy_number) updatePayload.vehicle_insurance_policy_number = extracted.policy_number;
        if (extracted.expiry_date) updatePayload.vehicle_insurance_expiration = extracted.expiry_date;
      }

      if (extracted.insurance_provider && extracted.insurance_type === 'health') {
        if (extracted.insurance_provider) updatePayload.insurance_provider = extracted.insurance_provider;
        if (extracted.policy_number) updatePayload.insurance_member_id = extracted.policy_number;
      }

      if (extracted.insurance_provider && extracted.insurance_type === 'dental') {
        if (extracted.insurance_provider) updatePayload.dental_insurance_provider = extracted.insurance_provider;
        if (extracted.policy_number) updatePayload.dental_insurance_member_id = extracted.policy_number;
      }

      if (extracted.insurance_provider && extracted.insurance_type === 'vision') {
        if (extracted.insurance_provider) updatePayload.vision_insurance_provider = extracted.insurance_provider;
        if (extracted.policy_number) updatePayload.vision_insurance_member_id = extracted.policy_number;
      }

      await base44.entities.FamilyMember.update(memberId, updatePayload);
    }

    // Refetch the family members data to ensure UI updates immediately
    await queryClient.refetchQueries({ queryKey: ['familyMembers'] });
  };

  const saveHouseDoc = async () => {
    await base44.entities.Document.create({
      title: extracted.title,
      type: extracted.doc_category || 'other',
      related_item_name: extracted.related_item_name || null,
      expiration_date: extracted.expiration_date || null,
      purchase_date: extracted.purchase_date || null,
      purchase_price: extracted.purchase_price || null,
      notes: extracted.notes || null,
      file_url: fileUrl || null,
    });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  const isSaveDisabled = () => {
    if (!extracted) return true;
    if (docType === 'calendar_event') return !extracted.title || (missingDate && !extracted.date);
    if (docType === 'maintenance_task') return !extracted.task_title;
    if (docType === 'personal_id') return !extracted.doc_label || selectedMemberIds.length === 0;
    if (docType === 'house_doc') return !extracted.title;
    return true;
  };

  const docTypeLabel = docType ? (HINT_LABELS[docType] || docType) : null;

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
            {contextHint && HINT_LABELS[contextHint] && step === STEPS.UPLOAD && (
              <Badge className="ml-auto text-xs bg-blue-100 text-blue-700">
                Hint: {HINT_LABELS[contextHint]}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* UPLOAD */}
        {step === STEPS.UPLOAD && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Upload one or multiple photos. They'll be compiled into a single file. Homey will figure out what it is automatically.</p>

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
              onDrop={(e) => {
                e.preventDefault();
                Array.from(e.dataTransfer.files).forEach(f => handleFileSelect(f));
              }}
            >
              {files.length === 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-center gap-4">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                    <FileText className="w-8 h-8 text-gray-300" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Drop files here or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, PDF — add multiple photos to compile</p>
                  </div>
                </div>
              ) : (
                <div className="text-left space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">{files.length} file{files.length > 1 ? 's' : ''} selected:</p>
                  {files.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      {item.preview ? (
                        <img src={item.preview} alt="Preview" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-700 flex-1 truncate">{item.file.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                        className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => Array.from(e.target.files || []).forEach(f => handleFileSelect(f))} />

            <Button onClick={() => fileRef.current?.click()} variant="outline" className="w-full border-gray-200">
              <Plus className="w-4 h-4 mr-2" />
              Add More Files
            </Button>

            <Button onClick={handleScan} disabled={files.length === 0} className="w-full bg-gradient-to-r from-[#E91E8C] to-[#0AACFF] text-white font-semibold">
              <Sparkles className="w-4 h-4 mr-2" />
              Scan with Homey
            </Button>
          </div>
        )}

        {/* SCANNING */}
        {step === STEPS.SCANNING && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#0AACFF] opacity-20 animate-ping absolute inset-0" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#0AACFF] flex items-center justify-center relative">
                <ScanLine className="w-7 h-7 text-white animate-pulse" />
              </div>
            </div>
            <p className="font-semibold text-gray-800">Homey is scanning...</p>
            <p className="text-sm text-gray-400">Identifying document type and extracting details</p>
          </div>
        )}

        {/* REVIEW */}
        {step === STEPS.REVIEW && extracted && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700">Classified as:</p>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-8 text-xs w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calendar_event">📅 Calendar Event</SelectItem>
                    <SelectItem value="maintenance_task">🔧 Maintenance / Service</SelectItem>
                    <SelectItem value="personal_id">🔒 Personal ID / Vault</SelectItem>
                    <SelectItem value="house_doc">🏠 House Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {extracted.confidence && (
                <Badge className={`text-xs ${confidenceColor[extracted.confidence] || confidenceColor.medium}`}>
                  {extracted.confidence} confidence
                </Badge>
              )}
            </div>

            {docType === 'personal_id' && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                <Shield className="w-4 h-4 flex-shrink-0" />
                Homey detected a private document. This will be saved to your Secure Vault.
              </div>
            )}

            {/* Dynamic form based on doc type */}
            {docType === 'calendar_event' && (
              <EventReviewForm
                extracted={extracted}
                setExtracted={setExtracted}
                familyMembers={familyMembers}
                selectedMembers={selectedMembers}
                toggleMember={toggleMember}
                selectedCalendarId={selectedCalendarId}
                setSelectedCalendarId={setSelectedCalendarId}
                calendars={calendars}
                missingDate={missingDate}
              />
            )}

            {docType === 'maintenance_task' && (
              <MaintenanceReviewForm extracted={extracted} setExtracted={setExtracted} />
            )}

            {(docType === 'personal_id' || docType === 'house_doc') && (
              <VaultReviewForm
                extracted={extracted}
                setExtracted={setExtracted}
                docType={docType}
                familyMembers={familyMembers}
                selectedMemberIds={selectedMemberIds}
                setSelectedMemberIds={setSelectedMemberIds}
              />
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={reset} className="flex-1">Re-scan</Button>
              <Button
                onClick={handleConfirm}
                disabled={isSaveDisabled()}
                className="flex-1 bg-gradient-to-r from-[#E91E8C] to-[#0AACFF] text-white font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save to Homey
              </Button>
            </div>
          </div>
        )}

        {/* SAVING */}
        {step === STEPS.SAVING && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 text-[#0AACFF] animate-spin" />
            <p className="font-semibold text-gray-800">Saving to Homey...</p>
          </div>
        )}

        {/* DONE */}
        {step === STEPS.DONE && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-semibold text-gray-800">Saved to Homey!</p>
            <p className="text-sm text-gray-500">{docTypeLabel} has been filed.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}