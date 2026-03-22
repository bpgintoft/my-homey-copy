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

export default function MaraPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const mara = familyMembers.find(m => m.name === 'Mara');

  const handleSwipe = (direction) => {
    if (direction === 'left') {
      navigate(createPageUrl('Bryan'));
    } else if (direction === 'right') {
      navigate(createPageUrl('Phoenix'));
    }
  };

  useSwipe(handleSwipe, bannerRef);

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(to bottom, #FFF0F4 0%, #FFF0F4 60%, #FFD0DC 100%)' }}>
      <div className="mara-page-stripes" />
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
        .mara-page-stripes {
          position: absolute;
          inset: 0;
          min-height: 100%;
          pointer-events: none;
          z-index: 0;
          background:
            repeating-linear-gradient(
              45deg,
              rgba(255, 182, 193, 0.18) 0px,
              rgba(255, 182, 193, 0.18) 10px,
              rgba(255, 150, 170, 0.10) 10px,
              rgba(255, 150, 170, 0.10) 20px,
              rgba(255, 182, 193, 0.18) 20px,
              rgba(255, 182, 193, 0.18) 25px,
              rgba(236, 72, 153, 0.07) 25px,
              rgba(236, 72, 153, 0.07) 30px
            );
          -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0) 55%);
          mask-image: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0) 55%);
        }
      `}</style>
      <div ref={bannerRef} className="relative h-64 overflow-hidden mara-banner">
        <div className="relative z-10 h-full flex items-center px-6 sm:px-8">
          <motion.h1
            key="mara-title"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-7xl font-bold text-white drop-shadow-lg"
            style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}
          >
            Mara
          </motion.h1>
          <motion.img
            key="mara-img"
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/ad7a0defd_Marapage.png"
            alt="Mara"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="absolute right-0 top-1 h-80 w-auto object-contain"
          />
        </div>
      </div>

      {mara && (
        <>
          <ChoreNotificationsDialog memberId={mara.id} />
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-6 space-y-4">
            <FamilyMemberDetails memberId={mara.id} memberName="Mara" color="purple" />
          </div>
        </>
      )}
    </div>
  );
}