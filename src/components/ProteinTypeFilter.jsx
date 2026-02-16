import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const proteinTypes = [
  { key: 'beef', emoji: '🥩' },
  { key: 'chicken', emoji: '🍗' },
  { key: 'fish', emoji: '🐟' },
  { key: 'beans', emoji: '🫘' },
  { key: 'vegetarian', emoji: '🥬' },
  { key: 'pork', emoji: '🍖' },
  { key: 'turkey', emoji: '🦃' },
  { key: 'eggs', emoji: '🥚' }
];

export default function ProteinTypeFilter({ selectedProteins, onSelectionChange }) {
  const toggleProtein = (protein) => {
    const updated = selectedProteins.includes(protein)
      ? selectedProteins.filter(p => p !== protein)
      : [...selectedProteins, protein];
    onSelectionChange(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2 overflow-x-auto pb-2"
    >
      {proteinTypes.map(({ key, emoji }) => (
        <button
          key={key}
          onClick={() => toggleProtein(key)}
          className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all ${
            selectedProteins.includes(key)
              ? 'bg-pink-200 ring-2 ring-pink-500 scale-110'
              : 'bg-white border-2 border-gray-200 hover:border-pink-200'
          }`}
          title={key.charAt(0).toUpperCase() + key.slice(1)}
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}