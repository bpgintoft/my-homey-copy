import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function RoundaboutGrid({ sections, imageUrls }) {
  const containerRef = useRef(null);
  const [G, setG] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (containerRef.current) setG(containerRef.current.offsetWidth);
    });
    ro.observe(containerRef.current);
    setG(containerRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  if (G === 0) return <div ref={containerRef} className="pb-8 w-full" style={{ minHeight: 200 }} />;

  const gap = G * 0.075;
  const BW = (G - gap) / 2;
  const BH = BW;
  const outerR = BW * 0.20;
  const diamondHalf = BW * 0.34; // drive everything from diamond size
  const cutSize = diamondHalf * 1.15; // larger cut creates gap between corners and diamond
  const CX = G / 2;
  const CY = G / 2;

  // Build clip-path for each corner button with a diagonal cut on the inner corner
  // tl: cut bottom-right corner, tr: cut bottom-left, bl: cut top-right, br: cut top-left
  function buildPath(q) {
    let ox, oy;
    if (q === 'tl') { ox = 0;      oy = 0; }
    if (q === 'tr') { ox = G - BW; oy = 0; }
    if (q === 'bl') { ox = 0;      oy = G - BH; }
    if (q === 'br') { ox = G - BW; oy = G - BH; }

    const x1 = ox, y1 = oy, x2 = ox + BW, y2 = oy + BH;
    const r = outerR;
    const c = cutSize;

    // Helper to round a corner: Q control point at the corner vertex
    const arc = (cx, cy, ex, ey) => `Q ${(cx - ox).toFixed(2)} ${(cy - oy).toFixed(2)} ${(ex - ox).toFixed(2)} ${(ey - oy).toFixed(2)}`;
    const line = (px, py) => `L ${(px - ox).toFixed(2)} ${(py - oy).toFixed(2)}`;
    const move = (px, py) => `M ${(px - ox).toFixed(2)} ${(py - oy).toFixed(2)}`;

    if (q === 'tl') {
      // outer corners: tl, tr(inner→diagonal), bl(outer)
      // inner corner (br) = diagonal cut
      return `path('${[
        move(x1 + r, y1),
        line(x2 - r, y1), arc(x2, y1, x2, y1 + r),   // top-right: small round
        line(x2, y2 - c),                              // right edge down to cut start
        line(x2 - c, y2),                              // diagonal cut to bottom edge
        line(x1 + r, y2), arc(x1, y2, x1, y2 - r),   // bottom-left: rounded
        line(x1, y1 + r), arc(x1, y1, x1 + r, y1),   // top-left: rounded
        'Z'
      ].join(' ')}')`;
    }

    if (q === 'tr') {
      return `path('${[
        move(x1 + r, y1),
        line(x2 - r, y1), arc(x2, y1, x2, y1 + r),   // top-right: rounded
        line(x2, y2 - r), arc(x2, y2, x2 - r, y2),   // bottom-right: rounded
        line(x1 + c, y2),                              // bottom edge to cut start
        line(x1, y2 - c),                              // diagonal cut to left edge
        line(x1, y1 + r), arc(x1, y1, x1 + r, y1),   // top-left: small round
        'Z'
      ].join(' ')}')`;
    }

    if (q === 'bl') {
      return `path('${[
        move(x1 + r, y1),
        line(x2 - c, y1),                             // top edge to cut start
        line(x2, y1 + c),                             // diagonal cut to right edge
        line(x2, y2 - r), arc(x2, y2, x2 - r, y2),  // bottom-right: rounded
        line(x1 + r, y2), arc(x1, y2, x1, y2 - r),  // bottom-left: rounded
        line(x1, y1 + r), arc(x1, y1, x1 + r, y1),  // top-left: rounded
        'Z'
      ].join(' ')}')`;
    }

    if (q === 'br') {
      return `path('${[
        move(x1, y1 + c),
        line(x1 + c, y1),                             // diagonal cut
        line(x2 - r, y1), arc(x2, y1, x2, y1 + r),  // top-right: rounded
        line(x2, y2 - r), arc(x2, y2, x2 - r, y2),  // bottom-right: rounded
        line(x1 + r, y2), arc(x1, y2, x1, y2 - r),  // bottom-left: rounded
        line(x1, y1 + c),
        'Z'
      ].join(' ')}')`;
    }
  }

  const quadrants = ['tl', 'tr', 'bl', 'br'];
  const buttonPos = {
    tl: { left: 0,      top: 0 },
    tr: { left: G - BW, top: 0 },
    bl: { left: 0,      top: G - BH },
    br: { left: G - BW, top: G - BH },
  };

  // Content offset: keep centered
  const contentOffset = {
    tl: { x: 0, y: 0 },
    tr: { x: 0, y: 0 },
    bl: { x: 0, y: 0 },
    br: { x: 0, y: 0 },
  };

  return (
    <div ref={containerRef} className="pb-8 w-full">
      <div className="relative" style={{ width: G, height: G }}>

        {sections.map((section, i) => {
          const q = quadrants[i];
          const pos = buttonPos[q];
          const clipPath = buildPath(q);
          const offset = contentOffset[q];

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
                  clipPath,
                  WebkitClipPath: clipPath,
                }}
              >
                <Link to={createPageUrl(section.href)} style={{ display: 'block', width: '100%', height: '100%' }}>
                  <div className={`w-full h-full flex flex-col items-center justify-center ${section.bgColor} cursor-pointer hover:brightness-110 transition-all duration-300`}>
                    <div style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', ...((['Calendar', 'Meals'].includes(section.title)) && { justifyContent: 'center' }) }}>
                      {imageUrls[section.imageKey] && (
                        <img
                          src={imageUrls[section.imageKey]}
                          alt={section.title}
                          style={{ width: BW * 0.65, height: BW * 0.65, objectFit: 'contain', marginBottom: 8, ...((['Calendar', 'Meals'].includes(section.title)) && { marginTop: -12 }), ...(section.title === 'History' && { marginLeft: 12 }) }}
                        />
                      )}
                      <h3 className="font-bold text-white drop-shadow-lg whitespace-nowrap" style={{ fontSize: BW * 0.11, marginTop: (['Calendar', 'Meals'].includes(section.title) ? -16 : -8), ...(section.title === 'Calendar' && { marginLeft: 20 }), ...(section.title === 'Meals' && { marginRight: 8 }) }}>
                        {section.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
              {section.count > 0 && (
                <div
                  className="absolute bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg"
                  style={{ top: pos.top - 10, left: pos.left + BW - 18, zIndex: 20 }}
                >
                  {section.count}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Central diamond button */}
        <Link to={createPageUrl('Decisions')}>
          <motion.div
            initial={{ opacity: 0, rotate: 45 }}
            animate={{ opacity: 1, rotate: 45 }}
            transition={{ duration: 0.2, delay: 0.4 }}
            className="hover:brightness-110 transition-all duration-300"
            style={{
              position: 'absolute',
              left: CX - diamondHalf,
              top: CY - diamondHalf,
              width: diamondHalf * 2,
              height: diamondHalf * 2,
              borderRadius: diamondHalf * 0.22,
              background: 'linear-gradient(160deg, #c4b5f5 0%, #a78bfa 40%, #9b7af0 70%, #8b6fe8 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            }}
          >
            {/* Content rotated back to be upright */}
            <div style={{
              transform: 'rotate(-45deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
              width: diamondHalf * 1.2,
              height: diamondHalf * 1.6,
            }}>
              {/* Kate - above, centered between top diamond edge and label */}
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: diamondHalf * 0.75,
                marginBottom: diamondHalf * 0.15,
              }}>
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/d7b8218e7_katehome.png"
                  alt="Kate"
                  style={{ width: diamondHalf * 0.75, height: diamondHalf * 0.75, objectFit: 'contain' }}
                />
              </div>
              {/* Label */}
              <span style={{
                color: 'white',
                fontWeight: '800',
                fontSize: BW * 0.11,
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}>Decisions</span>
              {/* Bryan - below, centered between label and bottom diamond edge */}
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: diamondHalf * 0.7875,
                marginTop: diamondHalf * 0.15,
              }}>
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/fc0753fbc_bryanhome.png"
                  alt="Bryan"
                  style={{ width: diamondHalf * 0.7875, height: diamondHalf * 0.7875, objectFit: 'contain' }}
                />
              </div>
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}