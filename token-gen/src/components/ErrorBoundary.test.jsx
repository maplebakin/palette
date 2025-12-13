import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary.jsx';

const Boom = () => {
  throw new Error('Boom');
};

describe('ErrorBoundary', () => {
  it('shows a friendly fallback when children throw', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/We hit a snag/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
