import React from 'react';
import { Shuffle } from 'lucide-react';

export default function FloatingActions({ randomRitual }) {
  return (
    <div className="fixed bottom-6 right-6 space-y-3 z-50">
      <button
        type="button"
        onClick={randomRitual}
        className="w-14 h-14 rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        aria-label="Generate random palette"
        title="Random Palette (R)"
      >
        <Shuffle size={20} className="group-hover:rotate-180 transition-transform duration-500" />
      </button>
    </div>
  );
}
