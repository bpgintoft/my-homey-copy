import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

// Each button has a concave corner on its inner corner (facing the center).
// We use SVG clipPath to achieve the roundabout shape.
// The grid is a fixed square. Each button occupies one quadrant.
// The inner corner of each button curves around a central circle.

const GRID = 320; // total grid size in px
const GAP = 24;   // gap between buttons (matches page spacing)
const RADIUS = 28; // outer corner radius of buttons
const CENTER_R = (GAP * 2.2); // radius of central circle — wide enough to show text
const CONCAVE_R = CENTER_R + GAP / 2; // concave cut radius (slightly larger than circle)

// Button dimensions
const BW = (GRID - GAP) / 2; // button width
const BH = (GRID - GAP) / 2; // button height

// Center of grid
const CX = GRID / 2;
const CY = GRID / 2;

// Build a path for one quadrant button with one concave inner corner
// quadrant: 'tl' | 'tr' | 'bl' | 'br'
function buildButtonPath(quadrant) {
  const r = RADIUS;
  const cr = CONCAVE_R;

  let x, y; // top-left of the button
  if (quadrant === 'tl') { x = 0; y = 0; }
  else if (quadrant === 'tr') { x = GRID - BW; y = 0; }
  else if (quadrant === 'bl') { x = 0; y = GRID - BH; }
  else { x = GRID - BW; y = GRID - BH; } // br

  const x2 = x + BW;
  const y2 = y + BH;

  // The inner corner position (corner closest to center)
  // tl → bottom-right corner, tr → bottom-left, bl → top-right, br → top-left
  let icx, icy;
  if (quadrant === 'tl') { icx = x2; icy = y2; }
  else if (quadrant === 'tr') { icx = x; icy = y2; }
  else if (quadrant === 'bl') { icx = x2; icy = y; }
  else { icx = x; icy = y; }

  // For the concave arc: the two points where the arc meets the button edges
  // The arc is a circle of radius cr centered at CX, CY
  // For each quadrant, the two tangent points are along the button edges adjacent to the inner corner

  // We find where the circle of radius cr meets the inner edges of the button
  // tl: right edge (x=x2) and bottom edge (y=y2)
  // We solve: (x2 - CX)^2 + (py - CY)^2 = cr^2 → py
  //           (px - CX)^2 + (y2 - CY)^2 = cr^2 → px

  function circleY(edgeX) {
    const dy2 = cr * cr - (edgeX - CX) * (edgeX - CX);
    return dy2 >= 0 ? Math.sqrt(dy2) : 0;
  }
  function circleX(edgeY) {
    const dx2 = cr * cr - (edgeY - CY) * (edgeY - CY);
    return dx2 >= 0 ? Math.sqrt(dx2) : 0;
  }

  let p1, p2; // two points where concave arc meets the button edges
  // sweep direction for the concave arc (always curving inward toward center)
  // large-arc=0, sweep=0 for concave (curves away from center = toward button interior)

  if (quadrant === 'tl') {
    // inner corner is bottom-right: right edge x=x2, bottom edge y=y2
    const py = CY - circleY(x2); // on right edge, above center
    const px = CX - circleX(y2); // on bottom edge, left of center
    p1 = { x: x2, y: py }; // start on right edge
    p2 = { x: px, y: y2 }; // end on bottom edge
  } else if (quadrant === 'tr') {
    // inner corner is bottom-left: left edge x=x, bottom edge y=y2
    const py = CY - circleY(x); // on left edge, above center
    const px = CX + circleX(y2); // on bottom edge, right of center
    p1 = { x: px, y: y2 }; // start on bottom edge
    p2 = { x: x, y: py }; // end on left edge
  } else if (quadrant === 'bl') {
    // inner corner is top-right: right edge x=x2, top edge y=y
    const py = CY + circleY(x2); // on right edge, below center
    const px = CX - circleX(y); // on top edge, left of center
    p1 = { x: px, y: y }; // start on top edge
    p2 = { x: x2, y: py }; // end on right edge
  } else {
    // br: inner corner is top-left: left edge x=x, top edge y=y
    const py = CY + circleY(x); // on left edge, below center
    const px = CX + circleX(y); // on top edge, right of center
    p1 = { x: x, y: py }; // start on left edge
    p2 = { x: px, y: y }; // end on top edge
  }

  // Build the path
  if (quadrant === 'tl') {
    return `
      M ${x + r} ${y}
      L ${x2 - r} ${y}
      Q ${x2} ${y} ${x2} ${y + r}
      L ${p1.x} ${p1.y}
      A ${cr} ${cr} 0 0 0 ${p2.x} ${p2.y}
      L ${x2} ${y2 - r}
      Q ${x2} ${y2} ${x2 - r} ${y2}
      L ${x + r} ${y2}
      Q ${x} ${y2} ${x} ${y2 - r}
      L ${x} ${y + r}
      Q ${x} ${y} ${x + r} ${y}
      Z
    `;
  } else if (quadrant === 'tr') {
    return `
      M ${x + r} ${y}
      L ${x2 - r} ${y}
      Q ${x2} ${y} ${x2} ${y + r}
      L ${x2} ${y2 - r}
      Q ${x2} ${y2} ${x2 - r} ${y2}
      L ${p1.x} ${p1.y}
      A ${cr} ${cr} 0 0 0 ${p2.x} ${p2.y}
      L ${x} ${y + r}
      Q ${x} ${y} ${x + r} ${y}
      Z
    `;
  } else if (quadrant === 'bl') {
    return `
      M ${x + r} ${y}
      L ${p1.x} ${p1.y}
      A ${cr} ${cr} 0 0 0 ${p2.x} ${p2.y}
      L ${x2} ${y2 - r}
      Q ${x2} ${y2} ${x2 - r} ${y2}
      L ${x + r} ${y2}
      Q ${x} ${y2} ${x} ${y2 - r}
      L ${x} ${y + r}
      Q ${x} ${y} ${x + r} ${y}
      Z
    `;
  } else {
    // br
    return `
      M ${x + r} ${y}
      L ${p2.x} ${p2.y}
      A ${cr} ${cr} 0 0 0 ${p1.x} ${p1.y}
      L ${x2 - r} ${y2}
      Q ${x2} ${y2} ${x2} ${y2 - r}
      L ${x2} ${y + r}
      Q ${x2} ${y} ${x2 - r} ${y}
      L ${x + r} ${y}
      Z
    `;
  }
}

const quadrants = ['tl', 'tr', 'bl', 'br'];

export default function RoundaboutGrid({ sections, imageUrls }) {
  const bgColor = '#F5F5F7';

  return (
    <div className="pb-8">
      <div
        className="relative mx-auto"
        style={{ width: GRID, height: GRID }}
      >
        {/* SVG for clip paths */}
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            {quadrants.map(q => (
              <clipPath key={q} id={`clip-${q}`} clipPathUnits="userSpaceOnUse">
                <path d={buildButtonPath(q)} />
              </clipPath>
            ))}
          </defs>
        </svg>

        {/* 4 Buttons */}
        {sections.map((section, i) => {
          const q = quadrants[i];
          let left, top;
          if (q === 'tl') { left = 0; top = 0; }
          else if (q === 'tr') { left = GRID - BW; top = 0; }
          else if (q === 'bl') { left = 0; top = GRID - BH; }
          else { left = GRID - BW; top = GRID - BH; }

          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              style={{
                position: 'absolute',
                left,
                top,
                width: BW,
                height: BH,
                clipPath: `url(#clip-${q})`,
              }}
            >
              <Link to={createPageUrl(section.href)}>
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
                      className="w-20 h-20 object-contain mb-2"
                    />
                  )}
                  <h3 className="text-base font-bold text-white drop-shadow-lg whitespace-nowrap">{section.title}</h3>
                </div>
              </Link>
            </motion.div>
          );
        })}

        {/* Central "Family Decisions" circle */}
        <Link to={createPageUrl('Decisions')}>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            style={{
              position: 'absolute',
              left: CX - CENTER_R,
              top: CY - CENTER_R,
              width: CENTER_R * 2,
              height: CENTER_R * 2,
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
            <span
              style={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: 10,
                textAlign: 'center',
                lineHeight: 1.2,
                padding: '0 4px',
              }}
            >
              Family<br />Decisions
            </span>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}