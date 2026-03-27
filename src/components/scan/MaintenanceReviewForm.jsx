import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const CATEGORIES = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'safety', label: 'Safety' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'landscaping', label: 'Landscaping' },
];

export default function MaintenanceReviewForm({ extracted, setExtracted }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-gray-500">Task Title</Label>
        <Input value={extracted.task_title || ''} onChange={e => setExtracted({ ...extracted, task_title: e.target.value })} className="mt-1" placeholder="e.g. Furnace Filter Replacement" />
      </div>

      <div>
        <Label className="text-xs text-gray-500">Appliance / Area</Label>
        <Input value={extracted.appliance_name || ''} onChange={e => setExtracted({ ...extracted, appliance_name: e.target.value })} className="mt-1" placeholder="e.g. Furnace, HVAC, Roof" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500">Next Due Date</Label>
          <Input type="date" value={extracted.next_due_date || ''} onChange={e => setExtracted({ ...extracted, next_due_date: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Cost</Label>
          <Input value={extracted.cost || ''} onChange={e => setExtracted({ ...extracted, cost: e.target.value })} className="mt-1" placeholder="e.g. $150" />
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-500">Category</Label>
        <Select value={extracted.category || ''} onValueChange={v => setExtracted({ ...extracted, category: v })}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Select category..." /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-gray-500">Description</Label>
        <Textarea value={extracted.description || ''} onChange={e => setExtracted({ ...extracted, description: e.target.value })} rows={2} className="mt-1" />
      </div>
    </div>
  );
}