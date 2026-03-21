import React from 'react';

const colorSchemes = {
  blue: ['#3B82F6', '#60A5FA', '#93C5FD'],
  green: ['#22C55E', '#4ADE80', '#86EFAC'],
  pink: ['#EC4899', '#F472B6', '#F9A8D4'],
  purple: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
  orange: ['#F97316', '#FB923C', '#FDBA74'],
};

export default function SectionPillButton({ label, emoji, onClick, color = 'blue' }) {
  const [c1, c2, c3] = colorSchemes[color] || colorSchemes.blue;

  return (
    <button
      onClick={onClick}
      className="relative flex items-center w-full group"
      style={{ height: 52 }}
    >
      {/* Outer colored pill layers */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: c1,
          transform: 'translateX(-4px)',
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: c2,
          transform: 'translateX(-1px)',
          top: 2, bottom: 2, left: 2, right: 2,
        }}
      />
      {/* White inner pill */}
      <div className="absolute rounded-full bg-white shadow-sm"
        style={{ top: 4, bottom: 4, left: 6, right: 6 }}
      />
      {/* Content */}
      <div className="relative flex items-center justify-between w-full px-4 z-10">
        <span className="font-bold text-sm text-gray-800 tracking-wide pl-2 truncate">
          {label}
        </span>
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center border-2"
          style={{ borderColor: c1 }}
        >
          <span className="text-lg leading-none">{emoji}</span>
        </div>
      </div>
    </button>
  );
}