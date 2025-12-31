import { blendColorsPerceptual, blendHue, getColor, getContrastRatio, hexToHsl, hslToHex } from './colorUtils.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const orderedSwatchSpec = [
  { name: 'Primary', path: 'brand.primary' },
  { name: 'Accent', path: 'brand.accent' },
  { name: 'Background', path: 'surfaces.background' },
  { name: 'Body text', path: 'typography.text-body' },
  { name: 'Heading', path: 'typography.heading' },
  { name: 'Muted', path: 'typography.text-muted' },
  { name: 'Page background', path: 'surfaces.page-background' },
  { name: 'Header background', path: 'surfaces.header-background' },
  { name: 'Header border', path: 'surfaces.surface-plain-border' },
  { name: 'Footer background', path: 'cards.card-panel-surface' },
  { name: 'Footer border', path: 'cards.card-panel-border' },
  { name: 'Background (base)', path: 'surfaces.background' },
  { name: 'Page background (deepest)', path: 'surfaces.background' },
  { name: 'Header/overlay background', path: 'aliases.overlay-panel', fallbackPath: 'surfaces.header-background' },
  { name: 'Card surface background', path: 'cards.card-panel-surface' },
  { name: 'Body text colour', path: 'typography.text-body' },
  { name: 'Heading text (lightest)', path: 'typography.heading' },
  { name: 'Muted / subtle text', path: 'typography.text-muted' },
  { name: 'Primary CTA & accents', path: 'brand.cta' },
  { name: 'Brand accent colour', path: 'brand.secondary' },
  { name: 'Hover & interactive states', path: 'brand.cta-hover' },
  { name: 'Text accent', path: 'typography.text-accent' },
  { name: 'Text accent strong', path: 'typography.text-accent-strong' },
  { name: 'Link colour', path: 'brand.link-color' },
  { name: 'Focus ring colour', path: 'brand.focus-ring' },
  { name: 'Text primary', path: 'textPalette.text-primary' },
  { name: 'Text secondary', path: 'textPalette.text-secondary' },
  { name: 'Text tertiary', path: 'textPalette.text-tertiary' },
  { name: 'Text body', path: 'typography.text-body' },
  { name: 'Text subtle', path: 'typography.text-muted' },
  { name: 'Text strong', path: 'typography.text-strong' },
  { name: 'Text hint', path: 'typography.text-hint' },
  { name: 'Text disabled', path: 'typography.text-disabled' },
  { name: 'Text heading', path: 'typography.heading' },
  { name: 'Ink body', path: 'named.color-ink', fallbackPath: 'textPalette.text-primary' },
  { name: 'Ink strong', path: 'named.color-midnight', fallbackPath: 'typography.text-strong' },
  { name: 'Ink muted', path: 'named.color-dusk', fallbackPath: 'textPalette.text-tertiary' },
  { name: 'Surface plain', path: 'surfaces.surface-plain' },
  { name: 'Surface plain border', path: 'surfaces.surface-plain-border' },
  { name: 'Header background', path: 'surfaces.header-background' },
  { name: 'Header border', path: 'surfaces.surface-plain-border' },
  { name: 'Header text', path: 'typography.text-strong' },
  { name: 'Header text (hover)', path: 'typography.text-accent' },
  { name: 'Footer background', path: 'cards.card-panel-surface-strong' },
  { name: 'Footer border', path: 'cards.card-panel-border' },
  { name: 'Footer text', path: 'typography.footer-text' },
  { name: 'Footer muted text', path: 'typography.footer-text-muted' },
  { name: 'Card panel surface', path: 'cards.card-panel-surface' },
  { name: 'Card panel strong', path: 'cards.card-panel-surface-strong' },
  { name: 'Card panel border', path: 'cards.card-panel-border' },
  { name: 'Card panel border strong', path: 'cards.card-panel-border-strong' },
  { name: 'Card panel border soft', path: 'cards.card-panel-border-soft' },
  { name: 'Card badge bg', path: 'cards.card-tag-bg' },
  { name: 'Card badge border', path: 'cards.card-tag-border' },
  { name: 'Card badge text', path: 'cards.card-tag-text' },
  { name: 'Card tag bg', path: 'cards.card-tag-bg' },
  { name: 'Card tag border', path: 'cards.card-tag-border' },
  { name: 'Card tag text', path: 'cards.card-tag-text' },
  { name: 'Card spoon bg', path: 'aliases.chip-background', fallbackPath: 'cards.card-panel-surface' },
  { name: 'Card spoon border', path: 'aliases.chip-border', fallbackPath: 'cards.card-panel-border' },
  { name: 'Card spoon text', path: 'typography.text-strong' },
  { name: 'Card focus outline', path: 'brand.focus-ring' },
  { name: 'Glass base', path: 'glass.glass-surface' },
  { name: 'Glass strong', path: 'glass.glass-surface-strong' },
  { name: 'Glass card', path: 'glass.glass-surface' },
  { name: 'Glass hover', path: 'glass.glass-hover' },
  { name: 'Glass border', path: 'glass.glass-border' },
  { name: 'Glass border strong', path: 'glass.glass-border-strong' },
  { name: 'Glass highlight', path: 'glass.glass-highlight' },
  { name: 'Glass glow', path: 'glass.glass-glow' },
  { name: 'Glass shadow soft', path: 'glass.glass-shadow-soft' },
  { name: 'Glass shadow strong', path: 'glass.glass-shadow-strong' },
  { name: 'Glass blur radius', path: 'glass.glass-blur' },
  { name: 'Glass noise opacity', path: 'glass.glass-noise-opacity' },
  { name: 'Success', path: 'status.success' },
  { name: 'Warning', path: 'status.warning' },
  { name: 'Error', path: 'status.error' },
  { name: 'Info', path: 'status.info' },
  { name: 'Entity card border', path: 'entity.entity-card-border' },
  { name: 'Entity card glow', path: 'entity.entity-card-glow' },
  { name: 'Entity card highlight', path: 'entity.entity-card-highlight' },
  { name: 'Entity card surface top', path: 'entity.entity-card-surface' },
  { name: 'Entity card surface bottom', path: 'entity.entity-card-surface' },
  { name: 'Entity card heading', path: 'entity.entity-card-heading' },
  { name: 'Entity card text', path: 'typography.text-body' },
  { name: 'Entity card label', path: 'typography.text-muted' },
  { name: 'Entity card CTA', path: 'brand.cta' },
  { name: 'Entity card CTA hover', path: 'brand.cta-hover' },
  { name: 'Entity card icon', path: 'brand.accent' },
  { name: 'Entity card icon shadow', path: 'glass.glass-shadow-soft' },
];

const readTokenValue = (tokens, path) => {
  const parts = path.split('.');
  let current = tokens;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  if (current && typeof current === 'object' && 'value' in current) return current.value;
  return current ?? null;
};

export const buildOrderedStack = (tokens) => orderedSwatchSpec
  .map((item) => {
    const resolved = readTokenValue(tokens, item.path) ?? (item.fallbackPath ? readTokenValue(tokens, item.fallbackPath) : item.fallbackValue ?? null);
    if (resolved === null || resolved === undefined) return null;
    return { name: item.name, path: item.path, value: resolved };
  })
  .filter(Boolean);

// Token Generation
export const generateTokens = (baseColor, mode, themeMode, apocalypseIntensity = 100, options = {}) => {
  const meatMode = baseColor.toLowerCase() === '#beefbeef';
  const normalizedBase = meatMode
    ? '#beefbe'
    : (baseColor.length === 9 && baseColor.startsWith('#') ? baseColor.slice(0, 7) : baseColor);
  const hsl = hexToHsl(normalizedBase);
  const isDark = themeMode === 'dark';
  const isPop = themeMode === 'pop';
  const isApocalypse = mode === 'Apocalypse';
  const intensity = isApocalypse ? (Math.max(20, Math.min(150, apocalypseIntensity)) / 100) : 1;
  const {
    harmonyIntensity = 100,
    neutralCurve = 100,
    accentStrength = 100,
    popIntensity = 100,
    printMode: printModeOverride = false,
  } = options;
  const harmonyScale = clamp(harmonyIntensity, 40, 160) / 100;
  const accentScale = clamp(accentStrength, 50, 150) / 100;
  const neutralCurveScale = clamp(neutralCurve, 50, 150) / 100;
  const popScale = clamp(popIntensity, 60, 140) / 100;
  const isPrintMode = Boolean(printModeOverride);
  const POP_INTENSITY = 0.28;
  const LIGHT_TEMP_SHIFT = 8;
  const popBoost = isPop
    ? POP_INTENSITY * clamp(popScale, 0.85, 1.15) * (isPrintMode ? 0.85 : 1)
    : 0;
  
  const harmonySpec = {
    Monochromatic: { secH: 8, accH: -8, secSat: 0.9, accSat: 0.95, surfaceMix: 0.08, backgroundMix: 0.06 },
    Analogous: { secH: -30, accH: 28, secSat: 1.05, accSat: 1.15, surfaceMix: 0.28, backgroundMix: 0.2 },
    Complementary: { secH: 180, accH: -150, secSat: 1.08, accSat: 1.2, surfaceMix: 0.34, backgroundMix: 0.28 },
    Tertiary: { secH: 120, accH: -120, secSat: 1.12, accSat: 1.18, surfaceMix: 0.38, backgroundMix: 0.32 },
    Apocalypse: { secH: 180, accH: 180, secSat: 2.0 * intensity, accSat: 2.2 * intensity, surfaceMix: Math.min(0.6, 0.45 * intensity), backgroundMix: Math.min(0.55, 0.35 * intensity) },
  }[mode] ?? { secH: 0, accH: 0, secSat: 0.92, accSat: 1.0, surfaceMix: 0, backgroundMix: 0 };
  const { secH, accH, secSat, accSat, surfaceMix: surfaceMixBase, backgroundMix: backgroundMixBase } = harmonySpec;
  const surfaceMix = clamp(surfaceMixBase * harmonyScale, 0, isApocalypse ? 0.6 : 0.5);
  const backgroundMix = clamp(backgroundMixBase * harmonyScale, 0, isApocalypse ? 0.55 : 0.45);
  const resolvedSurfaceMix = surfaceMix;
  const resolvedBackgroundMix = backgroundMix;

  let bgL = isApocalypse ? (isDark ? 2 : 99) : (isDark ? 10 : 98);
  let surfaceL = isApocalypse ? (isDark ? 6 : 98) : (isDark ? 16 : 93);
  let textMainL = isApocalypse ? (isDark ? 98 : 8) : (isDark ? 95 : 10);
  let textMutedL = isApocalypse ? (isDark ? 70 : 35) : (isDark ? 65 : 40);
  let borderL = isApocalypse ? (isDark ? 10 : 88) : (isDark ? 25 : 90);
  if (!isDark) {
    if (isApocalypse) {
      bgL = 98;
      surfaceL = 94;
      borderL = 88;
    } else {
      bgL = 96;
      surfaceL = 92;
      borderL = 88;
    }
  }
  if (isPop && !isDark) {
    const basePop = clamp(56 + ((popScale - 1) * 6) - (isApocalypse ? 2 : 0), 42, 62);
    bgL = basePop;
    surfaceL = clamp(basePop - (isApocalypse ? 2 : 4), 38, 58);
    borderL = clamp(basePop - (isApocalypse ? 4 : 8), 32, 52);
  }
  
  let baseSurfaceSat = isApocalypse
    ? Math.max(32, Math.min(82, hsl.s * 0.8))
    : Math.max(14, Math.min(56, hsl.s * 0.42));
  const gammaLightSat = Math.pow(baseSurfaceSat / 100, 1.02) * 100;
  let surfaceSat = isDark
    ? baseSurfaceSat
    : Math.min(isApocalypse ? 32 : 24, Math.max(8, gammaLightSat * (isApocalypse ? 0.85 : 0.65)));

  let brandLightness = isApocalypse ? (isDark ? 75 : 52) : (isDark ? 60 : 50); 
  let accentLightness = isApocalypse ? (isDark ? 78 : 56) : (isDark ? 67 : 55);
  let ctaLightness = isApocalypse ? (isDark ? 78 : 54) : (isDark ? 62 : 52);
  let ctaHoverLightness = isApocalypse ? (isDark ? 82 : 50) : (isDark ? 68 : 48);

  let satNormalizer = isApocalypse ? (isDark ? 1.35 : 1.5) : (isDark ? 0.92 : 0.86);
  let primarySat = (isApocalypse ? 1.5 : 0.9) * accentScale;
  let secondarySat = secSat * satNormalizer * harmonyScale * accentScale;
  let accentSat = accSat * satNormalizer * harmonyScale * accentScale;

  if (isPop) {
    const satBoost = 1 + (popBoost * 1.3);
    primarySat *= satBoost;
    secondarySat *= satBoost * 1.1;
    accentSat *= satBoost * 1.25;
    satNormalizer *= 1 + (popBoost * 0.55);
    brandLightness = clamp(brandLightness + (popBoost * 6) - 2, 46, 70);
    accentLightness = clamp(accentLightness + (popBoost * 6) - 2, 48, 72);
    ctaLightness = clamp(ctaLightness + (popBoost * 5) - 2, 46, 68);
    ctaHoverLightness = clamp(ctaHoverLightness + (popBoost * 4) - 2, 44, 66);
  }

  const primary = getColor(hsl, 0, primarySat, brandLightness); 
  const secondary = getColor(hsl, secH, secondarySat * 0.96, brandLightness);
  const accent = getColor(hsl, accH, accentSat * 0.9, accentLightness);
  const accentStrong = getColor(hsl, accH, (accentSat * 0.9) + 0.04, accentLightness + 5);
  const cta = getColor(hsl, accH, (accentSat * 0.88) + 0.02, ctaLightness);
  const ctaHover = getColor(hsl, accH, (accentSat * 0.88) + 0.05, ctaHoverLightness);
  const gradientStart = getColor(hsl, 0, 1, isDark ? brandLightness + 5 : brandLightness + 8);
  const gradientEnd = getColor(hsl, accH, accentSat * 0.9, isDark ? brandLightness - 4 : brandLightness - 2);

  const secondaryTarget = getColor(hsl, secH, 1, hsl.l);
  const accentTarget = getColor(hsl, accH, 1, hsl.l);

  // Use perceptual blending when the mix is strong enough to avoid muddy cross-wheel travel.
  const surfaceHue = resolvedSurfaceMix > 0.2
    ? hexToHsl(blendColorsPerceptual(normalizedBase, secondaryTarget, resolvedSurfaceMix)).h
    : blendHue(hsl.h, secH, resolvedSurfaceMix);
  const backgroundHue = resolvedBackgroundMix > 0.2
    ? hexToHsl(blendColorsPerceptual(normalizedBase, accentTarget, resolvedBackgroundMix)).h
    : blendHue(hsl.h, accH, resolvedBackgroundMix);
  const neutralShift = isDark ? 0 : LIGHT_TEMP_SHIFT;
  const neutralSurfaceHue = (surfaceHue + neutralShift) % 360;
  const neutralBackgroundHue = (backgroundHue + neutralShift) % 360;
  const backgroundSatScale = isDark ? 0.85 : 1.05;
  const backgroundBase = { h: neutralBackgroundHue, s: surfaceSat * backgroundSatScale, l: bgL };
  const surfaceBase = { h: neutralSurfaceHue, s: surfaceSat, l: bgL };
  const popSurfaceInfluenceLarge = isPop && !isDark ? 0.02 + (popBoost * 0.05) : 0;
  const popSurfaceInfluenceMedium = isPop && !isDark ? 0.08 + (popBoost * 0.1) : 0;
  const popLargeHue = blendHue(neutralBackgroundHue, hsl.h - neutralBackgroundHue, popSurfaceInfluenceLarge);
  const popMediumHue = blendHue(neutralSurfaceHue, hsl.h - neutralSurfaceHue, popSurfaceInfluenceMedium);
  const popLargeSat = isPop && !isDark ? clamp(surfaceSat * 0.9, 4, 14) : surfaceSat;
  const popMediumSat = isPop && !isDark ? clamp(surfaceSat * (1 + (popBoost * 0.7)), 6, 26) : surfaceSat;
  const largeSurfaceBase = isPop && !isDark ? { h: popLargeHue, s: popLargeSat, l: bgL } : backgroundBase;
  const mediumSurfaceBase = isPop && !isDark ? { h: popMediumHue, s: popMediumSat, l: bgL } : surfaceBase;
  const neutralColor = (lightness, satMult = 0.3) =>
    getColor({ h: neutralBackgroundHue, s: surfaceSat * satMult, l: lightness }, 0, 1, lightness);
  const lightNeutralSteps = isApocalypse
    ? [98, 96, 92, 84, 70, 56, 40, 28, 18, 10]
    : [98, 95, 90, 78, 66, 52, 38, 26, 16, 10];
  const baseNeutralSteps = isDark
    ? (isApocalypse ? [94, 80, 64, 50, 40, 30, 18, 10, 6, 3] : [96, 88, 78, 68, 55, 45, 32, 22, 14, 8])
    : lightNeutralSteps;
  const neutralPivot = isDark ? 55 : 50;
  const neutralSteps = baseNeutralSteps.map((val) => clamp(neutralPivot + ((val - neutralPivot) * neutralCurveScale), 1, 99));

  const success = isApocalypse
    ? (isDark ? hslToHex(145, 100, 60) : hslToHex(145, 95, 40))
    : (isDark ? hslToHex(145, 65, 45) : hslToHex(145, 65, 40)); 
  const warning = isApocalypse
    ? (isDark ? hslToHex(45, 100, 60) : hslToHex(45, 100, 50))
    : (isDark ? hslToHex(45, 90, 50) : hslToHex(45, 90, 45));
  const error = isApocalypse
    ? (isDark ? hslToHex(0, 100, 65) : hslToHex(0, 100, 45))
    : (isDark ? hslToHex(0, 70, 60) : hslToHex(0, 70, 50));
  const info = isApocalypse
    ? (isDark ? hslToHex(210, 100, 65) : hslToHex(210, 100, 50))
    : (isDark ? hslToHex(210, 80, 60) : hslToHex(210, 80, 50));
  const statusStrong = {
    success: getColor({ h: 145, s: 65, l: 50 }, 0, 1, isDark ? 52 : 48),
    warning: getColor({ h: 45, s: 90, l: 55 }, 0, 1, isDark ? 52 : 50),
    error: getColor({ h: 0, s: 72, l: 55 }, 0, 1, isDark ? 58 : 52),
  };
  const glassNoiseOpacity = isApocalypse ? '0.9' : (isDark ? '0.08' : '0.04');
  const glassBlur = isApocalypse ? '40px' : '16px';

  const accentHueMain = (hsl.h + accH + 360) % 360;
  const accentHueSecondary = (hsl.h + secH + 360) % 360;
  const accentHueRoot = hsl.h;
  const accentLightSteps = isDark ? [68, 60, 52, 36] : [58, 52, 46, 32];
  const accentBaseSat = clamp(Math.max(20, hsl.s) * accentScale, 10, 100);
  const accentColor = (h, satMult, l) => getColor({ h, s: accentBaseSat, l }, 0, satMult, l);
  const linkBrandSat = isDark ? 0.9 : 0.9 + (popBoost * 0.6);
  const linkTextSat = isDark ? 1 : 1 + (popBoost * 0.6);
  const focusRingSat = isDark ? 1 : 0.8 + (popBoost * 0.7);
  const focusRingLight = isDark ? 50 : 62 + (popBoost * 6);
  const accentTextSat = isDark ? 1 : 1 + (popBoost * 0.55);
  const accentTextStrongSat = isDark ? 1 : 1 + (popBoost * 0.7);
  const borderAccentSubtleSat = isDark ? 0.15 : 0.12 + (popBoost * 0.12);
  const borderAccentMediumSat = isDark ? 0.25 : 0.18 + (popBoost * 0.16);
  const borderAccentStrongSat = isDark ? 0.35 : 0.26 + (popBoost * 0.2);
  const borderAccentHoverSat = isDark ? 0.4 : 0.3 + (popBoost * 0.24);
  const aliasBorderSubtleSat = isDark ? 0.2 : 0.16 + (popBoost * 0.14);
  const aliasBorderMediumSat = isDark ? 0.35 : 0.26 + (popBoost * 0.18);
  const aliasBorderStrongSat = isDark ? 0.5 : 0.38 + (popBoost * 0.24);
  const aliasBorderHoverSat = isDark ? 0.6 : 0.46 + (popBoost * 0.28);
  const purpleBorderSubtleSat = isDark ? 0.25 : 0.18 + (popBoost * 0.16);
  const purpleBorderMediumSat = isDark ? 0.35 : 0.26 + (popBoost * 0.2);

  const ensureContrast = (fg, bg, target, preferLighten) => {
    let color = fg;
    let { h, s, l } = hexToHsl(color);
    let ratio = getContrastRatio(color, bg);
    if (ratio >= target) return color;
    for (let i = 0; i < 30; i += 1) {
      const up = Math.min(99, l + 2);
      const down = Math.max(1, l - 2);
      const upColor = hslToHex(h, s, up);
      const downColor = hslToHex(h, s, down);
      const upRatio = getContrastRatio(upColor, bg);
      const downRatio = getContrastRatio(downColor, bg);
      if (upRatio === ratio && downRatio === ratio) break;
      if (upRatio === downRatio) {
        l = preferLighten ? up : down;
        color = preferLighten ? upColor : downColor;
        ratio = preferLighten ? upRatio : downRatio;
      } else if (upRatio > downRatio) {
        l = up;
        color = upColor;
        ratio = upRatio;
      } else {
        l = down;
        color = downColor;
        ratio = downRatio;
      }
      if (ratio >= target) return color;
    }
    const black = '#000000';
    const white = '#ffffff';
    const blackRatio = getContrastRatio(black, bg);
    const whiteRatio = getContrastRatio(white, bg);
    return blackRatio >= whiteRatio ? black : white;
  };

  const headerL = isDark ? bgL + 2 : clamp(bgL + (isPop ? 1 : 2), isPop ? 90 : 94, 98);
  const tokens = {
    foundation: {
      hue: hsl.h,
      neutrals: meatMode ? {
        "neutral-0": "#ffd7e0",
        "neutral-1": "#ffb3c4",
        "neutral-2": "#ff8aa3",
        "neutral-3": "#ff5b79",
        "neutral-4": "#e63a52",
        "neutral-5": "#c2203b",
        "neutral-6": "#991a32",
        "neutral-7": "#6e1326",
        "neutral-8": "#470d1b",
        "neutral-9": "#f5ede2",
      } : {
        "neutral-0": neutralColor(neutralSteps[0], 0.15),
        "neutral-1": neutralColor(neutralSteps[1], 0.18),
        "neutral-2": neutralColor(neutralSteps[2], 0.2),
        "neutral-3": neutralColor(neutralSteps[3], 0.22),
        "neutral-4": neutralColor(neutralSteps[4], 0.24),
        "neutral-5": neutralColor(neutralSteps[5], 0.26),
        "neutral-6": neutralColor(neutralSteps[6], 0.28),
        "neutral-7": neutralColor(neutralSteps[7], 0.3),
        "neutral-8": neutralColor(neutralSteps[8], 0.32),
        "neutral-9": neutralColor(neutralSteps[9], 0.34),
      },
      accents: {
        "accent-1": accentColor(accentHueMain, satNormalizer * accSat * 0.9, accentLightSteps[0]),
        "accent-2": accentColor(accentHueSecondary, satNormalizer * secSat * 0.98, accentLightSteps[1]),
        "accent-3": accentColor(accentHueRoot, satNormalizer * accSat * 1.05, accentLightSteps[2]),
        "accent-ink": accentColor(accentHueMain, satNormalizer * accSat * 1.2, accentLightSteps[3]),
      },
      status: {
        success,
        warning,
        error,
        info,
      },
    },

    brand: {
      primary,
      secondary,
      accent,
      "accent-strong": accentStrong,
      "cta": cta,
      "cta-hover": ctaHover,
      "gradient-start": gradientStart,
      "gradient-end": gradientEnd,
      "link-color": getColor(hsl, accH, linkBrandSat, isDark ? 70 : 45),
      "focus-ring": getColor(hsl, accH, focusRingSat, focusRingLight),
    },

    typography: {
      "heading": getColor(hsl, 0, 0.1, textMainL),
      "text-strong": getColor(hsl, 0, 0.1, isDark ? 90 : 15),
      "text-body": getColor(hsl, 0, 0.1, isDark ? 80 : 25),
      "text-muted": getColor(hsl, 0, 0.1, textMutedL),
      "text-hint": getColor(hsl, 0, 0.2, isDark ? 50 : 60),
      "text-disabled": getColor(hsl, 0, 0.1, isDark ? 30 : 80),
      "text-accent": getColor(hsl, accH, accentTextSat, isDark ? 75 : 40),
      "text-accent-strong": getColor(hsl, accH, accentTextStrongSat, isDark ? 85 : 30),
      "footer-text": getColor(hsl, 0, 0.1, isDark ? 60 : 85),
      "footer-text-muted": getColor(hsl, 0, 0.1, isDark ? 40 : 60),
    },
    textPalette: {
      "text-primary": getColor(hsl, 0, 0.1, isDark ? 92 : 18),
      "text-secondary": getColor(hsl, 0, 0.1, isDark ? 86 : 24),
      "text-tertiary": getColor(hsl, 0, 0.1, isDark ? 78 : 32),
      "text-hint": getColor(hsl, 0, 0.2, isDark ? 60 : 50),
      "text-disabled": getColor(hsl, 0, 0.1, isDark ? 38 : 80),
      "text-accent": getColor(hsl, accH, accentTextSat, isDark ? 75 : 40),
      "text-accent-strong": getColor(hsl, accH, accentTextStrongSat, isDark ? 85 : 30),
      "link-color": getColor(hsl, accH, linkTextSat, isDark ? 70 : 45),
    },

    borders: {
      "border-subtle": getColor(surfaceBase, 0, 0.9, borderL),
      "border-strong": getColor(surfaceBase, 0, 0.9, isDark ? borderL + 12 : borderL - 12),
      "border-accent-subtle": getColor(hsl, accH, borderAccentSubtleSat, isDark ? borderL + 5 : borderL - 5),
      "border-accent-medium": getColor(hsl, accH, borderAccentMediumSat, isDark ? borderL + 10 : borderL - 10),
      "border-accent-strong": getColor(hsl, accH, borderAccentStrongSat, isDark ? borderL + 18 : borderL - 18),
      "border-accent-hover": getColor(hsl, accH, borderAccentHoverSat, isDark ? borderL + 22 : borderL - 22),
    },

    surfaces: {
      "background": getColor(backgroundBase, 0, 1, bgL),
      "page-background": getColor(backgroundBase, 0, 1, isDark ? bgL - 2 : bgL - 2),
      "header-background": getColor(largeSurfaceBase, 0, 1, headerL),
      "surface-plain": getColor(mediumSurfaceBase, 0, 1, surfaceL),
      "surface-plain-border": getColor(mediumSurfaceBase, 0, 1, borderL),
    },

    cards: {
      "card-panel-surface": getColor(mediumSurfaceBase, 0, 1, surfaceL),
      "card-panel-surface-strong": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL + 5 : Math.min(97, surfaceL + (isPop ? 2 : 4))),
      "card-panel-border": getColor(mediumSurfaceBase, 0, 1, borderL),
      "card-panel-border-soft": getColor(mediumSurfaceBase, 0, 1, isDark ? borderL - 5 : Math.min(96, borderL + 6)),
      "card-panel-border-strong": getColor(surfaceBase, 0, 1, isDark ? borderL + 15 : 85),
      "card-tag-bg": isDark
        ? getColor(hsl, 0, 0.2, 20)
        : getColor(hsl, accH, 0.12 + (popBoost * 0.2), 94),
      "card-tag-text": getColor(hsl, 0, 0.4, isDark ? 80 : 30),
      "card-tag-border": isDark
        ? getColor(hsl, 0, 0.2, 30)
        : getColor(hsl, accH, 0.18 + (popBoost * 0.2), 85),
    },

    glass: {
      "glass-surface": getColor(hsl, 0, 0.1, isDark ? 20 : 95),
      "glass-surface-strong": getColor(hsl, 0, 0.1, isDark ? 30 : 90),
      "glass-border": getColor(hsl, 0, 0.1, isDark ? 35 : 85),
      "glass-border-strong": getColor(hsl, 0, 0.2, isDark ? 45 : 80),
      "glass-hover": getColor(hsl, accH, 0.3, isDark ? 25 : 95),
      "glass-shadow": getColor(hsl, 0, 0.3, isDark ? 5 : 80),
      "glass-highlight": getColor(hsl, 0, 0, isDark ? 30 : 99),
      "glass-glow": getColor(hsl, accH, 0.5, isDark ? 28 : 72),
      "glass-shadow-soft": isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.1)',
      "glass-shadow-strong": isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.18)',
      "glass-blur": glassBlur,
      "glass-noise-opacity": glassNoiseOpacity,
    },

    entity: {
      "entity-card-surface": getColor(hsl, secH, 0.15, isDark ? 18 : 98),
      "entity-card-border": getColor(hsl, secH, 0.2, isDark ? 35 : 85),
      "entity-card-glow": getColor(hsl, secH, 0.6, isDark ? 25 : 90),
      "entity-card-highlight": getColor(hsl, secH, 0.4, isDark ? 30 : 95),
      "entity-card-heading": getColor(hsl, secH, 0.5, isDark ? 80 : 20),
    },

    named: {
      "color-midnight": getColor(hsl, 0, 0.8, 10),
      "color-night": getColor(hsl, 10, 0.6, 15),
      "color-dusk": getColor(hsl, secH, 0.4, 30),
      "color-ink": getColor(hsl, 0, 0.1, 20),
      "color-amethyst": getColor(hsl, accH, 0.7, 60), 
      "color-iris": getColor(hsl, accH, 0.9, 75),     
      "color-gold": getColor(hsl, 45, 0.8, 60),     
      "color-rune": getColor(hsl, secH, 0.6, 85),
      "color-fog": getColor(hsl, 0, 0.1, 90),
    },

    status: {
      "success": success,
      "warning": warning,
      "error": error,
      "info": info,
      "success-strong": statusStrong.success,
      "warning-strong": statusStrong.warning,
      "error-strong": statusStrong.error,
    },

    admin: {
      "admin-surface-base": getColor(isPop && !isDark ? mediumSurfaceBase : backgroundBase, 0, 1, isDark ? bgL + 6 : Math.min(98, bgL + 3)),
      "admin-accent": getColor(hsl, accH, isDark ? 0.95 : 0.85 + (popBoost * 0.35), isDark ? 64 : 54),
    },

    aliases: {
      "surface-panel-primary": getColor(mediumSurfaceBase, 0, 1, surfaceL),
      "surface-panel-secondary": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL + 4 : surfaceL - 2),
      "surface-card-hover": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL + 6 : surfaceL - 4),
      "surface-muted": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL - 2 : surfaceL + 2),
      "border-purple-subtle": getColor(hsl, accH, purpleBorderSubtleSat, borderL),
      "border-purple-medium": getColor(hsl, accH, purpleBorderMediumSat, isDark ? borderL + 8 : borderL - 8),
      "border-accent-subtle": getColor(hsl, accH, aliasBorderSubtleSat, isDark ? borderL + 5 : borderL - 5),
      "border-accent-medium": getColor(hsl, accH, aliasBorderMediumSat, isDark ? borderL + 10 : borderL - 10),
      "border-accent-strong": getColor(hsl, accH, aliasBorderStrongSat, isDark ? borderL + 18 : borderL - 18),
      "border-accent-hover": getColor(hsl, accH, aliasBorderHoverSat, isDark ? borderL + 22 : borderL - 22),
      "text-subtle": getColor(hsl, 0, 0.1, textMutedL),
      "text-accent-strong": getColor(hsl, accH, accentTextStrongSat, isDark ? 88 : 34),
      "accent-purple-strong": accentStrong,
      "accent-purple-soft": getColor(hsl, accH, 0.7, isDark ? 75 : 70),
      "overlay-panel": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL + 2 : surfaceL),
      "overlay-panel-strong": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL + 6 : surfaceL - 2),
      "focus-ring": getColor(hsl, accH, focusRingSat, isDark ? 40 : 68 + (popBoost * 4)),
      "shadow-card": isDark ? '0 20px 50px -20px rgba(0,0,0,0.55)' : '0 12px 30px -18px rgba(0,0,0,0.15)',
      "shadow-card-hover": isDark ? '0 24px 60px -22px rgba(0,0,0,0.6)' : '0 14px 40px -20px rgba(0,0,0,0.2)',
      "chip-background": isDark
        ? getColor(surfaceBase, 0, 1, surfaceL - 2)
        : getColor(hsl, accH, 0.08 + (popBoost * 0.14), surfaceL + 2),
      "chip-border": isDark
        ? getColor(surfaceBase, 0, 1, borderL + 6)
        : getColor(hsl, accH, 0.12 + (popBoost * 0.16), borderL - 6),
    },

    dawn: {
      "surface-base": getColor({ h: neutralBackgroundHue, s: Math.max(surfaceSat * 0.55, 10), l: 98 }, 0, 1, 98),
      "surface-panel": getColor({ h: neutralBackgroundHue, s: Math.max(surfaceSat * 0.55, 10), l: 98 }, 0, 1, 98),
      "surface-card": getColor({ h: neutralBackgroundHue, s: Math.max(surfaceSat * 0.6, 12), l: 97 }, 0, 1, 97),
      "surface-elevated": getColor({ h: neutralBackgroundHue, s: Math.max(surfaceSat * 0.6, 12), l: 96 }, 0, 1, 96),
      "surface-hover": getColor({ h: neutralBackgroundHue, s: Math.max(surfaceSat * 0.5, 10), l: 94 }, 0, 1, 94),
      "text-strong": getColor(hsl, 0, 0.1, 18),
      "text-body": getColor(hsl, 0, 0.1, 26),
      "text-muted": getColor(hsl, 0, 0.1, 36),
      "border-subtle": getColor(surfaceBase, 0, 1, 90),
      "border-strong": getColor(surfaceBase, 0, 1, 78),
      "accent-link": getColor(hsl, accH, 1, 45),
      "accent-code": getColor(hsl, accH, 0.95, 42),
      "prose-bg-soft": getColor(surfaceBase, 0, 1, 94),
      "prose-bg-strong": getColor(surfaceBase, 0, 1, 92),
    },
  };

  const bg = tokens.surfaces.background;
  const card = tokens.cards['card-panel-surface'];

  const mutedBg = card;
  const mutedTarget = 3.2;

  tokens.typography.heading = ensureContrast(tokens.typography.heading, bg, 7, isDark);
  tokens.typography['text-strong'] = ensureContrast(tokens.typography['text-strong'], bg, 7, isDark);
  tokens.typography['text-body'] = ensureContrast(tokens.typography['text-body'], bg, 4.5, isDark);
  tokens.typography['text-muted'] = ensureContrast(tokens.typography['text-muted'], mutedBg, mutedTarget, isDark);
  tokens.typography['footer-text'] = ensureContrast(tokens.typography['footer-text'], bg, 4.5, isDark);
  tokens.typography['footer-text-muted'] = ensureContrast(tokens.typography['footer-text-muted'], bg, 3.2, isDark);
  tokens.textPalette['text-primary'] = ensureContrast(tokens.textPalette['text-primary'], bg, 7, isDark);
  tokens.textPalette['text-secondary'] = ensureContrast(tokens.textPalette['text-secondary'], card, 4.5, isDark);
  tokens.textPalette['text-tertiary'] = ensureContrast(tokens.textPalette['text-tertiary'], card, 3.2, isDark);
  tokens.typography['text-accent'] = ensureContrast(tokens.typography['text-accent'], bg, 4.5, isDark);
  tokens.typography['text-accent-strong'] = ensureContrast(tokens.typography['text-accent-strong'], bg, 4.5, isDark);

  if (isPop) {
    const accentBg = tokens.surfaces.background;
    const accentSurface = tokens.cards['card-panel-surface'];
    const borderBg = tokens.surfaces['surface-plain'];
    const accentTarget = 4.5;
    const borderTarget = 3.2;
    const bodyText = tokens.typography['text-body'];
    const preferLightenAccent = hexToHsl(bodyText).l < 50;

    tokens.brand.primary = ensureContrast(tokens.brand.primary, accentBg, accentTarget, false);
    tokens.brand.secondary = ensureContrast(tokens.brand.secondary, accentBg, accentTarget, false);
    tokens.brand.accent = ensureContrast(tokens.brand.accent, accentBg, accentTarget, false);
    tokens.brand.cta = ensureContrast(tokens.brand.cta, accentBg, accentTarget, false);
    tokens.brand['cta-hover'] = ensureContrast(tokens.brand['cta-hover'], accentBg, accentTarget, false);
    tokens.brand['link-color'] = ensureContrast(tokens.brand['link-color'], accentBg, accentTarget, false);
    tokens.brand['focus-ring'] = ensureContrast(tokens.brand['focus-ring'], accentSurface, 3.5, false);
    tokens.borders['border-accent-medium'] = ensureContrast(tokens.borders['border-accent-medium'], borderBg, borderTarget, false);
    tokens.borders['border-accent-strong'] = ensureContrast(tokens.borders['border-accent-strong'], borderBg, borderTarget, false);
    tokens.borders['border-accent-hover'] = ensureContrast(tokens.borders['border-accent-hover'], borderBg, borderTarget, false);

    tokens.brand.primary = ensureContrast(tokens.brand.primary, bodyText, accentTarget, preferLightenAccent);
    tokens.brand.secondary = ensureContrast(tokens.brand.secondary, bodyText, accentTarget, preferLightenAccent);
    tokens.brand.accent = ensureContrast(tokens.brand.accent, bodyText, accentTarget, preferLightenAccent);
    tokens.brand['accent-strong'] = ensureContrast(tokens.brand['accent-strong'], bodyText, accentTarget, preferLightenAccent);
    tokens.brand.cta = ensureContrast(tokens.brand.cta, bodyText, accentTarget, preferLightenAccent);
    tokens.brand['cta-hover'] = ensureContrast(tokens.brand['cta-hover'], bodyText, accentTarget, preferLightenAccent);
  }

  return tokens;
};

export const addPrintMode = (tokensObj, baseColorInput, modeName, isDark) => {
  const printTokens = { ...tokensObj, print: {} };
  const richBlack = isDark ? '#0a0a0a' : '#111111';
  const paperWhite = '#fdfdf9';

  const toCmykSafe = (hex) => {
    const baseHsl = hexToHsl(hex);
    const s = Math.min(baseHsl.s, 88);
    const l = baseHsl.l < 15 ? 8 : baseHsl.l > 92 ? 92 : baseHsl.l;
    return hslToHex(baseHsl.h, s, l);
  };

  const isHex = (val) => typeof val === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val);

  const mutateForPrint = (obj, path = []) => {
    Object.entries(obj).forEach(([key, token]) => {
      if (token && typeof token === 'object' && !Array.isArray(token)) {
        if ('type' in token && 'value' in token) {
          if (token.type === 'color' && isHex(token.value)) {
            const safe = toCmykSafe(token.value);
            const printKey = [...path, key].join('/');
            printTokens.print[printKey] = { type: 'color', value: safe };
          }
          return;
        }
        mutateForPrint(token, [...path, key]);
        return;
      }
      const val = typeof token === 'string' ? token : token?.value;
      if (isHex(val)) {
        const safe = toCmykSafe(val);
        const printKey = [...path, key].join('/');
        printTokens.print[printKey] = { type: 'color', value: safe };
      }
    });
  };

  ['foundation', 'brand', 'typography', 'surfaces', 'cards', 'glass', 'entity', 'status'].forEach((section) => {
    if (tokensObj[section]) mutateForPrint(tokensObj[section], [section]);
  });

  Object.assign(printTokens.print, {
    'description': { type: 'string', value: 'Print-optimized • CMYK-safe • high-contrast • foil-ready' },
    'background/paper': { type: 'color', value: paperWhite },
    'ink/richblack': { type: 'color', value: richBlack },
    'ink/dark': { type: 'color', value: '#111111' },
    'ink/mid': { type: 'color', value: '#333333' },
    'coat/gloss-overlay': { type: 'color', value: 'rgba(0,0,0,0.04)' },
    'foil/gold': { type: 'color', value: '#d4af37' },
    'foil/silver': { type: 'color', value: '#e8e8e8' },
    'foil/rose': { type: 'color', value: '#c8a2c8' },
    'bleed': { type: 'dimension', value: '8px' },
    'safe-margin': { type: 'dimension', value: '24px' },
    'glass-replacement/border': { type: 'color', value: isDark ? '#333333' : '#cccccc' },
    'glass-replacement/fill': { type: 'color', value: isDark ? '#1a1a1a' : '#f8f8f8' },
    'meta/base-color': { type: 'color', value: baseColorInput },
    'meta/harmony': { type: 'string', value: modeName },
  });

  return printTokens;
};
