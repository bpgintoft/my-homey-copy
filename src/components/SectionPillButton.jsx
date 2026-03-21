import React from 'react';

const colorGradients = {
  blue:   ['#0AACFF', '#3B82F6'],
  green:  ['#22C55E', '#16A34A'],
  pink:   ['#EC4899', '#F97316'],
  purple: ['#8B5CF6', '#EC4899'],
  orange: ['#F97316', '#EF4444'],
};

export default function SectionPillButton({ label, emoji, onClick, color = 'blue' }) {
  const [c1, c2] = colorGradients[color] || colorGradients.blue;

  return (
    <button
      onClick={onClick}
      className="relative flex items-center w-full active:scale-95 transition-transform"
      style={{ height: 58 }}
    >
      {/* Thick gradient C-shaped border — rendered as a rounded pill behind the white pill */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 0,
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          /* Leave the right side open visually by shrinking the white pill less on the right */
        }}
      />
      {/* Inner white pill — shifted right so the left side shows the colored border like a "C" */}
      {/* Inner white pill — height is auto to accommodate wrapped text */}
      <div
        className="absolute bg-white rounded-full"
        style={{ top: 5, bottom: 5, left: 10, right: 46 }}
      />
      {/* Label */}
      <div className="relative z-10 flex items-center w-full pl-5 pr-14">
        <span
          className="font-black text-xs tracking-widest uppercase text-gray-900 leading-tight text-left"
          style={{ letterSpacing: '0.08em' }}
        >
          {label}
        </span>
      </div>
      {/* Circular icon on the right — sits on top of the gradient pill */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center bg-white rounded-full shadow-md z-20 border-2"
        style={{
          width: 52,
          height: 52,
          borderColor: c1,
        }}
      >
        <span className="text-xl leading-none">{emoji}</span>
      </div>
    </button>
  );
}