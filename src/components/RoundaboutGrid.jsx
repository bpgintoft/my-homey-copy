import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function RoundaboutGrid({ sections, imageUrls }) {
  const containerRef = useRef(null);
  const [W, setW] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (containerRef.current) setW(containerRef.current.offsetWidth);
    });
    ro.observe(containerRef.current);
    setW(containerRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  if (W === 0) return <div ref={containerRef} className="pb-8 w-full" style={{ minHeight: 200 }} />;

  const gap = W * 0.06;
  const BW = (W - gap) / 2;
  const BH = BW;
  const radius = BW * 0.18;

  // Center circle sits over the gap intersection
  const circleR = gap * 1.1 + BW * 0.16;
  const CX = W / 2;
  const CY = W / 2;

  const positions = [
    { left: 0,        top: 0 },        // tl - Meals
    { left: BW + gap, top: 0 },        // tr - Calendar
    { left: 0,        top: BH + gap }, // bl - House
    { left: BW + gap, top: BH + gap }, // br - History
  ];

  return (
    <div ref={containerRef} className="pb-8 w-full">
      <div className="relative" style={{ width: W, height: W }}>

        {sections.map((section, i) => {
          const pos = positions[i];
          const isTop = i < 2;
          return (
            <React.Fragment key={section.title}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                  width: BW,
                  height: BH,
                  borderRadius: radius,
                  overflow: 'hidden',
                }}
              >
                <Link to={createPageUrl(section.href)} style={{ display: 'block', width: '100%', height: '100%' }}>
                  <div className={`w-full h-full flex flex-col items-center justify-between ${section.bgColor} cursor-pointer hover:brightness-105 transition-all duration-300`}
                    style={{ paddingTop: BH * 0.08, paddingBottom: BH * 0.1 }}>
                    {imageUrls[section.imageKey] && (
                      <img
                        src={imageUrls[section.imageKey]}
                        alt={section.title}
                        style={{ width: BW * 0.72, height: BW * 0.72, objectFit: 'contain' }}
                      />
                    )}
                    <h3 className="font-bold text-white drop-shadow-lg whitespace-nowrap" style={{ fontSize: BW * 0.115 }}>
                      {section.title}
                    </h3>
                  </div>
                </Link>
              </motion.div>

              {section.count > 0 && (
                <div
                  className="absolute bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    width: BW * 0.12,
                    height: BW * 0.12,
                    fontSize: BW * 0.07,
                    top: pos.top - BW * 0.04,
                    left: pos.left + BW - BW * 0.08,
                    zIndex: 20,
                  }}
                >
                  {section.count}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Central Decisions circle */}
        <Link to={createPageUrl('Decisions')}>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="hover:brightness-110 transition-all duration-300"
            style={{
              position: 'absolute',
              left: CX - circleR,
              top: CY - circleR,
              width: circleR * 2,
              height: circleR * 2,
              borderRadius: '50%',
              cursor: 'pointer',
              zIndex: 10,
              backgroundColor: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            }}
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/2105216e3_8181C62D-0250-452F-8B0C-D68964D40A49.png"
              alt="Family Decisions"
              style={{ width: '85%', height: '75%', objectFit: 'contain' }}
            />
            <span style={{
              fontWeight: 'bold',
              fontSize: circleR * 0.28,
              color: '#5b21b6',
              lineHeight: 1,
              marginTop: 2,
            }}>Decisions</span>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}