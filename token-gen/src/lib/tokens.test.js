import { describe, it, expect } from 'vitest';
import { generateTokens, addPrintMode } from './tokens.js';
import { getContrastRatio, hexToHsl } from './colorUtils.js';

const hueDistance = (a, b) => {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
};
const roleDistance = (a, b) => (
  Math.abs(a.l - b.l)
  + (Math.abs(a.s - b.s) * 0.25)
  + (hueDistance(a.h, b.h) * 0.08)
);

describe('generateTokens', () => {
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

  it('keeps pop harmony output unchanged by low harmony lightening', () => {
    const low = generateTokens('#FF9DB8', 'Analogous', 'pop', 100, { harmonyIntensity: 60, popIntensity: 130 });
    const neutral = generateTokens('#FF9DB8', 'Analogous', 'pop', 100, { harmonyIntensity: 100, popIntensity: 130 });

    expect(low.brand.secondary).toBe(neutral.brand.secondary);
    expect(low.brand.accent).toBe(neutral.brand.accent);
    expect(low.actions.primary).toBe(neutral.actions.primary);
  });

  it('softens low accent punch without greying out the accent stack', () => {
    ['light', 'dark'].forEach((themeMode) => {
      const low = generateTokens('#00D1FF', 'Analogous', themeMode, 100, { accentStrength: 50 });
      const neutral = generateTokens('#00D1FF', 'Analogous', themeMode, 100, { accentStrength: 100 });
      const lowSecondary = hexToHsl(low.brand.secondary);
      const lowAccent = hexToHsl(low.brand.accent);
      const neutralSecondary = hexToHsl(neutral.brand.secondary);
      const neutralAccent = hexToHsl(neutral.brand.accent);

      expect(lowSecondary.s).toBeGreaterThanOrEqual(70);
      expect(lowAccent.s).toBeGreaterThanOrEqual(70);
      expect(lowSecondary.l).toBeGreaterThan(neutralSecondary.l);
      expect(lowAccent.l).toBeGreaterThan(neutralAccent.l);
    });
  });

  it('keeps pop accent punch output unchanged by low accent lightening', () => {
    const low = generateTokens('#FF9DB8', 'Analogous', 'pop', 100, { accentStrength: 50, popIntensity: 130 });
    const neutral = generateTokens('#FF9DB8', 'Analogous', 'pop', 100, { accentStrength: 100, popIntensity: 130 });

    expect(low.brand.secondary).toBe(neutral.brand.secondary);
    expect(low.brand.accent).toBe(neutral.brand.accent);
    expect(low.actions.primary).toBe(neutral.actions.primary);
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

  it('makes pop mode a saturated seed-derived shop background with white foreground', () => {
    const base = '#3366ff';
    const seed = hexToHsl(base);
    const tokens = generateTokens(base, 'Analogous', 'pop', 100, { popIntensity: 130 });
    const bg = hexToHsl(tokens.surfaces.background);
    const card = hexToHsl(tokens.cards['card-panel-surface']);

    expect(hueDistance(bg.h, seed.h)).toBeLessThanOrEqual(2);
    expect(bg.s).toBeGreaterThanOrEqual(Math.max(seed.s - 4, 82));
    expect(getContrastRatio(tokens.pop['pop-foreground'], tokens.surfaces.background)).toBeGreaterThanOrEqual(4.5);
    expect(tokens.typography['text-strong']).toBe('#ffffff');
    expect(hueDistance(card.h, bg.h)).toBeLessThanOrEqual(2);
    expect(card.s).toBeGreaterThan(60);
    expect(card.l).toBeGreaterThan(bg.l);
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

  it.each(['#FF9DB8', '#F7D6E0'])('keeps light blush CTA clickable without leaving the seed family for %s', (base) => {
    const light = generateTokens(base, 'Monochromatic', 'light', 100);
    const seed = hexToHsl(base);
    const cta = hexToHsl(light.actions.primary);
    const hover = hexToHsl(light.brand['cta-hover']);

    expect(light.brand.cta).toBe(light.actions.primary);
    expect(hueDistance(cta.h, seed.h)).toBeLessThanOrEqual(3);
    expect(hueDistance(hover.h, cta.h)).toBeLessThanOrEqual(3);
    expect(cta.l).toBeGreaterThanOrEqual(54);
    expect(cta.l).toBeLessThanOrEqual(60);
    expect(cta.l).toBeLessThan(seed.l - 20);
    expect(cta.s).toBeGreaterThanOrEqual(56);
    expect(cta.s).toBeLessThanOrEqual(76);
    expect(Math.abs(hover.l - cta.l)).toBeLessThanOrEqual(6);
    expect(Math.abs(hover.s - cta.s)).toBeLessThanOrEqual(6);
    expect(getContrastRatio(light.actions.primary, light.cards['card-panel-surface'])).toBeGreaterThanOrEqual(3.2);
    expect(getContrastRatio(light.actions['primary-foreground'], light.actions.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['#FF9DB8', '#F7D6E0'])('distributes pale blush brand core roles without collapsing into same-value pinks for %s', (base) => {
    const light = generateTokens(base, 'Monochromatic', 'light', 100);
    const seed = hexToHsl(base);
    const secondary = hexToHsl(light.brand.secondary);
    const accent = hexToHsl(light.brand.accent);
    const accentStrong = hexToHsl(light.brand['accent-strong']);
    const cta = hexToHsl(light.brand.cta);
    const hover = hexToHsl(light.brand['cta-hover']);

    [secondary, accent, accentStrong, cta, hover].forEach((role) => {
      expect(hueDistance(role.h, seed.h)).toBeLessThanOrEqual(3);
    });
    expect(accent.l).toBeGreaterThanOrEqual(82);
    expect(secondary.l).toBeGreaterThanOrEqual(70);
    expect(secondary.l).toBeLessThan(accent.l - 8);
    expect(accentStrong.l).toBeGreaterThan(cta.l + 6);
    expect(cta.l).toBeGreaterThan(hover.l + 4);
    expect(hover.l).toBeGreaterThanOrEqual(50);
    expect(hover.s).toBeLessThanOrEqual(72);
    expect(Math.abs(accentStrong.l - cta.l)).toBeGreaterThanOrEqual(6);
    expect(Math.abs(secondary.l - cta.l)).toBeGreaterThanOrEqual(10);
  });

  it.each(['#FF9DB8', '#F7D6E0'])('harmonizes pale blush support palettes around brand core for %s', (base) => {
    const light = generateTokens(base, 'Monochromatic', 'light', 100);
    const seed = hexToHsl(base);
    const cta = hexToHsl(light.brand.cta);
    const textAccent = hexToHsl(light.textPalette['text-accent']);
    const textAccentStrong = hexToHsl(light.textPalette['text-accent-strong']);
    const neutralMid = hexToHsl(light.foundation.neutrals['neutral-4']);
    const accents = Object.values(light.foundation.accents).map(hexToHsl);

    accents.forEach((accentRole) => {
      expect(hueDistance(accentRole.h, seed.h)).toBeLessThanOrEqual(3);
      expect(accentRole.s).toBeLessThanOrEqual(cta.s + 8);
    });
    expect(hexToHsl(light.foundation.accents['accent-ink']).l).toBeGreaterThanOrEqual(30);
    expect(textAccent.s).toBeLessThan(cta.s);
    expect(textAccentStrong.s).toBeLessThan(cta.s);
    expect(hueDistance(textAccent.h, seed.h)).toBeLessThanOrEqual(3);
    expect(hueDistance(textAccentStrong.h, seed.h)).toBeLessThanOrEqual(3);
    expect(neutralMid.s).toBeGreaterThanOrEqual(8);
    expect(hueDistance(neutralMid.h, seed.h)).toBeLessThanOrEqual(12);
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

  it.each(['#FF9DB8', '#F7D6E0'])('gives dark pale-pink seed %s a crisp related strawberry action', (base) => {
    const dark = generateTokens(base, 'Monochromatic', 'dark', 100);
    const seed = hexToHsl(base);
    const cta = hexToHsl(dark.actions.primary);
    const hover = hexToHsl(dark.brand['cta-hover']);
    const secondary = hexToHsl(dark.actions.secondary);

    expect(hueDistance(cta.h, seed.h)).toBeLessThanOrEqual(3);
    expect(hueDistance(hover.h, cta.h)).toBeLessThanOrEqual(3);
    expect(cta.s).toBeGreaterThanOrEqual(56);
    expect(cta.s).toBeLessThanOrEqual(76);
    expect(cta.l).toBeGreaterThanOrEqual(54);
    expect(cta.l).toBeLessThanOrEqual(62);
    expect(Math.abs(hover.l - cta.l)).toBeLessThanOrEqual(5);
    expect(Math.abs(hover.s - cta.s)).toBeLessThanOrEqual(6);
    expect(secondary.l).toBeLessThanOrEqual(68);
    expect(getContrastRatio(dark.actions.primary, dark.surfaces.background)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(dark.actions.primary, dark.cards['card-panel-surface'])).toBeGreaterThanOrEqual(4);
    expect(getContrastRatio(dark.actions['primary-foreground'], dark.actions.primary)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(dark.actions.secondary, dark.cards['card-panel-surface'])).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(dark.entity['entity-card-highlight'], dark.cards['card-panel-surface'])).toBeGreaterThanOrEqual(2);
  });

  it.each(['#FF9DB8', '#F7D6E0', '#00D1FF', '#5B6FA8', '#111827', '#B8A48A', '#8BAF91', '#C7C7C7'])('keeps pop CTA scoped to pop roles for QA seed %s', (base) => {
    const pop = generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 130 });

    expect(pop.brand.cta).toBe(pop.pop['pop-cta']);
    expect(pop.actions.primary).toBe(pop.pop['pop-cta']);
    expect(pop.actions['primary-foreground']).toBe(pop.pop['pop-cta-foreground']);
    expect(getContrastRatio(pop.pop['pop-cta-foreground'], pop.pop['pop-cta'])).toBeGreaterThanOrEqual(4.5);
  });

  it('does not change pale pink pop outputs while refining dark actions', () => {
    const pop = generateTokens('#F7D6E0', 'Monochromatic', 'pop', 100, { popIntensity: 130 });

    expect(pop.brand.cta).toBe('#f39bb5');
    expect(pop.pop['pop-cta']).toBe('#f39bb5');
    expect(pop.pop['pop-cta-foreground']).toBe('#0b0b10');
    expect(pop.pop['pop-background']).toBe('#9e1941');
    expect(pop.pop['pop-surface']).toBe('#c72e5c');
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

  it.each(['#B8A48A', '#AD14B8', '#8A9EB8', '#A8B8A0', '#FF00FF'])('keeps %s seed-derived while enforcing pop role distance', (base) => {
    const pop = generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 130 });
    const seed = hexToHsl(base);
    const bg = hexToHsl(pop.surfaces.background);
    const surface = hexToHsl(pop.pop['pop-surface']);
    const elevated = hexToHsl(pop.pop['pop-surface-elevated']);
    const cta = hexToHsl(pop.pop['pop-cta']);

    expect(pop.brand.accent.toLowerCase()).toBe(base.toLowerCase());
    expect(pop.pop['pop-accent'].toLowerCase()).toBe(base.toLowerCase());
    expect(hueDistance(bg.h, seed.h)).toBeLessThanOrEqual(2);
    expect(hueDistance(cta.h, seed.h)).toBeLessThanOrEqual(pop.pop.choreography === 'botanical-shop-color-flood' ? 10 : 2);
    expect(bg.s).toBeGreaterThanOrEqual(pop.pop.choreography === 'botanical-shop-color-flood' ? 48 : 82);
    expect(getContrastRatio(pop.typography['text-body'], pop.surfaces.background)).toBeGreaterThanOrEqual(4.5);
    expect(hueDistance(surface.h, bg.h)).toBeLessThanOrEqual(2);
    expect(hueDistance(elevated.h, bg.h)).toBeLessThanOrEqual(2);
    expect(roleDistance(bg, surface)).toBeGreaterThanOrEqual(pop.pop.choreography === 'botanical-shop-color-flood' ? 13.5 : 14);
    expect(roleDistance(surface, elevated)).toBeGreaterThanOrEqual(12);
    expect(roleDistance(cta, bg)).toBeGreaterThanOrEqual(18);
    expect(roleDistance(cta, surface)).toBeGreaterThanOrEqual(18);
    expect(surface.s).toBeGreaterThan(pop.pop.choreography === 'botanical-shop-color-flood' ? 38 : 60);
    expect(elevated.s).toBeGreaterThan(pop.pop.choreography === 'botanical-shop-color-flood' ? 32 : 55);
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
  ])('keeps %s pop roles separated and CTA-ready across the QA gauntlet', (base) => {
    const pop = generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 130 });
    const bg = hexToHsl(pop.pop['pop-background']);
    const surface = hexToHsl(pop.pop['pop-surface']);
    const elevated = hexToHsl(pop.pop['pop-surface-elevated']);
    const cta = hexToHsl(pop.pop['pop-cta']);
    const border = hexToHsl(pop.pop['pop-border']);

    expect(roleDistance(bg, surface)).toBeGreaterThanOrEqual(14);
    expect(roleDistance(surface, elevated)).toBeGreaterThanOrEqual(13);
    expect(roleDistance(cta, bg)).toBeGreaterThanOrEqual(18);
    expect(roleDistance(cta, surface)).toBeGreaterThanOrEqual(18);
    expect(roleDistance(border, surface)).toBeGreaterThanOrEqual(18);
    expect(getContrastRatio(pop.pop['pop-foreground'], pop.pop['pop-background'])).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(pop.pop['pop-cta-foreground'], pop.pop['pop-cta'])).toBeGreaterThanOrEqual(4.5);
  });

  it('promotes a same-family CTA variant when the raw seed is too quiet', () => {
    const pop = generateTokens('#AD14B8', 'Monochromatic', 'pop', 100, { popIntensity: 130 });
    const seed = hexToHsl('#AD14B8');
    const cta = hexToHsl(pop.brand.cta);

    expect(pop.pop['pop-accent']).toBe('#AD14B8');
    expect(pop.brand.accent).toBe('#AD14B8');
    expect(pop.brand.cta).not.toBe('#AD14B8');
    expect(hueDistance(cta.h, seed.h)).toBeLessThanOrEqual(2);
    expect(cta.l).toBeGreaterThan(seed.l + 12);
    expect(getContrastRatio(pop.pop['pop-cta-foreground'], pop.brand.cta)).toBeGreaterThanOrEqual(4.5);
  });

  it('caps muted sage pop below neon while preserving botanical shop hierarchy', () => {
    const pop = generateTokens('#8BAF91', 'Monochromatic', 'pop', 100, { popIntensity: 130 });
    const bg = hexToHsl(pop.pop['pop-background']);
    const surface = hexToHsl(pop.pop['pop-surface']);
    const elevated = hexToHsl(pop.pop['pop-surface-elevated']);
    const cta = hexToHsl(pop.pop['pop-cta']);

    expect(pop.pop.choreography).toBe('botanical-shop-color-flood');
    expect(bg.h).toBeGreaterThanOrEqual(120);
    expect(bg.h).toBeLessThanOrEqual(140);
    expect(cta.h).toBeGreaterThan(bg.h);
    expect(cta.h).toBeLessThanOrEqual(bg.h + 10);
    expect(bg.s).toBeGreaterThanOrEqual(52);
    expect(bg.s).toBeLessThanOrEqual(68);
    expect(surface.s).toBeLessThan(bg.s);
    expect(elevated.s).toBeLessThan(surface.s);
    expect(cta.s).toBeLessThanOrEqual(72);
    expect(roleDistance(bg, surface)).toBeGreaterThanOrEqual(14);
    expect(roleDistance(surface, elevated)).toBeGreaterThanOrEqual(12);
    expect(getContrastRatio(pop.pop['pop-foreground'], pop.pop['pop-background'])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps pale pink pop in a glossy blush family instead of fuchsia override', () => {
    const base = '#F7D6E0';
    const seed = hexToHsl(base);
    const pop = generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 130 });
    const bg = hexToHsl(pop.pop['pop-background']);
    const surface = hexToHsl(pop.pop['pop-surface']);
    const elevated = hexToHsl(pop.pop['pop-surface-elevated']);
    const cta = hexToHsl(pop.pop['pop-cta']);

    expect(pop.pop.choreography).toBe('blush-shop-color-flood');
    expect(pop.pop.family).toBe('glossy-blush-shop');
    expect(hueDistance(bg.h, seed.h)).toBeLessThanOrEqual(2);
    expect(bg.s).toBeGreaterThanOrEqual(66);
    expect(bg.s).toBeLessThanOrEqual(78);
    expect(bg.l).toBeLessThanOrEqual(40);
    expect(bg.s > 88 && bg.l > 40).toBe(false);
    expect(surface.s).toBeLessThan(bg.s);
    expect(elevated.s).toBeLessThan(surface.s);
    expect(elevated.l).toBeGreaterThan(surface.l + 8);
    expect(pop.pop['pop-accent']).toBe(base);
    expect(pop.pop['pop-cta']).not.toBe(base);
    expect(hueDistance(cta.h, seed.h)).toBeLessThanOrEqual(2);
    expect(cta.s).toBeGreaterThan(seed.s);
    expect(cta.s).toBeLessThanOrEqual(84);
    expect(cta.l).toBeGreaterThanOrEqual(74);
    expect(cta.l).toBeLessThanOrEqual(82);
    expect(getContrastRatio(pop.pop['pop-foreground'], pop.pop['pop-background'])).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(pop.pop['pop-cta-foreground'], pop.pop['pop-cta'])).toBeGreaterThanOrEqual(4.5);
  });

  it('uses graphite and silver hierarchy for true neutral pop seeds', () => {
    const base = '#C7C7C7';
    const pop = generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 130 });
    const bg = hexToHsl(pop.surfaces.background);
    const card = hexToHsl(pop.cards['card-panel-surface']);
    const elevated = hexToHsl(pop.pop['pop-surface-elevated']);
    const cta = hexToHsl(pop.pop['pop-cta']);

    expect(pop.pop.choreography).toBe('neutral-shop-color-flood');
    expect(pop.pop.family).toBe('graphite-silver-shop');
    expect(bg.s).toBeLessThanOrEqual(2);
    expect(bg.l).toBeLessThanOrEqual(16);
    expect(hueDistance(card.h, bg.h)).toBeLessThanOrEqual(2);
    expect(card.s).toBeLessThanOrEqual(2);
    expect(card.l).toBeGreaterThan(bg.l + 10);
    expect(elevated.s).toBeLessThanOrEqual(2);
    expect(elevated.l).toBeGreaterThan(card.l + 10);
    expect(cta.s).toBeLessThanOrEqual(2);
    expect(cta.l).toBeGreaterThanOrEqual(72);
    expect(roleDistance(cta, bg)).toBeGreaterThanOrEqual(18);
    expect(roleDistance(cta, card)).toBeGreaterThanOrEqual(18);
    expect(bg.s > 50 && hueDistance(bg.h, 325) <= 20).toBe(false);
    expect(pop.brand.accent.toLowerCase()).toBe(base.toLowerCase());
    expect(pop.pop['pop-accent'].toLowerCase()).toBe(base.toLowerCase());
    expect(pop).toEqual(generateTokens(base, 'Monochromatic', 'pop', 100, { popIntensity: 130 }));
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
