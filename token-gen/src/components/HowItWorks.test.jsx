import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HowItWorks from './HowItWorks.jsx';

describe('HowItWorks', () => {
  it('explains the model without dead purchase actions', () => {
    render(<HowItWorks />);

    expect(screen.getByText('You design it, I finish it')).toBeInTheDocument();
    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.getByText('Suggest')).toBeInTheDocument();
    expect(screen.getByText('Collect')).toBeInTheDocument();
    expect(screen.getByText(/the shop opens soon/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
