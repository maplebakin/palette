import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CollapsedQuickBar from './CollapsedQuickBar.jsx';

const tokens = {
  brand: {
    primary: '#3366ff',
  },
  status: {
    error: '#ef4444',
  },
};

const renderQuickBar = (props = {}) => {
  const handleBaseColorChange = vi.fn();
  const flushBaseColorChange = vi.fn();
  render(
    <CollapsedQuickBar
      headerOpen={false}
      quickBarBottom="16px"
      pickerColor="#3366ff"
      handleBaseColorChange={handleBaseColorChange}
      flushBaseColorChange={flushBaseColorChange}
      baseInput="#3366ff"
      baseError=""
      tokens={tokens}
      mode="Analogous"
      setMode={vi.fn()}
      themeMode="pop"
      setThemeMode={vi.fn()}
      {...props}
    />
  );
  return { handleBaseColorChange, flushBaseColorChange };
};

describe('CollapsedQuickBar', () => {
  it('flushes throttled color changes when color dragging ends', () => {
    const { handleBaseColorChange, flushBaseColorChange } = renderQuickBar();
    const colorInput = screen.getByLabelText('Choose base color');

    fireEvent.change(colorInput, { target: { value: '#22c55e' } });
    fireEvent.pointerUp(colorInput);

    expect(handleBaseColorChange).toHaveBeenCalledWith('#22c55e', { deferInput: true });
    expect(flushBaseColorChange).toHaveBeenCalledTimes(1);
  });
});
