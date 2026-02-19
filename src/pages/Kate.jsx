import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FamilyMemberDetails from '../components/FamilyMemberDetails';

export default function KatePage() {
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const kate = familyMembers.find(m => m.name === 'Kate');

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <style>{`
        .kate-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(
              45deg,
              rgba(236, 72, 153, 0.6) 0px,
              rgba(236, 72, 153, 0.6) 10px,
              rgba(219, 39, 119, 0.4) 10px,
              rgba(219, 39, 119, 0.4) 20px,
              rgba(236, 72, 153, 0.6) 20px,
              rgba(236, 72, 153, 0.6) 25px,
              rgba(244, 114, 182, 0.3) 25px,
              rgba(244, 114, 182, 0.3) 30px
            ),
            radial-gradient(circle, rgba(219, 39, 119, 0.4) 2px, transparent 2px);
          background-size: 100% 100%, 15px 15px;
          background-position: 0 0, 7px 7px;
        }
      `}</style>
      <div className="relative h-64 bg-gradient-to-r from-pink-500 to-pink-600 overflow-hidden kate-banner">
        <div className="relative z-10 h-full flex items-end justify-between p-6 sm:p-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-white pb-2"
          >
            Kate
          </motion.h1>
          <motion.img
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/6d06cb23a_Katepage.png"
            alt="Kate"
            className="h-56 w-auto object-contain"
            style={{ position: 'relative', zIndex: 20 }}
          />
        </div>
      </div>

      {kate && <FamilyMemberDetails memberId={kate.id} memberName="Kate" color="pink" />}
    </div>
  );
}