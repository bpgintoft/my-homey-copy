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

  // Gap between the 4 tiles — the center circle sits in this space
  const gap = W * 0.07;
  const BW = (W - gap) / 2;
  const BH = BW;
  const radius = BW * 0.16;

  // Center circle radius — large enough to overlap all 4 tile corners nicely
  const circleR = gap * 0.5 + BW * 0.22;
  const CX = W / 2;
  const CY = BH + gap / 2; // vertically centred in the gap row

  const totalH = BH * 2 + gap;

  const positions = [
    { left: 0,        top: 0 },
    { left: BW + gap, top: 0 },
    { left: 0,        top: BH + gap },
    { left: BW + gap, top: BH + gap },
  ];

  return (
    <div ref={containerRef} className="pb-8 w-full">
      <div className="relative" style={{ width: W, height: totalH }}>

        {sections.map((section, i) => {
          const pos = positions[i];
          return (
            <div key={section.title} style={{ position: 'absolute', left: pos.left, top: pos.top, zIndex: 1 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                style={{
                  width: BW,
                  height: BH,
                  borderRadius: radius,
                  overflow: 'hidden',
                }}
              >
                <Link to={createPageUrl(section.href)} style={{ display: 'block', width: '100%', height: '100%' }}>
                  <div
                    className={`w-full h-full flex flex-col items-center justify-between ${section.bgColor} cursor-pointer hover:brightness-105 transition-all duration-200`}
                    style={{ paddingTop: BH * 0.07, paddingBottom: BH * 0.09 }}
                  >
                    {imageUrls[section.imageKey] && (
                      <img
                        src={imageUrls[section.imageKey]}
                        alt={section.title}
                        style={{ width: BW * 0.78, height: BW * 0.65, objectFit: 'contain' }}
                      />
                    )}
                    <h3
                      className="font-bold text-white drop-shadow whitespace-nowrap"
                      style={{ fontSize: BW * 0.12 }}
                    >
                      {section.title}
                    </h3>
                  </div>
                </Link>
              </motion.div>

              {section.count > 0 && (
                <div
                  className="absolute bg-red-500 text-white font-bold rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    width: BW * 0.13,
                    height: BW * 0.13,
                    fontSize: BW * 0.075,
                    top: -BW * 0.04,
                    right: -BW * 0.04,
                    zIndex: 20,
                  }}
                >
                  {section.count}
                </div>
              )}
            </div>
          );
        })}

        {/* Central Decisions circle — sits on top of the 4 tile corners */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.45 }}
          style={{
            position: 'absolute',
            left: CX - circleR,
            top: CY - circleR,
            width: circleR * 2,
            height: circleR * 2,
            borderRadius: '50%',
            zIndex: 10,
            backgroundColor: 'white',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}
        >
          <Link to={createPageUrl('Decisions')} style={{ display: 'block', width: '100%', height: '100%' }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/bcad3a5c8_8181C62D-0250-452F-8B0C-D68964D40A49.png"
              alt="Decisions"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </Link>
        </motion.div>

      </div>
    </div>
  );
}