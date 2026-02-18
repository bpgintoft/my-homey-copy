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
      <div className="relative h-64 bg-gradient-to-r from-orange-500 to-orange-600 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-8">
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