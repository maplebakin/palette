import React from 'react';
import { CheckCircle2, CircleDashed } from 'lucide-react';

const MODE_LABELS = {
  light: 'Light',
  dark: 'Dark',
  pop: 'Pop',
};

const MODE_ORDER = ['light', 'dark', 'pop'];

const ConfirmedVariantsStatus = ({
  availableModes = [],
  missingModes = MODE_ORDER,
  variantCoverage = 'current-mode-only',
  className = '',
}) => {
  const available = new Set(availableModes);
  const allReady = MODE_ORDER.every((mode) => available.has(mode));
  const statusLabel = allReady
    ? 'Full family ready'
    : availableModes.length <= 1
      ? 'Current mode only'
      : `${availableModes.length} modes confirmed`;

  return (
    <div className={`rounded-lg border panel-surface-soft p-3 ${className}`} data-testid="confirmed-variants-status">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-bold panel-text">Confirmed Variants</div>
        <div className="text-[11px] font-bold panel-muted" data-testid="variant-coverage-label">
          {statusLabel}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {MODE_ORDER.map((mode) => {
          const confirmed = available.has(mode);
          return (
            <div
              key={mode}
              className="flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold panel-text"
              data-testid={`variant-${mode}`}
              aria-label={`${MODE_LABELS[mode]} ${confirmed ? 'confirmed' : 'missing'}`}
            >
              {confirmed ? <CheckCircle2 size={12} aria-hidden="true" /> : <CircleDashed size={12} aria-hidden="true" />}
              <span>{MODE_LABELS[mode]}</span>
              <span className="panel-muted">{confirmed ? 'Confirmed' : 'Missing'}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs panel-muted">
        Review each mode once to unlock a full Light/Dark/Pop Theme Pack. Exports include confirmed modes only.
      </p>
      {variantCoverage === 'all-modes' && missingModes.length === 0 && (
        <p className="mt-1 text-xs font-bold panel-text">Full family ready.</p>
      )}
    </div>
  );
};

export default ConfirmedVariantsStatus;
