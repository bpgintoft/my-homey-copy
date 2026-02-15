import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [imageUrls] = useState({
    meals: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/294a7181f_mealplanning.png',
    kids: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/64d88eba1_kidsactivities.png',
    house: null,
    history: null
  });
  const [heroBanner] = useState('https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&h=400&fit=crop');

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
      href: 'Meals', 
      stat: `${thisWeekMeals} meals planned`,
      imageKey: 'meals'
    },
    { 
      title: 'Kids Activities', 
      href: 'Kids', 
      stat: `${upcomingEvents} upcoming`,
      imageKey: 'kids'
    },
    { 
      title: 'House', 
      href: 'House', 
      stat: `${totalAppliances} appliances`,
      imageKey: 'house'
    },
    { 
      title: 'History', 
      href: 'History', 
      stat: 'Est. 1927',
      imageKey: 'history'
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <div className="relative overflow-hidden">
        {heroBanner ? (
          <div className="relative h-40">
            <img 
              src={heroBanner} 
              alt="Family Welcome"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
            <div className="absolute top-0 left-0 right-0 container mx-auto px-6 py-6">
              <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                Welcome Home
              </h1>
              <p className="text-white drop-shadow-md">
                1934 Church St
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#00D9A3] to-[#00B386] py-8">
            <div className="container mx-auto px-6">
              <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome Home
              </h1>
              <p className="text-white/90">
                1934 Church St
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="container mx-auto px-6 -mt-6 relative z-10">
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
        {isGenerating ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Creating your home buttons...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pb-24">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Link to={createPageUrl(section.href)}>
                  <div className="group cursor-pointer hover:scale-105 transition-all duration-300">
                    {imageUrls[section.imageKey] ? (
                      <div className="relative">
                        <img 
                          src={imageUrls[section.imageKey]} 
                          alt={section.title}
                          className="w-full h-auto rounded-3xl shadow-lg hover:shadow-2xl transition-shadow duration-300"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent rounded-b-3xl p-4">
                          <p className="text-sm text-white font-medium drop-shadow-md">{section.stat}</p>
                        </div>
                      </div>
                    ) : (
                      <Card className="border-0 shadow-lg hover:shadow-2xl transition-all bg-gray-100">
                        <CardContent className="p-5 flex flex-col h-48 items-center justify-center">
                          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}