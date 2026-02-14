import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  History as HistoryIcon, 
  Upload, 
  FileText, 
  Image, 
  Calendar,
  MapPin,
  Home,
  Thermometer,
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Plus,
  X,
  ChevronRight,
  DollarSign,
  Bed,
  Bath,
  Ruler,
  Building
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from "@/components/ui/skeleton";

export default function History() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    type: 'document',
    description: '',
    date: '',
    year_estimate: '',
  });
  const [file, setFile] = useState(null);

  const queryClient = useQueryClient();

  const { data: homeInfo, isLoading: homeLoading } = useQuery({
    queryKey: ['homeInfo'],
    queryFn: () => base44.entities.HomeInfo.list(),
  });

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['historyDocuments'],
    queryFn: () => base44.entities.HistoryDocument.list('-created_date'),
  });

  const { data: propertyData, isLoading: propertyLoading } = useQuery({
    queryKey: ['propertyData'],
    queryFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Get property data from this Redfin page: https://www.redfin.com/WI/Milwaukee/1934-Church-St-53213/home/90306414. Extract the Redfin estimate, bedrooms, bathrooms, square footage, lot size, year built, and any sale history shown on the page.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            estimated_value: { type: "number" },
            value_range_low: { type: "number" },
            value_range_high: { type: "number" },
            bedrooms: { type: "number" },
            bathrooms: { type: "number" },
            square_footage: { type: "number" },
            lot_size: { type: "string" },
            year_built: { type: "number" },
            last_sale_date: { type: "string" },
            last_sale_price: { type: "number" },
            property_type: { type: "string" },
            data_source: { type: "string" }
          }
        }
      });
      return result;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather'],
    queryFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Get the current weather for Wauwatosa, WI 53213. Include temperature, conditions, humidity, and a brief forecast.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            temperature: { type: "number" },
            feels_like: { type: "number" },
            conditions: { type: "string" },
            humidity: { type: "number" },
            high: { type: "number" },
            low: { type: "number" },
            forecast: { type: "string" }
          }
        }
      });
      return result;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 mins
  });

  const createDocMutation = useMutation({
    mutationFn: async (docData) => {
      return base44.entities.HistoryDocument.create(docData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historyDocuments'] });
      setIsUploadOpen(false);
      setNewDoc({ title: '', type: 'document', description: '', date: '', year_estimate: '' });
      setFile(null);
    },
  });

  const handleUpload = async () => {
    setIsUploading(true);
    let fileUrl = null;
    
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      fileUrl = file_url;
    }

    await createDocMutation.mutateAsync({
      ...newDoc,
      year_estimate: newDoc.year_estimate ? parseInt(newDoc.year_estimate) : null,
      file_url: fileUrl,
    });
    setIsUploading(false);
  };

  const home = homeInfo?.[0];

  const getWeatherIcon = (conditions) => {
    const c = conditions?.toLowerCase() || '';
    if (c.includes('rain')) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (c.includes('snow')) return <Snowflake className="w-8 h-8 text-cyan-500" />;
    if (c.includes('cloud')) return <Cloud className="w-8 h-8 text-slate-500" />;
    return <Sun className="w-8 h-8 text-amber-500" />;
  };

  const typeIcons = {
    photo: Image,
    document: FileText,
    receipt: FileText,
    letter: FileText,
    blueprint: FileText,
    newspaper: FileText,
    certificate: FileText,
    other: FileText,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-amber-600 to-orange-600 text-white py-16">
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-amber-200 mb-3">
              <HistoryIcon className="w-5 h-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Our Story</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Home History</h1>
            <p className="text-amber-100">Preserving the memories and stories of 1934 Church St.</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Property Value & Weather Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 -mt-12 relative z-10">
          {/* Property Value Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-xl bg-white overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Estimated Home Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                {propertyLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      {[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}
                    </div>
                  </div>
                ) : propertyData ? (
                  <>
                    <div className="text-4xl font-bold text-emerald-600 mb-1">
                      ${propertyData.estimated_value?.toLocaleString() || '—'}
                    </div>
                    {propertyData.value_range_low && propertyData.value_range_high && (
                      <p className="text-sm text-slate-500 mb-4">
                        Range: ${propertyData.value_range_low?.toLocaleString()} - ${propertyData.value_range_high?.toLocaleString()}
                      </p>
                    )}
                    <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <Bed className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <div className="font-semibold">{propertyData.bedrooms || '—'}</div>
                        <div className="text-xs text-slate-500">Beds</div>
                      </div>
                      <div className="text-center">
                        <Bath className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <div className="font-semibold">{propertyData.bathrooms || '—'}</div>
                        <div className="text-xs text-slate-500">Baths</div>
                      </div>
                      <div className="text-center">
                        <Ruler className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <div className="font-semibold">{propertyData.square_footage?.toLocaleString() || '—'}</div>
                        <div className="text-xs text-slate-500">Sq Ft</div>
                      </div>
                      <div className="text-center">
                        <Building className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <div className="font-semibold">{propertyData.year_built || '—'}</div>
                        <div className="text-xs text-slate-500">Built</div>
                      </div>
                    </div>
                    {propertyData.data_source && (
                      <p className="text-xs text-slate-400 mt-3">Source: {propertyData.data_source}</p>
                    )}
                  </>
                ) : (
                  <p className="text-slate-500">Unable to fetch property data</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Weather Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-xl bg-white overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Thermometer className="w-5 h-5 text-blue-600" />
                  Current Weather
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weatherLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ) : weatherData ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-bold text-slate-800">
                        {weatherData.temperature}°F
                      </div>
                      <p className="text-slate-600 capitalize">{weatherData.conditions}</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Feels like {weatherData.feels_like}°F • H: {weatherData.high}° L: {weatherData.low}°
                      </p>
                      {weatherData.forecast && (
                        <p className="text-sm text-slate-500 mt-2">{weatherData.forecast}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {getWeatherIcon(weatherData.conditions)}
                      <p className="text-sm text-slate-500 mt-2">
                        Humidity: {weatherData.humidity}%
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">Unable to fetch weather</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs for Story, Documents, Timeline */}
        <Tabs defaultValue="story" className="mb-8">
          <TabsList className="bg-white/80 backdrop-blur border shadow-sm p-1 h-auto">
            <TabsTrigger value="story" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800 px-6 py-2">
              Our Story
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800 px-6 py-2">
              Documents & Photos
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800 px-6 py-2">
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="story" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                {homeLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : home?.history_story ? (
                  <div className="prose prose-lg max-w-none">
                    <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                      {home.history_story}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <HistoryIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600 mb-2">No story written yet</h3>
                    <p className="text-slate-500 mb-4">
                      Start documenting your home's history by uploading documents and photos
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Previous Owners */}
            {home?.previous_owners?.length > 0 && (
              <Card className="border-0 shadow-lg mt-6">
                <CardHeader>
                  <CardTitle>Previous Owners</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {home.previous_owners.map((owner, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
                          {owner.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{owner.name}</div>
                          {owner.years && <div className="text-sm text-slate-500">{owner.years}</div>}
                          {owner.notes && <div className="text-sm text-slate-600 mt-1">{owner.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-800">Historical Documents</h2>
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Upload Historical Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Title *</Label>
                      <Input 
                        value={newDoc.title}
                        onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                        placeholder="e.g., Original deed from 1934"
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newDoc.type} onValueChange={v => setNewDoc({...newDoc, type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="photo">Photo</SelectItem>
                          <SelectItem value="document">Document</SelectItem>
                          <SelectItem value="receipt">Receipt</SelectItem>
                          <SelectItem value="letter">Letter</SelectItem>
                          <SelectItem value="blueprint">Blueprint</SelectItem>
                          <SelectItem value="newspaper">Newspaper Clipping</SelectItem>
                          <SelectItem value="certificate">Certificate</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date (if known)</Label>
                        <Input 
                          type="date"
                          value={newDoc.date}
                          onChange={e => setNewDoc({...newDoc, date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Or Estimated Year</Label>
                        <Input 
                          type="number"
                          placeholder="e.g., 1945"
                          value={newDoc.year_estimate}
                          onChange={e => setNewDoc({...newDoc, year_estimate: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea 
                        value={newDoc.description}
                        onChange={e => setNewDoc({...newDoc, description: e.target.value})}
                        placeholder="What is this document? Any context or notes..."
                      />
                    </div>
                    <div>
                      <Label>File</Label>
                      <Input 
                        type="file"
                        onChange={e => setFile(e.target.files[0])}
                        accept="image/*,.pdf,.doc,.docx"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setIsUploadOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleUpload} 
                        disabled={!newDoc.title || isUploading}
                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                      >
                        {isUploading ? 'Uploading...' : 'Save Document'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {docsLoading ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                  <Card key={i} className="border-0 shadow-md">
                    <CardContent className="p-4">
                      <Skeleton className="h-40 w-full mb-4" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2 mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : documents?.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                <AnimatePresence>
                  {documents.map((doc, i) => {
                    const Icon = typeIcons[doc.type] || FileText;
                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card 
                          className="border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group overflow-hidden"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <div className="h-40 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                            {doc.file_url && doc.type === 'photo' ? (
                              <img src={doc.file_url} alt={doc.title} className="w-full h-full object-cover" />
                            ) : doc.file_url ? (
                              <div className="text-center">
                                <Icon className="w-12 h-12 text-slate-400 mx-auto" />
                                <span className="text-xs text-slate-500 mt-2 block uppercase">{doc.type}</span>
                              </div>
                            ) : (
                              <Icon className="w-12 h-12 text-slate-300" />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-medium text-slate-800 group-hover:text-amber-700 transition-colors">
                              {doc.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                              <Calendar className="w-3 h-3" />
                              {doc.date ? new Date(doc.date).toLocaleDateString() : doc.year_estimate ? `~${doc.year_estimate}` : 'Date unknown'}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <Card className="border-0 shadow-md">
                <CardContent className="py-16 text-center">
                  <Upload className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">No documents yet</h3>
                  <p className="text-slate-500 mb-4">
                    Upload photos, letters, deeds, and other historical documents
                  </p>
                  <Button onClick={() => setIsUploadOpen(true)} className="bg-amber-600 hover:bg-amber-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Your First Document
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                {home?.notable_events?.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-amber-200" />
                    <div className="space-y-8">
                      {home.notable_events.sort((a, b) => a.year - b.year).map((event, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="relative pl-12"
                        >
                          <div className="absolute left-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-medium">
                            {i + 1}
                          </div>
                          <div className="bg-amber-50 rounded-lg p-4">
                            <div className="font-bold text-amber-800">{event.year}</div>
                            <div className="text-slate-700">{event.event}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600 mb-2">No timeline events yet</h3>
                    <p className="text-slate-500">
                      Notable events in your home's history will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Document Detail Modal */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedDoc && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDoc.title}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {selectedDoc.file_url && (
                  <div className="mb-4">
                    {selectedDoc.type === 'photo' ? (
                      <img src={selectedDoc.file_url} alt={selectedDoc.title} className="w-full rounded-lg" />
                    ) : (
                      <a 
                        href={selectedDoc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-4 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <FileText className="w-8 h-8 text-slate-500" />
                        <span className="font-medium text-slate-700">View Document</span>
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </a>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    {selectedDoc.date ? new Date(selectedDoc.date).toLocaleDateString() : selectedDoc.year_estimate ? `Approximately ${selectedDoc.year_estimate}` : 'Date unknown'}
                  </div>
                  {selectedDoc.description && (
                    <p className="text-slate-700">{selectedDoc.description}</p>
                  )}
                  {selectedDoc.transcription && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                      <h4 className="font-medium text-amber-800 mb-2">Transcription</h4>
                      <p className="text-slate-700 whitespace-pre-wrap">{selectedDoc.transcription}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}