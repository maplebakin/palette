import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ConfirmedVariantsStatus from './ConfirmedVariantsStatus.jsx';

describe('ConfirmedVariantsStatus', () => {
  it('shows confirmed and missing modes', () => {
    render(
      <ConfirmedVariantsStatus
        availableModes={['light']}
        missingModes={['dark', 'pop']}
        variantCoverage="current-mode-only"
      />
    );

    expect(screen.getByLabelText(/light confirmed/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dark missing/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pop missing/i)).toBeInTheDocument();
    expect(screen.getByTestId('variant-coverage-label')).toHaveTextContent(/current mode only/i);
    expect(screen.getByText(/review each mode once to unlock a full light\/dark\/pop theme pack/i)).toBeInTheDocument();
    expect(screen.getByText(/exports include confirmed modes only/i)).toBeInTheDocument();
  });

  it('shows full-family readiness only when all modes are confirmed', () => {
    render(
      <ConfirmedVariantsStatus
        availableModes={['light', 'dark', 'pop']}
        missingModes={[]}
        variantCoverage="all-modes"
      />
    );

    expect(screen.getByTestId('variant-coverage-label')).toHaveTextContent(/full family ready/i);
    expect(screen.getByText('Full family ready.')).toBeInTheDocument();
  });

  it('shows partial coverage for more than one confirmed mode', () => {
    render(
      <ConfirmedVariantsStatus
        availableModes={['light', 'dark']}
        missingModes={['pop']}
        variantCoverage="available-modes"
      />
    );

    expect(screen.getByTestId('variant-coverage-label')).toHaveTextContent(/2 modes confirmed/i);
    expect(screen.queryByText('Full family ready.')).not.toBeInTheDocument();
  });
});
