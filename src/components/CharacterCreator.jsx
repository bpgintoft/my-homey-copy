import React, { useState, useEffect } from 'react';
import { getMemberAssetUrl } from '@/lib/getMemberAssetUrl';

const GENDERS = [
  { value: 'Male', label: 'Male', emoji: '♂' },
  { value: 'Female', label: 'Female', emoji: '♀' },
];

const AGE_RANGES = [
  { value: 'Baby', label: 'Baby' },
  { value: 'Under 13', label: 'Kid' },
  { value: '13-17', label: 'Teen' },
  { value: '18+', label: 'Adult' },
];

const SKIN_TONES = [
  { value: 'S1', color: '#FDDBB4' }, // White
  { value: 'S2', color: '#D4956A' }, // Light brown
  { value: 'S3', color: '#A0622A' }, // Brown
  { value: 'S4', color: '#5C3010' }, // Dark brown
];

const HAIR_COLORS = [
  { value: 'H1', label: 'Blonde', color: '#F5D27A' },
  { value: 'H2', label: 'Brown', color: '#7B4F2E' },
  { value: 'H3', label: 'Black', color: '#1A1A1A' },
  { value: 'H4', label: 'Red', color: '#C0392B' },
  { value: 'H5', label: 'Gray', color: '#9B9B9B' },
];

function TraitButton({ selected, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
        selected
          ? 'bg-teal-500 border-teal-500 text-white shadow-sm'
          : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-600'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function CircleButton({ selected, onClick, color, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`w-8 h-8 rounded-full transition-all flex-shrink-0 ${
        selected ? 'ring-2 ring-offset-2 ring-teal-500 scale-110' : 'hover:scale-105'
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

export default function CharacterCreator({ value = {}, onChange }) {
  const [imgError, setImgError] = useState(false);

  const { gender, age_range, skin_tone, hair_color } = value;

  // Reset imgError whenever traits change so we re-attempt the image
  useEffect(() => { setImgError(false); }, [gender, age_range, skin_tone, hair_color]);

  const set = (field, val) => onChange({ ...value, [field]: val });

  const assetUrl = getMemberAssetUrl(value);
  const hasTraits = gender && age_range && skin_tone && hair_color;

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start">
      {/* Live Preview */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2 w-full sm:w-auto">
        <div className="w-24 h-32 flex items-end justify-center bg-gradient-to-b from-teal-50 to-teal-100 rounded-2xl border border-teal-200 overflow-hidden">
          {hasTraits && !imgError ? (
            <img
              src={assetUrl}
              alt="Preview"
              className="h-full w-auto object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: '#0d9488' }}
              >
                ?
              </div>
            </div>
          )}
        </div>
        <span className="text-xs text-slate-400">Preview</span>
      </div>

      {/* Selectors */}
      <div className="flex-1 space-y-4 w-full">
        {/* Gender */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Gender</p>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map(g => (
              <TraitButton key={g.value} selected={gender === g.value} onClick={() => set('gender', g.value)}>
                {g.label}
              </TraitButton>
            ))}
          </div>
        </div>

        {/* Age Range */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Age Range</p>
          <div className="flex flex-wrap gap-2">
            {AGE_RANGES.map(a => (
              <TraitButton key={a.value} selected={age_range === a.value} onClick={() => set('age_range', a.value)}>
                {a.label}
              </TraitButton>
            ))}
          </div>
        </div>

        {/* Skin Tone */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Skin Tone</p>
          <div className="flex gap-3 flex-wrap">
            {SKIN_TONES.map(s => (
              <CircleButton key={s.value} selected={skin_tone === s.value} onClick={() => set('skin_tone', s.value)} color={s.color} label={s.value} />
            ))}
          </div>
        </div>

        {/* Hair Color */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hair Color</p>
          <div className="flex gap-3 flex-wrap">
            {HAIR_COLORS.map(h => (
              <CircleButton key={h.value} selected={hair_color === h.value} onClick={() => set('hair_color', h.value)} color={h.color} label={h.label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}