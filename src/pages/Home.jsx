import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  UtensilsCrossed,
  Calendar,
  Home as HomeIcon,
  History,
  ArrowRight,
  ChefHat,
  Users
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import VoiceAssistant from '../components/VoiceAssistant';

export default function Home() {
  const { data: mealPlans } = useQuery({
    queryKey: ['thisWeekMeals'],
    queryFn: () => base44.entities.MealPlan.list(),
  });

  const { data: activities } = useQuery({
    queryKey: ['upcomingActivities'],
    queryFn: () => base44.entities.KidsActivity.list(),
  });

  const { data: appliances } = useQuery({
    queryKey: ['appliances'],
    queryFn: () => base44.entities.Appliance.list(),
  });

  const thisWeekMeals = mealPlans?.length || 0;
  const upcomingEvents = activities?.filter(a => !a.reminder_sent)?.length || 0;
  const totalAppliances = appliances?.length || 0;

  const sections = [
    { 
      title: 'Meal Planning', 
      description: 'Weekly meals & grocery lists',
      icon: UtensilsCrossed, 
      href: 'Meals', 
      color: 'from-[#E91E8C] to-[#D01576]',
      stat: `${thisWeekMeals} meals planned`,
      bgColor: 'bg-pink-50'
    },
    { 
      title: 'Kids Activities', 
      description: 'Events, programs & reminders',
      icon: Calendar, 
      href: 'Kids', 
      color: 'from-[#0AACFF] to-[#0890D9]',
      stat: `${upcomingEvents} upcoming`,
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'House', 
      description: 'Rooms, appliances & organization',
      icon: HomeIcon, 
      href: 'House', 
      color: 'from-[#00D9A3] to-[#00B386]',
      stat: `${totalAppliances} appliances`,
      bgColor: 'bg-emerald-50'
    },
    { 
      title: 'History', 
      description: 'Property history & details',
      icon: History, 
      href: 'History', 
      color: 'from-[#FFB800] to-[#E5A200]',
      stat: 'Est. 1934',
      bgColor: 'bg-amber-50'
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <VoiceAssistant />
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        <div 
          className="h-[35vh] min-h-[280px] bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/19322ed38_image.png)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-white" />
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
              Welcome Home
            </h1>
            <p className="text-lg text-white/90">
              1934 Church St, Wauwatosa
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link to={createPageUrl(section.href)}>
                <Card className="group cursor-pointer border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <div className={`h-1.5 bg-gradient-to-r ${section.color}`} />
                    <div className="p-6">
                      <div className={`w-16 h-16 rounded-2xl ${section.bgColor} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300`}>
                        <section.icon className="w-8 h-8 text-gray-700" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{section.title}</h3>
                      <p className="text-sm text-gray-500 mb-3">{section.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">{section.stat}</span>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}