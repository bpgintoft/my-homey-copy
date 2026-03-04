import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

export default function HealthMedicalSection({ member }) {
  const queryClient = useQueryClient();
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
    vaccination_history: member?.vaccination_history ?? '',
  });
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.FamilyMember.update(member.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyMember', member?.id]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const data = {
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
      vaccination_history: form.vaccination_history || null,
    };
    updateMutation.mutate(data);
  };

  const isKid = member?.person_type === 'kid';

  return (
    <div className="space-y-5">
      {/* Physical */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Physical</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Height</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="ft"
                min={0}
                max={8}
                value={form.height_feet}
                onChange={(e) => setForm({ ...form, height_feet: e.target.value })}
                className="w-16 text-center"
              />
              <span className="text-sm text-gray-500">ft</span>
              <Input
                type="number"
                placeholder="in"
                min={0}
                max={11}
                value={form.height_inches}
                onChange={(e) => setForm({ ...form, height_inches: e.target.value })}
                className="w-16 text-center"
              />
              <span className="text-sm text-gray-500">in</span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Weight</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="lbs"
                min={0}
                value={form.weight_lbs}
                onChange={(e) => setForm({ ...form, weight_lbs: e.target.value })}
                className="w-24 text-center"
              />
              <span className="text-sm text-gray-500">lbs</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-xs text-gray-600 mb-1 block">Blood Type</Label>
          <Select value={form.blood_type} onValueChange={(val) => setForm({ ...form, blood_type: val })}>
            <SelectTrigger className="w-36">
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
            <Input placeholder="e.g., Blue Cross Blue Shield" value={form.insurance_provider} onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Member ID</Label>
              <Input placeholder="Member ID" value={form.insurance_member_id} onChange={(e) => setForm({ ...form, insurance_member_id: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Group Number</Label>
              <Input placeholder="Group #" value={form.insurance_group_number} onChange={(e) => setForm({ ...form, insurance_group_number: e.target.value })} />
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
              <Input placeholder="Pediatrician name" value={form.pediatrician} onChange={(e) => setForm({ ...form, pediatrician: e.target.value })} />
            </div>
          ) : (
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Primary Care Physician</Label>
              <Input placeholder="PCP name" value={form.primary_care_physician} onChange={(e) => setForm({ ...form, primary_care_physician: e.target.value })} />
            </div>
          )}
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Dentist</Label>
            <Input placeholder="Dentist name" value={form.dentist} onChange={(e) => setForm({ ...form, dentist: e.target.value })} />
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
        />
      </div>

      <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
        {updateMutation.isPending ? 'Saving...' : saved ? '✓ Saved!' : 'Save'}
      </Button>
    </div>
  );
}