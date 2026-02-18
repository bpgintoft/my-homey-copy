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
        .mara-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(
              45deg,
              rgba(168, 85, 247, 0.6) 0px,
              rgba(168, 85, 247, 0.6) 10px,
              rgba(147, 51, 234, 0.4) 10px,
              rgba(147, 51, 234, 0.4) 20px,
              rgba(168, 85, 247, 0.6) 20px,
              rgba(168, 85, 247, 0.6) 25px,
              rgba(192, 132, 252, 0.3) 25px,
              rgba(192, 132, 252, 0.3) 30px
            ),
            radial-gradient(circle, rgba(147, 51, 234, 0.4) 2px, transparent 2px);
          background-size: 100% 100%, 15px 15px;
          background-position: 0 0, 7px 7px;
        }
      `}</style>
      <div className="relative h-64 bg-gradient-to-r from-purple-500 to-purple-600 overflow-hidden mara-banner">
        <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-white"
          >
            Mara
          </motion.h1>
        </div>
      </div>

      {mara && <FamilyMemberDetails memberId={mara.id} memberName="Mara" color="purple" />}
    </div>
  );
}