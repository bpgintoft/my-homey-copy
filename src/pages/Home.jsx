import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import ChoreNotificationsDialog from '../components/ChoreNotificationsDialog';

export default function Home() {
  const [imageUrls] = useState({
    meals: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/294a7181f_mealplanning.png',
    kids: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/64d88eba1_kidsactivities.png',
    house: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/04b7513e6_house.png',
    history: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/2d4840f69_history.png'
  });
  const [familyImage] = useState('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/7afddfe7e_family.png');

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
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      const { data } = await base44.functions.invoke('getGoogleCalendarEvents', { 
        timeMin: startOfDay.toISOString(), 
        timeMax: endOfDay.toISOString() 
      });
      
      // Filter to only events that haven't ended yet
      const events = data.events || [];
      return events.filter(event => {
        if (!event.end) return true;
        const eventEnd = new Date(event.end);
        return eventEnd >= now;
      });
    }
  });

  const { data: appliances } = useQuery({
    queryKey: ['appliances'],
    queryFn: () => base44.entities.Appliance.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const bryanMember = familyMembers.find(m => m.name === 'Bryan') || { name: 'Bryan' };
  const kateMember = familyMembers.find(m => m.name === 'Kate') || { name: 'Kate' };
  const phoenixMember = familyMembers.find(m => m.name === 'Phoenix') || { name: 'Phoenix' };
  const maraMember = familyMembers.find(m => m.name === 'Mara') || { name: 'Mara' };

  const todayEvents = googleEvents?.length || 0;

  const sections = [
    { 
      title: 'Meal Planning', 
      href: 'Meals', 
      count: 0,
      imageKey: 'meals',
      bgColor: 'bg-gradient-to-br from-pink-200 to-pink-300'
    },
    { 
      title: 'Calendar', 
      href: 'Kids', 
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

      {/* Header */}
      <div className="relative overflow-hidden">
        <style>{`
          .banner-bg {
            background: linear-gradient(135deg, #C8F0E0 0%, #A8E6D3 50%, #88DCC8 100%);
            background-size: 400% 400%;
            position: relative;
          }
          .banner-bg::before {
            content: '';
            position: absolute;
            inset: 0;
            background: 
              repeating-linear-gradient(
                45deg,
                rgba(168, 230, 211, 0.6) 0px,
                rgba(168, 230, 211, 0.6) 10px,
                rgba(120, 200, 180, 0.4) 10px,
                rgba(120, 200, 180, 0.4) 20px,
                rgba(168, 230, 211, 0.6) 20px,
                rgba(168, 230, 211, 0.6) 25px,
                rgba(200, 240, 224, 0.3) 25px,
                rgba(200, 240, 224, 0.3) 30px
              ),
              radial-gradient(circle, rgba(120, 200, 180, 0.4) 2px, transparent 2px);
            background-size: 100% 100%, 15px 15px;
            background-position: 0 0, 7px 7px;
          }
          .section-btn {
            position: relative;
            overflow: hidden;
          }
          .section-btn::after {
            content: '';
            position: absolute;
            inset: 0;
            background-image: 
              repeating-linear-gradient(
                90deg,
                rgba(255, 255, 255, 0.1) 0px,
                rgba(255, 255, 255, 0.1) 1px,
                transparent 1px,
                transparent 2px
              ),
              repeating-linear-gradient(
                0deg,
                rgba(255, 255, 255, 0.1) 0px,
                rgba(255, 255, 255, 0.1) 1px,
                transparent 1px,
                transparent 2px
              );
            pointer-events: none;
          }
        `}</style>
        <div className="relative h-40 md:h-48 banner-bg">
          <div className="relative z-10 flex items-center justify-between px-4 md:px-12 gap-0 h-full">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-1 md:mb-2">
                Welcome Home
              </h1>
              <p className="text-sm md:text-lg text-gray-700">
                1934 Church St
              </p>
            </div>
            <Link to={createPageUrl('Family')}>
              <img 
                src={familyImage} 
                alt="Family Welcome"
                className="h-40 md:h-56 w-auto object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* Family Member Cards */}
      <div className="container mx-auto px-6 -mt-6 relative z-10">
        <div className="grid grid-cols-4 gap-2 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to={createPageUrl('Bryan')}>
              <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow cursor-pointer">
                <CardContent className="py-2 px-2 text-center">
                  <div className="text-sm font-bold text-gray-900">{bryanMember.name}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to={createPageUrl('Kate')}>
              <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow cursor-pointer">
                <CardContent className="py-2 px-2 text-center">
                  <div className="text-sm font-bold text-gray-900">{kateMember.name}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link to={createPageUrl('Phoenix')}>
              <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow cursor-pointer">
                <CardContent className="py-2 px-2 text-center">
                  <div className="text-sm font-bold text-gray-900">{phoenixMember.name}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link to={createPageUrl('Mara')}>
              <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow cursor-pointer">
                <CardContent className="py-2 px-2 text-center">
                  <div className="text-sm font-bold text-gray-900">{maraMember.name}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-2 gap-4 pb-8">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link to={createPageUrl(section.href)}>
                <div className="group cursor-pointer hover:scale-105 transition-all duration-300 relative">
                  {section.count > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg z-10">
                      {section.count}
                    </div>
                  )}
                  <div className={`section-btn rounded-3xl shadow-lg hover:shadow-2xl transition-all ${section.bgColor} p-6 flex flex-col items-center justify-center h-36`}>
                    {imageUrls[section.imageKey] && (
                      <img 
                        src={imageUrls[section.imageKey]} 
                        alt={section.title}
                        className="w-32 h-32 object-contain mb-3"
                      />
                    )}
                    <h3 className="text-lg font-bold text-white drop-shadow-lg whitespace-nowrap">{section.title}</h3>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer Image */}
        <Link to={createPageUrl('Family')}>
          <div className="w-full flex justify-center pb-6 cursor-pointer">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/8e2cf008e_Gintoftsback.png"
              alt="Gintoft Family"
              className="w-full max-w-lg h-auto object-contain"
            />
          </div>
        </Link>
      </div>
    </div>
  );
}