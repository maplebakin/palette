import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlaygroundCodeExport from './PlaygroundCodeExport.jsx';
import { buildSevenRoleSketchCode } from '../lib/sketchCode.js';

const roles = {
  background: '#111111', surface: '#222222', text: '#eeeeee', heading: '#ffffff',
  muted: '#aaaaaa', accent: '#cc9977', cta: '#ddaa88', border: '#555555', ctaText: '#111111',
};

describe('PlaygroundCodeExport', () => {
  it.each([['CSS', 'css'], ['JSON', 'json'], ['Tailwind', 'tailwind']])('preserves the exact %s snippet when coloring and copying code', (label, format) => {
    const onCopy = vi.fn();
    const { container } = render(<PlaygroundCodeExport roles={roles} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('tab', { name: label }));

    const expected = buildSevenRoleSketchCode({ roles, format });
    expect(container.querySelector('pre code').textContent).toBe(expected);
    expect(container.querySelector('.code-value')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(onCopy).toHaveBeenCalledWith(expected);
  });
});
