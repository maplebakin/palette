import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VaultStrip from './VaultStrip.jsx';

describe('VaultStrip', () => {
  it('shows metadata on hover without rendering file contents', () => {
    const { container } = render(
      <VaultStrip manifest={{ formats: ['ase', 'css'], coreColors: 6, tintsPerColor: 9 }} />
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: /\.ase/i }));
    expect(screen.getByText('6 core colors · 9 tints per color')).toBeInTheDocument();
    expect(screen.getByText('Semantic token names')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/--[a-z]|#[0-9a-f]{3,8}/i);
  });

  it('requests the shared gate when a locked format is selected', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<VaultStrip manifest={{ formats: ['json'], coreColors: 6, tintsPerColor: 9 }} />);

    fireEvent.click(screen.getByRole('button', { name: /JSON/i }));
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'apocapalette:request-gate',
      detail: { source: 'vault-click' },
    }));
    dispatchSpy.mockRestore();
  });
});
