import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Users, CheckCircle2 } from 'lucide-react';

export default function EventReviewForm({ extracted, setExtracted, familyMembers, selectedMembers, toggleMember, selectedCalendarId, setSelectedCalendarId, calendars, missingDate }) {
  return (
    <div className="space-y-3">
      {missingDate && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Homey couldn't find a date.</p>
            <p className="text-xs text-amber-600 mt-0.5">When should I set this for?</p>
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs text-gray-500">Event Name</Label>
        <Input value={extracted.title || ''} onChange={e => setExtracted({ ...extracted, title: e.target.value })} className="mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={`text-xs ${missingDate && !extracted.date ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
            Date {missingDate && !extracted.date && '← required'}
          </Label>
          <Input
            type="date"
            value={extracted.date || ''}
            onChange={e => setExtracted({ ...extracted, date: e.target.value })}
            className={`mt-1 ${missingDate && !extracted.date ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Time</Label>
          <Input placeholder="e.g. 3:30 PM" value={extracted.time || ''} onChange={e => setExtracted({ ...extracted, time: e.target.value })} className="mt-1" />
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-500">Location</Label>
        <Input value={extracted.location || ''} onChange={e => setExtracted({ ...extracted, location: e.target.value })} className="mt-1" placeholder="Venue or location" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500">Type</Label>
          <Select value={extracted.type || 'event'} onValueChange={v => setExtracted({ ...extracted, type: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="sports_league">Sports League</SelectItem>
              <SelectItem value="program">Program</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Cost</Label>
          <Input value={extracted.cost || ''} onChange={e => setExtracted({ ...extracted, cost: e.target.value })} className="mt-1" placeholder="e.g. Free, $15" />
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-500">Description</Label>
        <Textarea value={extracted.description || ''} onChange={e => setExtracted({ ...extracted, description: e.target.value })} rows={2} className="mt-1" />
      </div>

      {/* Calendar picker */}
      {calendars.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5" /> Add to Google Calendar (optional)
          </Label>
          <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
            <SelectTrigger><SelectValue placeholder="Select a calendar..." /></SelectTrigger>
            <SelectContent>
              {calendars.map(cal => (
                <SelectItem key={cal.id} value={cal.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cal.backgroundColor || '#64748b' }} />
                    {cal.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Family member assignment */}
      <div>
        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
          <Users className="w-3.5 h-3.5" /> Assign to family members (optional)
        </Label>
        <div className="flex flex-wrap gap-2">
          {familyMembers.map(member => (
            <button
              key={member.id}
              onClick={() => toggleMember(member.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                selectedMembers.includes(member.id)
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
              style={selectedMembers.includes(member.id) ? { backgroundColor: member.color || '#0AACFF' } : {}}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: member.color || '#64748b' }}>
                {member.name?.charAt(0)}
              </span>
              {member.name}
              {selectedMembers.includes(member.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}