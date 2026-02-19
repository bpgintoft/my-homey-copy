import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, Edit2 } from 'lucide-react';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const dayLabels = ['M', 'T', 'W', 'Th', 'F'];

export default function SchoolProgramSection({ memberId, memberName }) {
  const queryClient = useQueryClient();
  const [openSections, setOpenSections] = useState({ schoolProgram: false });
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editingPasscode, setEditingPasscode] = useState(null);
  const [newPasscode, setNewPasscode] = useState({ name: '', code: '' });
  const [isAddingPasscode, setIsAddingPasscode] = useState(false);

  // Fetch school program data
  const { data: program } = useQuery({
    queryKey: ['schoolProgram', memberId],
    queryFn: () => base44.entities.SchoolProgram.filter({ family_member_id: memberId }).then(res => res[0]),
    enabled: !!memberId,
  });

  // Mutations
  const createProgramMutation = useMutation({
    mutationFn: (data) => base44.entities.SchoolProgram.create(data),
    onSuccess: () => queryClient.invalidateQueries(['schoolProgram', memberId]),
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SchoolProgram.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['schoolProgram', memberId]),
  });

  const handleCreateProgram = () => {
    createProgramMutation.mutate({
      family_member_id: memberId,
      title: 'Right at School',
      url: '',
      schedule: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '' },
      passcodes: [],
      phone: '',
      email: '',
    });
  };

  const handleUpdateTitle = (newTitle) => {
    if (program) {
      updateProgramMutation.mutate({
        id: program.id,
        data: { title: newTitle },
      });
      setEditingTitle(null);
    }
  };

  const handleUpdateCell = (day, value) => {
    if (program) {
      const newSchedule = { ...program.schedule, [day]: value };
      updateProgramMutation.mutate({
        id: program.id,
        data: { schedule: newSchedule },
      });
      setEditingCell(null);
    }
  };

  const handleAddPasscode = () => {
    if (program && newPasscode.name && newPasscode.code) {
      const updatedPasscodes = [...(program.passcodes || []), newPasscode];
      updateProgramMutation.mutate({
        id: program.id,
        data: { passcodes: updatedPasscodes },
      });
      setNewPasscode({ name: '', code: '' });
      setIsAddingPasscode(false);
    }
  };

  const handleDeletePasscode = (index) => {
    if (program) {
      const updatedPasscodes = program.passcodes.filter((_, i) => i !== index);
      updateProgramMutation.mutate({
        id: program.id,
        data: { passcodes: updatedPasscodes },
      });
    }
  };

  const handleUpdatePhone = (phone) => {
    if (program) {
      updateProgramMutation.mutate({
        id: program.id,
        data: { phone },
      });
    }
  };

  const handleUpdateEmail = (email) => {
    if (program) {
      updateProgramMutation.mutate({
        id: program.id,
        data: { email },
      });
    }
  };

  const handleUpdateUrl = (url) => {
    if (program) {
      updateProgramMutation.mutate({
        id: program.id,
        data: { url },
      });
    }
  };

  if (!program) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Right at School</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateProgram} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Program
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible 
      open={openSections.schoolProgram} 
      onOpenChange={(open) => setOpenSections({ ...openSections, schoolProgram: open })}
    >
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center gap-2">
              Right at School
              <ChevronDown className={`w-5 h-5 transition-transform ${openSections.schoolProgram ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* URL Input */}
            <div>
              <label className="text-sm font-medium">Website URL</label>
              <Input
                type="url"
                placeholder="https://..."
                value={program.url || ''}
                onChange={(e) => handleUpdateUrl(e.target.value)}
                onBlur={(e) => handleUpdateUrl(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Schedule Table */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                {editingTitle === 'title' ? (
                  <div className="flex gap-2 flex-1">
                    <Input
                      defaultValue={program.title}
                      onBlur={(e) => handleUpdateTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateTitle(e.target.value);
                        if (e.key === 'Escape') setEditingTitle(null);
                      }}
                      autoFocus
                      className="text-sm font-semibold"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <h3 className="text-sm font-semibold">{program.title}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTitle('title')}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="w-3 h-3 text-gray-500" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {dayLabels.map((label) => (
                        <th key={label} className="border border-gray-300 p-2 text-center text-sm font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {days.map((day) => (
                        <td
                          key={day}
                          className="border border-gray-300 p-2 text-center text-sm cursor-pointer hover:bg-gray-100"
                          onClick={() => setEditingCell(day)}
                        >
                          {editingCell === day ? (
                            <Input
                              defaultValue={program.schedule[day] || ''}
                              onBlur={(e) => handleUpdateCell(day, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateCell(day, e.target.value);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="text-xs p-1 h-8"
                              placeholder="e.g., 3:20 - 6:00 pm"
                            />
                          ) : (
                            program.schedule[day] || '-'
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Passcodes Section */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold">Passcodes</h4>
              <div className="space-y-2">
                {program.passcodes && program.passcodes.map((passcode, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{passcode.name}</div>
                      <div className="text-gray-600 font-mono">{passcode.code}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePasscode(index)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              {!isAddingPasscode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingPasscode(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Passcode
                </Button>
              ) : (
                <div className="space-y-2 p-2 bg-gray-50 rounded">
                  <Input
                    placeholder="Person's name"
                    value={newPasscode.name}
                    onChange={(e) => setNewPasscode({ ...newPasscode, name: e.target.value })}
                  />
                  <Input
                    placeholder="4-digit code"
                    value={newPasscode.code}
                    onChange={(e) => setNewPasscode({ ...newPasscode, code: e.target.value })}
                    maxLength="4"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddPasscode}
                      disabled={!newPasscode.name || !newPasscode.code}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingPasscode(false);
                        setNewPasscode({ name: '', code: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="border-t pt-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={program.phone || ''}
                  onChange={(e) => handleUpdatePhone(e.target.value)}
                  onBlur={(e) => handleUpdatePhone(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={program.email || ''}
                  onChange={(e) => handleUpdateEmail(e.target.value)}
                  onBlur={(e) => handleUpdateEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}