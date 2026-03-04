import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Receipt, BookOpen, FileQuestion, File, Upload, Loader2, Trash2, ExternalLink } from 'lucide-react';

const DOC_TYPES = [
  { value: 'manual', label: "Owner's Manual", icon: BookOpen },
  { value: 'receipt', label: 'Receipt', icon: Receipt },
  { value: 'quick_reference', label: 'Quick Reference Guide', icon: FileText },
  { value: 'warranty', label: 'Warranty', icon: FileText },
  { value: 'other', label: 'Other', icon: File },
];

function getDocIcon(type) {
  const found = DOC_TYPES.find(d => d.value === type);
  const Icon = found?.icon || File;
  return <Icon className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
}

export default function ApplianceDocuments({ appliance }) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('manual');
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = React.useRef(null);

  const documents = appliance.documents || [];

  const handleFileSelect = async (file) => {
    if (!file || !docName.trim()) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newDocs = [...documents, { name: docName.trim(), type: docType, url: file_url }];
      await base44.entities.RoomItem.update(appliance.id, { documents: newDocs });
      queryClient.invalidateQueries(['appliances']);
      queryClient.invalidateQueries(['roomItems']);
      setDocName('');
      setDocType('manual');
      setShowForm(false);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (index) => {
    const newDocs = documents.filter((_, i) => i !== index);
    await base44.entities.RoomItem.update(appliance.id, { documents: newDocs });
    queryClient.invalidateQueries(['appliances']);
    queryClient.invalidateQueries(['roomItems']);
  };

  return (
    <div className="pt-3 border-t">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Documents</span>
        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowForm(!showForm)}>
          <Upload className="w-3 h-3 mr-1" /> Upload
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg">
          <Input
            placeholder="Document name (e.g. Dishwasher Manual)"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            className="text-sm h-8"
          />
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="text-sm h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="w-full text-xs h-8 bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
            disabled={!docName.trim() || isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Uploading...</> : 'Choose File & Upload'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
        </div>
      )}

      {documents.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 italic">No documents uploaded yet.</p>
      )}

      <ul className="space-y-1">
        {documents.map((doc, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm group">
            {getDocIcon(doc.type)}
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-gray-700 hover:text-emerald-600 hover:underline truncate flex items-center gap-1"
            >
              {doc.name}
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
            <span className="text-xs text-gray-400 capitalize">{DOC_TYPES.find(d => d.value === doc.type)?.label || doc.type}</span>
            <button
              onClick={() => handleDelete(idx)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}