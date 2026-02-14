import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  FileText, Plus, Search, Upload, Folder, Calendar,
  DollarSign, ExternalLink, Pencil, Trash2, Filter, Tag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { format, isBefore, addDays } from 'date-fns';

export default function Documents() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newDoc, setNewDoc] = useState({
    title: '', type: 'other', related_item_name: '',
    expiration_date: '', purchase_date: '', purchase_price: '', tags: [], notes: ''
  });
  const [tagInput, setTagInput] = useState('');

  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: items } = useQuery({
    queryKey: ['allItems'],
    queryFn: () => base44.entities.RoomItem.list(),
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsAddOpen(false);
      resetForm();
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const resetForm = () => {
    setNewDoc({
      title: '', type: 'other', related_item_name: '',
      expiration_date: '', purchase_date: '', purchase_price: '', tags: [], notes: ''
    });
    setFile(null);
    setTagInput('');
  };

  const handleUpload = async () => {
    setIsSubmitting(true);
    let fileUrl = null;
    
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      fileUrl = file_url;
    }

    await createDocMutation.mutateAsync({
      ...newDoc,
      file_url: fileUrl,
      purchase_price: newDoc.purchase_price ? parseFloat(newDoc.purchase_price) : null,
    });
    setIsSubmitting(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !newDoc.tags.includes(tagInput.trim())) {
      setNewDoc({ ...newDoc, tags: [...newDoc.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setNewDoc({ ...newDoc, tags: newDoc.tags.filter(t => t !== tag) });
  };

  const filteredDocs = documents?.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.related_item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  const typeLabels = {
    warranty: 'Warranty',
    receipt: 'Receipt',
    manual: 'Manual',
    insurance: 'Insurance',
    contract: 'Contract',
    permit: 'Permit',
    diagram: 'Diagram',
    other: 'Other',
  };

  const typeColors = {
    warranty: 'bg-green-100 text-green-700',
    receipt: 'bg-blue-100 text-blue-700',
    manual: 'bg-purple-100 text-purple-700',
    insurance: 'bg-amber-100 text-amber-700',
    contract: 'bg-pink-100 text-pink-700',
    permit: 'bg-cyan-100 text-cyan-700',
    diagram: 'bg-orange-100 text-orange-700',
    other: 'bg-slate-100 text-slate-700',
  };

  const typeIcons = {
    warranty: '🛡️',
    receipt: '🧾',
    manual: '📖',
    insurance: '📋',
    contract: '📝',
    permit: '🏛️',
    diagram: '📐',
    other: '📄',
  };

  // Group by type for folder view
  const docsByType = documents?.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {}) || {};

  const expiringDocs = documents?.filter(d => 
    d.expiration_date && 
    isBefore(new Date(d.expiration_date), addDays(new Date(), 90)) &&
    isBefore(new Date(), new Date(d.expiration_date))
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-amber-600 to-orange-600 text-white py-16">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-amber-200 mb-3">
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Vault</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Documents Vault</h1>
            <p className="text-amber-100">Store warranties, receipts, manuals, and important documents</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Expiring Alert */}
        {expiringDocs.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 -mt-12 relative z-10"
          >
            <Card className="border-0 shadow-lg border-l-4 border-l-amber-500 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                  <Calendar className="w-4 h-4" />
                  {expiringDocs.length} document(s) expiring soon
                </div>
                <div className="flex flex-wrap gap-2">
                  {expiringDocs.slice(0, 3).map(doc => (
                    <Badge key={doc.id} variant="outline" className="bg-white">
                      {doc.title} - {format(new Date(doc.expiration_date), 'MMM d')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="pl-10 bg-white shadow-md border-0"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 bg-white shadow-md border-0">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Document Title *</Label>
                  <Input 
                    value={newDoc.title}
                    onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                    placeholder="e.g., Samsung Refrigerator Warranty"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={newDoc.type} onValueChange={v => setNewDoc({...newDoc, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Related Item</Label>
                    <Select value={newDoc.related_item_name || ''} onValueChange={v => setNewDoc({...newDoc, related_item_name: v})}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {items?.map(item => (
                          <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Purchase Date</Label>
                    <Input 
                      type="date"
                      value={newDoc.purchase_date}
                      onChange={e => setNewDoc({...newDoc, purchase_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Purchase Price ($)</Label>
                    <Input 
                      type="number"
                      value={newDoc.purchase_price}
                      onChange={e => setNewDoc({...newDoc, purchase_price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {(newDoc.type === 'warranty' || newDoc.type === 'insurance' || newDoc.type === 'contract') && (
                  <div>
                    <Label>Expiration Date</Label>
                    <Input 
                      type="date"
                      value={newDoc.expiration_date}
                      onChange={e => setNewDoc({...newDoc, expiration_date: e.target.value})}
                    />
                  </div>
                )}
                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                  </div>
                  {newDoc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {newDoc.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>File</Label>
                  <Input 
                    type="file"
                    onChange={e => setFile(e.target.files[0])}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea 
                    value={newDoc.notes}
                    onChange={e => setNewDoc({...newDoc, notes: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={!newDoc.title || isSubmitting}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    {isSubmitting ? 'Uploading...' : 'Save Document'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="grid">
          <TabsList className="mb-6">
            <TabsTrigger value="grid">All Documents</TabsTrigger>
            <TabsTrigger value="folders">By Folder</TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            {isLoading ? (
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <Card key={i} className="border-0 shadow-md animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-12 bg-slate-200 rounded mb-3" />
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredDocs.length > 0 ? (
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                  {filteredDocs.map((doc, i) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <Card className="border-0 shadow-md hover:shadow-lg transition-all group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-2xl">{typeIcons[doc.type]}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {doc.file_url && (
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon">
                                    <ExternalLink className="w-4 h-4 text-slate-400" />
                                  </Button>
                                </a>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => deleteDocMutation.mutate(doc.id)}>
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </div>
                          <h3 className="font-medium text-slate-800 mb-1 line-clamp-2">{doc.title}</h3>
                          <Badge className={`${typeColors[doc.type]} text-xs`}>{typeLabels[doc.type]}</Badge>
                          
                          {doc.related_item_name && (
                            <p className="text-xs text-slate-500 mt-2">📦 {doc.related_item_name}</p>
                          )}
                          {doc.expiration_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              Expires: {format(new Date(doc.expiration_date), 'MMM d, yyyy')}
                            </p>
                          )}
                          {doc.purchase_price && (
                            <p className="text-xs text-slate-500 mt-1">
                              ${doc.purchase_price.toFixed(2)}
                            </p>
                          )}
                          {doc.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {doc.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-16 text-center">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">No documents found</h3>
                  <p className="text-slate-500 mb-4">Start organizing your home documents</p>
                  <Button onClick={() => setIsAddOpen(true)} className="bg-amber-600 hover:bg-amber-700">
                    <Upload className="w-4 h-4 mr-2" /> Upload Your First Document
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="folders">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(typeLabels).map(([type, label]) => {
                const typeDocs = docsByType[type] || [];
                return (
                  <Card key={type} className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-3">{typeIcons[type]}</div>
                      <h3 className="font-semibold text-slate-800">{label}</h3>
                      <p className="text-sm text-slate-500">{typeDocs.length} document(s)</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}