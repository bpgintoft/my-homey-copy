import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const FAMILY_MEMBER_PAGES = ['Bryan', 'Kate', 'Mara', 'Phoenix'];

export default function VoiceAssistant({ currentPageName }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [recognition, setRecognition] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-US';
      
      recog.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleVoiceCommand(text);
      };
      
      recog.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        toast.error('Could not understand audio');
      };
      
      recog.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recog);
    }
  }, []);

  const startListening = () => {
    if (recognition) {
      setTranscript('');
      setIsListening(true);
      setShowDialog(true);
      recognition.start();
    } else {
      toast.error('Voice recognition not supported on this device');
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const handleVoiceCommand = async (text) => {
    setIsProcessing(true);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Parse this voice command and determine the intent and extract relevant data: "${text}"
        
Available actions:
- add_appliance: User wants to add an appliance (extract: name, brand, model, room, purchase_date if mentioned)
- add_meal: User wants to add a meal or recipe
- add_activity: User wants to add a kids activity or event
- add_room: User wants to add a room
- question: User is asking a question
- other: Cannot determine intent

Return the intent and any extracted data. If you need more information to complete the action, set needs_followup: true and provide a follow_up_question.`,
        response_json_schema: {
          type: "object",
          properties: {
            intent: { type: "string" },
            needs_followup: { type: "boolean" },
            follow_up_question: { type: "string" },
            data: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                model: { type: "string" },
                room: { type: "string" },
                purchase_date: { type: "string" },
                title: { type: "string" },
                type: { type: "string" },
                location: { type: "string" },
                date: { type: "string" },
                description: { type: "string" }
              }
            }
          }
        }
      });

      if (result.needs_followup && result.follow_up_question) {
        setFollowUpQuestion(result.follow_up_question);
        setIsProcessing(false);
        return;
      }

      await executeAction(result.intent, result.data);
    } catch (error) {
      console.error('Error processing voice command:', error);
      toast.error('Error processing command');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFollowUp = async () => {
    setIsProcessing(true);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Original command: "${transcript}"
Follow-up question: "${followUpQuestion}"
User's answer: "${followUpAnswer}"

Parse this and extract complete data to add an appliance. Return: name, brand, model, room_name, purchase_date (YYYY-MM-DD if mentioned), serial_number if mentioned.`,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            brand: { type: "string" },
            model: { type: "string" },
            room_name: { type: "string" },
            purchase_date: { type: "string" },
            serial_number: { type: "string" }
          }
        }
      });

      await executeAction('add_appliance', result);
    } catch (error) {
      console.error('Error processing follow-up:', error);
      toast.error('Error processing answer');
    } finally {
      setIsProcessing(false);
      setFollowUpQuestion('');
      setFollowUpAnswer('');
    }
  };

  const executeAction = async (intent, data) => {
    try {
      switch (intent) {
        case 'add_appliance':
          if (data.brand && data.model && data.name) {
            await base44.entities.Appliance.create({
              name: data.name,
              brand: data.brand,
              model: data.model,
              room_name: data.room || data.room_name,
              purchase_date: data.purchase_date,
              serial_number: data.serial_number
            });
            toast.success(`Added ${data.brand} ${data.name} to House`);
            setTimeout(() => {
              navigate(createPageUrl('House'));
              setShowDialog(false);
            }, 1500);
          } else {
            toast.error('Missing required information');
          }
          break;
          
        case 'add_meal':
          if (data.name || data.title) {
            await base44.entities.Meal.create({
              name: data.name || data.title,
              type: data.type || 'dinner',
              kid_friendly: true,
              description: data.description
            });
            toast.success(`Added ${data.name || data.title} to Meals`);
            setTimeout(() => {
              navigate(createPageUrl('Meals'));
              setShowDialog(false);
            }, 1500);
          }
          break;
          
        case 'add_activity':
          if (data.title || data.name) {
            await base44.entities.KidsActivity.create({
              title: data.title || data.name,
              type: data.type || 'event',
              location: data.location,
              date: data.date,
              description: data.description
            });
            toast.success(`Added activity to Kids`);
            setTimeout(() => {
              navigate(createPageUrl('Kids'));
              setShowDialog(false);
            }, 1500);
          }
          break;
          
        case 'add_room':
          if (data.name) {
            await base44.entities.Room.create({
              name: data.name,
              description: data.description
            });
            toast.success(`Added ${data.name} room`);
            setTimeout(() => {
              navigate(createPageUrl('House'));
              setShowDialog(false);
            }, 1500);
          }
          break;
          
        default:
          toast.info('I understood you, but I\'m not sure what to do with that yet');
          setTimeout(() => setShowDialog(false), 2000);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error('Error completing action');
    }
  };

  if (FAMILY_MEMBER_PAGES.includes(currentPageName)) return null;

  return (
    <>
      <button
        onClick={startListening}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-[#E91E8C] to-[#0AACFF] shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
      >
        <Mic className="w-7 h-7 text-white" />
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Assistant</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center py-8">
              {isListening ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#E91E8C] to-[#0AACFF] flex items-center justify-center animate-pulse">
                    <Mic className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-sm text-gray-600">Listening...</p>
                  <Button onClick={stopListening} variant="outline" size="sm">
                    <MicOff className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </div>
              ) : isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                  <p className="text-sm text-gray-600">Processing...</p>
                  {transcript && (
                    <p className="text-sm text-gray-800 italic">"{transcript}"</p>
                  )}
                </div>
              ) : followUpQuestion ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-800 font-medium">{followUpQuestion}</p>
                  <textarea
                    value={followUpAnswer}
                    onChange={(e) => setFollowUpAnswer(e.target.value)}
                    className="w-full p-3 border rounded-lg text-sm"
                    rows={3}
                    placeholder="Type your answer..."
                  />
                  <Button 
                    onClick={handleFollowUp}
                    disabled={!followUpAnswer.trim()}
                    className="w-full bg-gradient-to-r from-[#E91E8C] to-[#0AACFF] text-white"
                  >
                    Submit
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mic className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">Tap the mic button to speak</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}