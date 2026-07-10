import React from 'react';
import { Shuffle } from 'lucide-react';

export default function FloatingActions({ randomRitual }) {
  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-3 sm:bottom-6 sm:right-6">
      <button
        type="button"
        onClick={randomRitual}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-purple-600 hover:shadow-xl sm:h-14 sm:w-14 group"
        aria-label="Generate random palette"
        title="Random Palette (R)"
      >
        <Shuffle size={20} className="group-hover:rotate-180 transition-transform duration-500" />
      </button>
    </div>
  );
}
