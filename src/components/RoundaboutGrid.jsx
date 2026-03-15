import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function RoundaboutGrid({ sections, imageUrls }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setSize(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const G = size; // total grid size
  const gap = Math.round(G * 0.075); // ~7.5% gap (scales with size)
  const BW = (G - gap) / 2;
  const BH = BW; // square buttons
  const r = Math.round(BW * 0.18); // outer corner radius
  const CX = G / 2;
  const CY = G / 2;
  const circleR = gap * 1.8; // central circle radius — bigger than gap for readable text

  // The concave cut radius — arc centered at (CX,CY) that forms the concave corner
  const concaveR = circleR + gap * 0.5;

  function circleIntersectY(edgeX, sign) {
    const dy2 = concaveR * concaveR - (edgeX - CX) * (edgeX - CX);
    if (dy2 < 0) return CY;
    return CY + sign * Math.sqrt(dy2);
  }
  function circleIntersectX(edgeY, sign) {
    const dx2 = concaveR * concaveR - (edgeY - CY) * (edgeY - CY);
    if (dx2 < 0) return CX;
    return CX + sign * Math.sqrt(dx2);
  }

  // Build clip path for each quadrant
  // Each button is positioned at its quadrant, path is in local (button) coordinates
  // But clipPath uses userSpaceOnUse so we work in grid coordinates
  function buildPath(q) {
    let x, y;
    if (q === 'tl') { x = 0; y = 0; }
    else if (q === 'tr') { x = G - BW; y = 0; }
    else if (q === 'bl') { x = 0; y = G - BH; }
    else { x = G - BW; y = G - BH; }

    const x2 = x + BW;
    const y2 = y + BH;

    if (q === 'tl') {
      // concave at bottom-right corner
      const p1x = x2;
      const p1y = circleIntersectY(x2, -1); // on right edge, above center
      const p2x = circleIntersectX(y2, -1); // on bottom edge, left of center
      const p2y = y2;
      return `M ${x+r} ${y} L ${x2-r} ${y} Q ${x2} ${y} ${x2} ${y+r}
              L ${p1x} ${p1y} A ${concaveR} ${concaveR} 0 0 0 ${p2x} ${p2y}
              L ${x+r} ${y2} Q ${x} ${y2} ${x} ${y2-r}
              L ${x} ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
    } else if (q === 'tr') {
      // concave at bottom-left corner
      const p1x = circleIntersectX(y2, 1); // on bottom edge, right of center
      const p1y = y2;
      const p2x = x;
      const p2y = circleIntersectY(x, -1); // on left edge, above center
      return `M ${x+r} ${y} L ${x2-r} ${y} Q ${x2} ${y} ${x2} ${y+r}
              L ${x2} ${y2-r} Q ${x2} ${y2} ${x2-r} ${y2}
              L ${p1x} ${p1y} A ${concaveR} ${concaveR} 0 0 0 ${p2x} ${p2y}
              L ${x} ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
    } else if (q === 'bl') {
      // concave at top-right corner
      const p1x = circleIntersectX(y, -1); // on top edge, left of center
      const p1y = y;
      const p2x = x2;
      const p2y = circleIntersectY(x2, 1); // on right edge, below center
      return `M ${x+r} ${y} L ${p1x} ${p1y} A ${concaveR} ${concaveR} 0 0 0 ${p2x} ${p2y}
              L ${x2} ${y2-r} Q ${x2} ${y2} ${x2-r} ${y2}
              L ${x+r} ${y2} Q ${x} ${y2} ${x} ${y2-r}
              L ${x} ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
    } else {
      // br: concave at top-left corner
      const p1x = x;
      const p1y = circleIntersectY(x, 1); // on left edge, below center
      const p2x = circleIntersectX(y, 1); // on top edge, right of center
      const p2y = y;
      return `M ${p2x} ${p2y} L ${x2-r} ${y} Q ${x2} ${y} ${x2} ${y+r}
              L ${x2} ${y2-r} Q ${x2} ${y2} ${x2-r} ${y2}
              L ${x+r} ${y2} Q ${x} ${y2} ${x} ${y2-r}
              L ${p1x} ${p1y} A ${concaveR} ${concaveR} 0 0 0 ${p2x} ${p2y} Z`;
    }
  }

  const quadrants = ['tl', 'tr', 'bl', 'br'];

  const positions = {
    tl: { left: 0, top: 0 },
    tr: { left: G - BW, top: 0 },
    bl: { left: 0, top: G - BH },
    br: { left: G - BW, top: G - BH },
  };

  return (
    <div className="pb-8" ref={containerRef}>
      {size > 0 && (
        <div className="relative" style={{ width: G, height: G }}>
          {/* SVG clip paths */}
          <svg width={0} height={0} style={{ position: 'absolute', overflow: 'visible' }}>
            <defs>
              {quadrants.map(q => (
                <clipPath key={q} id={`rab-clip-${q}-${Math.round(G)}`} clipPathUnits="userSpaceOnUse">
                  <path d={buildPath(q)} />
                </clipPath>
              ))}
            </defs>
          </svg>

          {/* 4 Buttons */}
          {sections.map((section, i) => {
            const q = quadrants[i];
            const pos = positions[q];
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                  width: BW,
                  height: BH,
                  clipPath: `url(#rab-clip-${q}-${Math.round(G)})`,
                }}
              >
                <Link to={createPageUrl(section.href)} style={{ display: 'block', width: '100%', height: '100%' }}>
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center ${section.bgColor} cursor-pointer hover:brightness-110 transition-all duration-300 relative`}
                  >
                    {section.count > 0 && (
                      <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg z-10">
                        {section.count}
                      </div>
                    )}
                    {imageUrls[section.imageKey] && (
                      <img
                        src={imageUrls[section.imageKey]}
                        alt={section.title}
                        style={{ width: BW * 0.55, height: BW * 0.55, objectFit: 'contain', marginBottom: 6 }}
                      />
                    )}
                    <h3 className="font-bold text-white drop-shadow-lg whitespace-nowrap" style={{ fontSize: BW * 0.11 }}>
                      {section.title}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {/* Central Family Decisions circle */}
          <Link to={createPageUrl('Decisions')}>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              style={{
                position: 'absolute',
                left: CX - circleR,
                top: CY - circleR,
                width: circleR * 2,
                height: circleR * 2,
                borderRadius: '50%',
                backgroundColor: '#a78bfa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
              }}
              className="hover:brightness-110 transition-all duration-300"
            >
              <span style={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: circleR * 0.22,
                textAlign: 'center',
                lineHeight: 1.3,
                padding: '0 4px',
              }}>
                Family<br />Decisions
              </span>
            </motion.div>
          </Link>
        </div>
      )}
    </div>
  );
}