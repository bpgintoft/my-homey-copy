import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import ChoreNotificationsDialog from '../components/ChoreNotificationsDialog';
import RoundaboutGrid from '../components/RoundaboutGrid';
import FamilyPortraitBanner from '../components/FamilyPortraitBanner';

export default function Home() {
  const [imageUrls] = useState({
    meals: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/294a7181f_mealplanning.png',
    kids: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/64d88eba1_kidsactivities.png',
    house: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/04b7513e6_house.png',
    history: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/2d4840f69_history.png'
  });
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['thisWeekMeals'],
    queryFn: () => base44.entities.MealPlan.list(),
  });

  const { data: googleEvents = [] } = useQuery({
    queryKey: ['todayGoogleEvents'],
    queryFn: async () => {
      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        const { data } = await base44.functions.invoke('getGoogleCalendarEvents', { 
          timeMin: startOfDay.toISOString(), 
          timeMax: endOfDay.toISOString() 
        });
        
        const events = data.events || [];
        return events.filter(event => {
          if (!event.end) return true;
          const eventEnd = new Date(event.end);
          return eventEnd >= now;
        });
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: appliances } = useQuery({
    queryKey: ['appliances'],
    queryFn: () => base44.entities.RoomItem.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const sortedMembers = [...familyMembers].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const todayEvents = googleEvents?.length || 0;

  const sections = [
    { 
      title: 'Meals', 
      href: 'Meals', 
      count: 0,
      imageKey: 'meals',
      bgColor: 'bg-gradient-to-br from-pink-200 to-pink-300'
    },
    { 
      title: 'Calendar', 
      href: 'Calendar', 
      count: todayEvents,
      imageKey: 'kids',
      bgColor: 'bg-gradient-to-br from-blue-200 to-blue-300'
    },
    { 
      title: 'House', 
      href: 'House', 
      count: 0,
      imageKey: 'house',
      bgColor: 'bg-gradient-to-br from-green-200 to-green-300'
    },
    { 
      title: 'History', 
      href: 'History', 
      count: 0,
      imageKey: 'history',
      bgColor: 'bg-gradient-to-br from-amber-200 to-amber-300'
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {currentUser && <ChoreNotificationsDialog memberId={currentUser.email} />}

      {/* Header — Dynamic Portrait Banner */}
      <div className="relative overflow-hidden">
        <div className="absolute top-3 left-4 z-20">
          <h1 className="text-2xl md:text-3xl font-bold text-stone-700 drop-shadow-sm">
            Welcome Home
          </h1>
        </div>
        <Link to={createPageUrl('Family')}>
          <FamilyPortraitBanner members={sortedMembers} />
        </Link>
      </div>

      {/* Family Member Cards */}
      <div className="container mx-auto px-6 -mt-6 relative z-10">
        <div className="grid grid-cols-4 gap-2 mb-6">
          {sortedMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Link to={createPageUrl(member.name)}>
                <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow cursor-pointer">
                  <CardContent className="py-2 px-2 text-center">
                    <div className="text-sm font-bold text-gray-900">{member.name}</div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Main Sections - Roundabout Layout */}
        <RoundaboutGrid sections={sections} imageUrls={imageUrls} />


      </div>
    </div>
  );
}