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
      bgColor: 'bg-[#FF9DBD]',
      stat: `${thisWeekMeals} meals planned`
    },
    { 
      title: 'Kids Activities', 
      description: 'Events, programs & reminders',
      icon: Calendar, 
      href: 'Kids', 
      bgColor: 'bg-[#7DD3FC]',
      stat: `${upcomingEvents} upcoming`
    },
    { 
      title: 'House', 
      description: 'Rooms, appliances & organization',
      icon: HomeIcon, 
      href: 'House', 
      bgColor: 'bg-[#5EEAD4]',
      stat: `${totalAppliances} appliances`
    },
    { 
      title: 'History', 
      description: 'Property history & details',
      icon: History, 
      href: 'History', 
      bgColor: 'bg-[#FDBA74]',
      stat: 'Est. 1927'
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
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
        <div className="grid grid-cols-2 gap-6 pb-24">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link to={createPageUrl(section.href)}>
                <div className={`group cursor-pointer ${section.bgColor} rounded-[40px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.18)] hover:scale-[1.02] transition-all duration-300 aspect-square flex flex-col items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10 bg-white rounded-[40px]"></div>
                  <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                    <div className="mb-6 transform group-hover:scale-110 transition-transform duration-300">
                      <section.icon className="w-24 h-24 text-white drop-shadow-lg" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-bold text-white text-center drop-shadow-md">{section.title}</h3>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}