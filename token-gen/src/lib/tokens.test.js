import { hexToOklch } from './core-math.js';
import { buildTheme } from './theme/engine.js';
import { describe, it, expect } from 'vitest';
import { generateTokens, addPrintMode } from './tokens.js';
import { getContrastRatio, hexToHsl } from './colorUtils.js';

const hueDistance = (a, b) => {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
};
const SEED_GAUNTLET = [
  '#FF9DB8',
  '#F7D6E0',
  '#B86F8A',
  '#AD14B8',
  '#A78BFA',
  '#6B4FA3',
  '#5B6FA8',
  '#00D1FF',
  '#2563EB',
  '#8BAF91',
  '#7F9F7A',
  '#B8A48A',
  '#B89251',
  '#FF7A00',
  '#FFD000',
  '#C7C7C7',
  '#71717A',
  '#111827',
  '#18181B',
];

// Acceptance is now based on delivered contrast and OKLCH structure, not fixed HSL windows.
const assertSemanticReadability = tokens => {
  for (const background of [tokens.surfaces.background, tokens.cards['card-panel-surface']]) {
    expect(getContrastRatio(tokens.typography['text-body'], background)).toBeGreaterThanOrEqual(7);
    expect(getContrastRatio(tokens.typography.heading, background)).toBeGreaterThanOrEqual(7);
    expect(getContrastRatio(tokens.typography['text-muted'], background)).toBeGreaterThanOrEqual(4.5);
  }
  expect(getContrastRatio(tokens.brand.accent, tokens.surfaces.background)).toBeGreaterThanOrEqual(4.5);
  expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions.primary)).toBeGreaterThanOrEqual(4.5);
};

describe('generateTokens', () => {
  it('retains muted violet character in all three variants', () => {
    const seed = '#685779';
    for (const variant of ['light', 'dark']) {
      const tokens = generateTokens(seed, 'Monochromatic', variant);
      expect(hexToHsl(tokens.brand.accent).s).toBeLessThanOrEqual(hexToHsl(seed).s + 8);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions.primary)).toBeGreaterThanOrEqual(4.5);
    }
    const pop = generateTokens(seed, 'Monochromatic', 'pop', 100, { popIntensity: 130 });
    expect(hexToHsl(pop.pop['pop-background']).s).toBeLessThan(65);
    expect(pop.pop['original-accent']).toBe(seed);
  });

  it.each(['light', 'dark'])('uses a coherent panel, overlay and hover elevation ladder in %s', (themeMode) => {
    for (const seed of SEED_GAUNTLET) {
      for (const mode of ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary']) {
        const tokens = generateTokens(seed, mode, themeMode);
        const value = (path) => hexToHsl(path.split('.').reduce((obj, key) => obj[key], tokens)).l;
        const panel = value('cards.card-panel-surface');
        const secondary = value('aliases.surface-panel-secondary');
        const elevated = value('cards.card-panel-surface-strong');
        const overlay = value('aliases.overlay-panel');
        const overlayStrong = value('aliases.overlay-panel-strong');
        const hover = value('aliases.surface-card-hover');
        expect(secondary).toBeGreaterThan(panel);
        expect(elevated).toBeGreaterThan(secondary);
        expect(overlay).toBeGreaterThan(secondary);
        expect(overlayStrong).toBeGreaterThan(overlay);
        expect(hover).toBeGreaterThan(elevated);
        expect(getContrastRatio(tokens.typography['text-body'], tokens.surfaces.background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('does not change the existing Pop and Apocalypse elevation choreography', () => {
    for (const mode of ['pop', 'dark', 'light']) {
      const harmony = mode === 'pop' ? 'Analogous' : 'Apocalypse';
      const tokens = generateTokens('#7755bb', harmony, mode);
      const surface = hexToHsl(tokens.cards['card-panel-surface']).l;
      const secondary = hexToHsl(tokens.aliases['surface-panel-secondary']).l;
      const overlay = hexToHsl(tokens.aliases['overlay-panel']).l;
      expect(secondary).toBeCloseTo(surface + (mode === 'dark' ? 4 : -2), 0);
      expect(overlay).toBeCloseTo(surface + (mode === 'dark' ? 2 : 0), 0);
    }
  });

  it.each(['light', 'dark'])('maintains a distinct page-to-card tonal ladder in %s', (themeMode) => {
    for (const seed of SEED_GAUNTLET) {
      for (const harmony of ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary']) {
        const tokens = generateTokens(seed, harmony, themeMode);
        const backgroundL = hexToHsl(tokens.surfaces.background).l;
        const panelL = hexToHsl(tokens.cards['card-panel-surface']).l;
        const elevatedL = hexToHsl(tokens.cards['card-panel-surface-strong']).l;
        if (themeMode === 'dark') {
          expect(panelL).toBeGreaterThanOrEqual(backgroundL + 8);
          expect(elevatedL).toBeGreaterThan(panelL);
        } else {
          expect(panelL).toBeLessThanOrEqual(backgroundL - 5);
          expect(elevatedL).toBeGreaterThan(panelL);
        }
        expect(getContrastRatio(tokens.typography['text-body'], tokens.surfaces.background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps Apocalypse and Pop custom tonal settings intact', () => {
    const seed = '#7755bb';
    const pop = generateTokens(seed, 'Analogous', 'pop');
    const apocalypse = generateTokens(seed, 'Apocalypse', 'dark');
    expect(hexToHsl(pop.surfaces.background).l).toBeGreaterThan(12);
    expect(hexToHsl(apocalypse.surfaces.background).l).toBeLessThan(6);
  });

  it.each(['light', 'dark'])('gives %s harmony presets a distinct secondary action hue', (themeMode) => {
    const seed = '#7755bb';
    const baseHue = hexToHsl(seed).h;
    const cases = [
      ['Monochromatic', 8],
      ['Analogous', -30],
      ['Complementary', 180],
      ['Tertiary', 120],
      ['Apocalypse', 180],
    ];
    for (const [mode, offset] of cases) {
      const tokens = generateTokens(seed, mode, themeMode);
      const secondary = hexToHsl(tokens.actions.secondary);
      const expectedHue = mode === 'Monochromatic' ? (baseHue + 8 + 360) % 360 : (baseHue + offset + 360) % 360;
      expect(hueDistance(secondary.h, expectedHue)).toBeLessThanOrEqual(3);
      expect(tokens.actions['secondary-border']).toBe(tokens.actions.secondary);
      expect(getContrastRatio(tokens.actions['secondary-foreground'], tokens.actions.secondary)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps grayscale secondary actions neutral and soft-blush exceptions stable', () => {
    for (const theme of ['light', 'dark']) {
      const gray = generateTokens('#808080', 'Complementary', theme);
      expect(hexToHsl(gray.actions.secondary).s).toBe(0);
      const mono = generateTokens('#F7D6E0', 'Monochromatic', theme);
      const comp = generateTokens('#F7D6E0', 'Complementary', theme);
      expect(comp.actions.secondary).toBe(mono.actions.secondary);
    }
  });

  it('gives Pop presets distinct supporting hues without replacing seed-led surfaces or CTAs', () => {
    const seed = '#7755bb';
    const modes = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
    const outputs = modes.map((mode) => generateTokens(seed, mode, 'pop', 100, { popIntensity: 130 }));
    const seedHue = hexToHsl(seed).h;
    const expectedOffsets = [0, -30, 170, 120, 175];
    outputs.forEach((tokens, index) => {
      const supportHue = hexToHsl(tokens.pop['sticker-accent']).h;
      expect(hueDistance(supportHue, (seedHue + expectedOffsets[index] + 360) % 360)).toBeLessThanOrEqual(3);
      expect(getContrastRatio(tokens.brand.accent, tokens.surfaces.background)).toBeGreaterThanOrEqual(4.5);
      expect(tokens.pop['pop-accent']).toBe(seed);
      expect(tokens.actions.secondary).toBe(tokens.pop['sticker-border']);
      expect(tokens.entity['entity-highlight-border']).toBe(tokens.pop['sticker-border']);
      expect(getContrastRatio(tokens.pop['pop-foreground'], tokens.pop['pop-background'])).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions.primary)).toBeGreaterThanOrEqual(4.5);
    });
    expect(new Set(outputs.map((tokens) => tokens.pop['sticker-accent'])).size).toBe(5);
  });

  it('keeps neutral Pop support hue-neutral across harmony modes', () => {
    const mono = generateTokens('#808080', 'Monochromatic', 'pop');
    const complement = generateTokens('#808080', 'Complementary', 'pop');
    expect(complement.pop['sticker-accent']).toBe(mono.pop['sticker-accent']);
  });

  it('produces distinct brand colors per harmony mode', () => {
    const base = '#3366ff';
    const lightMono = generateTokens(base, 'Monochromatic', 'light', 100);
    const lightAnalog = generateTokens(base, 'Analogous', 'light', 100);
    const lightComp = generateTokens(base, 'Complementary', 'light', 100);
    expect(lightMono.brand.secondary).not.toBe(lightAnalog.brand.secondary);
    expect(lightAnalog.brand.secondary).not.toBe(lightComp.brand.secondary);
  });

  it('responds to neutral curve and accent strength controls', () => {
    const muted = generateTokens('#3366ff', 'Monochromatic', 'dark', 100, { neutralCurve: 80, accentStrength: 80 });
    const punchy = generateTokens('#3366ff', 'Monochromatic', 'dark', 100, { neutralCurve: 130, accentStrength: 140 });
    expect(muted.foundation.neutrals['neutral-0']).not.toBe(punchy.foundation.neutrals['neutral-0']);
    expect(muted.brand.accent).not.toBe(punchy.brand.accent);
    const mutedContrast = getContrastRatio(muted.brand.primary, muted.surfaces.background);
    const punchyContrast = getContrastRatio(punchy.brand.primary, punchy.surfaces.background);
    expect(punchyContrast).toBeGreaterThan(mutedContrast * 0.8);
  });

  it('lets harmony spread influence the brand stack', () => {
    const narrow = generateTokens('#6633ff', 'Analogous', 'light', 100, { harmonyIntensity: 60 });
    const wide = generateTokens('#6633ff', 'Analogous', 'light', 100, { harmonyIntensity: 150 });
    expect(narrow.brand.secondary).not.toBe(wide.brand.secondary);
    expect(narrow.brand.accent).not.toBe(wide.brand.accent);
  });

  it('lightens harmony colors instead of making low harmony spread feel darker', () => {
    ['light', 'dark'].forEach((themeMode) => {
      const low = generateTokens('#6633ff', 'Analogous', themeMode, 100, { harmonyIntensity: 60 });
      const neutral = generateTokens('#6633ff', 'Analogous', themeMode, 100, { harmonyIntensity: 100 });

      expect(hexToHsl(low.brand.secondary).l).toBeGreaterThan(hexToHsl(neutral.brand.secondary).l);
      expect(hexToHsl(low.brand.accent).l).toBeGreaterThan(hexToHsl(neutral.brand.accent).l);
    });
  });

  it("keeps Pop readable while harmony intensity changes its OKLCH hue spread", () => {
    const low = generateTokens('#FF9DB8', 'Analogous', 'pop', 100, { harmonyIntensity: 60 });
    const normal = generateTokens('#FF9DB8', 'Analogous', 'pop');
    assertSemanticReadability(low); assertSemanticReadability(normal);
    expect(low.brand.accent).not.toBe(normal.brand.accent);
  });

  it("reduces accent chroma with lower accent strength without losing readability", () => {
    for (const theme of ['light', 'dark']) {
      const low = generateTokens('#00D1FF', 'Analogous', theme, 100, { accentStrength: 50 });
      const normal = generateTokens('#00D1FF', 'Analogous', theme);
      expect(hexToOklch(low.brand.accent).c).toBeLessThan(hexToOklch(normal.brand.accent).c);
      assertSemanticReadability(low); assertSemanticReadability(normal);
    }
  });

  it("applies accent strength to Pop colours deterministically", () => {
    const low = generateTokens('#FF9DB8', 'Analogous', 'pop', 100, { accentStrength: 50 });
    const normal = generateTokens('#FF9DB8', 'Analogous', 'pop');
    expect(low.brand.accent).not.toBe(normal.brand.accent);
    assertSemanticReadability(low); assertSemanticReadability(normal);
  });

  it('applies manual accent hue and saturation tuning to action colors only', () => {
    const base = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);
    const hueTuned = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100, {
      accentHueShift: -30,
    });
    const saturationTuned = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100, {
      accentSaturationShift: -24,
    });

    expect(hueTuned.brand.cta).not.toBe(base.brand.cta);
    expect(hueTuned.actions.primary).toBe(hueTuned.brand.cta);
    expect(hueTuned.brand.accent).not.toBe(base.brand.accent);
    expect(hueTuned.surfaces.background).toBe(base.surfaces.background);
    expect(hueTuned.typography['text-body']).toBe(base.typography['text-body']);
    expect(hueTuned.brand.primary).toBe(base.brand.primary);

    expect(saturationTuned.actions.primary).not.toBe(base.actions.primary);
    expect(hexToHsl(saturationTuned.actions.primary).s).toBeLessThan(hexToHsl(base.actions.primary).s);
    expect(saturationTuned.surfaces.background).toBe(base.surfaces.background);
  });

  it('leaves generated action colors unchanged when manual accent tuning is reset', () => {
    const base = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);
    const reset = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100, {
      accentHueShift: 0,
      accentSaturationShift: 0,
    });

    expect(reset.brand.cta).toBe(base.brand.cta);
    expect(reset.actions.primary).toBe(base.actions.primary);
    expect(reset.brand.accent).toBe(base.brand.accent);
  });

  it('keeps pop CTA aliases tied together after manual accent tuning', () => {
    const tuned = generateTokens('#FF9DB8', 'Monochromatic', 'pop', 100, {
      accentHueShift: -20,
      accentSaturationShift: -12,
      popIntensity: 130,
    });

    expect(tuned.brand.cta).toBe(tuned.actions.primary);
    expect(tuned.pop['pop-cta']).toBe(tuned.actions.primary);
    expect(tuned.pop['pop-cta-foreground']).toBe(tuned.actions['primary-foreground']);
    expect(getContrastRatio(tuned.pop['pop-cta-foreground'], tuned.pop['pop-cta'])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps complementary blue surfaces from drifting into green', () => {
    const tokens = generateTokens('#0000ff', 'Complementary', 'light', 100);
    const surfaceHue = hexToHsl(tokens.surfaces['surface-plain']).h;
    expect(surfaceHue).toBeGreaterThan(185);
    expect(surfaceHue).toBeLessThan(260);
  });

  it('keeps tertiary yellow surfaces from turning muddy', () => {
    const tokens = generateTokens('#ffff00', 'Tertiary', 'light', 100);
    const backgroundHue = hexToHsl(tokens.surfaces.background).h;
    expect(backgroundHue).toBeGreaterThan(10);
    expect(backgroundHue).toBeLessThan(90);
  });

  it("keeps Pop chromatic and seed-related with a subtle readable surface step", () => {
    const tokens = generateTokens('#3366ff', 'Analogous', 'pop', 100, { popIntensity: 130 });
    assertSemanticReadability(tokens);
    expect(hexToOklch(tokens.surfaces.background).c).toBeGreaterThan(0.04);
    expect(hueDistance(hexToOklch(tokens.surfaces.background).h, hexToOklch('#3366ff').h)).toBeLessThan(2);
    expect(hexToOklch(tokens.cards['card-panel-surface']).l).toBeGreaterThan(hexToOklch(tokens.surfaces.background).l);
  });

  it('produces darker backgrounds for dark mode', () => {
    const lightTokens = generateTokens('#3366ff', 'Monochromatic', 'light', 100);
    const darkTokens = generateTokens('#3366ff', 'Monochromatic', 'dark', 100);
    const lightBg = hexToHsl(lightTokens.surfaces.background).l;
    const darkBg = hexToHsl(darkTokens.surfaces.background).l;
    expect(darkBg).toBeLessThan(lightBg);
  });

  it('keeps dark and light primary colors tied to the seed hue', () => {
    const base = '#3366ff';
    const baseHue = hexToHsl(base).h;
    const variants = ['dark', 'light'].map((themeMode) =>
      generateTokens(base, 'Analogous', themeMode, 100, { popIntensity: 130 })
    );

    variants.forEach((tokens) => {
      const primary = hexToHsl(tokens.brand.primary);
      expect(hueDistance(primary.h, baseHue)).toBeLessThanOrEqual(8);
      expect(primary.s).toBeGreaterThan(60);
    });
  });

  it('gives dark, light, and pop variants distinct purpose-built backgrounds with usable text contrast', () => {
    const dark = generateTokens('#3366ff', 'Analogous', 'dark', 100);
    const light = generateTokens('#3366ff', 'Analogous', 'light', 100);
    const pop = generateTokens('#3366ff', 'Analogous', 'pop', 100, { popIntensity: 130 });

    const darkBg = hexToHsl(dark.surfaces.background);
    const lightBg = hexToHsl(light.surfaces.background);
    const popBg = hexToHsl(pop.surfaces.background);

    expect(darkBg.l).toBeLessThan(20);
    expect(lightBg.l).toBeGreaterThan(90);
    expect(popBg.s).toBeGreaterThan(80);
    expect(popBg.l).toBeLessThan(45);
    expect(popBg.l).toBeGreaterThan(darkBg.l + 10);

    [dark, light, pop].forEach((tokens) => {
      expect(getContrastRatio(tokens.typography['text-body'], tokens.surfaces.background)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(tokens.typography['text-muted'], tokens.cards['card-panel-surface'])).toBeGreaterThanOrEqual(3.2);
    });
  });

  it.each(['#FF9DB8', '#F7D6E0'])("keeps light blush CTA seed-related and readable for %s", (base) => {
    for (const theme of ["light"]) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it("keeps lavender light actions in their perceptual seed family with readable labels", () => {
    const tokens = generateTokens('#A78BFA', 'Monochromatic', 'light');
    assertSemanticReadability(tokens);
    expect(hueDistance(hexToOklch(tokens.brand.cta).h, hexToOklch('#A78BFA').h)).toBeLessThan(2);
  });

  it.each(['#FF9DB8', '#F7D6E0'])("keeps pale blush roles distinct and link-safe for %s", (base) => {
    for (const theme of ["light"]) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it.each(['#FF9DB8', '#F7D6E0'])("keeps pale blush semantic roles readable alongside support tokens for %s", (base) => {
    for (const theme of ["light"]) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it('keeps blush status colors recognizable but less default-saturated', () => {
    const light = generateTokens('#FF9DB8', 'Monochromatic', 'light', 100);
    const success = hexToHsl(light.status.success);
    const warning = hexToHsl(light.status.warning);
    const error = hexToHsl(light.status.error);
    const info = hexToHsl(light.status.info);

    expect(success.h).toBeGreaterThanOrEqual(125);
    expect(success.h).toBeLessThanOrEqual(155);
    expect(warning.h).toBeGreaterThanOrEqual(35);
    expect(warning.h).toBeLessThanOrEqual(50);
    expect(hueDistance(error.h, 0)).toBeLessThanOrEqual(8);
    expect(info.h).toBeGreaterThanOrEqual(200);
    expect(info.h).toBeLessThanOrEqual(220);
    [success, warning, error, info].forEach((role) => {
      expect(role.s).toBeLessThanOrEqual(62);
      expect(role.s).toBeGreaterThanOrEqual(40);
    });
  });

  it.each(['#FF9DB8', '#F7D6E0'])('keeps light pale-pink entity highlight soft and integrated for %s', (base) => {
    const light = generateTokens(base, 'Monochromatic', 'light', 100);
    const highlightBg = hexToHsl(light.entity['entity-highlight-bg']);
    const highlightAccent = hexToHsl(light.entity['entity-highlight-accent']);

    expect(light.brand.cta).toBe(light.actions.primary);
    expect(highlightBg.l).toBeGreaterThanOrEqual(92);
    expect(highlightBg.s).toBeLessThanOrEqual(26);
    expect(highlightAccent.l).toBeGreaterThanOrEqual(36);
    expect(highlightAccent.l).toBeLessThanOrEqual(42);
    expect(highlightAccent.s).toBeGreaterThanOrEqual(40);
    expect(highlightAccent.s).toBeLessThanOrEqual(58);
    expect(light.entity['entity-card-highlight']).toBe(light.entity['entity-highlight-bg']);
    expect(getContrastRatio(light.entity['entity-highlight-accent'], light.entity['entity-highlight-bg'])).toBeGreaterThanOrEqual(6);
    expect(getContrastRatio(light.entity['entity-highlight-border'], light.entity['entity-highlight-bg'])).toBeGreaterThanOrEqual(1.5);
    expect(getContrastRatio(light.entity['entity-highlight-text'], light.entity['entity-card-surface'])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['#FF9DB8', '#F7D6E0'])('keeps light entity highlight responsive to fine-tune sliders for %s', (base) => {
    const low = generateTokens(base, 'Monochromatic', 'light', 100, {
      neutralCurve: 70,
      accentStrength: 60,
    });
    const high = generateTokens(base, 'Monochromatic', 'light', 100, {
      neutralCurve: 140,
      accentStrength: 140,
    });

    expect(low.entity['entity-highlight-bg']).not.toBe(high.entity['entity-highlight-bg']);
    expect(low.entity['entity-highlight-accent']).not.toBe(high.entity['entity-highlight-accent']);
    expect(low.brand.cta).not.toBe(high.brand.cta);
  });

  it.each(['#FF9DB8', '#F7D6E0', '#00D1FF', '#5B6FA8', '#111827', '#B8A48A', '#8BAF91', '#C7C7C7'])('keeps light mode action roles visible for QA seed %s', (base) => {
    const light = generateTokens(base, 'Monochromatic', 'light', 100);
    const seed = hexToHsl(base);
    const paleBlush = seed.l >= 76 && seed.s >= 30 && (seed.h >= 330 || seed.h <= 8);

    expect(light.brand.cta).toBe(light.actions.primary);
    expect(light.actions.primary).not.toBe(light.pop?.['pop-cta']);
    expect(getContrastRatio(light.actions.primary, light.cards['card-panel-surface'])).toBeGreaterThanOrEqual(paleBlush ? 3.2 : 3.5);
    expect(getContrastRatio(light.actions['primary-foreground'], light.actions.primary)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(light.actions.secondary, light.cards['card-panel-surface'])).toBeGreaterThanOrEqual(3);
  });

  it.each(['#FF9DB8', '#F7D6E0', '#00D1FF', '#5B6FA8', '#111827', '#B8A48A', '#8BAF91', '#C7C7C7'])('keeps dark mode action roles visible for QA seed %s', (base) => {
    const dark = generateTokens(base, 'Monochromatic', 'dark', 100);

    expect(dark.brand.cta).toBe(dark.actions.primary);
    expect(dark.actions.primary).not.toBe(dark.pop?.['pop-cta']);
    expect(getContrastRatio(dark.actions.primary, dark.surfaces.background)).toBeGreaterThanOrEqual(3.4);
    expect(getContrastRatio(dark.actions.primary, dark.cards['card-panel-surface'])).toBeGreaterThanOrEqual(3.4);
    expect(getContrastRatio(dark.actions['primary-foreground'], dark.actions.primary)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(dark.actions.secondary, dark.surfaces.background)).toBeGreaterThanOrEqual(3);
  });

  it.each(['#FF9DB8', '#F7D6E0'])("keeps dark pale pink CTA seed-related and readable for %s", (base) => {
    for (const theme of ["dark"]) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it.each(['#FF9DB8', '#F7D6E0', '#00D1FF', '#5B6FA8', '#111827', '#B8A48A', '#8BAF91', '#C7C7C7'])('keeps pop CTA scoped to pop roles for QA seed %s', (base) => {
    const pop = generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 130 });

    expect(pop.brand.cta).toBe(pop.pop['pop-cta']);
    expect(pop.actions.primary).toBe(pop.pop['pop-cta']);
    expect(pop.actions['primary-foreground']).toBe(pop.pop['pop-cta-foreground']);
    expect(getContrastRatio(pop.pop['pop-cta-foreground'], pop.pop['pop-cta'])).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps Pop aliases synchronized with the generated seven roles", () => {
    const tokens = generateTokens('#F7D6E0', 'Monochromatic', 'pop', 100, { popIntensity: 130 });
    assertSemanticReadability(tokens);
    expect(tokens.pop['pop-background']).toBe(tokens.surfaces.background);
    expect(tokens.pop['pop-surface']).toBe(tokens.cards['card-panel-surface']);
    expect(tokens.pop['pop-cta']).toBe(tokens.brand.cta);
  });

  it.each(['#FF9DB8', '#F7D6E0'])('keeps pale pink pop mode responsive to pop intensity for %s', (base) => {
    const quiet = generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 70 });
    const punchy = generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 130 });

    expect(quiet.pop['pop-background']).not.toBe(punchy.pop['pop-background']);
    expect(quiet.pop['pop-surface']).not.toBe(punchy.pop['pop-surface']);
  });

  it('keeps dark pale pink action in the seed family while refining light entity highlights', () => {
    const dark = generateTokens('#FF9DB8', 'Monochromatic', 'dark', 100, { popIntensity: 130 });
    const seed = hexToHsl('#FF9DB8');
    const cta = hexToHsl(dark.brand.cta);

    expect(dark.actions.primary).toBe(dark.brand.cta);
    expect(hueDistance(cta.h, seed.h)).toBeLessThanOrEqual(3);
    expect(cta.s).toBeLessThanOrEqual(76);
    expect(dark.entity['entity-card-highlight']).toBe('#962c58');
  });

  it.each(['#B8A48A', '#AD14B8', '#8A9EB8', '#A8B8A0', '#FF00FF'])("keeps %s Pop seed-related with a subtle surface step", (base) => {
    for (const theme of ["pop"]) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it.each([
    '#AD14B8',
    '#B89251',
    '#B8A48A',
    '#8BAF91',
    '#B86F8A',
    '#5B6FA8',
    '#C7C7C7',
    '#111827',
    '#F7D6E0',
    '#FF7A00',
    '#00D1FF',
    '#FADADD',
  ])("keeps %s Pop roles and CTA aliases readable across the QA gauntlet", (base) => {
    for (const theme of ["pop"]) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it("solves a quiet magenta seed into readable accent and CTA roles", () => {
    const tokens = generateTokens('#AD14B8', 'Monochromatic', 'pop');
    assertSemanticReadability(tokens);
    expect(tokens.pop['original-accent']).toBe('#AD14B8');
    expect(tokens.brand.cta).not.toBe('#AD14B8');
    expect(hueDistance(hexToOklch(tokens.brand.cta).h, hexToOklch('#AD14B8').h)).toBeLessThan(2);
  });

  it("keeps sage Pop fields lower-chroma than the seed", () => {
    const tokens = generateTokens('#8BAF91', 'Monochromatic', 'pop');
    assertSemanticReadability(tokens);
    expect(hexToOklch(tokens.surfaces.background).c).toBeLessThan(hexToOklch('#8BAF91').c);
  });

  it("keeps pale pink Pop fields in their perceptual seed family", () => {
    const tokens = generateTokens('#F7D6E0', 'Monochromatic', 'pop');
    assertSemanticReadability(tokens);
    expect(hueDistance(hexToOklch(tokens.surfaces.background).h, hexToOklch('#F7D6E0').h)).toBeLessThan(2);
  });

  it("keeps true-neutral Pop fields and actions achromatic", () => {
    const tokens = generateTokens('#C7C7C7', 'Monochromatic', 'pop');
    assertSemanticReadability(tokens);
    for (const colour of [tokens.surfaces.background, tokens.cards['card-panel-surface'], tokens.brand.cta]) expect(hexToOklch(colour).c).toBeLessThan(0.001);
  });

  it.each([
    ['#111827', 'blue-midnight-shop'],
    ['#1A0B2E', 'purple-midnight-shop'],
    ['#102A24', 'cyan-midnight-shop'],
  ])("keeps dark chromatic seed %s perceptually related in Pop", (base) => {
    for (const theme of ["pop"]) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it.each(['#025a34', '#064e3b', '#052e16'])("keeps dark green Pop seed %s perceptually botanical", (base) => {
    for (const theme of ["pop"]) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it.each(['#102A24', '#111827', '#1A0B2E', '#2A1F12'])("keeps dark Pop CTA hover readable and related for %s", (base) => {
    for (const theme of ["pop"]) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it("keeps near-neutral Pop fields and actions low-chroma", () => {
    const tokens = generateTokens('#18181B', 'Monochromatic', 'pop');
    assertSemanticReadability(tokens);
    expect(hexToOklch(tokens.surfaces.background).c).toBeLessThan(0.005);
    expect(hexToOklch(tokens.brand.cta).c).toBeLessThan(0.01);
  });

  it("keeps explicit historical Light and Dark CTA values when saved as overrides", () => {
    for (const [baseColor, themeMode, savedCta] of [['#111827', 'light', '#2a578d'], ['#111827', 'dark', '#779fcf'], ['#1A0B2E', 'light', '#431d9b'], ['#1A0B2E', 'dark', '#8d6cda'], ['#102A24', 'light', '#278260'], ['#102A24', 'dark', '#77cfaf']]) {
      expect(buildTheme({ baseColor, themeMode, importedOverrides: { 'brand.cta': savedCta } }).tokens.brand.cta).toBe(savedCta);
    }
  });

  it.each(SEED_GAUNTLET)("keeps all theme action roles and link contrast safe for %s", (base) => {
    for (const theme of ['light', 'dark', 'pop']) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it.each(SEED_GAUNTLET)("keeps Light semantic roles readable alongside support groups for %s", (base) => {
    for (const theme of ["light"]) {
      const tokens = generateTokens(base, 'Monochromatic', theme, 100, { popIntensity: 130 });
      assertSemanticReadability(tokens);
      const seed = hexToOklch(base);
      const cta = hexToOklch(tokens.brand.cta);
      if (seed.c > 0.015) expect(hueDistance(cta.h, seed.h)).toBeLessThan(3);
      else expect(cta.c).toBeLessThan(seed.c * 1.7 + 0.002);
      expect(tokens.brand.cta).toBe(tokens.actions.primary);
      expect(tokens.brand['cta-hover']).toBe(tokens.actions['primary-hover']);
      expect(getContrastRatio(tokens.actions['primary-foreground'], tokens.actions['primary-hover'])).toBeGreaterThanOrEqual(4.5);
      if (theme === 'pop') expect(tokens.pop['pop-cta']).toBe(tokens.actions.primary);
    }
  });

  it.each(SEED_GAUNTLET)('keeps entity highlights mode-aware without competing with primary actions for %s', (base) => {
    const light = generateTokens(base, 'Monochromatic', 'light', 100);
    const dark = generateTokens(base, 'Monochromatic', 'dark', 100);
    const pop = generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 130 });

    expect(light.entity['entity-highlight-bg']).not.toBe(light.brand.cta);
    expect(light.entity['entity-highlight-bg']).not.toBe(light.brand['cta-hover']);
    expect(light.entity['entity-highlight-bg']).not.toBe(light.brand['accent-strong']);
    expect(getContrastRatio(light.entity['entity-highlight-accent'], light.entity['entity-highlight-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(light.entity['entity-highlight-text'], light.entity['entity-highlight-bg'])).toBeGreaterThanOrEqual(4.5);

    expect(dark.entity['entity-card-glow']).not.toBe(dark.brand.cta);
    expect(dark.entity['entity-card-glow']).not.toBe(dark.brand['cta-hover']);
    expect(dark.entity['entity-card-glow']).not.toBe(dark.brand['accent-strong']);
    expect(getContrastRatio(dark.entity['entity-highlight-accent'], dark.entity['entity-card-glow'])).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(dark.entity['entity-highlight-text'], dark.entity['entity-card-glow'])).toBeGreaterThanOrEqual(4.5);

    expect(pop.entity['entity-highlight-bg']).toBe(pop.actions['seed-accent']);
    expect(pop.entity['entity-highlight-border']).toBe(pop.pop['sticker-border']);
  });

  it.each(['#050505', '#FAFAFA'])('keeps near-black and near-white pop seeds visible and contrast-safe', (base) => {
    const pop = generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 130 });
    const bg = hexToHsl(pop.surfaces.background);

    expect(bg.s).toBeLessThanOrEqual(2);
    expect(bg.l).toBeLessThanOrEqual(42);
    expect(getContrastRatio(pop.pop['pop-foreground'], pop.surfaces.background)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(pop.typography['text-body'], pop.surfaces.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps generation deterministic for the same inputs', () => {
    const first = generateTokens('#3366ff', 'Complementary', 'pop', 100, {
      harmonyIntensity: 120,
      neutralCurve: 105,
      accentStrength: 110,
      popIntensity: 125,
    });
    const second = generateTokens('#3366ff', 'Complementary', 'pop', 100, {
      harmonyIntensity: 120,
      neutralCurve: 105,
      accentStrength: 110,
      popIntensity: 125,
    });

    expect(second).toEqual(first);
  });
});

describe('addPrintMode', () => {
  it('adds print-safe tokens and metadata', () => {
    const base = generateTokens('#6633ff', 'Tertiary', 'dark', 110);
    const withPrint = addPrintMode(base, '#6633ff', 'Tertiary', true);
    expect(withPrint.print['meta/base-color'].value).toBe('#6633ff');
    expect(withPrint.print['meta/harmony'].value).toBe('Tertiary');
    expect(withPrint.print['foil/gold']).toBeDefined();
    expect(withPrint.print['bleed'].value).toBe('8px');
  });
});
