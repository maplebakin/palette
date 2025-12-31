import React from 'react';

const SectionFallback = ({ reset, message, label }) => (
  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
    <p className="font-semibold text-sm">{label ? `${label} failed to render.` : 'This section failed to render.'}</p>
    {message && <p className="text-xs mt-1">{message}</p>}
    <button
      type="button"
      onClick={reset}
      className="mt-3 inline-flex items-center px-3 py-1 rounded bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
    >
      Retry
    </button>
  </div>
);

export default SectionFallback;
