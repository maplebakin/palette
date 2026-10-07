import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlaygroundAccessibility from './PlaygroundAccessibility.jsx';

describe('PlaygroundAccessibility', () => {
  it('uses the measured role colors in its miniatures and preserves honest failures after an edit', () => {
    const roles = {
      background: '#ffffff', surface: '#eeeeee', text: '#111111', heading: '#111111',
      muted: '#333333', accent: '#222222', cta: '#111111', ctaText: '#ffffff', border: '#ffffff',
    };
    const { container, rerender } = render(<PlaygroundAccessibility roles={roles} />);
    const samples = container.querySelectorAll('.playground-contrast-sample');
    expect(samples).toHaveLength(6);
    expect(samples[0]).toHaveStyle({ color: '#111111', backgroundColor: '#ffffff' });
    expect(samples[3]).toHaveStyle({ color: '#ffffff', backgroundColor: '#111111' });
    expect(screen.getAllByText('Fail')).toHaveLength(1);

    rerender(<PlaygroundAccessibility roles={{ ...roles, text: '#ffffff' }} />);
    expect(container.querySelector('.playground-contrast-sample')).toHaveStyle({ color: '#ffffff' });
    expect(screen.getAllByText('Fail')).toHaveLength(3);
    expect(screen.getByRole('group')).toHaveAccessibleName('3 of 6 pairings meet their contrast target; 3 need adjustment');
  });
});
