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

export default function PhoenixPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const phoenix = familyMembers.find(m => m.name === 'Phoenix');

  const handleSwipe = (direction) => {
    if (direction === 'left') {
      navigate(createPageUrl('Mara'));
    } else if (direction === 'right') {
      navigate(createPageUrl('Kate'));
    }
  };

  useSwipe(handleSwipe, bannerRef);

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(to bottom, #FFF0E6 0%, #FFF0E6 60%, #FFD5B8 100%)' }}>
      <div className="phoenix-page-stripes" />
      <style>{`
        .phoenix-banner {
          background: linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%);
          position: relative;
        }
        .phoenix-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(
              45deg,
              rgba(251, 146, 60, 0.6) 0px,
              rgba(251, 146, 60, 0.6) 10px,
              rgba(234, 88, 12, 0.4) 10px,
              rgba(234, 88, 12, 0.4) 20px,
              rgba(251, 146, 60, 0.6) 20px,
              rgba(251, 146, 60, 0.6) 25px,
              rgba(249, 115, 22, 0.3) 25px,
              rgba(249, 115, 22, 0.3) 30px
            ),
            radial-gradient(circle, rgba(234, 88, 12, 0.4) 2px, transparent 2px);
          background-size: 100% 100%, 15px 15px;
          background-position: 0 0, 7px 7px;
        }
        .phoenix-page-stripes {
          position: absolute;
          inset: 0;
          min-height: 100%;
          pointer-events: none;
          z-index: 0;
          background:
            repeating-linear-gradient(
              45deg,
              rgba(249, 115, 22, 0.7) 0px,
              rgba(249, 115, 22, 0.7) 10px,
              rgba(253, 186, 116, 0.4) 10px,
              rgba(253, 186, 116, 0.4) 20px,
              rgba(249, 115, 22, 0.7) 20px,
              rgba(249, 115, 22, 0.7) 25px,
              rgba(251, 146, 60, 0.3) 25px,
              rgba(251, 146, 60, 0.3) 30px
            );
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,1) 70%, rgba(0,0,0,1) 100%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,1) 70%, rgba(0,0,0,1) 100%);
        }
      `}</style>
      <div ref={bannerRef} className="relative h-64 overflow-hidden phoenix-banner">
        <div className="relative z-10 h-full flex items-center px-6 sm:px-8">
          <motion.h1
            key="phoenix-title"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-7xl font-bold text-white drop-shadow-lg"
            style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}
          >
            Phoenix
          </motion.h1>
          <motion.img
            key="phoenix-img"
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/a53d7db8e_Phoenixpage.png"
            alt="Phoenix"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="absolute right-0 top-1 h-80 w-auto object-contain"
          />
        </div>
      </div>

      {phoenix && (
        <>
          <ChoreNotificationsDialog memberId={phoenix.id} />
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-6 space-y-4">
            <FamilyMemberDetails memberId={phoenix.id} memberName="Phoenix" color="orange" />
          </div>
        </>
      )}
    </div>
  );
}