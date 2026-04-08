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

  // Scale down height and increase overlap as member count grows past 3
  const count = ordered.length;
  const scale = count <= 3 ? 1 : count === 4 ? 0.85 : count === 5 ? 0.72 : Math.max(0.45, 1 - (count - 3) * 0.15);
  const scaledHeight = height * scale;
  const overlap = count <= 3 ? 18 : 18 + (count - 3) * 10;

  return (
    <div className="flex items-end justify-center h-full" style={{ paddingRight: overlap }}>
      {ordered.map((member, i) => {
        const assetUrl = getMemberAssetUrl(member);
        const isAdult = isAdultMember(member);
        const imgHeight = isAdult ? scaledHeight : scaledHeight * 0.75;

        return (
          <div
            key={member.id}
            className="flex flex-col items-center justify-end flex-shrink-0"
            style={{
              height: scaledHeight,
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: ordered.length - i,
              position: 'relative',
            }}
          >
            <img
              src={assetUrl}
              alt={member.name}
              style={{ height: imgHeight, width: 'auto', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        );
      })}
    </div>
  );
}