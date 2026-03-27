import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, FileText } from 'lucide-react';

const ID_CATEGORIES = [
  { value: 'identity', label: 'Identity' },
  { value: 'travel', label: 'Travel' },
  { value: 'health', label: 'Health' },
  { value: 'financial', label: 'Financial' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'education', label: 'Education' },
  { value: 'property', label: 'Property' },
  { value: 'other', label: 'Other' },
];

const DOC_CATEGORIES = [
  { value: 'warranty', label: 'Warranty' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'manual', label: 'Manual' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'contract', label: 'Contract' },
  { value: 'permit', label: 'Permit' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'other', label: 'Other' },
];

export default function VaultReviewForm({ extracted, setExtracted, docType, familyMembers, selectedMemberId, setSelectedMemberId }) {
  const isPersonalId = docType === 'personal_id';

  return (
    <div className="space-y-3">
      {/* Type badge */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isPersonalId ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
        {isPersonalId ? <Shield className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        {isPersonalId ? 'Personal ID / Sensitive Document' : 'House Document'}
      </div>

      {isPersonalId ? (
        <>
          <div>
            <Label className="text-xs text-gray-500">Document Label</Label>
            <Input value={extracted.doc_label || ''} onChange={e => setExtracted({ ...extracted, doc_label: e.target.value })} className="mt-1" placeholder="e.g. Passport, Driver's License" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Doc Type</Label>
              <Input value={extracted.doc_type || ''} onChange={e => setExtracted({ ...extracted, doc_type: e.target.value })} className="mt-1" placeholder="e.g. passport" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Expiry Date</Label>
              <Input type="date" value={extracted.expiry_date || ''} onChange={e => setExtracted({ ...extracted, expiry_date: e.target.value })} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Category</Label>
            <Select value={extracted.id_category || 'identity'} onValueChange={v => setExtracted({ ...extracted, id_category: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ID_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 block">
              Which family member does this belong to?
              {extracted.member_name && (
                <span className="ml-2 text-xs font-normal text-purple-600">
                  (Homey detected: "{extracted.member_name}")
                </span>
              )}
            </Label>
            <div className="flex flex-wrap gap-2">
              {familyMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                    selectedMemberId === member.id
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                  style={selectedMemberId === member.id ? { backgroundColor: member.color || '#7c3aed' } : {}}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: member.color || '#64748b' }}>
                    {member.name?.charAt(0)}
                  </span>
                  {member.name}
                </button>
              ))}
            </div>
            {!selectedMemberId && (
              <p className="text-xs text-amber-600 mt-1">← Select a family member to save this ID</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div>
            <Label className="text-xs text-gray-500">Document Title</Label>
            <Input value={extracted.title || ''} onChange={e => setExtracted({ ...extracted, title: e.target.value })} className="mt-1" placeholder="e.g. Dishwasher Warranty" />
          </div>

          <div>
            <Label className="text-xs text-gray-500">Category</Label>
            <Select value={extracted.doc_category || 'other'} onValueChange={v => setExtracted({ ...extracted, doc_category: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Related Item / Appliance</Label>
            <Input value={extracted.related_item_name || ''} onChange={e => setExtracted({ ...extracted, related_item_name: e.target.value })} className="mt-1" placeholder="e.g. Bosch Dishwasher" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Expiration Date</Label>
              <Input type="date" value={extracted.expiration_date || ''} onChange={e => setExtracted({ ...extracted, expiration_date: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Purchase Date</Label>
              <Input type="date" value={extracted.purchase_date || ''} onChange={e => setExtracted({ ...extracted, purchase_date: e.target.value })} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Purchase Price</Label>
            <Input type="number" value={extracted.purchase_price || ''} onChange={e => setExtracted({ ...extracted, purchase_price: parseFloat(e.target.value) || null })} className="mt-1" placeholder="e.g. 450" />
          </div>
        </>
      )}
    </div>
  );
}