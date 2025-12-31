import React from 'react';

const SectionFallback = ({ reset, message, label }) => (
  <div className="p-4 rounded-lg border panel-surface-strong panel-text">
    <p className="font-semibold text-sm">{label ? `${label} failed to render.` : 'This section failed to render.'}</p>
    {message && <p className="text-xs mt-1 panel-muted">{message}</p>}
    <button
      type="button"
      onClick={reset}
      className="mt-3 inline-flex items-center px-3 py-1 rounded panel-cta text-xs font-semibold hover:opacity-90"
    >
      Retry
    </button>
  </div>
);

export default SectionFallback;
