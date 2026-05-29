import { describe, expect, it } from 'vitest';
import { generateTokens } from './tokens.js';
import {
  buildPreviewPaletteRow,
  buildPreviewQuickEssentials,
  buildPreviewRoleTokens,
} from './previewTokens.js';

describe('preview token display mapping', () => {
  it('uses the visual preview roles as displayed hex source of truth for StrawberryMilk Light', () => {
    const tokens = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);
    const preview = buildPreviewRoleTokens(tokens, 'light');
    const quickEssentials = buildPreviewQuickEssentials(preview);
    const previewRow = buildPreviewPaletteRow(preview);

    expect(quickEssentials).toEqual([
      { key: 'Preview shell', color: '#f7f2f3' },
      { key: 'Preview card', color: '#fbf9f9' },
      { key: 'Primary action', color: '#db4d75' },
      { key: 'Primary text', color: '#0b0b10' },
      { key: 'Secondary', color: '#80233e' },
      { key: 'Entity fill', color: '#f5eff1' },
      { key: 'Entity accent', color: '#972b49' },
      { key: 'Entity text', color: '#612e3c' },
      { key: 'Entity border', color: '#ddb6c1' },
      { key: 'Body text', color: '#46393d' },
    ]);
    expect(previewRow).toEqual({
      title: 'Preview UI Roles',
      colors: [
        { name: 'shell-bg', color: preview.shellBg },
        { name: 'card-bg', color: preview.cardBg },
        { name: 'primary-action', color: preview.cta },
        { name: 'secondary-border', color: preview.secondaryActionBorder },
        { name: 'secondary-text', color: preview.secondaryActionForeground },
        { name: 'entity-bg', color: preview.entityHighlightBg },
        { name: 'entity-accent', color: preview.entityHighlightAccent },
        { name: 'entity-text', color: preview.entityHighlightText },
        { name: 'entity-border', color: preview.entityHighlightBorder },
      ],
    });
  });

  it('keeps displayed preview hexes aligned with Dark entity hierarchy', () => {
    const tokens = generateTokens('#FF9DB8', 'Monochromatic', 'dark', 100);
    const preview = buildPreviewRoleTokens(tokens, 'dark');
    const quickEssentials = buildPreviewQuickEssentials(preview);

    expect(quickEssentials).toEqual(expect.arrayContaining([
      { key: 'Preview shell', color: '#231016' },
      { key: 'Preview card', color: '#3a1821' },
      { key: 'Primary action', color: '#de547b' },
      { key: 'Secondary', color: '#d97893' },
      { key: 'Entity fill', color: '#5c233b' },
      { key: 'Entity accent', color: '#e6b3c8' },
      { key: 'Entity border', color: '#6d4656' },
    ]));
  });
});
