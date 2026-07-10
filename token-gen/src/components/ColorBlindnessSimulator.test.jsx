import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ColorBlindnessSimulator from './ColorBlindnessSimulator.jsx';

describe('ColorBlindnessSimulator', () => {
  it('renders real SVG filters for every supported simulation', () => {
    const { container } = render(
      <ColorBlindnessSimulator>
        <div>Preview</div>
      </ColorBlindnessSimulator>
    );

    ['protanopia', 'deuteranopia', 'tritanopia', 'grayscale', 'contrast'].forEach((type) => {
      expect(container.querySelector(`filter#${type}-filter`)).toBeInTheDocument();
    });
    expect(container.innerHTML).not.toContain('&lt;filter');
  });

  it('applies and clears the selected SVG filter', () => {
    render(
      <ColorBlindnessSimulator>
        <div>Preview</div>
      </ColorBlindnessSimulator>
    );

    const select = screen.getByLabelText('Color vision simulation');
    const preview = screen.getByTestId('color-vision-preview');

    expect(preview).not.toHaveStyle({ filter: 'url(#protanopia-filter)' });

    fireEvent.change(select, { target: { value: 'protanopia' } });
    expect(preview).toHaveStyle({ filter: 'url(#protanopia-filter)' });

    fireEvent.change(select, { target: { value: 'contrast' } });
    expect(preview).toHaveStyle({ filter: 'url(#contrast-filter)' });

    fireEvent.change(select, { target: { value: 'none' } });
    expect(preview.style.filter).toBe('');
  });
});
