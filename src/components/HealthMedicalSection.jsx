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
  const [syncMemberIds, setSyncMemberIds] = useState([]);

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
    primary_care_physician: member?.primary_care_physician ?? '',
    pediatrician: member?.pediatrician ?? '',
    dentist: member?.dentist ?? '',
    specialists: member?.specialists ?? [],
    vaccination_history: member?.vaccination_history ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.FamilyMember.update(member.id, data);
      // Sync insurance to selected other members
      if (syncMemberIds.length > 0) {
        const insuranceData = {
          insurance_provider: data.insurance_provider,
          insurance_member_id: data.insurance_member_id,
          insurance_group_number: data.insurance_group_number,
        };
        await Promise.all(syncMemberIds.map(id => base44.entities.FamilyMember.update(id, insuranceData)));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['familyMember', member?.id]);
      if (syncMemberIds.length > 0) queryClient.invalidateQueries(['familyMember']);
      setSaved(true);
      setEditing(false);
      setSyncMemberIds([]);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      height_feet: form.height_feet !== '' ? Number(form.height_feet) : null,
      height_inches: form.height_inches !== '' ? Number(form.height_inches) : null,
      weight_lbs: form.weight_lbs !== '' ? Number(form.weight_lbs) : null,
      blood_type: form.blood_type || null,
      insurance_provider: form.insurance_provider || null,
      insurance_member_id: form.insurance_member_id || null,
      insurance_group_number: form.insurance_group_number || null,
      primary_care_physician: form.primary_care_physician || null,
      pediatrician: form.pediatrician || null,
      dentist: form.dentist || null,
      specialists: form.specialists.filter(s => s.specialty || s.name),
      vaccination_history: form.vaccination_history || null,
    });
  };

  const toggleSyncMember = (id) => {
    setSyncMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
  const hasPhysician = isKid ? !!form.pediatrician : !!form.primary_care_physician;
  const hasDentist = !!form.dentist;
  const hasSpecialists = form.specialists?.some(s => s.specialty || s.name);
  const hasVaccinations = !!form.vaccination_history;

  const hasAnyPhysical = hasHeight || hasWeight || hasBloodType;
  const hasAnyInsurance = hasInsuranceProvider || hasInsuranceMemberId || hasInsuranceGroup;
  const hasAnyDoctors = hasPhysician || hasDentist;
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
            <div className="space-y-1.5">
              {hasInsuranceProvider && <ViewRow label="Provider" copyKey="ins_provider" value={form.insurance_provider} />}
              {hasInsuranceMemberId && <ViewRow label="Member ID" copyKey="ins_member" value={form.insurance_member_id} />}
              {hasInsuranceGroup && <ViewRow label="Group Number" copyKey="ins_group" value={form.insurance_group_number} />}
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
          {otherMembers.length > 0 && (
            <div className="pt-1">
              <Label className="text-xs text-gray-600 mb-2 block">Also sync insurance to:</Label>
              <div className="flex flex-wrap gap-3">
                {otherMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-1.5 cursor-pointer" onClick={() => toggleSyncMember(m.id)}>
                    <Checkbox checked={syncMemberIds.includes(m.id)} onCheckedChange={() => toggleSyncMember(m.id)} onClick={e => e.stopPropagation()} />
                    <span className="text-sm text-gray-700">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
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