import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export default function BusinessCardReviewForm({ extracted, setExtracted, familyMembers, selectedMemberIds, setSelectedMemberIds }) {
  const handleChange = (field, value) => {
    setExtracted(prev => ({ ...prev, [field]: value }));
  };

  const toggleMemberId = (id) => {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-xs font-semibold text-gray-700">Name</Label>
        <Input
          id="name"
          value={extracted.contact_name || ''}
          onChange={(e) => handleChange('contact_name', e.target.value)}
          placeholder="e.g., John Couch"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="title" className="text-xs font-semibold text-gray-700">Job Title</Label>
        <Input
          id="title"
          value={extracted.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="e.g., Vice President, Sales Manager"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="company" className="text-xs font-semibold text-gray-700">Company</Label>
        <Input
          id="company"
          value={extracted.company || ''}
          onChange={(e) => handleChange('company', e.target.value)}
          placeholder="e.g., Your Company Name"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="phone" className="text-xs font-semibold text-gray-700">Phone</Label>
        <Input
          id="phone"
          value={extracted.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="e.g., 408 974-6117"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="phone_secondary" className="text-xs font-semibold text-gray-700">Phone (Secondary)</Label>
        <Input
          id="phone_secondary"
          value={extracted.phone_secondary || ''}
          onChange={(e) => handleChange('phone_secondary', e.target.value)}
          placeholder="e.g., 408 974-0121 (fax)"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="email" className="text-xs font-semibold text-gray-700">Email</Label>
        <Input
          id="email"
          type="email"
          value={extracted.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="e.g., oliver@company.com"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="address" className="text-xs font-semibold text-gray-700">Address</Label>
        <Input
          id="address"
          value={extracted.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="e.g., 123 Business Rd, City, State 12345"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="website" className="text-xs font-semibold text-gray-700">Website</Label>
        <Input
          id="website"
          value={extracted.website || ''}
          onChange={(e) => handleChange('website', e.target.value)}
          placeholder="e.g., www.yourwebsite.com"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="notes" className="text-xs font-semibold text-gray-700">Notes</Label>
        <Textarea
          id="notes"
          value={extracted.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Additional notes, social media handles, etc."
          className="mt-1 h-20"
        />
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-700 block mb-2">Link to Family Members</Label>
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {familyMembers && familyMembers.length > 0 ? (
            familyMembers.map(member => (
              <div key={member.id} className="flex items-center gap-2">
                <Checkbox
                  id={`member-${member.id}`}
                  checked={selectedMemberIds.includes(member.id)}
                  onCheckedChange={() => toggleMemberId(member.id)}
                />
                <label htmlFor={`member-${member.id}`} className="text-sm text-gray-700 cursor-pointer">
                  {member.name}
                </label>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">No family members found</p>
          )}
        </div>
      </div>
    </div>
  );
}