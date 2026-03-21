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
      style={{ minHeight: 58 }}
    >
      {/* Gradient background — rounded only on left, straight on right (hidden behind circle) */}
      <div
        className="absolute"
        style={{
          inset: 0,
          right: 26, /* extends under the circle */
          borderRadius: '999px 0 0 999px',
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
        }}
      />
      {/* Inner white area — rounded only on left, straight on right */}
      <div
        className="absolute bg-white"
        style={{
          top: 5,
          bottom: 5,
          left: 10,
          right: 26,
          borderRadius: '999px 0 0 999px',
        }}
      />
      {/* Label */}
      <div className="relative z-10 flex items-center w-full pl-5 pr-16 py-3">
        <span
          className="font-black text-xs uppercase text-gray-900 leading-tight text-left"
          style={{ letterSpacing: '0.08em' }}
        >
          {label}
        </span>
      </div>
      {/* Circular icon — sits on top, covering the right open end */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center bg-white rounded-full z-20"
        style={{ width: 52, height: 52, border: `8px solid ${c1}`, flexShrink: 0 }}
      >
        <span className="text-xl leading-none">{emoji}</span>
      </div>
    </button>
  );
}