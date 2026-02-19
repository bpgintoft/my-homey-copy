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
              rgba(132, 204, 22, 0.6) 0px,
              rgba(132, 204, 22, 0.6) 10px,
              rgba(101, 163, 13, 0.4) 10px,
              rgba(101, 163, 13, 0.4) 20px,
              rgba(132, 204, 22, 0.6) 20px,
              rgba(132, 204, 22, 0.6) 25px,
              rgba(163, 230, 53, 0.3) 25px,
              rgba(163, 230, 53, 0.3) 30px
            ),
            radial-gradient(circle, rgba(101, 163, 13, 0.4) 2px, transparent 2px);
          background-size: 100% 100%, 15px 15px;
          background-position: 0 0, 7px 7px;
        }
      `}</style>
      <div className="relative h-screen bg-gradient-to-br from-lime-500 to-lime-600 overflow-hidden kate-banner">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/6d06cb23a_Katepage.png"
            alt="Kate"
            className="h-[85vh] w-auto object-contain relative z-10"
            style={{ 
              objectPosition: 'center',
              maxHeight: '85vh'
            }}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-20 p-6 sm:p-8 bg-gradient-to-t from-black/40 to-transparent">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl sm:text-6xl font-bold text-white drop-shadow-lg"
          >
            Kate
          </motion.h1>
        </div>
      </div>

      {kate && <FamilyMemberDetails memberId={kate.id} memberName="Kate" color="lime" />}
    </div>
  );
}