import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function BusinessCardReviewForm({ extracted, setExtracted }) {
  const handleChange = (field, value) => {
    setExtracted(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-xs font-semibold text-gray-700">Name</Label>
        <Input
          id="name"
          value={extracted.contact_name || ''}
          onChange={(e) => handleChange('contact_name', e.target.value)}
          placeholder="e.g., Oliver Smith"
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
          placeholder="e.g., 123-456-7890"
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
    </div>
  );
}