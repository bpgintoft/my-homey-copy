import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function RoundaboutGrid({ sections, imageUrls }) {
  const containerRef = useRef(null);
  const [G, setG] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setG(containerRef.current.offsetWidth);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (G === 0) {
    return <div ref={containerRef} className="pb-8 w-full" style={{ minHeight: 200 }} />;
  }

  const gap = G * 0.075;
  const BW = (G - gap) / 2;
  const BH = BW;
  const r = BW * 0.18; // outer corner radius
  const CX = G / 2;
  const CY = G / 2;
  const circleR = gap * 1.9;
  const concaveR = circleR + gap * 0.4;

  // Intersection of concave arc circle (centered at CX,CY, radius concaveR) with a vertical/horizontal edge
  function iy(edgeX, sign) {
    const d2 = concaveR * concaveR - (edgeX - CX) ** 2;
    return CY + sign * (d2 >= 0 ? Math.sqrt(d2) : 0);
  }
  function ix(edgeY, sign) {
    const d2 = concaveR * concaveR - (edgeY - CY) ** 2;
    return CX + sign * (d2 >= 0 ? Math.sqrt(d2) : 0);
  }

  // Build an inline CSS path() string for each button
  // Each path is in the button's LOCAL coordinate space (origin = button top-left)
  function buildLocalPath(q) {
    let ox, oy; // button origin in grid space
    if (q === 'tl') { ox = 0; oy = 0; }
    else if (q === 'tr') { ox = G - BW; oy = 0; }
    else if (q === 'bl') { ox = 0; oy = G - BH; }
    else { ox = G - BW; oy = G - BH; }

    // Grid-space coords of the button rectangle
    const gx1 = ox, gy1 = oy, gx2 = ox + BW, gy2 = oy + BH;

    // Convert grid coords to local (subtract button origin)
    const lx = v => v - ox;
    const ly = v => v - oy;

    if (q === 'tl') {
      // concave at bottom-right
      const p1x = gx2, p1y = iy(gx2, -1); // right edge, above center
      const p2x = ix(gy2, -1), p2y = gy2; // bottom edge, left of center
      return `path('M ${lx(gx1+r)} ${ly(gy1)}
        L ${lx(gx2-r)} ${ly(gy1)} Q ${lx(gx2)} ${ly(gy1)} ${lx(gx2)} ${ly(gy1+r)}
        L ${lx(p1x)} ${ly(p1y)} A ${concaveR} ${concaveR} 0 0 0 ${lx(p2x)} ${ly(p2y)}
        L ${lx(gx1+r)} ${ly(gy2)} Q ${lx(gx1)} ${ly(gy2)} ${lx(gx1)} ${ly(gy2-r)}
        L ${lx(gx1)} ${ly(gy1+r)} Q ${lx(gx1)} ${ly(gy1)} ${lx(gx1+r)} ${ly(gy1)} Z')`;
    } else if (q === 'tr') {
      // concave at bottom-left
      const p1x = ix(gy2, 1), p1y = gy2; // bottom edge, right of center
      const p2x = gx1, p2y = iy(gx1, -1); // left edge, above center
      return `path('M ${lx(gx1+r)} ${ly(gy1)}
        L ${lx(gx2-r)} ${ly(gy1)} Q ${lx(gx2)} ${ly(gy1)} ${lx(gx2)} ${ly(gy1+r)}
        L ${lx(gx2)} ${ly(gy2-r)} Q ${lx(gx2)} ${ly(gy2)} ${lx(gx2-r)} ${ly(gy2)}
        L ${lx(p1x)} ${ly(p1y)} A ${concaveR} ${concaveR} 0 0 0 ${lx(p2x)} ${ly(p2y)}
        L ${lx(gx1)} ${ly(gy1+r)} Q ${lx(gx1)} ${ly(gy1)} ${lx(gx1+r)} ${ly(gy1)} Z')`;
    } else if (q === 'bl') {
      // concave at top-right
      const p1x = ix(gy1, -1), p1y = gy1; // top edge, left of center
      const p2x = gx2, p2y = iy(gx2, 1); // right edge, below center
      return `path('M ${lx(gx1+r)} ${ly(gy1)}
        L ${lx(p1x)} ${ly(p1y)} A ${concaveR} ${concaveR} 0 0 0 ${lx(p2x)} ${ly(p2y)}
        L ${lx(gx2)} ${ly(gy2-r)} Q ${lx(gx2)} ${ly(gy2)} ${lx(gx2-r)} ${ly(gy2)}
        L ${lx(gx1+r)} ${ly(gy2)} Q ${lx(gx1)} ${ly(gy2)} ${lx(gx1)} ${ly(gy2-r)}
        L ${lx(gx1)} ${ly(gy1+r)} Q ${lx(gx1)} ${ly(gy1)} ${lx(gx1+r)} ${ly(gy1)} Z')`;
    } else {
      // br: concave at top-left
      const p1x = gx1, p1y = iy(gx1, 1); // left edge, below center
      const p2x = ix(gy1, 1), p2y = gy1; // top edge, right of center
      return `path('M ${lx(p2x)} ${ly(p2y)}
        L ${lx(gx2-r)} ${ly(gy1)} Q ${lx(gx2)} ${ly(gy1)} ${lx(gx2)} ${ly(gy1+r)}
        L ${lx(gx2)} ${ly(gy2-r)} Q ${lx(gx2)} ${ly(gy2)} ${lx(gx2-r)} ${ly(gy2)}
        L ${lx(gx1+r)} ${ly(gy2)} Q ${lx(gx1)} ${ly(gy2)} ${lx(gx1)} ${ly(gy2-r)}
        L ${lx(p1x)} ${ly(p1y)} A ${concaveR} ${concaveR} 0 0 0 ${lx(p2x)} ${ly(p2y)} Z')`;
    }
  }

  const quadrants = ['tl', 'tr', 'bl', 'br'];
  const buttonPositions = {
    tl: { left: 0, top: 0 },
    tr: { left: G - BW, top: 0 },
    bl: { left: 0, top: G - BH },
    br: { left: G - BW, top: G - BH },
  };

  return (
    <div ref={containerRef} className="pb-8 w-full">
      <div className="relative" style={{ width: G, height: G }}>

        {/* 4 Buttons */}
        {sections.map((section, i) => {
          const q = quadrants[i];
          const pos = buttonPositions[q];
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
                clipPath: buildLocalPath(q),
                WebkitClipPath: buildLocalPath(q),
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
                  <h3
                    className="font-bold text-white drop-shadow-lg whitespace-nowrap"
                    style={{ fontSize: BW * 0.11 }}
                  >
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
              padding: '0 6px',
            }}>
              Family<br />Decisions
            </span>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}