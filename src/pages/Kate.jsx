import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useSwipe } from '../components/useSwipe';
import FamilyMemberDetails from '../components/FamilyMemberDetails';
import ChoreNotificationsDialog from '../components/ChoreNotificationsDialog';
import { useQueryClient } from '@tanstack/react-query';

export default function KatePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
  });

  const kate = familyMembers.find(m => m.name === 'Kate');

  const handleSwipe = (direction) => {
    if (direction === 'left') {
      navigate(createPageUrl('Phoenix'));
    } else if (direction === 'right') {
      navigate(createPageUrl('Bryan'));
    }
  };

  useSwipe(handleSwipe, bannerRef);

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <style>{`
        .kate-banner {
          background: linear-gradient(135deg, #A7F3D0 0%, #6EE7B7 50%, #34D399 100%);
          position: relative;
        }
        .kate-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(
              45deg,
              rgba(167, 243, 208, 0.6) 0px,
              rgba(167, 243, 208, 0.6) 10px,
              rgba(52, 211, 153, 0.4) 10px,
              rgba(52, 211, 153, 0.4) 20px,
              rgba(167, 243, 208, 0.6) 20px,
              rgba(167, 243, 208, 0.6) 25px,
              rgba(110, 231, 183, 0.3) 25px,
              rgba(110, 231, 183, 0.3) 30px
            ),
            radial-gradient(circle, rgba(52, 211, 153, 0.4) 2px, transparent 2px);
          background-size: 100% 100%, 15px 15px;
          background-position: 0 0, 7px 7px;
        }
      `}</style>
      <div ref={bannerRef} className="relative h-64 overflow-hidden kate-banner">
        <div className="relative z-10 h-full flex items-center px-6 sm:px-8">
          <h1 
            className="text-5xl sm:text-7xl font-bold text-white drop-shadow-lg"
            style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}
          >
            Kate
          </h1>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/6d06cb23a_Katepage.png"
            alt="Kate"
            className="absolute right-0 top-1 h-80 w-auto object-contain"
          />
        </div>
      </div>

      {kate && (
        <>
          <ChoreNotificationsDialog memberId={kate.id} />
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-6 space-y-4">
            <FamilyMemberDetails memberId={kate.id} memberName="Kate" color="green" />
          </div>
        </>
      )}
    </div>
  );
}