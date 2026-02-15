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
      gradient: 'from-[#FF6B9D] via-[#FF85B0] to-[#FFA5C4]',
      stat: `${thisWeekMeals} meals planned`,
      iconBg: 'bg-gradient-to-br from-white to-pink-100',
      iconColor: 'text-pink-600'
    },
    { 
      title: 'Kids Activities', 
      description: 'Events, programs & reminders',
      icon: Calendar, 
      href: 'Kids', 
      gradient: 'from-[#4FC3F7] via-[#6DD5FA] to-[#89E7FE]',
      stat: `${upcomingEvents} upcoming`,
      iconBg: 'bg-gradient-to-br from-white to-blue-100',
      iconColor: 'text-blue-600'
    },
    { 
      title: 'House', 
      description: 'Rooms, appliances & organization',
      icon: HomeIcon, 
      href: 'House', 
      gradient: 'from-[#26E2A3] via-[#4EEEB3] to-[#6FFAC4]',
      stat: `${totalAppliances} appliances`,
      iconBg: 'bg-gradient-to-br from-white to-emerald-100',
      iconColor: 'text-emerald-600'
    },
    { 
      title: 'History', 
      description: 'Property history & details',
      icon: History, 
      href: 'History', 
      gradient: 'from-[#FFB347] via-[#FFC870] to-[#FFDA94]',
      stat: 'Est. 1927',
      iconBg: 'bg-gradient-to-br from-white to-amber-100',
      iconColor: 'text-amber-600'
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
                <Card className={`group cursor-pointer border-0 shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden h-full bg-gradient-to-br ${section.gradient}`}>
                  <CardContent className="p-5 flex flex-col h-full relative">
                    <div className={`w-16 h-16 rounded-3xl ${section.iconBg} shadow-md flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform duration-300`}>
                      <section.icon className={`w-8 h-8 ${section.iconColor}`} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 drop-shadow-sm">{section.title}</h3>
                    <p className="text-sm text-white/90 font-medium drop-shadow-sm">{section.stat}</p>
                    <div className="absolute bottom-3 right-3 opacity-20">
                      <section.icon className="w-16 h-16 text-white" strokeWidth={1} />
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