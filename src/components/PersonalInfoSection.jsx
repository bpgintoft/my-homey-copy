import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Copy, Plus, Trash2 } from 'lucide-react';

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

export default function PersonalInfoSection({ member, color = 'blue' }) {
  const inputClass = inputColorMap[color] || inputColorMap.blue;
  const valueColor = valueColorMap[color] || valueColorMap.blue;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [newGiftIdea, setNewGiftIdea] = useState('');
  const [giftIdeas, setGiftIdeas] = useState(member?.gift_ideas || []);

  React.useEffect(() => {
    setGiftIdeas(member?.gift_ideas || []);
  }, [member?.gift_ideas]);

  const saveGiftIdeas = (ideas) => {
    updateMutation.mutate({ gift_ideas: ideas });
  };

  const addGiftIdea = () => {
    if (!newGiftIdea.trim()) return;
    const updated = [...giftIdeas, newGiftIdea.trim()];
    setGiftIdeas(updated);
    setNewGiftIdea('');
    saveGiftIdeas(updated);
  };

  const removeGiftIdea = (index) => {
    const updated = giftIdeas.filter((_, i) => i !== index);
    setGiftIdeas(updated);
    saveGiftIdeas(updated);
  };

  const [form, setForm] = useState({
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    role: member?.role ?? '',
    passport_expiration_date: member?.passport_expiration_date ?? '',
    student_number: member?.student_number ?? '',
    license_number: member?.license_number ?? '',
    license_issue_date: member?.license_issue_date ?? '',
    license_expiration_date: member?.license_expiration_date ?? '',
    // Height & Weight (mirrored from Health)
    height_feet: member?.height_feet ?? '',
    height_inches: member?.height_inches ?? '',
    weight_lbs: member?.weight_lbs ?? '',
    // Clothing sizes
    shirt_size: member?.shirt_size ?? '',
    pant_size: member?.pant_size ?? '',
    shoe_size: member?.shoe_size ?? '',
    jacket_size: member?.jacket_size ?? '',
    hat_size: member?.hat_size ?? '',
  });

  const isKid = member?.person_type === 'kid';

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
      phone: form.phone || null,
      email: form.email || null,
      role: form.role || null,
      passport_expiration_date: form.passport_expiration_date || null,
      student_number: form.student_number || null,
      license_number: form.license_number || null,
      license_issue_date: form.license_issue_date || null,
      license_expiration_date: form.license_expiration_date || null,
      height_feet: form.height_feet !== '' ? Number(form.height_feet) : null,
      height_inches: form.height_inches !== '' ? Number(form.height_inches) : null,
      weight_lbs: form.weight_lbs !== '' ? Number(form.weight_lbs) : null,
      shirt_size: form.shirt_size || null,
      pant_size: form.pant_size || null,
      shoe_size: form.shoe_size || null,
      jacket_size: form.jacket_size || null,
      hat_size: form.hat_size || null,
    });
  };

  const handleCopy = (value, key) => {
    navigator.clipboard.writeText(String(value));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const ViewRow = ({ label, value, copyKey }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 shrink-0 w-36">{label}</span>
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

  const hasContact = form.phone || form.email;
  const hasRole = !!form.role;
  const hasPassport = !!form.passport_expiration_date;
  const hasStudent = !!form.student_number;
  const hasLicense = form.license_number || form.license_issue_date || form.license_expiration_date;
  const hasHeight = form.height_feet !== '' || form.height_inches !== '';
  const hasWeight = form.weight_lbs !== '';
  const hasPhysical = hasHeight || hasWeight;
  const hasClothing = form.shirt_size || form.pant_size || form.shoe_size || form.jacket_size || form.hat_size;
  const hasAnything = hasContact || hasRole || hasPassport || hasStudent || hasLicense || hasPhysical || hasClothing;

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
          <p className="text-sm text-gray-400 italic">No personal info added yet. Click the edit icon to add details.</p>
        )}

        {hasContact && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact</h3>
            <div className="space-y-1.5">
              {form.phone && <ViewRow label="Phone" copyKey="phone" value={form.phone} />}
              {form.email && <ViewRow label="Email" copyKey="email" value={form.email} />}
            </div>
          </div>
        )}

        {(hasRole || hasPassport || hasStudent) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Identity</h3>
            <div className="space-y-1.5">
              {hasRole && <ViewRow label="Role" copyKey="role" value={form.role} />}
              {hasPassport && (
                <ViewRow
                  label="Passport Exp."
                  copyKey="passport"
                  value={new Date(form.passport_expiration_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                />
              )}
              {isKid && hasStudent && <ViewRow label="Student #" copyKey="student" value={form.student_number} />}
            </div>
          </div>
        )}

        {!isKid && hasLicense && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Driver's License</h3>
            <div className="space-y-1.5">
              {form.license_number && <ViewRow label="License #" copyKey="lic_num" value={form.license_number} />}
              {form.license_issue_date && (
                <ViewRow label="Issue Date" copyKey="lic_issue" value={new Date(form.license_issue_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
              )}
              {form.license_expiration_date && (
                <ViewRow label="Expiration" copyKey="lic_exp" value={new Date(form.license_expiration_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
              )}
            </div>
          </div>
        )}

        {hasPhysical && (
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
            </div>
          </div>
        )}

        {hasClothing && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Clothing Sizes</h3>
            <div className="space-y-1.5">
              {form.shirt_size && <ViewRow label="Shirt" copyKey="shirt" value={form.shirt_size} />}
              {form.pant_size && <ViewRow label="Pants" copyKey="pants" value={form.pant_size} />}
              {form.shoe_size && <ViewRow label="Shoes" copyKey="shoes" value={form.shoe_size} />}
              {form.jacket_size && <ViewRow label="Jacket" copyKey="jacket" value={form.jacket_size} />}
              {form.hat_size && <ViewRow label="Hat" copyKey="hat" value={form.hat_size} />}
            </div>
          </div>
        )}

        {isKid && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">🎁 Gift Ideas</h3>
            {giftIdeas.length === 0 && (
              <p className="text-sm text-gray-400 italic mb-2">No gift ideas yet.</p>
            )}
            <div className="space-y-1.5 mb-3">
              {giftIdeas.map((idea, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-sm font-medium flex-1 ${valueColor}`}>• {idea}</span>
                  <button onClick={() => removeGiftIdea(i)} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className={`flex-1 border rounded-md px-3 py-1.5 outline-none focus:ring-1 ${inputClass}`}
                style={{ fontSize: '16px' }}
                placeholder="Add a gift idea..."
                value={newGiftIdea}
                onChange={(e) => setNewGiftIdea(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addGiftIdea(); }}
              />
              <button onClick={addGiftIdea} className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
                <Plus className="w-4 h-4 text-gray-600" />
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

      {/* Contact */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Phone</Label>
            <Input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Email</Label>
            <Input placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Identity */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Identity</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Role in Household</Label>
            <Input placeholder="e.g., Parent, Child" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Passport Expiration Date</Label>
            <Input type="date" value={form.passport_expiration_date} onChange={(e) => setForm({ ...form, passport_expiration_date: e.target.value })} className={inputClass} />
          </div>
          {isKid && (
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Student Number</Label>
              <Input placeholder="Student ID" value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} className={inputClass} />
            </div>
          )}
        </div>
      </div>

      {/* Driver's License (adults only) */}
      {!isKid && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Driver's License</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">License Number</Label>
              <Input placeholder="License #" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Issue Date</Label>
                <Input type="date" value={form.license_issue_date} onChange={(e) => setForm({ ...form, license_issue_date: e.target.value })} className={inputClass} />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Expiration Date</Label>
                <Input type="date" value={form.license_expiration_date} onChange={(e) => setForm({ ...form, license_expiration_date: e.target.value })} className={inputClass} />
              </div>
            </div>
          </div>
        </div>
      )}

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
      </div>

      {/* Clothing Sizes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Clothing Sizes</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Shirt</Label>
            <Input placeholder="e.g., M, L, 8T" value={form.shirt_size} onChange={(e) => setForm({ ...form, shirt_size: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Pants</Label>
            <Input placeholder="e.g., 32x30, 7 Slim" value={form.pant_size} onChange={(e) => setForm({ ...form, pant_size: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Shoes</Label>
            <Input placeholder="e.g., 10, 4Y" value={form.shoe_size} onChange={(e) => setForm({ ...form, shoe_size: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Jacket</Label>
            <Input placeholder="e.g., M, 10/12" value={form.jacket_size} onChange={(e) => setForm({ ...form, jacket_size: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Hat</Label>
            <Input placeholder="e.g., S/M, 7¼" value={form.hat_size} onChange={(e) => setForm({ ...form, hat_size: e.target.value })} className={inputClass} />
          </div>
        </div>
      </div>

      {isKid && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">🎁 Gift Ideas</h3>
          <div className="space-y-2 mb-3">
            {giftIdeas.map((idea, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm flex-1">• {idea}</span>
                <button onClick={() => removeGiftIdea(i)} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={`flex-1 border rounded-md px-3 py-1.5 outline-none focus:ring-1 ${inputClass}`}
              style={{ fontSize: '16px' }}
              placeholder="Add a gift idea..."
              value={newGiftIdea}
              onChange={(e) => setNewGiftIdea(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addGiftIdea(); }}
            />
            <button onClick={addGiftIdea} className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
        {updateMutation.isPending ? 'Saving...' : saved ? '✓ Saved!' : 'Save'}
      </Button>
    </div>
  );
}