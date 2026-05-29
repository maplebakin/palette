import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ValidateStage from './ValidateStage.jsx';
import { generateTokens } from '../../lib/tokens.js';
import { getContrastRatio } from '../../lib/colorUtils.js';
import { buildPreviewRoleTokens } from '../../lib/previewTokens.js';

const renderValidateStage = (props = {}) => {
  const tokens = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);
  const quickEssentials = [
    { key: 'Primary', color: tokens.brand.primary },
    { key: 'CTA', color: tokens.brand.cta },
    { key: 'Entity', color: tokens.entity['entity-highlight-accent'] },
  ];

  return render(
    <ValidateStage
      tokens={tokens}
      displayThemeName="Monochromatic Light"
      baseColor="#FF9DB8"
      mode="Monochromatic"
      themeMode="light"
      isDark={false}
      primaryTextColor="#ffffff"
      quickEssentials={quickEssentials}
      copyAllEssentials={vi.fn()}
      copyEssentialsList={vi.fn()}
      copyHexValue={vi.fn()}
      orderedSwatches={quickEssentials.map(({ key, color }) => ({ name: key, color }))}
      showContrast={false}
      setShowContrast={vi.fn()}
      contrastChecks={[]}
      paletteRows={[{ title: 'Entity', colors: [{ name: 'Highlight', color: tokens.entity['entity-highlight-accent'] }] }]}
      activeTab="Quick view"
      setActiveTab={vi.fn()}
      getTabId={(tab) => `tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
      tabOptions={['Quick view', 'Full system']}
      onJumpToFileTools={vi.fn()}
      isInternal={false}
      {...props}
    />
  );
};

describe('ValidateStage', () => {
  it('renders the light entity highlight with a visible accent strip and icon fill', () => {
    const tokens = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);

    renderValidateStage({ tokens });

    expect(screen.getByTestId('preview-primary-action')).toHaveStyle({
      backgroundColor: tokens.actions.primary,
      color: tokens.actions['primary-foreground'],
    });
    expect(screen.getByTestId('preview-secondary-action')).toHaveStyle({
      borderColor: tokens.actions['secondary-border'],
      color: tokens.actions['secondary-border'],
    });
    expect(screen.getByTestId('entity-highlight-card')).toHaveStyle({
      backgroundColor: tokens.entity['entity-highlight-bg'],
      borderColor: tokens.entity['entity-highlight-border'],
    });
    expect(screen.getByTestId('entity-highlight-strip')).toHaveStyle({
      backgroundColor: tokens.entity['entity-highlight-accent'],
    });
    expect(screen.getByTestId('entity-highlight-icon')).toHaveStyle({
      backgroundColor: tokens.entity['entity-highlight-bg'],
      color: tokens.entity['entity-highlight-accent'],
    });
    expect(screen.getByText('Entity Highlight')).toHaveStyle({
      color: tokens.entity['entity-highlight-text'],
    });
  });

  it('keeps the light preview hierarchy airy without changing brand core tokens', () => {
    const tokens = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);

    renderValidateStage({ tokens });

    expect(tokens.brand.cta).toBe(tokens.actions.primary);
    expect(screen.getByTestId('theme-preview-root')).toHaveStyle({
      backgroundColor: tokens.surfaces.background,
    });
    expect(screen.getByTestId('preview-content-card')).toHaveStyle({
      backgroundColor: tokens.entity['entity-card-surface'],
    });
    expect(screen.getByTestId('preview-primary-action')).toHaveStyle({
      backgroundColor: tokens.actions.primary,
    });
    expect(screen.getByTestId('entity-highlight-card')).toHaveStyle({
      backgroundColor: tokens.entity['entity-highlight-bg'],
      borderColor: tokens.entity['entity-highlight-border'],
    });
    expect(screen.getByTestId('entity-highlight-card')).not.toHaveStyle({
      backgroundColor: tokens.brand['cta-hover'],
    });
    expect(screen.getByTestId('entity-highlight-card')).not.toHaveStyle({
      backgroundColor: tokens.foundation.accents['accent-ink'],
    });
  });

  it('keeps the light secondary action visible as a quiet outline button', () => {
    const tokens = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);

    renderValidateStage({ tokens });

    expect(screen.getByTestId('preview-secondary-action')).toHaveStyle({
      borderColor: tokens.actions['secondary-border'],
      color: tokens.actions['secondary-border'],
    });
    expect(screen.getByTestId('preview-secondary-action')).not.toHaveStyle({
      color: tokens.actions['secondary-foreground'],
    });
    expect(screen.getByTestId('preview-primary-action')).toHaveStyle({
      backgroundColor: tokens.actions.primary,
    });
    expect(getContrastRatio(tokens.actions['secondary-border'], tokens.entity['entity-card-surface'])).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    [
      '#FF9DB8',
      {
        shellBg: '#f7f2f3',
        cardBg: '#fbf9f9',
        cta: '#db4d75',
        ctaForeground: '#0b0b10',
        secondaryActionBorder: '#80233e',
        secondaryActionForeground: '#80233e',
        entityHighlightBg: '#f5eff1',
        entityHighlightAccent: '#972b49',
        entityHighlightText: '#612e3c',
        entityHighlightBorder: '#ddb6c1',
      },
    ],
    [
      '#F7D6E0',
      {
        shellBg: '#f7f3f4',
        cardBg: '#faf9fa',
        cta: '#d2567b',
        ctaForeground: '#0b0b10',
        secondaryActionBorder: '#7a2941',
        secondaryActionForeground: '#7a2941',
        entityHighlightBg: '#f4f0f1',
        entityHighlightAccent: '#8a3851',
        entityHighlightText: '#593640',
        entityHighlightBorder: '#d6bcc4',
      },
    ],
  ])('locks approved Light preview token mapping for %s', (base, expected) => {
    const tokens = generateTokens(base, 'Monochromatic', 'light', 100);
    const preview = buildPreviewRoleTokens(tokens, 'light');

    expect(preview).toEqual(expect.objectContaining(expected));
    expect(preview.cta).toBe(tokens.actions.primary);
    expect(preview.cardBg).toBe(tokens.entity['entity-card-surface']);
    expect(preview.shellBg).toBe(tokens.surfaces.background);
    expect(preview.entityHighlightBg).toBe(tokens.entity['entity-highlight-bg']);
    expect(preview.entityHighlightAccent).toBe(tokens.entity['entity-highlight-accent']);
    expect(preview.entityHighlightText).toBe(tokens.entity['entity-highlight-text']);
    expect(preview.entityHighlightBorder).toBe(tokens.entity['entity-highlight-border']);
  });

  it('keeps Light entity highlight softer than Primary and off Brand Core action fills', () => {
    const tokens = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);
    const preview = buildPreviewRoleTokens(tokens, 'light');

    renderValidateStage({ tokens });

    expect(preview.entityHighlightBg).not.toBe(tokens.brand.cta);
    expect(preview.entityHighlightBg).not.toBe(tokens.brand['cta-hover']);
    expect(preview.entityHighlightBg).not.toBe(tokens.brand['accent-strong']);
    expect(preview.entityHighlightBg).not.toBe(tokens.foundation.accents['accent-ink']);
    expect(screen.getByTestId('entity-highlight-icon')).toHaveStyle({
      backgroundColor: preview.entityHighlightBg,
      color: preview.entityHighlightAccent,
    });
    expect(getContrastRatio(preview.entityHighlightAccent, preview.entityHighlightBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(preview.entityHighlightText, preview.entityHighlightBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(preview.cta, preview.cardBg)).toBeGreaterThan(
      getContrastRatio(preview.entityHighlightBg, preview.cardBg)
    );
  });

  it('renders Primary as the only filled action in the approved Light hierarchy', () => {
    const tokens = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);

    renderValidateStage({ tokens });

    expect(screen.getByTestId('preview-primary-action')).toHaveStyle({
      backgroundColor: tokens.actions.primary,
      color: tokens.actions['primary-foreground'],
    });
    expect(screen.getByTestId('preview-secondary-action')).not.toHaveStyle({
      backgroundColor: tokens.actions.primary,
    });
    expect(screen.getByTestId('entity-highlight-card')).not.toHaveStyle({
      backgroundColor: tokens.actions.primary,
    });
  });

  it('keeps Pop #F7D6E0 on the approved strawberry cream conversion mapping', () => {
    const pop = generateTokens('#F7D6E0', 'Monochromatic', 'pop', 100, { popIntensity: 130 });
    const preview = buildPreviewRoleTokens(pop, 'pop');

    expect(preview).toEqual(expect.objectContaining({
      shellBg: '#9e1941',
      cardBg: '#c72e5c',
      cta: '#f39bb5',
      ctaForeground: '#0b0b10',
      secondaryActionBorder: '#ee6d93',
      secondaryActionForeground: '#f5f5f5',
      entityHighlightBg: '#f7d6e0',
      entityHighlightAccent: '#ffffff',
      entityHighlightBorder: '#ee6d93',
    }));
    expect(pop.pop['pop-background']).toBe('#9e1941');
    expect(pop.pop['pop-cta']).toBe('#f39bb5');
  });

  it('keeps Dark #FF9DB8 on the approved rose/plum dashboard mapping', () => {
    const dark = generateTokens('#FF9DB8', 'Monochromatic', 'dark', 100);
    const preview = buildPreviewRoleTokens(dark, 'dark');

    expect(preview).toEqual(expect.objectContaining({
      shellBg: '#231016',
      cardBg: '#3a1821',
      cta: '#de547b',
      ctaForeground: '#0b0b10',
      secondaryActionBorder: '#d97893',
      secondaryActionForeground: '#0b0b10',
      entityHighlightBg: '#5c233b',
      entityHighlightAccent: '#e6b3c8',
      entityHighlightBorder: '#6d4656',
    }));
    expect(dark.actions.primary).toBe('#de547b');
    expect(dark.entity['entity-highlight-bg']).toBe('#962c58');
    expect(preview.entityHighlightBg).toBe(dark.entity['entity-card-glow']);
    expect(preview.entityHighlightBg).not.toBe(dark.entity['entity-highlight-bg']);
  });

  it('keeps Dark entity highlight integrated and less dominant than Primary Action', () => {
    const dark = generateTokens('#FF9DB8', 'Monochromatic', 'dark', 100);
    const preview = buildPreviewRoleTokens(dark, 'dark');

    renderValidateStage({
      tokens: dark,
      displayThemeName: 'Monochromatic Dark',
      themeMode: 'dark',
      isDark: true,
      primaryTextColor: dark.actions['primary-foreground'],
      quickEssentials: [
        { key: 'Primary', color: dark.brand.primary },
        { key: 'CTA', color: dark.brand.cta },
        { key: 'Entity', color: dark.entity['entity-highlight-accent'] },
      ],
    });

    expect(preview.entityHighlightBg).not.toBe(dark.brand.cta);
    expect(preview.entityHighlightBg).not.toBe(dark.brand['cta-hover']);
    expect(preview.entityHighlightBg).not.toBe(dark.brand['accent-strong']);
    expect(preview.entityHighlightBg).not.toBe(dark.pop?.['pop-cta']);
    expect(screen.getByTestId('entity-highlight-card')).toHaveStyle({
      backgroundColor: preview.entityHighlightBg,
      borderColor: preview.entityHighlightBorder,
    });
    expect(screen.getByTestId('entity-highlight-icon')).toHaveStyle({
      backgroundColor: preview.entityHighlightAccent,
      color: preview.entityHighlightBg,
    });
    expect(getContrastRatio(preview.entityHighlightText, preview.entityHighlightBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(preview.entityHighlightAccent, preview.entityHighlightBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(preview.cta, preview.cardBg)).toBeGreaterThan(
      getContrastRatio(preview.entityHighlightBg, preview.cardBg)
    );
  });

  it('updates preview action and highlight mapping when mode tokens change', () => {
    const light = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);
    const dark = generateTokens('#FF9DB8', 'Monochromatic', 'dark', 100);
    const { rerender } = renderValidateStage({ tokens: light });

    expect(screen.getByTestId('preview-primary-action')).toHaveStyle({
      backgroundColor: light.actions.primary,
    });
    expect(screen.getByTestId('entity-highlight-card')).toHaveStyle({
      backgroundColor: light.entity['entity-highlight-bg'],
    });

    rerender(
      <ValidateStage
        tokens={dark}
        displayThemeName="Monochromatic Dark"
        baseColor="#FF9DB8"
        mode="Monochromatic"
        themeMode="dark"
        isDark
        primaryTextColor={dark.actions['primary-foreground']}
        quickEssentials={[
          { key: 'Primary', color: dark.brand.primary },
          { key: 'CTA', color: dark.brand.cta },
          { key: 'Entity', color: dark.entity['entity-highlight-accent'] },
        ]}
        copyAllEssentials={vi.fn()}
        copyEssentialsList={vi.fn()}
        copyHexValue={vi.fn()}
        orderedSwatches={[]}
        showContrast={false}
        setShowContrast={vi.fn()}
        contrastChecks={[]}
        paletteRows={[]}
        activeTab="Quick view"
        setActiveTab={vi.fn()}
        getTabId={(tab) => `tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
        tabOptions={['Quick view', 'Full system']}
        onJumpToFileTools={vi.fn()}
        isInternal={false}
      />
    );

    expect(screen.getByTestId('preview-primary-action')).toHaveStyle({
      backgroundColor: dark.actions.primary,
      color: dark.actions['primary-foreground'],
    });
    expect(screen.getByTestId('entity-highlight-card')).toHaveStyle({
      backgroundColor: dark.entity['entity-card-glow'],
      borderColor: dark.entity['entity-card-border'],
    });
    expect(screen.getByTestId('entity-highlight-icon')).toHaveStyle({
      backgroundColor: dark.entity['entity-highlight-accent'],
      color: dark.entity['entity-card-glow'],
    });
  });

  it('updates preview action and highlight mapping when fine-tune tokens change', () => {
    const quiet = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100, {
      accentStrength: 60,
      neutralCurve: 80,
    });
    const punchy = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100, {
      accentStrength: 140,
      neutralCurve: 130,
    });
    const { rerender } = renderValidateStage({ tokens: quiet });

    expect(quiet.actions.primary).not.toBe(punchy.actions.primary);
    expect(quiet.entity['entity-highlight-bg']).not.toBe(punchy.entity['entity-highlight-bg']);
    expect(screen.getByTestId('preview-primary-action')).toHaveStyle({
      backgroundColor: quiet.actions.primary,
    });
    expect(screen.getByTestId('entity-highlight-card')).toHaveStyle({
      backgroundColor: quiet.entity['entity-highlight-bg'],
    });

    rerender(
      <ValidateStage
        tokens={punchy}
        displayThemeName="Monochromatic Light"
        baseColor="#FF9DB8"
        mode="Monochromatic"
        themeMode="light"
        isDark={false}
        primaryTextColor={punchy.actions['primary-foreground']}
        quickEssentials={[
          { key: 'Primary', color: punchy.brand.primary },
          { key: 'CTA', color: punchy.brand.cta },
          { key: 'Entity', color: punchy.entity['entity-highlight-accent'] },
        ]}
        copyAllEssentials={vi.fn()}
        copyEssentialsList={vi.fn()}
        copyHexValue={vi.fn()}
        orderedSwatches={[]}
        showContrast={false}
        setShowContrast={vi.fn()}
        contrastChecks={[]}
        paletteRows={[]}
        activeTab="Quick view"
        setActiveTab={vi.fn()}
        getTabId={(tab) => `tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
        tabOptions={['Quick view', 'Full system']}
        onJumpToFileTools={vi.fn()}
        isInternal={false}
      />
    );

    expect(screen.getByTestId('preview-primary-action')).toHaveStyle({
      backgroundColor: punchy.actions.primary,
      color: punchy.actions['primary-foreground'],
    });
    expect(screen.getByTestId('entity-highlight-card')).toHaveStyle({
      backgroundColor: punchy.entity['entity-highlight-bg'],
      borderColor: punchy.entity['entity-highlight-border'],
    });
  });
});
