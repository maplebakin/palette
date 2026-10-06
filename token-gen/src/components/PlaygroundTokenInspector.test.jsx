import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlaygroundTokenInspector from './PlaygroundTokenInspector.jsx';

describe('PlaygroundTokenInspector', () => {
  it('shows curated CSS properties and copies an individual sketch value', () => {
    const onCopy = vi.fn();
    render(
      <PlaygroundTokenInspector
        tokens={[
          { name: 'Primary', path: 'brand.primary', value: '#123456' },
          { name: 'Body text', path: 'typography.text-body', value: '#222222' },
        ]}
        onCopy={onCopy}
      />,
    );

    fireEvent.click(screen.getByText('Tokens'));
    expect(screen.getByText('Current sketch\'s main CSS custom properties')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy --brand-primary value #123456' }));
    expect(onCopy).toHaveBeenCalledWith({ path: 'brand.primary', value: '#123456' });
  });
});
