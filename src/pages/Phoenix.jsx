import React from 'react';
import { motion } from 'framer-motion';

export default function PhoenixPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="relative h-64 bg-gradient-to-r from-orange-500 to-orange-600 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-white"
          >
            Phoenix
          </motion.h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Phoenix's personal page - Coming soon!</p>
      </div>
    </div>
  );
}