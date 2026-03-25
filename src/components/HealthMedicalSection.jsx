import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Check, Copy, Plus, Trash2 } from 'lucide-react';

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

const inputColorMap = {
  blue: 'border-blue-400 focus-visible:ring-blue-500 bg-blue-50',
  green: 'border-green-400 focus-visible:ring-green-500 bg-green-50',
  purple: 'border-purple-400 focus-visible:ring-purple-500 bg-purple-50',
  orange: 'border-orange-400 focus-visible:ring-orange-500 bg-orange-50',
  pink: 'border-pink-400 focus-visible:ring-pink-500 bg-pink-50',
};

const valueColorMap = {
  blue: 'text-blue-700',
  green: 'text-green-700',
  purple: 'text-purple-700',
  orange: 'text-orange-700',
  pink: 'text-pink-700',
};

// Convert old separate fields to unified insurances array
function memberToInsurances(member) {
  const list = [];
  if (member?.insurance_provider || member?.insurance_member_id || member?.insurance_group_number) {
    list.push({ type: 'Health', provider: member.insurance_provider || '', member_id: member.insurance_member_id || '', group_number: member.insurance_group_number || '' });
  }
  if (member?.dental_insurance_provider || member?.dental_insurance_member_id || member?.dental_insurance_group_number) {
    list.push({ type: 'Dental', provider: member.dental_insurance_provider || '', member_id: member.dental_insurance_member_id || '', group_number: member.dental_insurance_group_number || '' });
  }
  if (member?.vision_insurance_provider || member?.vision_insurance_member_id || member?.vision_insurance_group_number) {
    list.push({ type: 'Vision', provider: member.vision_insurance_provider || '', member_id: member.vision_insurance_member_id || '', group_number: member.vision_insurance_group_number || '' });
  }
  return list;
}

// Map insurances array back to entity fields based on type
function insurancesToEntityFields(insurances) {
  const fields = {
    insurance_provider: null, insurance_member_id: null, insurance_group_number: null,
    dental_insurance_provider: null, dental_insurance_member_id: null, dental_insurance_group_number: null,
    vision_insurance_provider: null, vision_insurance_member_id: null, vision_insurance_group_number: null,
  };
  for (const ins of insurances) {
    const t = ins.type?.toLowerCase();
    if (t === 'health') {
      fields.insurance_provider = ins.provider || null;
      fields.insurance_member_id = ins.member_id || null;
      fields.insurance_group_number = ins.group_number || null;
    } else if (t === 'dental') {
      fields.dental_insurance_provider = ins.provider || null;
      fields.dental_insurance_member_id = ins.member_id || null;
      fields.dental_insurance_group_number = ins.group_number || null;
    } else if (t === 'vision') {
      fields.vision_insurance_provider = ins.provider || null;
      fields.vision_insurance_member_id = ins.member_id || null;
      fields.vision_insurance_group_number = ins.group_number || null;
    }
    // For custom types, we don't have separate fields — store in health slot if empty, else skip for now
  }
  return fields;
}

export default function HealthMedicalSection({ member, color = 'blue' }) {
  const inputClass = inputColorMap[color] || inputColorMap.blue;
  const valueColor = valueColorMap[color] || valueColorMap.blue;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  // sync: { [insuranceIndex]: memberId[] }
  const [syncByIndex, setSyncByIndex] = useState({});

  const { data: allFamilyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
    enabled: editing,
  });
  const otherMembers = allFamilyMembers.filter(m => m.id !== member?.id);

  const [form, setForm] = useState({
    height_feet: member?.height_feet ?? '',
    height_inches: member?.height_inches ?? '',
    weight_lbs: member?.weight_lbs ?? '',
    blood_type: member?.blood_type ?? '',
    insurances: memberToInsurances(member),
    primary_care_physician: member?.primary_care_physician ?? '',
    pediatrician: member?.pediatrician ?? '',
    dentist: member?.dentist ?? '',
    optometrist: member?.optometrist ?? '',
    specialists: member?.specialists ?? [],
    vaccination_history: member?.vaccination_history ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [revealedKey, setRevealedKey] = useState(null);

  const toggleReveal = (key) => setRevealedKey(prev => prev === key ? null : key);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.FamilyMember.update(member.id, data);
      // Sync each insurance to its selected members
      const allSyncIds = [...new Set(Object.values(syncByIndex).flat())];
      if (allSyncIds.length > 0) {
        await Promise.all(allSyncIds.map(memberId => {
          const patch = {};
          form.insurances.forEach((ins, idx) => {
            if ((syncByIndex[idx] || []).includes(memberId)) {
              const t = ins.type?.toLowerCase();
              if (t === 'health') {
                patch.insurance_provider = ins.provider || null;
                patch.insurance_member_id = ins.member_id || null;
                patch.insurance_group_number = ins.group_number || null;
              } else if (t === 'dental') {
                patch.dental_insurance_provider = ins.provider || null;
                patch.dental_insurance_member_id = ins.member_id || null;
                patch.dental_insurance_group_number = ins.group_number || null;
              } else if (t === 'vision') {
                patch.vision_insurance_provider = ins.provider || null;
                patch.vision_insurance_member_id = ins.member_id || null;
                patch.vision_insurance_group_number = ins.group_number || null;
              }
            }
          });
          return Object.keys(patch).length > 0 ? base44.entities.FamilyMember.update(memberId, patch) : Promise.resolve();
        }));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['familyMember', member?.id]);
      queryClient.invalidateQueries(['familyMember']);
      setSaved(true);
      setEditing(false);
      setSyncByIndex({});
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const insuranceFields = insurancesToEntityFields(form.insurances);
    updateMutation.mutate({
      height_feet: form.height_feet !== '' ? Number(form.height_feet) : null,
      height_inches: form.height_inches !== '' ? Number(form.height_inches) : null,
      weight_lbs: form.weight_lbs !== '' ? Number(form.weight_lbs) : null,
      blood_type: form.blood_type || null,
      ...insuranceFields,
      primary_care_physician: form.primary_care_physician || null,
      pediatrician: form.pediatrician || null,
      dentist: form.dentist || null,
      optometrist: form.optometrist || null,
      specialists: form.specialists.filter(s => s.specialty || s.name),
      vaccination_history: form.vaccination_history || null,
    });
  };

  const handleCopy = (value, key) => {
    navigator.clipboard.writeText(String(value));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const updateInsurance = (idx, field, value) => {
    const updated = [...form.insurances];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, insurances: updated });
  };

  const removeInsurance = (idx) => {
    setForm({ ...form, insurances: form.insurances.filter((_, i) => i !== idx) });
    setSyncByIndex(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const toggleSync = (insIdx, memberId) => {
    setSyncByIndex(prev => {
      const cur = prev[insIdx] || [];
      return { ...prev, [insIdx]: cur.includes(memberId) ? cur.filter(x => x !== memberId) : [...cur, memberId] };
    });
  };

  const ViewRow = ({ label, value, copyKey }) => {
    const key = copyKey || label;
    const isRevealed = revealedKey === key;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0 w-32">{label}</span>
        <button
          onClick={() => toggleReveal(key)}
          className={`text-sm font-medium flex-1 text-left transition-all ${isRevealed ? valueColor : 'text-gray-300 tracking-widest'}`}
        >
          {isRevealed ? value : '••••••••'}
        </button>
        {isRevealed && (
          <button
            onClick={() => handleCopy(value, key)}
            className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            title="Copy"
          >
            {copiedKey === key
              ? <Check className="w-3.5 h-3.5 text-green-500" />
              : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    );
  };

  const isKid = member?.person_type === 'kid';
  const hasHeight = form.height_feet !== '' || form.height_inches !== '';
  const hasWeight = form.weight_lbs !== '';
  const hasBloodType = !!form.blood_type;
  const hasAnyPhysical = hasHeight || hasWeight || hasBloodType;
  const hasAnyInsurance = form.insurances.length > 0;
  const hasPhysician = isKid ? !!form.pediatrician : !!form.primary_care_physician;
  const hasDentist = !!form.dentist;
  const hasOptometrist = !!form.optometrist;
  const hasSpecialists = form.specialists?.some(s => s.specialty || s.name);
  const hasAnyDoctors = hasPhysician || hasDentist || hasOptometrist || hasSpecialists;
  const hasVaccinations = !!form.vaccination_history;
  const hasAnything = hasAnyPhysical || hasAnyInsurance || hasAnyDoctors || hasVaccinations;

  if (!editing) {
    return (
      <div className="space-y-5 relative">
        <button
          onClick={() => setEditing(true)}
          className="absolute top-0 right-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {!hasAnything && (
          <p className="text-sm text-gray-400 italic">No health or medical info added yet. Click the edit icon to add details.</p>
        )}

        {hasAnyPhysical && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Physical</h3>
            <div className="space-y-1.5">
              {hasHeight && (
                <ViewRow label="Height" copyKey="height"
                  value={[form.height_feet !== '' ? `${form.height_feet} ft` : null, form.height_inches !== '' ? `${form.height_inches} in` : null].filter(Boolean).join(' ')}
                />
              )}
              {hasWeight && <ViewRow label="Weight" copyKey="weight" value={`${form.weight_lbs} lbs`} />}
              {hasBloodType && <ViewRow label="Blood Type" copyKey="blood_type" value={form.blood_type} />}
            </div>
          </div>
        )}

        {hasAnyInsurance && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Insurance</h3>
            <div className="space-y-3">
              {form.insurances.map((ins, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">{ins.type || 'Insurance'}</p>
                  <div className="space-y-1.5">
                    {ins.provider && <ViewRow label="Provider" copyKey={`ins_provider_${i}`} value={ins.provider} />}
                    {ins.member_id && <ViewRow label="Member ID" copyKey={`ins_member_${i}`} value={ins.member_id} />}
                    {ins.group_number && <ViewRow label="Group Number" copyKey={`ins_group_${i}`} value={ins.group_number} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasAnyDoctors && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Doctors</h3>
            <div className="space-y-1.5">
              {hasPhysician && <ViewRow label={isKid ? 'Pediatrician' : 'PCP'} copyKey="physician" value={isKid ? form.pediatrician : form.primary_care_physician} />}
              {hasDentist && <ViewRow label="Dentist" copyKey="dentist" value={form.dentist} />}
              {hasOptometrist && <ViewRow label="Optometrist" copyKey="optometrist" value={form.optometrist} />}
              {hasSpecialists && form.specialists.filter(s => s.specialty || s.name).map((s, i) => (
                <ViewRow key={i} label={s.specialty || 'Specialist'} copyKey={`specialist_${i}`} value={s.name} />
              ))}
            </div>
          </div>
        )}

        {hasVaccinations && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Vaccination History</h3>
            <div className="flex items-start gap-2">
              <button
                onClick={() => toggleReveal('vaccinations')}
                className={`text-sm font-medium flex-1 text-left transition-all ${revealedKey === 'vaccinations' ? `${valueColor} whitespace-pre-wrap` : 'text-gray-300 tracking-widest'}`}
              >
                {revealedKey === 'vaccinations' ? form.vaccination_history : '••••••••'}
              </button>
              {revealedKey === 'vaccinations' && (
                <button onClick={() => handleCopy(form.vaccination_history, 'vaccinations')} className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5" title="Copy">
                  {copiedKey === 'vaccinations' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-5 relative">
      <button onClick={() => setEditing(false)} className="absolute top-0 right-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Done editing">
        <Check className="w-4 h-4" />
      </button>

      {/* Physical */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Physical</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Height</Label>
            <div className="flex gap-2 items-center">
              <Input type="number" placeholder="ft" min={0} max={8} value={form.height_feet} onChange={(e) => setForm({ ...form, height_feet: e.target.value })} className={`w-16 text-center ${inputClass}`} />
              <span className="text-sm text-gray-500">ft</span>
              <Input type="number" placeholder="in" min={0} max={11} value={form.height_inches} onChange={(e) => setForm({ ...form, height_inches: e.target.value })} className={`w-16 text-center ${inputClass}`} />
              <span className="text-sm text-gray-500">in</span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Weight</Label>
            <div className="flex gap-2 items-center">
              <Input type="number" placeholder="lbs" min={0} value={form.weight_lbs} onChange={(e) => setForm({ ...form, weight_lbs: e.target.value })} className={`w-24 text-center ${inputClass}`} />
              <span className="text-sm text-gray-500">lbs</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-xs text-gray-600 mb-1 block">Blood Type</Label>
          <Select value={form.blood_type} onValueChange={(val) => setForm({ ...form, blood_type: val })}>
            <SelectTrigger className={`w-36 ${inputClass}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Insurance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Insurance</h3>
          <button
            type="button"
            onClick={() => setForm({ ...form, insurances: [...form.insurances, { type: '', provider: '', member_id: '', group_number: '' }] })}
            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-4">
          {form.insurances.map((ins, idx) => (
            <div key={idx} className={`rounded-lg border p-3 space-y-3 ${idx > 0 ? 'border-gray-200' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <Input
                  placeholder="Type (e.g., Health, Dental, Vision)"
                  value={ins.type}
                  onChange={(e) => updateInsurance(idx, 'type', e.target.value)}
                  className={`font-semibold text-xs ${inputClass}`}
                />
                <button type="button" onClick={() => removeInsurance(idx)} className="ml-2 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Provider</Label>
                <Input placeholder="e.g., Blue Cross Blue Shield" value={ins.provider} onChange={(e) => updateInsurance(idx, 'provider', e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Member ID</Label>
                  <Input placeholder="Member ID" value={ins.member_id} onChange={(e) => updateInsurance(idx, 'member_id', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Group Number</Label>
                  <Input placeholder="Group #" value={ins.group_number} onChange={(e) => updateInsurance(idx, 'group_number', e.target.value)} className={inputClass} />
                </div>
              </div>
              {otherMembers.length > 0 && (
                <div className="pt-2 border-t">
                  <Label className="text-xs text-gray-600 mb-2 block">Sync to:</Label>
                  <div className="flex flex-wrap gap-3">
                    {otherMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-1.5 cursor-pointer" onClick={() => toggleSync(idx, m.id)}>
                        <Checkbox checked={(syncByIndex[idx] || []).includes(m.id)} onCheckedChange={() => toggleSync(idx, m.id)} onClick={e => e.stopPropagation()} />
                        <span className="text-sm text-gray-700">{m.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {form.insurances.length === 0 && (
            <p className="text-xs text-gray-400 italic">No insurance added. Tap Add to add one.</p>
          )}
        </div>
      </div>

      {/* Doctors */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Doctors</h3>
        <div className="space-y-3">
          {isKid ? (
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Pediatrician</Label>
              <Input placeholder="Pediatrician name" value={form.pediatrician} onChange={(e) => setForm({ ...form, pediatrician: e.target.value })} className={inputClass} />
            </div>
          ) : (
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Primary Care Physician</Label>
              <Input placeholder="PCP name" value={form.primary_care_physician} onChange={(e) => setForm({ ...form, primary_care_physician: e.target.value })} className={inputClass} />
            </div>
          )}
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Dentist</Label>
            <Input placeholder="Dentist name" value={form.dentist} onChange={(e) => setForm({ ...form, dentist: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Optometrist</Label>
            <Input placeholder="Optometrist name" value={form.optometrist} onChange={(e) => setForm({ ...form, optometrist: e.target.value })} className={inputClass} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-gray-600">Specialists</Label>
              <button
                type="button"
                onClick={() => setForm({ ...form, specialists: [...(form.specialists || []), { specialty: '', name: '' }] })}
                className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {(form.specialists || []).map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Specialty (e.g., Cardiologist)"
                    value={s.specialty}
                    onChange={(e) => {
                      const updated = [...form.specialists];
                      updated[i] = { ...updated[i], specialty: e.target.value };
                      setForm({ ...form, specialists: updated });
                    }}
                    className={`${inputClass} flex-1`}
                  />
                  <Input
                    placeholder="Doctor name"
                    value={s.name}
                    onChange={(e) => {
                      const updated = [...form.specialists];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setForm({ ...form, specialists: updated });
                    }}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, specialists: form.specialists.filter((_, idx) => idx !== i) })}
                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vaccinations */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Vaccination History</h3>
        <Textarea
          placeholder="e.g., MMR (2020), Flu (2024), COVID booster (2023)..."
          value={form.vaccination_history}
          onChange={(e) => setForm({ ...form, vaccination_history: e.target.value })}
          rows={4}
          className={inputClass}
        />
      </div>

      <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
        {updateMutation.isPending ? 'Saving...' : saved ? '✓ Saved!' : 'Save'}
      </Button>
    </div>
  );
}