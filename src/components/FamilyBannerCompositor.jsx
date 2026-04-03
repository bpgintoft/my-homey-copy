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

  return (
    <div className="flex items-end justify-center h-full gap-1">
      {ordered.map((member) => {
        const assetUrl = getMemberAssetUrl(member);
        const isAdult = isAdultMember(member);
        const imgHeight = isAdult ? height : height * 0.75;

        return (
          <div
            key={member.id}
            className="flex flex-col items-center justify-end"
            style={{ height }}
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