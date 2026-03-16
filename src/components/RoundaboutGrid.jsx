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

  if (W === 0) return <div ref={containerRef} className="w-full pb-6" style={{ minHeight: 300 }} />;

  // Each tile is just under half the container width, with a small gap
  const gap = Math.round(W * 0.05);
  const BW = Math.round((W - gap) / 2);
  const BH = Math.round(BW * 1.0);
  const tileRadius = Math.round(BW * 0.15);

  // The center circle overlaps all 4 inner corners — make it big enough
  const circleR = Math.round(W * 0.19);
  const CX = Math.round(W / 2);
  const CY = Math.round(BH + gap / 2);

  const totalH = BH * 2 + gap;

  const positions = [
    { left: 0,        top: 0 },
    { left: BW + gap, top: 0 },
    { left: 0,        top: BH + gap },
    { left: BW + gap, top: BH + gap },
  ];

  return (
    <div ref={containerRef} className="w-full pb-6">
      <div className="relative" style={{ width: W, height: totalH }}>

        {/* 4 section tiles */}
        {sections.map((section, i) => {
          const pos = positions[i];
          return (
            <div key={section.title} style={{ position: 'absolute', left: pos.left, top: pos.top, zIndex: 1 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.93 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                style={{ width: BW, height: BH, borderRadius: tileRadius, overflow: 'hidden' }}
              >
                <Link to={createPageUrl(section.href)} style={{ display: 'block', width: '100%', height: '100%' }}>
                  <div
                    className={`w-full h-full flex flex-col items-center justify-between ${section.bgColor} cursor-pointer active:brightness-95 transition-all duration-150`}
                    style={{ paddingTop: BH * 0.06, paddingBottom: BH * 0.1 }}
                  >
                    {imageUrls[section.imageKey] && (
                      <img
                        src={imageUrls[section.imageKey]}
                        alt={section.title}
                        style={{ width: BW * 0.82, height: BH * 0.62, objectFit: 'contain' }}
                      />
                    )}
                    <h3
                      className="font-extrabold text-white whitespace-nowrap"
                      style={{
                        fontSize: BW * 0.13,
                        textShadow: '0 1px 4px rgba(0,0,0,0.25)',
                      }}
                    >
                      {section.title}
                    </h3>
                  </div>
                </Link>
              </motion.div>

              {/* Badge */}
              {section.count > 0 && (
                <div
                  className="absolute bg-red-500 text-white font-bold rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    width: BW * 0.14,
                    height: BW * 0.14,
                    fontSize: BW * 0.08,
                    top: -BW * 0.05,
                    right: -BW * 0.05,
                    zIndex: 20,
                  }}
                >
                  {section.count}
                </div>
              )}
            </div>
          );
        })}

        {/* White backing circle — sits behind the Decisions PNG to mask tile corners */}
        <div
          style={{
            position: 'absolute',
            left: CX - circleR - 4,
            top: CY - circleR - 4,
            width: (circleR + 4) * 2,
            height: (circleR + 4) * 2,
            borderRadius: '50%',
            backgroundColor: 'white',
            zIndex: 8,
          }}
        />

        {/* Decisions circle */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.4 }}
          style={{
            position: 'absolute',
            left: CX - circleR,
            top: CY - circleR,
            width: circleR * 2,
            height: circleR * 2,
            borderRadius: '50%',
            zIndex: 9,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          <Link to={createPageUrl('Decisions')} style={{ display: 'block', width: '100%', height: '100%' }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/bcad3a5c8_8181C62D-0250-452F-8B0C-D68964D40A49.png"
              alt="Decisions"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Link>
        </motion.div>

      </div>
    </div>
  );
}