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
        .phoenix-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(
              45deg,
              rgba(249, 115, 22, 0.6) 0px,
              rgba(249, 115, 22, 0.6) 10px,
              rgba(234, 88, 12, 0.4) 10px,
              rgba(234, 88, 12, 0.4) 20px,
              rgba(249, 115, 22, 0.6) 20px,
              rgba(249, 115, 22, 0.6) 25px,
              rgba(251, 146, 60, 0.3) 25px,
              rgba(251, 146, 60, 0.3) 30px
            ),
            radial-gradient(circle, rgba(234, 88, 12, 0.4) 2px, transparent 2px);
          background-size: 100% 100%, 15px 15px;
          background-position: 0 0, 7px 7px;
        }
      `}</style>
      <div className="relative h-64 bg-gradient-to-r from-orange-500 to-orange-600 overflow-hidden phoenix-banner">
        <div className="absolute right-0 sm:right-8 bottom-0 z-10 h-48 sm:h-56 w-auto">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/bce10fc11_Phoenixpage.png"
            alt="Phoenix"
            className="h-full w-auto object-contain"
            style={{ mixBlendMode: 'multiply' }}
          />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-8 pr-40 sm:pr-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-white"
          >
            Phoenix
          </motion.h1>
        </div>
      </div>

      {phoenix && <FamilyMemberDetails memberId={phoenix.id} memberName="Phoenix" color="orange" />}
    </div>
  );
}