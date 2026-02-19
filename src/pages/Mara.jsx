import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FamilyMemberDetails from '../components/FamilyMemberDetails';

export default function MaraPage() {
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const mara = familyMembers.find(m => m.name === 'Mara');

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <style>{`
        .mara-banner {
          background: linear-gradient(135deg, #FFE5B4 0%, #FFDAB9 50%, #FFB6C1 100%);
          position: relative;
        }
        .mara-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(
              45deg,
              rgba(255, 229, 180, 0.6) 0px,
              rgba(255, 229, 180, 0.6) 10px,
              rgba(255, 182, 193, 0.4) 10px,
              rgba(255, 182, 193, 0.4) 20px,
              rgba(255, 229, 180, 0.6) 20px,
              rgba(255, 229, 180, 0.6) 25px,
              rgba(255, 240, 220, 0.3) 25px,
              rgba(255, 240, 220, 0.3) 30px
            ),
            radial-gradient(circle, rgba(255, 182, 193, 0.4) 2px, transparent 2px);
          background-size: 100% 100%, 15px 15px;
          background-position: 0 0, 7px 7px;
        }
      `}</style>
      <div className="relative h-64 overflow-hidden mara-banner">
        <div className="relative z-10 h-full flex items-center px-6 sm:px-8">
          <motion.h1 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-7xl font-bold text-white drop-shadow-lg"
            style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}
          >
            Mara
          </motion.h1>
          <motion.img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/ad7a0defd_Marapage.png"
            alt="Mara"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="absolute right-0 top-1 h-80 w-auto object-contain"
          />
        </div>
      </div>

      {mara && <FamilyMemberDetails memberId={mara.id} memberName="Mara" color="purple" />}
    </div>
  );
}