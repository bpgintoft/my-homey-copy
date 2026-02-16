import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const proteinTypes = [
  { key: 'beef', emoji: '🥩' },
  { key: 'chicken', emoji: '🍗' },
  { key: 'fish', emoji: '🐟' },
  { key: 'pork', emoji: '🍖' },
  { key: 'turkey', emoji: '🦃' },
  { key: 'eggs', emoji: '🥚' },
  { key: 'beans', emoji: '🫘' },
  { key: 'vegetarian', emoji: '🥬' }
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
      className="flex gap-1.5 overflow-x-auto pb-2"
    >
      {proteinTypes.map(({ key, emoji }) => (
        <button
          key={key}
          onClick={() => toggleProtein(key)}
          className={`flex-shrink-0 relative w-9 h-9 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-lg md:text-2xl transition-all ${
            selectedProteins.includes(key)
              ? 'bg-pink-100 border-2 border-pink-500'
              : 'bg-white border-2 border-gray-200 hover:border-pink-200'
          }`}
          title={key.charAt(0).toUpperCase() + key.slice(1)}
        >
          {emoji}
          {selectedProteins.includes(key) && (
            <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-0.5 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </button>
      ))}
    </motion.div>
  );
}