import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Copy, Check, Plus, Trash2 } from 'lucide-react';

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

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 py-4 space-y-3 bg-white">{children}</div>}
    </div>
  );
}

function ViewRow({ label, value, copyKey, copiedKey, onCopy, valueColor }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 shrink-0 w-24">{label}</span>
      <span className={`text-sm font-medium flex-1 min-w-0 truncate ${valueColor}`}>{value}</span>
      <button
        onClick={() => onCopy(value, copyKey || label)}
        className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        title="Copy"
      >
        {copiedKey === (copyKey || label)
          ? <Check className="w-3.5 h-3.5 text-green-500" />
          : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function PersonalInfoSection({ member, color = 'blue' }) {
  const inputClass = inputColorMap[color] || inputColorMap.blue;
  const valueColor = valueColorMap[color] || valueColorMap.blue;
  const queryClient = useQueryClient();
  const [copiedKey, setCopiedKey] = useState(null);
  const [newGiftIdea, setNewGiftIdea] = useState('');
  const [giftIdeas, setGiftIdeas] = useState(member?.gift_ideas || []);
  const [customInfo, setCustomInfo] = useState(member?.custom_info || []);
  const [newCustomItem, setNewCustomItem] = useState({ category: '', label: '', value: '' });

  const [form, setForm] = useState({
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    role: member?.role ?? '',
    passport_expiration_date: member?.passport_expiration_date ?? '',
    student_number: member?.student_number ?? '',
    license_number: member?.license_number ?? '',
    license_issue_date: member?.license_issue_date ?? '',
    license_expiration_date: member?.license_expiration_date ?? '',
    height_feet: member?.height_feet ?? '',
    height_inches: member?.height_inches ?? '',
    weight_lbs: member?.weight_lbs ?? '',
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
    },
  });

  const saveField = (patch) => {
    updateMutation.mutate(patch);
  };

  const handleBlur = (field, value) => {
    const parsedValue = ['height_feet', 'height_inches', 'weight_lbs'].includes(field)
      ? (value !== '' ? Number(value) : null)
      : (value || null);
    saveField({ [field]: parsedValue });
  };

  const handleCopy = (value, key) => {
    navigator.clipboard.writeText(String(value));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const saveGiftIdeas = (ideas) => {
    setGiftIdeas(ideas);
    updateMutation.mutate({ gift_ideas: ideas });
  };

  const addGiftIdea = () => {
    if (!newGiftIdea.trim()) return;
    saveGiftIdeas([...giftIdeas, newGiftIdea.trim()]);
    setNewGiftIdea('');
  };

  const removeGiftIdea = (i) => saveGiftIdeas(giftIdeas.filter((_, idx) => idx !== i));

  const addCustomItem = () => {
    if (!newCustomItem.label.trim() || !newCustomItem.value.trim()) return;
    const updated = [...customInfo, {
      category: newCustomItem.category.trim() || 'Other',
      label: newCustomItem.label.trim(),
      value: newCustomItem.value.trim(),
    }];
    setCustomInfo(updated);
    setNewCustomItem({ category: '', label: '', value: '' });
    updateMutation.mutate({ custom_info: updated });
  };

  const removeCustomItem = (i) => {
    const updated = customInfo.filter((_, idx) => idx !== i);
    setCustomInfo(updated);
    updateMutation.mutate({ custom_info: updated });
  };

  const rowProps = { copiedKey, onCopy: handleCopy, valueColor };

  return (
    <div className="space-y-2">

      {/* Contact */}
      <CollapsibleSection title="Contact">
        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Phone</Label>
          <Input
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
            onBlur={(e) => handleBlur('phone', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Email</Label>
          <Input
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            onBlur={(e) => handleBlur('email', e.target.value)}
            className={inputClass}
          />
        </div>
        {(form.phone || form.email) && (
          <div className="pt-1 space-y-1 border-t border-gray-100">
            {form.phone && <ViewRow label="Phone" copyKey="phone" value={form.phone} {...rowProps} />}
            {form.email && <ViewRow label="Email" copyKey="email" value={form.email} {...rowProps} />}
          </div>
        )}
      </CollapsibleSection>

      {/* Identity */}
      <CollapsibleSection title="Identity">
        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Role in Household</Label>
          <Input
            placeholder="e.g., Parent, Child"
            value={form.role}
            onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
            onBlur={(e) => handleBlur('role', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Passport Expiration Date</Label>
          <Input
            type="date"
            value={form.passport_expiration_date}
            onChange={(e) => setForm(f => ({ ...f, passport_expiration_date: e.target.value }))}
            onBlur={(e) => handleBlur('passport_expiration_date', e.target.value)}
            className={inputClass}
          />
        </div>
        {isKid && (
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Student Number</Label>
            <Input
              placeholder="Student ID"
              value={form.student_number}
              onChange={(e) => setForm(f => ({ ...f, student_number: e.target.value }))}
              onBlur={(e) => handleBlur('student_number', e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </CollapsibleSection>

      {/* Driver's License (adults only) */}
      {!isKid && (
        <CollapsibleSection title="Driver's License">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">License Number</Label>
            <Input
              placeholder="License #"
              value={form.license_number}
              onChange={(e) => setForm(f => ({ ...f, license_number: e.target.value }))}
              onBlur={(e) => handleBlur('license_number', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Issue Date</Label>
              <Input
                type="date"
                value={form.license_issue_date}
                onChange={(e) => setForm(f => ({ ...f, license_issue_date: e.target.value }))}
                onBlur={(e) => handleBlur('license_issue_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Expiration Date</Label>
              <Input
                type="date"
                value={form.license_expiration_date}
                onChange={(e) => setForm(f => ({ ...f, license_expiration_date: e.target.value }))}
                onBlur={(e) => handleBlur('license_expiration_date', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Physical */}
      <CollapsibleSection title="Physical">
        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Height</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number" placeholder="ft" min={0} max={8}
              value={form.height_feet}
              onChange={(e) => setForm(f => ({ ...f, height_feet: e.target.value }))}
              onBlur={(e) => handleBlur('height_feet', e.target.value)}
              className={`w-16 text-center ${inputClass}`}
            />
            <span className="text-sm text-gray-500">ft</span>
            <Input
              type="number" placeholder="in" min={0} max={11}
              value={form.height_inches}
              onChange={(e) => setForm(f => ({ ...f, height_inches: e.target.value }))}
              onBlur={(e) => handleBlur('height_inches', e.target.value)}
              className={`w-16 text-center ${inputClass}`}
            />
            <span className="text-sm text-gray-500">in</span>
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Weight</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number" placeholder="lbs" min={0}
              value={form.weight_lbs}
              onChange={(e) => setForm(f => ({ ...f, weight_lbs: e.target.value }))}
              onBlur={(e) => handleBlur('weight_lbs', e.target.value)}
              className={`w-24 text-center ${inputClass}`}
            />
            <span className="text-sm text-gray-500">lbs</span>
          </div>
        </div>
      </CollapsibleSection>

      {/* Clothing Sizes */}
      <CollapsibleSection title="Clothing Sizes">
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'shirt_size', label: 'Shirt', placeholder: 'e.g., M, L, 8T' },
            { key: 'pant_size', label: 'Pants', placeholder: 'e.g., 32x30, 7 Slim' },
            { key: 'shoe_size', label: 'Shoes', placeholder: 'e.g., 10, 4Y' },
            { key: 'jacket_size', label: 'Jacket', placeholder: 'e.g., M, 10/12' },
            { key: 'hat_size', label: 'Hat', placeholder: 'e.g., S/M, 7¼' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label className="text-xs text-gray-600 mb-1 block">{label}</Label>
              <Input
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                onBlur={(e) => handleBlur(key, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Gift Ideas (kids only) */}
      {isKid && (
        <CollapsibleSection title="🎁 Gift Ideas">
          {giftIdeas.length === 0 && (
            <p className="text-sm text-gray-400 italic">No gift ideas yet.</p>
          )}
          <div className="space-y-1.5">
            {giftIdeas.map((idea, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-sm font-medium flex-1 ${valueColor}`}>• {idea}</span>
                <button onClick={() => removeGiftIdea(i)} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
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
        </CollapsibleSection>
      )}

      {/* Custom Items */}
      <CollapsibleSection title="Custom Items">
        {customInfo.length > 0 && (
          <div className="space-y-2 mb-1">
            {(() => {
              const grouped = customInfo.reduce((acc, item, i) => {
                const cat = item.category || 'Other';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push({ ...item, _idx: i });
                return acc;
              }, {});
              return Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{cat}</p>
                  {items.map((item) => (
                    <div key={item._idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 mb-1">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700">{item.label}: </span>
                        <span className="text-sm text-gray-600">{item.value}</span>
                      </div>
                      <button onClick={() => removeCustomItem(item._idx)} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        )}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <Input
            placeholder="Category (e.g., Memberships)"
            value={newCustomItem.category}
            onChange={e => setNewCustomItem(v => ({ ...v, category: e.target.value }))}
            className={`h-8 text-sm ${inputClass}`}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Label"
              value={newCustomItem.label}
              onChange={e => setNewCustomItem(v => ({ ...v, label: e.target.value }))}
              className={`h-8 text-sm ${inputClass}`}
            />
            <Input
              placeholder="Value"
              value={newCustomItem.value}
              onChange={e => setNewCustomItem(v => ({ ...v, value: e.target.value }))}
              className={`h-8 text-sm ${inputClass}`}
            />
          </div>
          <button
            onClick={addCustomItem}
            disabled={!newCustomItem.label.trim() || !newCustomItem.value.trim()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add item
          </button>
        </div>
      </CollapsibleSection>

    </div>
  );
}