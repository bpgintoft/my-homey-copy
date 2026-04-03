import React, { useState } from 'react';
import { getMemberAssetUrl, getMemberPlaceholderColor } from '@/lib/getMemberAssetUrl';

/**
 * FamilyPortraitBanner — dynamically composes a family portrait
 * from individual transparent PNGs, layered on a Sage & Gold backdrop.
 *
 * Adults are placed in the center, Children on the sides.
 */
export default function FamilyPortraitBanner({ members = [] }) {
  // Sort: children on the outside, adults in the center
  const adults = members.filter(m => m.age_range === '18+' || m.age_range === '13-17');
  const children = members.filter(m => m.age_range === 'Under 13');

  // Interleave: child, adult, adult, child...
  const arranged = [];
  const leftChildren = children.slice(0, Math.ceil(children.length / 2));
  const rightChildren = children.slice(Math.ceil(children.length / 2));
  arranged.push(...leftChildren, ...adults, ...rightChildren);

  if (arranged.length === 0) {
    // Fallback when no members yet
    return (
      <div className="relative h-40 md:h-48 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #C8DFC8 0%, #E8D89A 100%)' }}>
        <p className="text-lg font-semibold text-stone-600 opacity-60">Welcome Home</p>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden h-40 md:h-52"
      style={{
        background: 'linear-gradient(135deg, #C8DFC8 0%, #E2D4A0 60%, #D4C87A 100%)',
      }}
    >
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #7A9E7A 0px, #7A9E7A 1px, transparent 1px, transparent 12px)`,
        }}
      />

      {/* Portrait row */}
      <div className="relative z-10 flex items-end justify-center h-full gap-1 px-4 pb-0">
        {arranged.map((member) => {
          const isChild = member.age_range === 'Under 13';
          const isTeen = member.age_range === '13-17';
          const heightClass = isChild
            ? 'h-28 md:h-36'
            : isTeen
            ? 'h-32 md:h-40'
            : 'h-36 md:h-48';

          const assetUrl = getMemberAssetUrl(member);
          const placeholderColor = getMemberPlaceholderColor(member);

          return (
            <div key={member.id} className={`flex flex-col items-center flex-shrink-0 ${heightClass}`}>
              <MemberFigure
                member={member}
                assetUrl={assetUrl}
                placeholderColor={placeholderColor}
                heightClass={heightClass}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberFigure({ member, assetUrl, placeholderColor, heightClass }) {
  const [imgError, setImgError] = React.useState(false);

  if (imgError || !member.gender) {
    // Silhouette placeholder
    return (
      <div className={`flex flex-col items-center justify-end ${heightClass}`}>
        <div
          className="rounded-full w-10 h-10 md:w-14 md:h-14 mb-1 flex items-center justify-center text-white font-bold text-lg shadow"
          style={{ backgroundColor: placeholderColor }}
        >
          {member.name?.charAt(0)}
        </div>
        <span className="text-xs font-semibold text-stone-700 drop-shadow">{member.name}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-end ${heightClass}`}>
      <img
        src={assetUrl}
        alt={member.name}
        className="h-full w-auto object-contain drop-shadow-lg"
        onError={() => setImgError(true)}
      />
      <span className="text-xs font-semibold text-stone-700 drop-shadow -mt-1">{member.name}</span>
    </div>
  );
}