import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Home() {
  // Static image URLs - generated once
  const heroBanner = 'https://image.pollinations.ai/prompt/Cartoon%20illustration%20of%20a%20happy%20family%20of%204%20-%20mother%2C%20father%2C%20young%20girl%20(age%204)%2C%20and%20young%20boy%20(age%209)%20-%20sitting%20together%20outdoors%20in%20a%20lush%20green%20park%20or%20backyard.%20Vibrant%20colors%2C%20warm%20and%20friendly%20style%2C%20showing%20love%20and%20togetherness.%20Beautiful%20trees%20and%20nature%20in%20background.%20Rounded%20corners%2C%20bright%20and%20cheerful%2C%20suitable%20as%20a%20welcome%20banner.%20Family%20wearing%20casual%20outdoor%20clothing%2C%20big%20smiles%2C%20Disney%2FPixar%20animation%20style?width=1200&height=400&seed=42';
  
  const imageUrls = {
    meals: 'https://image.pollinations.ai/prompt/3D%20cartoon%20illustration%20button%20with%20rounded%20square%20shape%20and%20pink%20gradient%20background.%20Shows%20a%20clipboard%20with%20checkmarks%2C%20a%20colorful%20pencil%2C%20fresh%20vegetables%20(carrot%2C%20tomatoes)%2C%20and%20a%20plate%20with%20bread.%20Cute%2C%20playful%20style%20with%20soft%20shadows.%20Icon%20style%2C%20vibrant%20colors%2C%20isometric%20view%2C%20clean%20design?width=500&height=500&seed=101',
    kids: 'https://image.pollinations.ai/prompt/3D%20cartoon%20illustration%20button%20with%20rounded%20square%20shape%20and%20light%20blue%20gradient%20background.%20Shows%20a%20soccer%20ball%2C%20jump%20rope%20in%20red%2C%20and%20a%20calendar%20with%20stars%20marked.%20Cute%2C%20playful%20style%20with%20soft%20shadows.%20Icon%20style%2C%20vibrant%20colors%2C%20isometric%20view%2C%20clean%20design?width=500&height=500&seed=102',
    house: 'https://image.pollinations.ai/prompt/3D%20cartoon%20illustration%20button%20with%20rounded%20square%20shape%20and%20green%20gradient%20background.%20Shows%20a%20beautiful%20two-story%20brick%20house%20with%20glowing%20windows%2C%20white%20door%2C%20surrounded%20by%20green%20trees%20and%20bushes%2C%20front%20porch%20with%20lights.%20Cute%2C%20playful%20style%20with%20soft%20shadows.%20Icon%20style%2C%20vibrant%20colors%2C%20isometric%20view%2C%20clean%20design?width=500&height=500&seed=103',
    history: 'https://image.pollinations.ai/prompt/3D%20cartoon%20illustration%20button%20with%20rounded%20square%20shape%20and%20warm%20yellow%2Forange%20gradient%20background.%20Shows%20an%20old%20parchment%20scroll%20with%20a%20sepia-toned%20house%20illustration%2C%20and%20a%20magnifying%20glass%20examining%20details.%20Cute%2C%20playful%20style%20with%20soft%20shadows.%20Icon%20style%2C%20vibrant%20colors%2C%20isometric%20view%2C%20clean%20design?width=500&height=500&seed=104'
  };

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
        <div className="relative h-40">
          <img 
            src={heroBanner} 
            alt="Family Welcome"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
              Welcome Home
            </h1>
            <p className="text-white drop-shadow-md">
              1934 Church St
            </p>
          </div>
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
                <div className="group cursor-pointer hover:scale-105 transition-all duration-300">
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
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}