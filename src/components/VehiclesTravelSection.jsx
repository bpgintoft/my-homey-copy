import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Check, Copy } from 'lucide-react';

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

export default function VehiclesTravelSection({ member, color = 'blue' }) {
  const inputClass = inputColorMap[color] || inputColorMap.blue;
  const valueColor = valueColorMap[color] || valueColorMap.blue;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    vehicle_make: member?.vehicle_make ?? '',
    vehicle_model: member?.vehicle_model ?? '',
    vehicle_year: member?.vehicle_year ?? '',
    license_plate_number: member?.license_plate_number ?? '',
    vehicle_vin: member?.vehicle_vin ?? '',
    vehicle_insurance_provider: member?.vehicle_insurance_provider ?? '',
    vehicle_insurance_policy_number: member?.vehicle_insurance_policy_number ?? '',
    vehicle_registration_expiration: member?.vehicle_registration_expiration ?? '',
    roadside_assistance_provider: member?.roadside_assistance_provider ?? '',
    roadside_assistance_member_number: member?.roadside_assistance_member_number ?? '',
    license_number: member?.license_number ?? '',
    license_issue_date: member?.license_issue_date ?? '',
    passport_expiration_date: member?.passport_expiration_date ?? '',
    frequent_flyer_programs: member?.frequent_flyer_programs ?? [],
  });
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.FamilyMember.update(member.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyMember', member?.id]);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      vehicle_make: form.vehicle_make || null,
      vehicle_model: form.vehicle_model || null,
      vehicle_year: form.vehicle_year !== '' ? Number(form.vehicle_year) : null,
      license_plate_number: form.license_plate_number || null,
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

  // Check which fields have values
  const hasVehicle = form.vehicle_year || form.vehicle_make || form.vehicle_model;
  const hasLicensePlate = !!form.license_plate_number;
  const hasVin = !!form.vehicle_vin;
  const hasRegExpiry = !!form.vehicle_registration_expiration;
  const hasInsuranceProvider = !!form.vehicle_insurance_provider;
  const hasInsurancePolicyNum = !!form.vehicle_insurance_policy_number;
  const hasRoadsideProvider = !!form.roadside_assistance_provider;
  const hasRoadsideMemberNum = !!form.roadside_assistance_member_number;
  const hasLicenseNumber = !!form.license_number;
  const hasLicenseIssueDate = !!form.license_issue_date;
  const hasFrequentFlyer = form.frequent_flyer_programs.filter(p => p.airline || p.number).length > 0;

  const hasAnyVehicleInsurance = hasInsuranceProvider || hasInsurancePolicyNum;

  const hasAnyRoadside = hasRoadsideProvider || hasRoadsideMemberNum;
  const hasAnyLicense = isAdult && (hasLicenseNumber || hasLicenseIssueDate);

  const hasAnything = hasVehicle || hasLicensePlate || hasVin || hasRegExpiry || hasAnyVehicleInsurance || hasAnyRoadside || hasAnyLicense || hasFrequentFlyer;

  const [copiedKey, setCopiedKey] = useState(null);
  const handleCopy = (value, key) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // In view mode, show a read-only field row
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
          <p className="text-sm text-gray-400 italic">No vehicle or travel info added yet. Click the edit icon to add details.</p>
        )}

        {/* Vehicle */}
        {(hasVehicle || hasLicensePlate || hasVin || hasRegExpiry) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Vehicle</h3>
            <div className="space-y-1.5">
              {hasVehicle && (
                <ViewRow
                  label="Vehicle"
                  copyKey="vehicle"
                  value={[form.vehicle_year, form.vehicle_make, form.vehicle_model].filter(Boolean).join(' ')}
                />
              )}
              {hasLicensePlate && <ViewRow label="License Plate" copyKey="plate" value={form.license_plate_number} />}
              {hasVin && <ViewRow label="VIN" copyKey="vin" value={form.vehicle_vin} />}
              {hasRegExpiry && <ViewRow label="Reg. Expiration" copyKey="reg_expiry" value={form.vehicle_registration_expiration} />}
            </div>
          </div>
        )}

        {/* Vehicle Insurance */}
        {hasAnyVehicleInsurance && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Vehicle Insurance</h3>
            <div className="space-y-1.5">
              {hasInsuranceProvider && <ViewRow label="Provider" copyKey="ins_provider" value={form.vehicle_insurance_provider} />}
              {hasInsurancePolicyNum && <ViewRow label="Policy Number" copyKey="ins_policy" value={form.vehicle_insurance_policy_number} />}
            </div>
          </div>
        )}

        {/* Roadside Assistance */}
        {hasAnyRoadside && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Roadside Assistance</h3>
            <div className="space-y-1.5">
              {hasRoadsideProvider && <ViewRow label="Provider" copyKey="road_provider" value={form.roadside_assistance_provider} />}
              {hasRoadsideMemberNum && <ViewRow label="Member Number" copyKey="road_member" value={form.roadside_assistance_member_number} />}
            </div>
          </div>
        )}

        {/* Driver's License */}
        {hasAnyLicense && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Driver's License</h3>
            <div className="space-y-1.5">
              {hasLicenseNumber && <ViewRow label="License Number" copyKey="lic_number" value={form.license_number} />}
              {hasLicenseIssueDate && <ViewRow label="Issue Date" copyKey="lic_issue" value={form.license_issue_date} />}
            </div>
          </div>
        )}

        {/* Frequent Flyer */}
        {hasFrequentFlyer && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Frequent Flyer Programs</h3>
            <div className="space-y-1.5">
              {form.frequent_flyer_programs.filter(p => p.airline || p.number).map((program, i) => (
                <ViewRow key={i} label={program.airline || '—'} copyKey={`ff_${i}`} value={program.number || '—'} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Edit mode — show all fields
  return (
    <div className="space-y-5 relative">
      <button
        onClick={() => setEditing(false)}
        className="absolute top-0 right-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Done editing"
      >
        <Check className="w-4 h-4" />
      </button>

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
            <Label className="text-xs text-gray-600 mb-1 block">License Plate</Label>
            <Input placeholder="e.g., ABC 1234" value={form.license_plate_number} onChange={(e) => setForm({ ...form, license_plate_number: e.target.value })} className={inputClass} />
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
            <Input placeholder="Policy #" value={form.vehicle_insurance_policy_number} onChange={(e) => setForm({ ...form, vehicle_insurance_policy_number: e.target.value })} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Roadside Assistance */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Roadside Assistance</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Provider</Label>
            <Input placeholder="e.g., AAA" value={form.roadside_assistance_provider} onChange={(e) => setForm({ ...form, roadside_assistance_provider: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Member Number</Label>
            <Input placeholder="Membership #" value={form.roadside_assistance_member_number} onChange={(e) => setForm({ ...form, roadside_assistance_member_number: e.target.value })} className={inputClass} />
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
              <Input placeholder="License #" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className={`h-9 text-sm font-normal ${inputClass}`} />
            </div>
            <div className="w-28 flex-shrink-0">
              <Label className="text-xs text-gray-600 mb-1 block">Issue Date</Label>
              <Input type="date" value={form.license_issue_date} onChange={(e) => setForm({ ...form, license_issue_date: e.target.value })} className={`text-sm px-2 h-9 ${inputClass}`} />
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
                  className={`flex-1 ${inputClass}`}
                />
                <Input
                  placeholder="Member #"
                  value={program.number}
                  onChange={(e) => updateFrequentFlyer(index, 'number', e.target.value)}
                  className={`flex-1 ${inputClass}`}
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