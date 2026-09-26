import React from 'react';

// Back/Next pager for the demo stepper. Lives under the active step in
// PaletteWorkspace; visual language matches the existing pill buttons.
const StepPager = ({ steps, currentIndex, onNavigate }) => {
  const prev = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const next = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;

  return (
    <nav aria-label="Workflow steps" className="flex items-center justify-between gap-3 mt-10">
      <div>
        {prev && (
          <button
            type="button"
            onClick={() => onNavigate(prev)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
          >
            <span aria-hidden>←</span>
            Back · {prev.label}
          </button>
        )}
      </div>
      <div>
        {next && (
          <button
            type="button"
            onClick={() => onNavigate(next)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border panel-surface-strong hover:-translate-y-[1px] active:scale-95 transition focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
          >
            {next.label} · Next
            <span aria-hidden>→</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default StepPager;
