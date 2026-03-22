import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useSwipe } from '../components/useSwipe';
import FamilyMemberDetails from '../components/FamilyMemberDetails';
import ChoreNotificationsDialog from '../components/ChoreNotificationsDialog';
import { useQueryClient } from '@tanstack/react-query';

export default function BryanPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const bryan = familyMembers.find(m => m.name === 'Bryan');

  const handleSwipe = (direction) => {
    if (direction === 'left') {
      navigate(createPageUrl('Kate'));
    } else if (direction === 'right') {
      navigate(createPageUrl('Mara'));
    }
  };

  useSwipe(handleSwipe, bannerRef);

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(to bottom, #EEF5FF 0%, #EEF5FF 60%, #C8DEFF 100%)' }}>
      <div className="bryan-page-stripes" />
      <style>{`
        .bryan-banner {
          background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%);
          position: relative;
        }
        .bryan-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(
              45deg,
              rgba(96, 165, 250, 0.6) 0px,
              rgba(96, 165, 250, 0.6) 10px,
              rgba(37, 99, 235, 0.4) 10px,
              rgba(37, 99, 235, 0.4) 20px,
              rgba(96, 165, 250, 0.6) 20px,
              rgba(96, 165, 250, 0.6) 25px,
              rgba(59, 130, 246, 0.3) 25px,
              rgba(59, 130, 246, 0.3) 30px
            ),
            radial-gradient(circle, rgba(37, 99, 235, 0.4) 2px, transparent 2px);
          background-size: 100% 100%, 15px 15px;
          background-position: 0 0, 7px 7px;
        }
        .bryan-page-stripes {
          position: absolute;
          inset: 0;
          min-height: 100%;
          pointer-events: none;
          z-index: 0;
          background:
            repeating-linear-gradient(
              45deg,
              rgba(147, 197, 253, 0.18) 0px,
              rgba(147, 197, 253, 0.18) 10px,
              rgba(96, 165, 250, 0.10) 10px,
              rgba(96, 165, 250, 0.10) 20px,
              rgba(147, 197, 253, 0.18) 20px,
              rgba(147, 197, 253, 0.18) 25px,
              rgba(59, 130, 246, 0.07) 25px,
              rgba(59, 130, 246, 0.07) 30px
            );
          -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0) 55%);
          mask-image: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0) 55%);
        }
      `}</style>
      <div ref={bannerRef} className="relative h-64 overflow-hidden bryan-banner">
        <div className="relative z-10 h-full flex items-center px-6 sm:px-8">
          <motion.h1
            key="bryan-title"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-7xl font-bold text-white drop-shadow-lg"
            style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}
          >
            Bryan
          </motion.h1>
          <motion.img
            key="bryan-img"
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/6d78c2f2c_Bryanpage.png"
            alt="Bryan"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="absolute right-0 top-1 h-80 w-auto object-contain"
          />
        </div>
      </div>

      {bryan && (
        <>
          <ChoreNotificationsDialog memberId={bryan.id} />
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-6 space-y-4">
            <FamilyMemberDetails memberId={bryan.id} memberName="Bryan" color="blue" />
          </div>
        </>
      )}
    </div>
  );
}