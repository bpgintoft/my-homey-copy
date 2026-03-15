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

  // Layout constants
  const gap = G * 0.07;          // gap between buttons and circle
  const BW = (G - gap) / 2;      // button width
  const BH = BW;                  // square buttons
  const outerR = BW * 0.20;      // outer corner radius (large, like reference)
  const innerR = gap * 0.7;      // inner corner radius (small concave transition)
  const circleR = (gap / 2) + BW * 0.18; // radius of the center circle
  // The concave cutout on each inner edge is a quarter-circle arc of radius = circleR + gap/2
  // But in the reference, the concave on each inner edge is a simple rounded notch into the corner
  // Looking at reference: inner corners have a convex-outward arc (the button "hugs" the circle)
  const concaveR = circleR + gap * 0.5;

  const CX = G / 2;
  const CY = G / 2;

  // Each button occupies one quadrant. The inner corner (closest to center) has TWO concave arcs —
  // one on each inner edge — that follow the circle outline.
  // The path traces: outer 3 corners with outerR rounding, then two concave arcs at the inner edges.

  // Intersection of circle (CX,CY,concaveR) with a horizontal line at y=edgeY
  function circleX(edgeY, sign) {
    const d2 = concaveR * concaveR - (edgeY - CY) ** 2;
    if (d2 < 0) return CX;
    return CX + sign * Math.sqrt(d2);
  }
  // Intersection of circle (CX,CY,concaveR) with a vertical line at x=edgeX
  function circleY(edgeX, sign) {
    const d2 = concaveR * concaveR - (edgeX - CX) ** 2;
    if (d2 < 0) return CY;
    return CY + sign * Math.sqrt(d2);
  }

  // Build path in LOCAL coordinates of each button
  function buildPath(q) {
    let ox, oy;
    if (q === 'tl') { ox = 0;      oy = 0; }
    if (q === 'tr') { ox = G - BW; oy = 0; }
    if (q === 'bl') { ox = 0;      oy = G - BH; }
    if (q === 'br') { ox = G - BW; oy = G - BH; }

    const x1 = ox, y1 = oy, x2 = ox + BW, y2 = oy + BH;
    // local conversion
    const lx = v => +(v - ox).toFixed(2);
    const ly = v => +(v - oy).toFixed(2);

    if (q === 'tl') {
      // Outer corners: top-left, top-right, bottom-left (all rounded with outerR)
      // Inner edges: right edge (x=x2) and bottom edge (y=y2) both curve inward toward circle
      // On right edge (x=x2): concave arc from (x2, y1+outerR) ... down to intersection with concaveCircle
      // But actually: the right inner edge is straight from top-right corner down to where the concave notch starts,
      // then a concave arc, then straight along bottom to where bottom concave notch starts, then concave arc, then to bottom-left corner.
      // 
      // The concave arc on the right edge goes from point A (on right edge, above center) to point B (on bottom edge, left of center)
      // sweeping AROUND the center circle (large arc going outward from center = sweep-flag 0)

      // Point where concave arc meets the right inner edge (x=x2)
      const Ay = circleY(x2, -1); // above CY
      // Point where concave arc meets the bottom inner edge (y=y2)  
      const Bx = circleX(y2, -1); // left of CX

      const pts = [
        `M ${lx(x1+outerR)} ${ly(y1)}`,
        // top edge →
        `L ${lx(x2-innerR)} ${ly(y1)}`,
        // top-right inner corner (small convex rounding)
        `Q ${lx(x2)} ${ly(y1)} ${lx(x2)} ${ly(y1+innerR)}`,
        // right inner edge down to where concave begins
        `L ${lx(x2)} ${ly(Ay)}`,
        // concave arc around the circle (sweep=0 goes around the outside)
        `A ${concaveR} ${concaveR} 0 0 0 ${lx(Bx)} ${ly(y2)}`,
        // bottom inner edge left to bottom-left inner corner
        `L ${lx(x1+innerR)} ${ly(y2)}`,
        // bottom-left outer corner
        `Q ${lx(x1)} ${ly(y2)} ${lx(x1)} ${ly(y2-outerR)}`,
        // left edge up
        `L ${lx(x1)} ${ly(y1+outerR)}`,
        // top-left outer corner
        `Q ${lx(x1)} ${ly(y1)} ${lx(x1+outerR)} ${ly(y1)} Z`,
      ];
      return `path('${pts.join(' ')}')`;
    }

    if (q === 'tr') {
      const Ay = circleY(x1, -1); // above CY on left edge (x=x1)
      const Bx = circleX(y2, 1);  // right of CX on bottom edge (y=y2)

      const pts = [
        `M ${lx(x1+innerR)} ${ly(y1)}`,
        // top edge →
        `L ${lx(x2-outerR)} ${ly(y1)}`,
        // top-right outer corner
        `Q ${lx(x2)} ${ly(y1)} ${lx(x2)} ${ly(y1+outerR)}`,
        // right edge down
        `L ${lx(x2)} ${ly(y2-outerR)}`,
        // bottom-right outer corner
        `Q ${lx(x2)} ${ly(y2)} ${lx(x2-outerR)} ${ly(y2)}`,
        // bottom edge left to where concave begins
        `L ${lx(Bx)} ${ly(y2)}`,
        // concave arc around center
        `A ${concaveR} ${concaveR} 0 0 0 ${lx(x1)} ${ly(Ay)}`,
        // left inner edge up to top-left inner corner
        `L ${lx(x1)} ${ly(y1+innerR)}`,
        // top-left inner corner small rounding
        `Q ${lx(x1)} ${ly(y1)} ${lx(x1+innerR)} ${ly(y1)} Z`,
      ];
      return `path('${pts.join(' ')}')`;
    }

    if (q === 'bl') {
      const Ax = circleX(y1, -1); // left of CX on top edge (y=y1)
      const By = circleY(x2, 1);  // below CY on right edge (x=x2)

      const pts = [
        `M ${lx(x1+outerR)} ${ly(y1)}`,
        // top edge right to where concave begins
        `L ${lx(Ax)} ${ly(y1)}`,
        // concave arc around center
        `A ${concaveR} ${concaveR} 0 0 0 ${lx(x2)} ${ly(By)}`,
        // right inner edge down to bottom-right inner corner
        `L ${lx(x2)} ${ly(y2-innerR)}`,
        // bottom-right inner corner small rounding
        `Q ${lx(x2)} ${ly(y2)} ${lx(x2-innerR)} ${ly(y2)}`,
        // bottom edge left
        `L ${lx(x1+outerR)} ${ly(y2)}`,
        // bottom-left outer corner
        `Q ${lx(x1)} ${ly(y2)} ${lx(x1)} ${ly(y2-outerR)}`,
        // left edge up
        `L ${lx(x1)} ${ly(y1+outerR)}`,
        // top-left outer corner
        `Q ${lx(x1)} ${ly(y1)} ${lx(x1+outerR)} ${ly(y1)} Z`,
      ];
      return `path('${pts.join(' ')}')`;
    }

    if (q === 'br') {
      const Ax = circleX(y1, 1);  // right of CX on top edge (y=y1)
      const By = circleY(x1, 1);  // below CY on left edge (x=x1)

      const pts = [
        `M ${lx(x1+innerR)} ${ly(y1)}`,
        // top edge right to where concave begins — NOTE: inner corner top-left
        // Actually top-left of br is the inner corner
        // top-left inner corner
        `Q ${lx(x1)} ${ly(y1)} ${lx(x1)} ${ly(y1+innerR)}`,

        // Hmm, let me retrace. br button: outer corners = top-right, bottom-right, bottom-left. inner = top-left
        // Start at top edge, left side (inner)
        // go right along top to top-right outer corner
      ];

      // Redo br cleanly:
      const pts2 = [
        // Start at top edge just right of where concave ends
        `M ${lx(Ax)} ${ly(y1)}`,
        // top edge to top-right outer corner
        `L ${lx(x2-outerR)} ${ly(y1)}`,
        `Q ${lx(x2)} ${ly(y1)} ${lx(x2)} ${ly(y1+outerR)}`,
        // right edge down
        `L ${lx(x2)} ${ly(y2-outerR)}`,
        `Q ${lx(x2)} ${ly(y2)} ${lx(x2-outerR)} ${ly(y2)}`,
        // bottom edge left
        `L ${lx(x1+outerR)} ${ly(y2)}`,
        `Q ${lx(x1)} ${ly(y2)} ${lx(x1)} ${ly(y2-outerR)}`,
        // left edge up to where concave begins
        `L ${lx(x1)} ${ly(By)}`,
        // concave arc around center back to start
        `A ${concaveR} ${concaveR} 0 0 0 ${lx(Ax)} ${ly(y1)} Z`,
      ];
      return `path('${pts2.join(' ')}')`;
    }
  }

  const quadrants = ['tl', 'tr', 'bl', 'br'];
  const buttonPos = {
    tl: { left: 0,      top: 0 },
    tr: { left: G - BW, top: 0 },
    bl: { left: 0,      top: G - BH },
    br: { left: G - BW, top: G - BH },
  };

  return (
    <div ref={containerRef} className="pb-8 w-full">
      <div className="relative" style={{ width: G, height: G }}>

        {sections.map((section, i) => {
          const q = quadrants[i];
          const pos = buttonPos[q];
          const clipPath = buildPath(q);
          const isTop = q === 'tl' || q === 'tr';
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
                    {isTop ? (
                      <>
                        <h3 className="font-bold text-white drop-shadow-lg whitespace-nowrap" style={{ fontSize: BW * 0.11, marginBottom: 6 }}>
                          {section.title}
                        </h3>
                        {imageUrls[section.imageKey] && (
                          <img
                            src={imageUrls[section.imageKey]}
                            alt={section.title}
                            style={{ width: BW * 0.65, height: BW * 0.65, objectFit: 'contain' }}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {imageUrls[section.imageKey] && (
                          <img
                            src={imageUrls[section.imageKey]}
                            alt={section.title}
                            style={{ width: BW * 0.65, height: BW * 0.65, objectFit: 'contain', marginBottom: 6 }}
                          />
                        )}
                        <h3 className="font-bold text-white drop-shadow-lg whitespace-nowrap" style={{ fontSize: BW * 0.11 }}>
                          {section.title}
                        </h3>
                      </>
                    )}
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

        {/* Central circle */}
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
              backgroundColor: '#a78bfa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <span style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: circleR * 0.30,
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