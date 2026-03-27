import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Plus, Trash2, Eye, EyeOff, Lock, FileText, Image,
  Upload, X, ShieldCheck, Shield, Home, Heart, DollarSign,
  Plane, Car, GraduationCap, FolderOpen, ChevronDown, ChevronRight
} from 'lucide-react';

// ─── Category Config ────────────────────────────────────────────────────────
export const CATEGORIES = [
  { value: 'identity',   label: 'Identity',   icon: Shield,         color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  { value: 'property',   label: 'Property',   icon: Home,           color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  { value: 'health',     label: 'Health',     icon: Heart,          color: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-200' },
  { value: 'financial',  label: 'Financial',  icon: DollarSign,     color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  { value: 'travel',     label: 'Travel',     icon: Plane,          color: 'text-sky-600',    bg: 'bg-sky-50',    border: 'border-sky-200' },
  { value: 'vehicles',   label: 'Vehicles',   icon: Car,            color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { value: 'education',  label: 'Education',  icon: GraduationCap,  color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { value: 'other',      label: 'Other',      icon: FolderOpen,     color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200' },
];

const getCategoryConfig = (value) =>
  CATEGORIES.find(c => c.value === value) || CATEGORIES.find(c => c.value === 'other');

// ─── PIN Lock Gate ─────────────────────────────────────────────────────────
function PinLockGate({ onUnlock }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState('choose');
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const STORAGE_KEY = 'family_docs_pin';

  const handlePinDigit = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < 3) inputRefs[index + 1].current?.focus();
    if (newPin.every(d => d !== '')) {
      setTimeout(() => validatePin(newPin.join('')), 50);
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const validatePin = (enteredPin) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, enteredPin);
      onUnlock();
    } else if (stored === enteredPin) {
      onUnlock();
    } else {
      setError(true);
      setPin(['', '', '', '']);
      setTimeout(() => { setError(false); inputRefs[0].current?.focus(); }, 1200);
    }
  };

  const handleConfirm = () => onUnlock();

  if (mode === 'choose') {
    const hasPin = !!localStorage.getItem(STORAGE_KEY);
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-gray-900 text-lg">Double-Lock Protected</h3>
          <p className="text-sm text-gray-500 mt-1">This section contains sensitive documents.<br />Verify your identity to continue.</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={() => setMode('pin')} className="w-full gap-2">
            <Lock className="w-4 h-4" />
            {hasPin ? 'Enter PIN' : 'Set up PIN'}
          </Button>
          <Button variant="outline" onClick={handleConfirm} className="w-full gap-2">
            <ShieldCheck className="w-4 h-4" />
            Confirm Identity
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center">
        <Lock className="w-7 h-7 text-white" />
      </div>
      <div className="text-center">
        <h3 className="font-bold text-gray-900 text-lg">Enter PIN</h3>
        <p className="text-sm text-gray-500 mt-1">
          {localStorage.getItem(STORAGE_KEY) ? 'Enter your 4-digit PIN' : 'Create a new 4-digit PIN'}
        </p>
      </div>
      <div className="flex gap-3">
        {pin.map((digit, i) => (
          <input
            key={i}
            ref={inputRefs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handlePinDigit(i, e.target.value)}
            onKeyDown={(e) => handlePinKeyDown(i, e)}
            autoFocus={i === 0}
            className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
              ${error ? 'border-red-400 bg-red-50 animate-bounce' : digit ? 'border-gray-900 bg-gray-50' : 'border-gray-300'}`}
          />
        ))}
      </div>
      {error && <p className="text-sm text-red-500 font-medium">Incorrect PIN. Try again.</p>}
      <button onClick={() => setMode('choose')} className="text-xs text-gray-400 hover:text-gray-600 underline">
        Back
      </button>
    </div>
  );
}

// ─── Document Card ─────────────────────────────────────────────────────────
function DocumentCard({ doc, color, onDelete }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [showValue, setShowValue] = useState(false);

  const SENSITIVE_TYPES = ['ssn', 'passport_number', 'id_number', 'pin', 'account_number'];
  const isSensitive = SENSITIVE_TYPES.includes(doc.type);

  const valueColorMap = {
    blue: 'text-blue-700', green: 'text-green-700', purple: 'text-purple-700',
    orange: 'text-orange-700', pink: 'text-pink-700',
  };
  const valueColor = valueColorMap[color] || valueColorMap.blue;

  const catConfig = getCategoryConfig(doc.category || 'other');
  const CatIcon = catConfig.icon;

  const handleViewFile = async () => {
    if (signedUrl) { window.open(signedUrl, '_blank'); return; }
    setLoadingUrl(true);
    const { data } = await base44.functions.invoke('getPrivateFileUrl', { file_uri: doc.file_uri });
    setLoadingUrl(false);
    if (data?.signed_url) {
      setSignedUrl(data.signed_url);
      window.open(data.signed_url, '_blank');
    }
  };

  const DOC_LABELS = {
    ssn: 'SSN', passport_number: 'Passport #', id_number: 'ID Number', pin: 'PIN',
    account_number: 'Account #', drivers_license: "Driver's License", birth_certificate: 'Birth Certificate',
    social_security_card: 'Social Security Card', passport: 'Passport', insurance_card: 'Insurance Card',
    medical_card: 'Medical Card', other: 'Other',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* Category color tag */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${catConfig.bg} ${catConfig.border} border`}>
        <CatIcon className={`w-4 h-4 ${catConfig.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 truncate">{doc.label || DOC_LABELS[doc.type] || doc.type}</div>
        {doc.value && (
          <div className="flex items-center gap-1 mt-0.5">
            {isSensitive ? (
              <>
                <span className={`text-xs font-mono ${showValue ? valueColor : 'text-gray-300 tracking-widest'}`}>
                  {showValue ? doc.value : '••••••••'}
                </span>
                <button onClick={() => setShowValue(v => !v)} className="p-0.5 rounded text-gray-400 hover:text-gray-600">
                  {showValue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </>
            ) : (
              <span className={`text-xs font-mono ${valueColor}`}>{doc.value}</span>
            )}
          </div>
        )}
        {doc.expiry_date && (
          <div className="text-xs text-gray-400 mt-0.5">
            Expires {new Date(doc.expiry_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {doc.file_uri && (
          <button onClick={handleViewFile} disabled={loadingUrl}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="View document">
            {loadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <button onClick={() => onDelete(doc.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Category Group ──────────────────────────────────────────────────────────
function CategoryGroup({ catConfig, docs, color, onDelete }) {
  const [open, setOpen] = useState(true);
  const CatIcon = catConfig.icon;

  return (
    <div className={`rounded-xl border ${catConfig.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-2.5 ${catConfig.bg} hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <CatIcon className={`w-4 h-4 ${catConfig.color}`} />
          <span className={`text-sm font-semibold ${catConfig.color}`}>{catConfig.label}</span>
          <span className="text-xs text-gray-400 font-normal">({docs.length})</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="p-2 space-y-2 bg-white">
          {docs.map(doc => (
            <DocumentCard key={doc.id} doc={doc} color={color} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Document Form ──────────────────────────────────────────────────────
function AddDocumentForm({ memberId, memberName, color, onSaved }) {
  const inputColorMap = {
    blue: 'border-blue-400 focus-visible:ring-blue-500 bg-blue-50',
    green: 'border-green-400 focus-visible:ring-green-500 bg-green-50',
    purple: 'border-purple-400 focus-visible:ring-purple-500 bg-purple-50',
    orange: 'border-orange-400 focus-visible:ring-orange-500 bg-orange-50',
    pink: 'border-pink-400 focus-visible:ring-pink-500 bg-pink-50',
  };
  const inputClass = inputColorMap[color] || inputColorMap.blue;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ type: '', category: '', label: '', value: '', expiry_date: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileRef = useRef();

  const DOC_TYPES = [
    { value: 'ssn', label: 'SSN' },
    { value: 'passport_number', label: 'Passport Number' },
    { value: 'passport', label: 'Passport (scan)' },
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'id_number', label: 'ID Number' },
    { value: 'birth_certificate', label: 'Birth Certificate' },
    { value: 'social_security_card', label: 'Social Security Card' },
    { value: 'insurance_card', label: 'Insurance Card' },
    { value: 'medical_card', label: 'Medical Card' },
    { value: 'account_number', label: 'Account Number' },
    { value: 'pin', label: 'PIN / Password' },
    { value: 'other', label: 'Other' },
  ];

  const toBase64 = (f) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  const handleSave = async () => {
    if (!form.type) return;
    setUploading(true);
    setUploadError(null);

    let file_uri = null;
    if (file) {
      let lastError = null;
      for (let i = 0; i < 3; i++) {
        try {
          const { data } = await base44.functions.invoke('uploadPrivateDocument', {
            file_name: file.name,
            file_type: file.type,
            file_data: await toBase64(file),
          });
          if (!data?.file_uri) throw new Error('No file URI returned from server');
          file_uri = data.file_uri;
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          if (i < 2) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
      if (lastError) {
        setUploading(false);
        setUploadError(`File upload failed after 3 attempts: ${lastError.message}. Your document was NOT saved. Please try again.`);
        return;
      }
    }

    try {
      const memberData = await base44.entities.FamilyMember.filter({ id: memberId }).then(r => r[0]);
      const existing = memberData?.documents_ids || [];
      const docEntry = {
        id: crypto.randomUUID(),
        type: form.type,
        category: form.category || 'other',
        label: form.label,
        value: form.value,
        expiry_date: form.expiry_date || null,
        file_uri,
        created_at: new Date().toISOString(),
      };
      await base44.entities.FamilyMember.update(memberId, { documents_ids: [...existing, docEntry] });
      await queryClient.refetchQueries({ queryKey: ['familyMembers'] });
      setForm({ type: '', category: '', label: '', value: '', expiry_date: '' });
      setFile(null);
      onSaved?.();
    } catch (err) {
      setUploadError(`Failed to save document record: ${err.message}. Please try again.`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
      <h4 className="text-sm font-semibold text-gray-700">Add Document / ID</h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Document Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  <span className="flex items-center gap-2">
                    <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
                    {c.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Label (optional)</Label>
        <Input placeholder="e.g., Bryan's Passport" value={form.label}
          onChange={e => setForm({ ...form, label: e.target.value })} className={inputClass} />
      </div>
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Number / Value (optional)</Label>
        <Input placeholder="e.g., 123-45-6789" value={form.value}
          onChange={e => setForm({ ...form, value: e.target.value })} className={inputClass} />
      </div>
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Expiry Date (optional)</Label>
        <Input type="date" value={form.expiry_date}
          onChange={e => setForm({ ...form, expiry_date: e.target.value })} className={inputClass} />
      </div>
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Upload File (private, encrypted)</Label>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">{file.name}</span>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="p-0.5 rounded hover:bg-gray-200">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-500">Click to upload (PDF, image)</span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
          onChange={e => setFile(e.target.files?.[0] || null)} />
      </div>

      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-xs text-red-600 font-medium leading-snug">{uploadError}</p>
          <button
            onClick={() => { setUploadError(null); handleSave(); }}
            className="text-xs font-semibold text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}
      <Button onClick={handleSave} disabled={!form.type || uploading} className="w-full">
        {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving securely...</> : <><Plus className="w-4 h-4 mr-2" />Add Document</>}
      </Button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function DocumentsIDsSection({ member, color = 'blue', isReadOnly = false }) {
  const [unlocked, setUnlocked] = useState(false);
  const queryClient = useQueryClient();

  // Always read from cache so we get live updates when the scan modal saves
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });
  const liveMember = familyMembers.find(m => m.id === member?.id) || member;

  if (isReadOnly) return null;

  // Normalise: existing docs without a category get 'other' as default
  const docs = (liveMember?.documents_ids || []).map(d => ({ ...d, category: d.category || 'other' }));

  const handleDelete = async (docId) => {
    const updated = docs.filter(d => d.id !== docId);
    await base44.entities.FamilyMember.update(member.id, { documents_ids: updated });
    queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
  };

  if (!unlocked) {
    return <PinLockGate onUnlock={() => setUnlocked(true)} />;
  }

  // Group docs by category, preserving CATEGORIES order
  const grouped = CATEGORIES.map(cat => ({
    catConfig: cat,
    docs: docs.filter(d => d.category === cat.value),
  })).filter(g => g.docs.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Lock className="w-3 h-3" />
        <span>Files stored in private encrypted storage</span>
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No documents added yet.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ catConfig, docs: catDocs }) => (
            <CategoryGroup
              key={catConfig.value}
              catConfig={catConfig}
              docs={catDocs}
              color={color}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddDocumentForm
        memberId={member.id}
        memberName={member.name}
        color={color}
        onSaved={() => {}}
      />
    </div>
  );
}