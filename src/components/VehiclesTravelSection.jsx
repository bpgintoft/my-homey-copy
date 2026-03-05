import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from 'lucide-react';

const inputColorMap = {
  blue: 'border-blue-400 focus-visible:ring-blue-500 bg-blue-50',
  green: 'border-green-400 focus-visible:ring-green-500 bg-green-50',
  purple: 'border-purple-400 focus-visible:ring-purple-500 bg-purple-50',
  orange: 'border-orange-400 focus-visible:ring-orange-500 bg-orange-50',
  pink: 'border-pink-400 focus-visible:ring-pink-500 bg-pink-50',
};

export default function VehiclesTravelSection({ member, color = 'blue' }) {
  const inputClass = inputColorMap[color] || inputColorMap.blue;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    vehicle_make: member?.vehicle_make ?? '',
    vehicle_model: member?.vehicle_model ?? '',
    vehicle_year: member?.vehicle_year ?? '',
    vehicle_vin: member?.vehicle_vin ?? '',
    vehicle_insurance_provider: member?.vehicle_insurance_provider ?? '',
    vehicle_insurance_policy_number: member?.vehicle_insurance_policy_number ?? '',
    vehicle_registration_expiration: member?.vehicle_registration_expiration ?? '',
    roadside_assistance_provider: member?.roadside_assistance_provider ?? '',
    roadside_assistance_member_number: member?.roadside_assistance_member_number ?? '',
    license_number: member?.license_number ?? '',
    license_issue_date: member?.license_issue_date ?? '',
    frequent_flyer_programs: member?.frequent_flyer_programs ?? [],
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
    updateMutation.mutate({
      vehicle_make: form.vehicle_make || null,
      vehicle_model: form.vehicle_model || null,
      vehicle_year: form.vehicle_year !== '' ? Number(form.vehicle_year) : null,
      vehicle_vin: form.vehicle_vin || null,
      vehicle_insurance_provider: form.vehicle_insurance_provider || null,
      vehicle_insurance_policy_number: form.vehicle_insurance_policy_number || null,
      vehicle_registration_expiration: form.vehicle_registration_expiration || null,
      roadside_assistance_provider: form.roadside_assistance_provider || null,
      roadside_assistance_member_number: form.roadside_assistance_member_number || null,
      license_number: form.license_number || null,
      license_issue_date: form.license_issue_date || null,
      frequent_flyer_programs: form.frequent_flyer_programs.filter(p => p.airline || p.number),
    });
  };

  const addFrequentFlyer = () => {
    setForm({ ...form, frequent_flyer_programs: [...form.frequent_flyer_programs, { airline: '', number: '' }] });
  };

  const updateFrequentFlyer = (index, field, value) => {
    const updated = form.frequent_flyer_programs.map((p, i) => i === index ? { ...p, [field]: value } : p);
    setForm({ ...form, frequent_flyer_programs: updated });
  };

  const removeFrequentFlyer = (index) => {
    setForm({ ...form, frequent_flyer_programs: form.frequent_flyer_programs.filter((_, i) => i !== index) });
  };

  const isAdult = member?.person_type !== 'kid';

  return (
    <div className="space-y-5">

      {/* Vehicle */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Vehicle</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Year</Label>
              <Input type="number" placeholder="2022" value={form.vehicle_year} onChange={(e) => setForm({ ...form, vehicle_year: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Make</Label>
              <Input placeholder="Toyota" value={form.vehicle_make} onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Model</Label>
              <Input placeholder="Camry" value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">VIN</Label>
            <Input placeholder="Vehicle Identification Number" value={form.vehicle_vin} onChange={(e) => setForm({ ...form, vehicle_vin: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Registration Expiration</Label>
            <Input type="date" value={form.vehicle_registration_expiration} onChange={(e) => setForm({ ...form, vehicle_registration_expiration: e.target.value })} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Vehicle Insurance */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Vehicle Insurance</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Provider</Label>
            <Input placeholder="e.g., State Farm" value={form.vehicle_insurance_provider} onChange={(e) => setForm({ ...form, vehicle_insurance_provider: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Policy Number</Label>
            <Input placeholder="Policy #" value={form.vehicle_insurance_policy_number} onChange={(e) => setForm({ ...form, vehicle_insurance_policy_number: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Roadside Assistance */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Roadside Assistance</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Provider</Label>
            <Input placeholder="e.g., AAA" value={form.roadside_assistance_provider} onChange={(e) => setForm({ ...form, roadside_assistance_provider: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Member Number</Label>
            <Input placeholder="Membership #" value={form.roadside_assistance_member_number} onChange={(e) => setForm({ ...form, roadside_assistance_member_number: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Driver's License (adults only) */}
      {isAdult && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Driver's License</h3>
          <div className="flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-gray-600 mb-1 block">License Number</Label>
              <Input placeholder="License #" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className="h-9 text-sm font-normal" />
            </div>
            <div className="w-28 flex-shrink-0">
              <Label className="text-xs text-gray-600 mb-1 block">Issue Date</Label>
              <Input type="date" value={form.license_issue_date} onChange={(e) => setForm({ ...form, license_issue_date: e.target.value })} className="text-sm px-2 h-9" />
            </div>
          </div>
        </div>
      )}

      {/* Frequent Flyer */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Frequent Flyer Programs</h3>
          <Button variant="ghost" size="sm" onClick={addFrequentFlyer} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        {form.frequent_flyer_programs.length === 0 ? (
          <p className="text-sm text-gray-400">No programs added yet.</p>
        ) : (
          <div className="space-y-2">
            {form.frequent_flyer_programs.map((program, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="Airline"
                  value={program.airline}
                  onChange={(e) => updateFrequentFlyer(index, 'airline', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Member #"
                  value={program.number}
                  onChange={(e) => updateFrequentFlyer(index, 'number', e.target.value)}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeFrequentFlyer(index)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
        {updateMutation.isPending ? 'Saving...' : saved ? '✓ Saved!' : 'Save'}
      </Button>
    </div>
  );
}