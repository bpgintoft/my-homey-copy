import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FamilyMemberDetails from '../components/FamilyMemberDetails';

export default function PhoenixPage() {
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const phoenix = familyMembers.find(m => m.name === 'Phoenix');

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <style>{`
        .phoenix-banner {
          background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1D4ED8 100%);
          position: relative;
        }
        .phoenix-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(
              45deg,
              rgba(96, 165, 250, 0.6) 0px,
              rgba(96, 165, 250, 0.6) 10px,
              rgba(29, 78, 216, 0.4) 10px,
              rgba(29, 78, 216, 0.4) 20px,
              rgba(96, 165, 250, 0.6) 20px,
              rgba(96, 165, 250, 0.6) 25px,
              rgba(59, 130, 246, 0.3) 25px,
              rgba(59, 130, 246, 0.3) 30px
            ),
            radial-gradient(circle, rgba(29, 78, 216, 0.4) 2px, transparent 2px);
          background-size: 100% 100%, 15px 15px;
          background-position: 0 0, 7px 7px;
        }
      `}</style>
      <div className="relative h-64 overflow-hidden phoenix-banner">
        <div className="relative z-10 h-full flex items-center px-6 sm:px-8">
          <motion.h1 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-7xl font-bold text-white drop-shadow-lg"
            style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}
          >
            Phoenix
          </motion.h1>
          <motion.img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/bb740f9f7_Phoenixpage.png"
            alt="Phoenix"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="absolute right-0 top-1 h-80 w-auto object-contain"
          />
        </div>
      </div>

      {phoenix && <FamilyMemberDetails memberId={phoenix.id} memberName="Phoenix" color="orange" />}
    </div>
  );
}