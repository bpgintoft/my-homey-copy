import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useSwipe } from './useSwipe';
import FamilyMemberDetails from './FamilyMemberDetails';
import ChoreNotificationsDialog from './ChoreNotificationsDialog';

// Per-member theme config
const MEMBER_CONFIG = {
  Bryan: {
    color: 'blue',
    pageBackground: 'linear-gradient(to bottom, #EEF5FF 0%, #EEF5FF 60%, #C8DEFF 100%)',
    pageStripeColor1: 'rgba(59, 130, 246, 0.7)',
    pageStripeColor2: 'rgba(147, 197, 253, 0.4)',
    pageStripeColor3: 'rgba(96, 165, 250, 0.3)',
    bottomGlow: 'rgba(29, 78, 216, 0.5)',
    bannerGradient: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)',
    bannerStripe1: 'rgba(96, 165, 250, 0.6)',
    bannerStripe2: 'rgba(37, 99, 235, 0.4)',
    bannerStripe3: 'rgba(59, 130, 246, 0.3)',
    bannerDot: 'rgba(37, 99, 235, 0.4)',
    photoUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/6d78c2f2c_Bryanpage.png',
    swipeLeft: 'Kate',
    swipeRight: 'Mara',
  },
  Kate: {
    color: 'green',
    pageBackground: 'linear-gradient(to bottom, #E4F8ED 0%, #E4F8ED 60%, #B8EDCF 100%)',
    pageStripeColor1: 'rgba(16, 185, 129, 0.7)',
    pageStripeColor2: 'rgba(110, 231, 183, 0.4)',
    pageStripeColor3: 'rgba(52, 211, 153, 0.3)',
    bottomGlow: 'rgba(4, 120, 87, 0.5)',
    bannerGradient: 'linear-gradient(135deg, #A7F3D0 0%, #6EE7B7 50%, #34D399 100%)',
    bannerStripe1: 'rgba(167, 243, 208, 0.6)',
    bannerStripe2: 'rgba(52, 211, 153, 0.4)',
    bannerStripe3: 'rgba(110, 231, 183, 0.3)',
    bannerDot: 'rgba(52, 211, 153, 0.4)',
    photoUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/6d06cb23a_Katepage.png',
    swipeLeft: 'Phoenix',
    swipeRight: 'Bryan',
  },
  Phoenix: {
    color: 'orange',
    pageBackground: 'linear-gradient(to bottom, #FFF0E6 0%, #FFF0E6 60%, #FFD5B8 100%)',
    pageStripeColor1: 'rgba(249, 115, 22, 0.7)',
    pageStripeColor2: 'rgba(253, 186, 116, 0.4)',
    pageStripeColor3: 'rgba(251, 146, 60, 0.3)',
    bottomGlow: 'rgba(180, 83, 9, 0.5)',
    bannerGradient: 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
    bannerStripe1: 'rgba(251, 146, 60, 0.6)',
    bannerStripe2: 'rgba(234, 88, 12, 0.4)',
    bannerStripe3: 'rgba(249, 115, 22, 0.3)',
    bannerDot: 'rgba(234, 88, 12, 0.4)',
    photoUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/a53d7db8e_Phoenixpage.png',
    swipeLeft: 'Mara',
    swipeRight: 'Kate',
  },
  Mara: {
    color: 'purple',
    pageBackground: 'linear-gradient(to bottom, #FFF0F4 0%, #FFF0F4 60%, #FFD0DC 100%)',
    pageStripeColor1: 'rgba(236, 72, 153, 0.7)',
    pageStripeColor2: 'rgba(255, 182, 193, 0.4)',
    pageStripeColor3: 'rgba(255, 150, 170, 0.3)',
    bottomGlow: 'rgba(157, 23, 77, 0.5)',
    bannerGradient: 'linear-gradient(135deg, #FFE5B4 0%, #FFDAB9 50%, #FFB6C1 100%)',
    bannerStripe1: 'rgba(255, 229, 180, 0.6)',
    bannerStripe2: 'rgba(255, 182, 193, 0.4)',
    bannerStripe3: 'rgba(255, 240, 220, 0.3)',
    bannerDot: 'rgba(255, 182, 193, 0.4)',
    photoUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/ad7a0defd_Marapage.png',
    swipeLeft: 'Bryan',
    swipeRight: 'Phoenix',
  },
};

export default function FamilyMemberPage({ memberName }) {
  const cfg = MEMBER_CONFIG[memberName];
  const bannerRef = useRef(null);
  const navigate = useNavigate();

  const { data: familyMembers = [], isLoading } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const member = familyMembers.find(m => m.name === memberName);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: cfg.pageBackground }}>
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: cfg.pageBackground }}>
        <div className="text-gray-500">Family member not found</div>
      </div>
    );
  }

  useSwipe((direction) => {
    if (direction === 'left') navigate(createPageUrl(cfg.swipeLeft));
    else if (direction === 'right') navigate(createPageUrl(cfg.swipeRight));
  }, bannerRef);

  const slug = memberName.toLowerCase();

  return (
    <div className="min-h-screen relative" style={{ background: cfg.pageBackground }}>
      <div className={`${slug}-page-stripes`} />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 z-0"
        style={{ background: `linear-gradient(to bottom, transparent, ${cfg.bottomGlow})` }} />
      <style>{`
        .${slug}-banner {
          background: ${cfg.bannerGradient};
          position: relative;
        }
        .${slug}-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(
              45deg,
              ${cfg.bannerStripe1} 0px, ${cfg.bannerStripe1} 10px,
              ${cfg.bannerStripe2} 10px, ${cfg.bannerStripe2} 20px,
              ${cfg.bannerStripe1} 20px, ${cfg.bannerStripe1} 25px,
              ${cfg.bannerStripe3} 25px, ${cfg.bannerStripe3} 30px
            ),
            radial-gradient(circle, ${cfg.bannerDot} 2px, transparent 2px);
          background-size: 100% 100%, 15px 15px;
          background-position: 0 0, 7px 7px;
        }
        .${slug}-page-stripes {
          position: absolute;
          inset: 0;
          min-height: 100%;
          pointer-events: none;
          z-index: 0;
          background:
            repeating-linear-gradient(
              45deg,
              ${cfg.pageStripeColor1} 0px, ${cfg.pageStripeColor1} 10px,
              ${cfg.pageStripeColor2} 10px, ${cfg.pageStripeColor2} 20px,
              ${cfg.pageStripeColor1} 20px, ${cfg.pageStripeColor1} 25px,
              ${cfg.pageStripeColor3} 25px, ${cfg.pageStripeColor3} 30px
            );
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,1) 95%, rgba(0,0,0,1) 100%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,1) 95%, rgba(0,0,0,1) 100%);
        }
      `}</style>

      <div ref={bannerRef} className={`relative h-64 overflow-hidden ${slug}-banner`}>
        <div className="relative z-10 h-full flex items-center px-6 sm:px-8">
          <motion.h1
            key={`${slug}-title`}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-7xl font-bold text-white drop-shadow-lg"
            style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}
          >
            {memberName}
          </motion.h1>
          <motion.img
            key={`${slug}-img`}
            src={cfg.photoUrl}
            alt={memberName}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="absolute right-0 top-1 h-80 w-auto object-contain"
          />
        </div>
      </div>

      <ChoreNotificationsDialog memberId={member.id} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-6 space-y-4">
        <FamilyMemberDetails memberId={member.id} memberName={memberName} color={cfg.color} />
      </div>
    </div>
  );
}