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
      
      {/* Header */}
      <div className="bg-gradient-to-br from-[#00D9A3] to-[#00B386] py-8">
        <div className="container mx-auto px-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome Home
          </h1>
          <p className="text-white/90">
            1934 Church St
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="container mx-auto px-6 -mt-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{thisWeekMeals}</div>
              <div className="text-xs text-gray-500">Meals</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{upcomingEvents}</div>
              <div className="text-xs text-gray-500">Events</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalAppliances}</div>
              <div className="text-xs text-gray-500">Items</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-2 gap-4 pb-24">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link to={createPageUrl(section.href)}>
                <Card className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden bg-white h-full">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className={`w-14 h-14 rounded-2xl ${section.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <section.icon className="w-7 h-7 text-gray-700" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{section.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 flex-1">{section.stat}</p>
                    <div className={`w-full h-1 rounded-full bg-gradient-to-r ${section.color}`} />
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