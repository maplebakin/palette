import { describe, expect, it } from 'vitest';
import { getContrastRatio } from './colorUtils.js';
import { generateTokens } from './tokens.js';
import {
  buildPreviewPaletteRow,
  buildPreviewQuickEssentials,
  buildPreviewRoleTokens,
} from './previewTokens.js';

const QA_SEEDS = [
  '#FF9DB8',
  '#F7D6E0',
  '#00D1FF',
  '#5B6FA8',
  '#111827',
  '#B8A48A',
  '#8BAF91',
  '#C7C7C7',
  '#FF7A00',
  '#050505',
  '#FAFAFA',
];

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

  it.each(QA_SEEDS)('applies Light preview hierarchy to seed %s', (base) => {
    const tokens = generateTokens(base, 'Monochromatic', 'light', 100);
    const preview = buildPreviewRoleTokens(tokens, 'light');
    const quickEssentials = buildPreviewQuickEssentials(preview);
    const previewRow = buildPreviewPaletteRow(preview);

    expect(preview.shellBg).toBe(tokens.surfaces.background);
    expect(preview.cardBg).toBe(tokens.entity['entity-card-surface']);
    expect(preview.cta).toBe(tokens.actions.primary);
    expect(preview.ctaForeground).toBe(tokens.actions['primary-foreground']);
    expect(preview.secondaryActionBorder).toBe(tokens.actions['secondary-border']);
    expect(preview.secondaryActionForeground).toBe(tokens.actions['secondary-border']);
    expect(preview.entityHighlightBg).toBe(tokens.entity['entity-highlight-bg']);
    expect(preview.entityHighlightAccent).toBe(tokens.entity['entity-highlight-accent']);
    expect(preview.entityHighlightText).toBe(tokens.entity['entity-highlight-text']);
    expect(preview.entityHighlightBorder).toBe(tokens.entity['entity-highlight-border']);
    expect(preview.entityHighlightBg).not.toBe(tokens.brand.cta);
    expect(preview.entityHighlightBg).not.toBe(tokens.brand['cta-hover']);
    expect(preview.entityHighlightBg).not.toBe(tokens.brand['accent-strong']);
    expect(getContrastRatio(preview.secondaryActionForeground, preview.cardBg)).toBeGreaterThanOrEqual(3.2);
    expect(getContrastRatio(preview.entityHighlightText, preview.entityHighlightBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(preview.entityHighlightAccent, preview.entityHighlightBg)).toBeGreaterThanOrEqual(4.5);
    expect(quickEssentials.find(({ key }) => key === 'Preview card')?.color).toBe(preview.cardBg);
    expect(quickEssentials.find(({ key }) => key === 'Primary action')?.color).toBe(preview.cta);
    expect(quickEssentials.find(({ key }) => key === 'Entity fill')?.color).toBe(preview.entityHighlightBg);
    expect(previewRow.colors.find(({ name }) => name === 'card-bg')?.color).toBe(preview.cardBg);
    expect(previewRow.colors.find(({ name }) => name === 'entity-bg')?.color).toBe(preview.entityHighlightBg);
  });

  it('displays the softened lavender Light action hex as the visual source of truth', () => {
    const tokens = generateTokens('#A78BFA', 'Monochromatic', 'light', 100);
    const preview = buildPreviewRoleTokens(tokens, 'light');
    const quickEssentials = buildPreviewQuickEssentials(preview);

    expect(preview.cta).toBe('#6150e2');
    expect(preview.cta).toBe(tokens.actions.primary);
    expect(quickEssentials.find(({ key }) => key === 'Primary action')?.color).toBe('#6150e2');
    expect(quickEssentials.find(({ key }) => key === 'Secondary')?.color).toBe(preview.secondaryActionBorder);
  });

  it.each(QA_SEEDS)('applies Dark preview hierarchy to seed %s', (base) => {
    const tokens = generateTokens(base, 'Monochromatic', 'dark', 100);
    const preview = buildPreviewRoleTokens(tokens, 'dark');
    const quickEssentials = buildPreviewQuickEssentials(preview);
    const previewRow = buildPreviewPaletteRow(preview);

    expect(preview.shellBg).toBe(tokens.surfaces.background);
    expect(preview.cardBg).toBe(tokens.cards['card-panel-surface']);
    expect(preview.cta).toBe(tokens.actions.primary);
    expect(preview.ctaForeground).toBe(tokens.actions['primary-foreground']);
    expect(preview.secondaryActionBorder).toBe(tokens.actions['secondary-border']);
    expect(preview.secondaryActionForeground).toBe(tokens.actions['secondary-foreground']);
    expect(preview.entityHighlightBg).toBe(tokens.entity['entity-card-glow']);
    expect(preview.entityHighlightBg).not.toBe(tokens.entity['entity-highlight-bg']);
    expect(preview.entityHighlightAccent).toBe(tokens.entity['entity-highlight-accent']);
    expect(preview.entityHighlightText).toBe(tokens.entity['entity-highlight-text']);
    expect(preview.entityHighlightBorder).toBe(tokens.entity['entity-card-border']);
    expect(preview.entityHighlightBg).not.toBe(tokens.brand.cta);
    expect(preview.entityHighlightBg).not.toBe(tokens.brand['cta-hover']);
    expect(preview.entityHighlightBg).not.toBe(tokens.brand['accent-strong']);
    expect(getContrastRatio(preview.entityHighlightText, preview.entityHighlightBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(preview.entityHighlightAccent, preview.entityHighlightBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(preview.cta, preview.cardBg)).toBeGreaterThan(
      getContrastRatio(preview.entityHighlightBg, preview.cardBg)
    );
    expect(quickEssentials.find(({ key }) => key === 'Preview card')?.color).toBe(preview.cardBg);
    expect(quickEssentials.find(({ key }) => key === 'Primary action')?.color).toBe(preview.cta);
    expect(quickEssentials.find(({ key }) => key === 'Entity fill')?.color).toBe(preview.entityHighlightBg);
    expect(previewRow.colors.find(({ name }) => name === 'card-bg')?.color).toBe(preview.cardBg);
    expect(previewRow.colors.find(({ name }) => name === 'entity-bg')?.color).toBe(preview.entityHighlightBg);
  });
});
