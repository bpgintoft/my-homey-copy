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

export default function HealthMedicalSection({ member, color = 'blue' }) {
  const inputClass = inputColorMap[color] || inputColorMap.blue;
  const valueColor = valueColorMap[color] || valueColorMap.blue;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [syncHealthIds, setSyncHealthIds] = useState([]);
  const [syncDentalIds, setSyncDentalIds] = useState([]);
  const [syncVisionIds, setSyncVisionIds] = useState([]);

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
    insurance_provider: member?.insurance_provider ?? '',
    insurance_member_id: member?.insurance_member_id ?? '',
    insurance_group_number: member?.insurance_group_number ?? '',
    dental_insurance_provider: member?.dental_insurance_provider ?? '',
    dental_insurance_member_id: member?.dental_insurance_member_id ?? '',
    dental_insurance_group_number: member?.dental_insurance_group_number ?? '',
    vision_insurance_provider: member?.vision_insurance_provider ?? '',
    vision_insurance_member_id: member?.vision_insurance_member_id ?? '',
    vision_insurance_group_number: member?.vision_insurance_group_number ?? '',
    primary_care_physician: member?.primary_care_physician ?? '',
    pediatrician: member?.pediatrician ?? '',
    dentist: member?.dentist ?? '',
    optometrist: member?.optometrist ?? '',
    specialists: member?.specialists ?? [],
    vaccination_history: member?.vaccination_history ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.FamilyMember.update(member.id, data);
      const allIds = [...new Set([...syncHealthIds, ...syncDentalIds, ...syncVisionIds])];
      if (allIds.length > 0) {
        await Promise.all(allIds.map(id => {
          const patch = {};
          if (syncHealthIds.includes(id)) {
            patch.insurance_provider = data.insurance_provider;
            patch.insurance_member_id = data.insurance_member_id;
            patch.insurance_group_number = data.insurance_group_number;
          }
          if (syncDentalIds.includes(id)) {
            patch.dental_insurance_provider = data.dental_insurance_provider;
            patch.dental_insurance_member_id = data.dental_insurance_member_id;
            patch.dental_insurance_group_number = data.dental_insurance_group_number;
          }
          if (syncVisionIds.includes(id)) {
            patch.vision_insurance_provider = data.vision_insurance_provider;
            patch.vision_insurance_member_id = data.vision_insurance_member_id;
            patch.vision_insurance_group_number = data.vision_insurance_group_number;
          }
          return base44.entities.FamilyMember.update(id, patch);
        }));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['familyMember', member?.id]);
      queryClient.invalidateQueries(['familyMember']);
      setSaved(true);
      setEditing(false);
      setSyncHealthIds([]);
      setSyncDentalIds([]);
      setSyncVisionIds([]);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const SyncCheckboxes = ({ ids, setIds }) => (
    otherMembers.length > 0 && (
      <div className="pt-2 border-t">
        <Label className="text-xs text-gray-600 mb-2 block">Sync to:</Label>
        <div className="flex flex-wrap gap-3">
          {otherMembers.map(m => (
            <div key={m.id} className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIds(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}>
              <Checkbox checked={ids.includes(m.id)} onCheckedChange={() => setIds(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])} onClick={e => e.stopPropagation()} />
              <span className="text-sm text-gray-700">{m.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  );

  const handleSave = () => {
    updateMutation.mutate({
      height_feet: form.height_feet !== '' ? Number(form.height_feet) : null,
      height_inches: form.height_inches !== '' ? Number(form.height_inches) : null,
      weight_lbs: form.weight_lbs !== '' ? Number(form.weight_lbs) : null,
      blood_type: form.blood_type || null,
      insurance_provider: form.insurance_provider || null,
      insurance_member_id: form.insurance_member_id || null,
      insurance_group_number: form.insurance_group_number || null,
      dental_insurance_provider: form.dental_insurance_provider || null,
      dental_insurance_member_id: form.dental_insurance_member_id || null,
      dental_insurance_group_number: form.dental_insurance_group_number || null,
      vision_insurance_provider: form.vision_insurance_provider || null,
      vision_insurance_member_id: form.vision_insurance_member_id || null,
      vision_insurance_group_number: form.vision_insurance_group_number || null,
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

  const ViewRow = ({ label, value, copyKey }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 shrink-0 w-32">{label}</span>
      <span className={`text-sm font-medium flex-1 ${valueColor}`}>{value}</span>
      <button
        onClick={() => handleCopy(value, copyKey || label)}
        className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        title="Copy"
      >
        {copiedKey === (copyKey || label)
          ? <Check className="w-3.5 h-3.5 text-green-500" />
          : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  const isKid = member?.person_type === 'kid';

  const hasHeight = form.height_feet !== '' || form.height_inches !== '';
  const hasWeight = form.weight_lbs !== '';
  const hasBloodType = !!form.blood_type;
  const hasInsuranceProvider = !!form.insurance_provider;
  const hasInsuranceMemberId = !!form.insurance_member_id;
  const hasInsuranceGroup = !!form.insurance_group_number;
  const hasDentalInsuranceProvider = !!form.dental_insurance_provider;
  const hasDentalInsuranceMemberId = !!form.dental_insurance_member_id;
  const hasDentalInsuranceGroup = !!form.dental_insurance_group_number;
  const hasVisionInsuranceProvider = !!form.vision_insurance_provider;
  const hasVisionInsuranceMemberId = !!form.vision_insurance_member_id;
  const hasVisionInsuranceGroup = !!form.vision_insurance_group_number;
  const hasPhysician = isKid ? !!form.pediatrician : !!form.primary_care_physician;
  const hasDentist = !!form.dentist;
  const hasOptometrist = !!form.optometrist;
  const hasSpecialists = form.specialists?.some(s => s.specialty || s.name);
  const hasVaccinations = !!form.vaccination_history;

  const hasAnyPhysical = hasHeight || hasWeight || hasBloodType;
  const hasAnyHealthInsurance = hasInsuranceProvider || hasInsuranceMemberId || hasInsuranceGroup;
  const hasAnyDentalInsurance = hasDentalInsuranceProvider || hasDentalInsuranceMemberId || hasDentalInsuranceGroup;
  const hasAnyVisionInsurance = hasVisionInsuranceProvider || hasVisionInsuranceMemberId || hasVisionInsuranceGroup;
  const hasAnyInsurance = hasAnyHealthInsurance || hasAnyDentalInsurance || hasAnyVisionInsurance;
  const hasAnyDoctors = hasPhysician || hasDentist || hasOptometrist || hasSpecialists;
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

        {/* Physical */}
        {hasAnyPhysical && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Physical</h3>
            <div className="space-y-1.5">
              {hasHeight && (
                <ViewRow
                  label="Height"
                  copyKey="height"
                  value={[form.height_feet !== '' ? `${form.height_feet} ft` : null, form.height_inches !== '' ? `${form.height_inches} in` : null].filter(Boolean).join(' ')}
                />
              )}
              {hasWeight && <ViewRow label="Weight" copyKey="weight" value={`${form.weight_lbs} lbs`} />}
              {hasBloodType && <ViewRow label="Blood Type" copyKey="blood_type" value={form.blood_type} />}
            </div>
          </div>
        )}

        {/* Insurance */}
        {hasAnyInsurance && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Insurance</h3>
            <div className="space-y-3">
              {hasAnyHealthInsurance && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">Health Insurance</p>
                  <div className="space-y-1.5">
                    {hasInsuranceProvider && <ViewRow label="Provider" copyKey="ins_provider" value={form.insurance_provider} />}
                    {hasInsuranceMemberId && <ViewRow label="Member ID" copyKey="ins_member" value={form.insurance_member_id} />}
                    {hasInsuranceGroup && <ViewRow label="Group Number" copyKey="ins_group" value={form.insurance_group_number} />}
                  </div>
                </div>
              )}
              {hasAnyDentalInsurance && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">Dental Insurance</p>
                  <div className="space-y-1.5">
                    {hasDentalInsuranceProvider && <ViewRow label="Provider" copyKey="dental_ins_provider" value={form.dental_insurance_provider} />}
                    {hasDentalInsuranceMemberId && <ViewRow label="Member ID" copyKey="dental_ins_member" value={form.dental_insurance_member_id} />}
                    {hasDentalInsuranceGroup && <ViewRow label="Group Number" copyKey="dental_ins_group" value={form.dental_insurance_group_number} />}
                  </div>
                </div>
              )}
              {hasAnyVisionInsurance && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">Vision Insurance</p>
                  <div className="space-y-1.5">
                    {hasVisionInsuranceProvider && <ViewRow label="Provider" copyKey="vision_ins_provider" value={form.vision_insurance_provider} />}
                    {hasVisionInsuranceMemberId && <ViewRow label="Member ID" copyKey="vision_ins_member" value={form.vision_insurance_member_id} />}
                    {hasVisionInsuranceGroup && <ViewRow label="Group Number" copyKey="vision_ins_group" value={form.vision_insurance_group_number} />}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Doctors */}
        {hasAnyDoctors && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Doctors</h3>
            <div className="space-y-1.5">
              {hasPhysician && (
                <ViewRow
                  label={isKid ? 'Pediatrician' : 'PCP'}
                  copyKey="physician"
                  value={isKid ? form.pediatrician : form.primary_care_physician}
                />
              )}
              {hasDentist && <ViewRow label="Dentist" copyKey="dentist" value={form.dentist} />}
              {hasOptometrist && <ViewRow label="Optometrist" copyKey="optometrist" value={form.optometrist} />}
              {hasSpecialists && form.specialists.filter(s => s.specialty || s.name).map((s, i) => (
                <ViewRow key={i} label={s.specialty || 'Specialist'} copyKey={`specialist_${i}`} value={s.name} />
              ))}
            </div>
          </div>
        )}

        {/* Vaccinations */}
        {hasVaccinations && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Vaccination History</h3>
            <div className="flex items-start gap-2">
              <span className={`text-sm font-medium flex-1 ${valueColor} whitespace-pre-wrap`}>{form.vaccination_history}</span>
              <button
                onClick={() => handleCopy(form.vaccination_history, 'vaccinations')}
                className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
                title="Copy"
              >
                {copiedKey === 'vaccinations'
                  ? <Check className="w-3.5 h-3.5 text-green-500" />
                  : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-5 relative">
      <button
        onClick={() => setEditing(false)}
        className="absolute top-0 right-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Done editing"
      >
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
              {BLOOD_TYPES.map(bt => (
                <SelectItem key={bt} value={bt}>{bt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Insurance */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Insurance</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-2 block">Health Insurance</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Provider</Label>
                <Input placeholder="e.g., Blue Cross Blue Shield" value={form.insurance_provider} onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Member ID</Label>
                  <Input placeholder="Member ID" value={form.insurance_member_id} onChange={(e) => setForm({ ...form, insurance_member_id: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Group Number</Label>
                  <Input placeholder="Group #" value={form.insurance_group_number} onChange={(e) => setForm({ ...form, insurance_group_number: e.target.value })} className={inputClass} />
                </div>
              </div>
              <SyncCheckboxes ids={syncHealthIds} setIds={setSyncHealthIds} />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2 block">Dental Insurance</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Provider</Label>
                <Input placeholder="e.g., Dental Care Plus" value={form.dental_insurance_provider} onChange={(e) => setForm({ ...form, dental_insurance_provider: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Member ID</Label>
                  <Input placeholder="Member ID" value={form.dental_insurance_member_id} onChange={(e) => setForm({ ...form, dental_insurance_member_id: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Group Number</Label>
                  <Input placeholder="Group #" value={form.dental_insurance_group_number} onChange={(e) => setForm({ ...form, dental_insurance_group_number: e.target.value })} className={inputClass} />
                </div>
              </div>
              <SyncCheckboxes ids={syncDentalIds} setIds={setSyncDentalIds} />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2 block">Vision Insurance</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Provider</Label>
                <Input placeholder="e.g., VSP Vision" value={form.vision_insurance_provider} onChange={(e) => setForm({ ...form, vision_insurance_provider: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Member ID</Label>
                  <Input placeholder="Member ID" value={form.vision_insurance_member_id} onChange={(e) => setForm({ ...form, vision_insurance_member_id: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Group Number</Label>
                  <Input placeholder="Group #" value={form.vision_insurance_group_number} onChange={(e) => setForm({ ...form, vision_insurance_group_number: e.target.value })} className={inputClass} />
                </div>
              </div>
              <SyncCheckboxes ids={syncVisionIds} setIds={setSyncVisionIds} />
            </div>
          </div>
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
          {/* Specialists */}
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