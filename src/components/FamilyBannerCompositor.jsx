import React from 'react';
import { getMemberAssetUrl, isAdultMember } from '@/lib/getMemberAssetUrl';

/**
 * FamilyBannerCompositor
 *
 * Renders a horizontal row of family member PNGs as a "composite" family portrait.
 * Adults are placed in the center, children on the sides.
 */
export default function FamilyBannerCompositor({ members = [], height = 160 }) {
  if (!members.length) return null;

  const adults = members.filter(isAdultMember);
  const children = members.filter(m => !isAdultMember(m));

  // Layout: [child, child, ...] [adult, adult, ...] [child, child, ...]
  const half = Math.ceil(children.length / 2);
  const leftChildren = children.slice(0, half);
  const rightChildren = children.slice(half);

  const ordered = [...leftChildren, ...adults, ...rightChildren];

  const count = ordered.length;

  // Per-count tuned values: { scale, overlap, childRatio }
  const CONFIG = {
    1: { scale: 1.4,  overlap: 0,  childRatio: 0.75 },
    2: { scale: 1.00, overlap: 6,  childRatio: 0.75 },
    3: { scale: 0.95, overlap: 18, childRatio: 0.75 },
    4: { scale: 0.88, overlap: 20, childRatio: 0.75 },
    5: { scale: 0.78, overlap: 24, childRatio: 0.76 },
    6: { scale: 0.68, overlap: 26, childRatio: 0.77 },
  };
  const cfg = CONFIG[count] || { scale: Math.max(0.52, 0.68 - (count - 6) * 0.08), overlap: 28, childRatio: 0.78 };

  const scaledHeight = height * cfg.scale;

  return (
    <div className="flex items-start justify-end" style={{ height: '100%', overflow: 'hidden' }}>
      <div className="flex items-start justify-end" style={{ paddingTop: count === 1 ? 48 : 20, height: '100%', overflow: 'hidden' }}>
        {ordered.map((member, i) => {
          const assetUrl = getMemberAssetUrl(member);
          const isAdult = isAdultMember(member);
          const imgHeight = isAdult ? scaledHeight : scaledHeight * cfg.childRatio;

          return (
            <div
              key={member.id}
              className="flex flex-col items-center justify-start flex-shrink-0"
              style={{
                height: '100%',
                marginLeft: i === 0 ? 0 : -cfg.overlap,
                zIndex: count - i,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <img
              src={assetUrl}
              alt={member.name}
              style={{ height: imgHeight, width: 'auto', objectFit: 'contain', objectPosition: 'top', transform: count === 1 ? 'scaleX(-1)' : 'none' }}
              onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}