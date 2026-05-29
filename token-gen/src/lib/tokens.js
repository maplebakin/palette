import { blendColorsPerceptual, blendHue, getColor, getContrastRatio, hexToHsl, hslToHex } from './colorUtils.js';
import { readPath } from './theme/paths.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const shiftToHue = (fromHue, toHue) => ((toHue - fromHue + 540) % 360) - 180;
const wrapHue = (hue) => ((hue % 360) + 360) % 360;
const chooseReadableText = (background, light = '#ffffff', dark = '#0b0b10') =>
  getContrastRatio(light, background) >= getContrastRatio(dark, background) ? light : dark;
const roleDistance = (a, b) => {
  const hueDelta = Math.abs(shiftToHue(a.h, b.h)) / 180;
  const satDelta = Math.abs(a.s - b.s) / 100;
  const lightDelta = Math.abs(a.l - b.l) / 100;
  return Math.sqrt(
    (hueDelta * 22) ** 2
    + (satDelta * 36) ** 2
    + (lightDelta * 145) ** 2
  );
};
const findWhiteSafeLightness = (hue, saturation, preferredLightness) => {
  let lightness = clamp(preferredLightness, 20, 36);
  let color = hslToHex(hue, saturation, lightness);
  while (lightness > 18 && getContrastRatio('#ffffff', color) < 4.5) {
    lightness -= 1;
    color = hslToHex(hue, saturation, lightness);
  }
  return lightness;
};
const pickActionColor = ({
  hue,
  saturation,
  preferredLightness,
  minLightness,
  maxLightness,
  surface,
  targetContrast,
  textContrast = 4.5,
}) => {
  let best = hslToHex(hue, saturation, preferredLightness);
  let bestScore = -Infinity;

  for (let lightness = minLightness; lightness <= maxLightness; lightness += 1) {
    const candidate = hslToHex(hue, saturation, lightness);
    const surfaceContrast = getContrastRatio(candidate, surface);
    const readableTextContrast = Math.max(
      getContrastRatio('#ffffff', candidate),
      getContrastRatio('#0b0b10', candidate),
    );
    const meetsSurface = surfaceContrast >= targetContrast;
    const meetsText = readableTextContrast >= textContrast;
    const distancePenalty = Math.abs(lightness - preferredLightness) * 0.015;
    const score = (meetsSurface ? 5 : 0)
      + (meetsText ? 4 : 0)
      + Math.min(surfaceContrast, targetContrast) * 0.5
      + Math.min(readableTextContrast, textContrast) * 0.35
      - distancePenalty;

    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
};

const getPopSignalProfile = (hue, saturation, lightness, mode, isDark = false, popScale = 1) => {
  void mode;
  void isDark;
  const popDelta = clamp(popScale, 0.6, 1.4) - 1.3;
  const trueNeutral = saturation < 8;
  const mutedBotanical = !trueNeutral && saturation < 35 && hue >= 80 && hue <= 155;
  const paleBlush = !trueNeutral && lightness >= 78 && saturation >= 18 && (hue >= 330 || hue <= 10);
  const signalHue = hue;
  const botanicalAccentHue = mutedBotanical ? wrapHue(signalHue + 8) : signalHue;
  const supportHue = signalHue;
  const fieldS = trueNeutral
      ? 0
      : mutedBotanical
      ? clamp(saturation * 2.1 + 16 + (popDelta * 14), 52, 64)
      : paleBlush
        ? clamp((saturation * 0.72) + 24 + (popDelta * 36), 58, 80)
    : clamp(Math.max(saturation * 1.65, saturation + 18, 82) + (popDelta * 12), 74, 98);
  const fieldL = trueNeutral
    ? clamp(12 - (popDelta * 8), 10, 18)
    : findWhiteSafeLightness(signalHue, fieldS, (lightness > 55 ? lightness - 36 : lightness - 16) - (popDelta * 8));
  const surfaceL = trueNeutral ? 27 : paleBlush ? clamp(fieldL + 14, 31, 48) : clamp(fieldL + 12, 31, 46);
  const elevatedL = trueNeutral ? 42 : paleBlush ? clamp(surfaceL + 13, 45, 60) : clamp(surfaceL + 12, 43, 58);
  const borderL = trueNeutral ? 58 : clamp(elevatedL + 8, 52, 68);
  const highlightL = trueNeutral ? clamp(Math.max(lightness, 84), 84, 94) : clamp(elevatedL + 14, 58, 74);
  const choreography = trueNeutral
    ? 'neutral-shop-color-flood'
    : mutedBotanical
      ? 'botanical-shop-color-flood'
      : paleBlush
        ? 'blush-shop-color-flood'
        : 'seed-shop-color-flood';
  const family = trueNeutral
    ? 'graphite-silver-shop'
    : mutedBotanical
      ? 'vivid-botanical-shop'
      : paleBlush
        ? 'glossy-blush-shop'
        : 'seed-hue-shop';
  const brightPop = {
    h: botanicalAccentHue,
    s: trueNeutral ? 0 : mutedBotanical ? clamp(fieldS + 6, 56, 64) : paleBlush ? clamp(fieldS + 7, 72, 84) : clamp(fieldS + 4, 86, 98),
    l: highlightL,
  };
  const frostedPop = {
    h: botanicalAccentHue,
    s: trueNeutral ? 0 : mutedBotanical ? clamp(fieldS - 10, 42, 56) : paleBlush ? clamp(fieldS - 12, 54, 66) : clamp(fieldS - 18, 58, 80),
    l: trueNeutral ? 82 : clamp(fieldL + 34, 66, 82),
  };
  const cutout = {
    h: signalHue,
    s: trueNeutral ? 0 : mutedBotanical ? clamp(fieldS - 6, 44, 58) : paleBlush ? clamp(fieldS - 10, 56, 68) : clamp(fieldS - 12, 68, 90),
    l: trueNeutral ? 88 : elevatedL,
  };
  const highlightTint = {
    h: signalHue,
    s: trueNeutral ? 0 : mutedBotanical ? clamp(fieldS - 16, 36, 50) : paleBlush ? clamp(fieldS - 18, 48, 60) : clamp(fieldS - 22, 54, 78),
    l: trueNeutral ? 32 : surfaceL,
  };
  const sticker = {
    h: botanicalAccentHue,
    s: trueNeutral ? 0 : mutedBotanical ? clamp(fieldS + 6, 56, 64) : paleBlush ? clamp(fieldS + 7, 72, 84) : clamp(fieldS + 2, 84, 98),
    l: highlightL,
  };
  const signalText = {
    h: signalHue,
    s: 0,
    l: 96,
  };
  const skeletonBlush = {
    h: signalHue,
    s: trueNeutral ? 0 : paleBlush ? clamp(fieldS - 28, 36, 50) : clamp(fieldS - 40, 38, 62),
    l: trueNeutral ? 30 : clamp(fieldL + 28, 58, 74),
  };
  const stickerBorder = {
    h: botanicalAccentHue,
    s: trueNeutral ? 0 : mutedBotanical ? clamp(fieldS + 6, 56, 64) : paleBlush ? clamp(fieldS + 7, 72, 84) : clamp(fieldS + 2, 84, 98),
    l: borderL,
  };

  return {
    family,
    choreography,
    strength: trueNeutral ? 0.65 : clamp((fieldS - Math.max(saturation, 1)) / 80, 0.35, 1),
    primaryHue: signalHue,
    supportHue,
    signalHue,
    washHue: hue,
    surfaceSatCap: 100,
    backgroundSatCap: 100,
    harmonizeWeight: 0,
    popBackground: { h: signalHue, s: fieldS, l: fieldL },
    popSurface: { h: signalHue, s: trueNeutral ? 0 : mutedBotanical ? clamp(fieldS - 10, 40, 52) : paleBlush ? clamp(fieldS - 10, 56, 68) : clamp(fieldS - 14, 66, 88), l: surfaceL },
    popSurfaceElevated: { h: signalHue, s: trueNeutral ? 0 : mutedBotanical ? clamp(fieldS - 16, 34, 48) : paleBlush ? clamp(fieldS - 16, 48, 60) : clamp(fieldS - 22, 56, 82), l: elevatedL },
    popBorder: { h: signalHue, s: trueNeutral ? 0 : mutedBotanical ? clamp(fieldS - 8, 42, 56) : paleBlush ? clamp(fieldS - 12, 52, 64) : clamp(fieldS - 14, 60, 86), l: borderL },
    brightPop,
    frostedPop,
    popField: { h: signalHue, s: fieldS, l: fieldL },
    cutout,
    highlightTint,
    skeletonBlush,
    sticker,
    stickerBorder,
    signalText,
  };
};

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

export const buildOrderedStack = (tokens) => orderedSwatchSpec
  .map((item) => {
    const resolved = readPath(tokens, item.path) ?? (item.fallbackPath ? readPath(tokens, item.fallbackPath) : item.fallbackValue ?? null);
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
  const isLight = themeMode === 'light';
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
  const accentChromaScale = !isPop && accentScale < 1
    ? clamp(0.7 + (accentScale * 0.3), 0.85, 1)
    : accentScale;
  const accentActionScale = !isPop && accentScale < 1
    ? clamp(0.5 + (accentScale * 0.45), 0.72, 1)
    : accentScale;
  const neutralCurveScale = clamp(neutralCurve, 50, 150) / 100;
  const popScale = clamp(popIntensity, 60, 140) / 100;
  const isPrintMode = Boolean(printModeOverride);
  const POP_INTENSITY = 0.28;
  const LIGHT_TEMP_SHIFT = 8;
  const popSignalProfile = isPop ? getPopSignalProfile(hsl.h, hsl.s, hsl.l, mode, isDark, popScale) : null;
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
  const brandSecondaryHueShift = isPop
    ? (popSignalProfile ? shiftToHue(hsl.h, popSignalProfile.supportHue) : (secH * 0.35))
    : secH;
  const brandSignalHueShift = isPop
    ? (popSignalProfile ? shiftToHue(hsl.h, popSignalProfile.signalHue) : (accH * 0.3))
    : accH;
  const surfaceMix = clamp(surfaceMixBase * harmonyScale, 0, isApocalypse ? 0.6 : 0.5);
  const backgroundMix = clamp(backgroundMixBase * harmonyScale, 0, isApocalypse ? 0.55 : 0.45);
  const resolvedSurfaceMix = isPop
    ? Math.min(surfaceMix, 0.04 + (popBoost * 0.02))
    : surfaceMix;
  const resolvedBackgroundMix = isPop
    ? Math.min(backgroundMix, 0.03 + (popBoost * 0.015))
    : backgroundMix;

  let bgL = isApocalypse ? (isDark ? 2 : 99) : (isDark ? 10 : 98);
  let surfaceL = isApocalypse ? (isDark ? 6 : 98) : (isDark ? 16 : 93);
  let textMainL = isApocalypse ? (isDark ? 98 : 8) : (isDark ? 95 : 10);
  let textMutedL = isApocalypse ? (isDark ? 70 : 35) : (isDark ? 65 : 40);
  let borderL = isApocalypse ? (isDark ? 10 : 88) : (isDark ? 25 : 90);
  if (isLight) {
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
  if (isPop && isApocalypse) {
    bgL = 96;
    surfaceL = 92;
    borderL = 88;
  }
  if (isPop && popSignalProfile) {
    bgL = popSignalProfile.popBackground.l;
    surfaceL = popSignalProfile.popSurface.l;
    borderL = popSignalProfile.popBorder.l;
    textMainL = 96;
    textMutedL = 82;
  }
  
  let baseSurfaceSat = isApocalypse
    ? Math.max(32, Math.min(82, hsl.s * 0.8))
    : Math.max(14, Math.min(56, hsl.s * 0.42));
  const gammaLightSat = Math.pow(baseSurfaceSat / 100, 1.02) * 100;
  let surfaceSat = isDark
    ? baseSurfaceSat
    : Math.min(isApocalypse ? 32 : 24, Math.max(8, gammaLightSat * (isApocalypse ? 0.85 : 0.65)));
  if (isPop) {
    surfaceSat = popSignalProfile?.popBackground.s ?? clamp(surfaceSat * 1.8, 70, 94);
  }

  let brandLightness = isApocalypse ? (isDark ? 75 : 52) : (isDark ? 60 : 50); 
  let accentLightness = isApocalypse ? (isDark ? 78 : 56) : (isDark ? 67 : 55);
  let ctaHoverLightness = isApocalypse ? (isDark ? 82 : 50) : (isDark ? 68 : 48);

  let satNormalizer = isApocalypse ? (isDark ? 1.35 : 1.5) : (isDark ? 0.92 : 0.86);
  let secondarySat = secSat * satNormalizer * harmonyScale * accentChromaScale;
  let accentSat = accSat * satNormalizer * harmonyScale * accentChromaScale;
  const paletteMaxS = clamp(Math.max(
    hsl.s,
    hsl.s * secondarySat * 0.96,
    hsl.s * accentSat * 0.9,
  ), 0, 100);
  const relativePopS = paletteMaxS > 60
    ? clamp((paletteMaxS - 15) + ((popScale - 1) * 6), 55, 75)
    : clamp((paletteMaxS * 1.6) + ((popScale - 1) * 6), 35, 70);
  const popSignalHue = popSignalProfile?.signalHue ?? hsl.h;
  const isNeutralPop = popSignalProfile?.family === 'graphite-silver-shop';
  const isBlushPop = popSignalProfile?.family === 'glossy-blush-shop';
  const popFieldS = popSignalProfile?.popField.s ?? relativePopS;
  const popFieldL = popSignalProfile?.popField.l ?? clamp(hsl.l - 25, 32, 45);
  const popSignalLightness = popFieldL;
  const cutoutRole = popSignalProfile?.cutout ?? { h: popSignalHue, s: 16, l: 92 };
  const brightPopRole = popSignalProfile?.brightPop ?? { h: popSignalHue, s: clamp(popFieldS + 12, 80, 97), l: isDark ? 68 : 54 };
  const frostedPopRole = popSignalProfile?.frostedPop ?? { h: popSignalHue, s: clamp(popFieldS * 0.9, 45, 75), l: isDark ? 30 : 86 };
  const highlightTintRole = popSignalProfile?.highlightTint ?? { h: popSignalHue, s: 16, l: isDark ? 24 : 92 };
  const skeletonBlushRole = popSignalProfile?.skeletonBlush ?? { h: popSignalHue, s: isDark ? 24 : 24, l: isDark ? 24 : 88 };
  const stickerRole = popSignalProfile?.sticker ?? { h: wrapHue(popSignalHue + 28), s: clamp(popFieldS + 12, 55, 82), l: isDark ? 68 : 54 };
  const stickerBorderRole = popSignalProfile?.stickerBorder ?? { h: stickerRole.h, s: stickerRole.s, l: isDark ? 76 : 98 };
  const signalTextRole = popSignalProfile?.signalText ?? { h: popSignalHue, s: clamp(popFieldS * 0.8, 38, 70), l: isDark ? 94 : 18 };
  const popBackgroundRole = popSignalProfile?.popBackground ?? { h: popSignalHue, s: popFieldS, l: popFieldL };
  const popSurfaceRole = popSignalProfile?.popSurface ?? { h: popSignalHue, s: clamp(popFieldS - 10, 68, 90), l: clamp(popFieldL + 7, 26, 43) };
  const popSurfaceElevatedRole = popSignalProfile?.popSurfaceElevated ?? { h: popSignalHue, s: clamp(popFieldS - 16, 62, 86), l: clamp(popFieldL + 12, 30, 46) };
  const popBorderRole = popSignalProfile?.popBorder ?? { h: popSignalHue, s: clamp(popFieldS - 14, 60, 86), l: clamp(popFieldL + 18, 38, 58) };
  const brightPopColor = hslToHex(brightPopRole.h, brightPopRole.s, brightPopRole.l);
  const frostedPopColor = hslToHex(frostedPopRole.h, frostedPopRole.s, frostedPopRole.l);
  const popFieldColor = hslToHex(popSignalHue, popFieldS, popFieldL);
  const popBackgroundColor = hslToHex(popBackgroundRole.h, popBackgroundRole.s, popBackgroundRole.l);
  const popSurfaceColor = hslToHex(popSurfaceRole.h, popSurfaceRole.s, popSurfaceRole.l);
  const popSurfaceElevatedColor = hslToHex(popSurfaceElevatedRole.h, popSurfaceElevatedRole.s, popSurfaceElevatedRole.l);
  const cutoutColor = hslToHex(cutoutRole.h, cutoutRole.s, cutoutRole.l);
  const highlightTintColor = hslToHex(highlightTintRole.h, highlightTintRole.s, highlightTintRole.l);
  const skeletonBlushColor = hslToHex(skeletonBlushRole.h, skeletonBlushRole.s, skeletonBlushRole.l);
  const stickerColor = hslToHex(stickerRole.h, stickerRole.s, stickerRole.l);
  const stickerBorderColor = hslToHex(stickerBorderRole.h, stickerBorderRole.s, stickerBorderRole.l);
  const signalTextColor = hslToHex(signalTextRole.h, signalTextRole.s, signalTextRole.l);
  const popForegroundColor = '#ffffff';
  const popMutedForegroundColor = hslToHex(popBackgroundRole.h, isNeutralPop ? 0 : 18, 84);
  const rawSeedRole = hexToHsl(normalizedBase);
  const rawSeedTooQuiet = roleDistance(rawSeedRole, popBackgroundRole) < 18
    || roleDistance(rawSeedRole, popSurfaceRole) < 18
    || (isNeutralPop && rawSeedRole.l < 72)
    || (!isNeutralPop && rawSeedRole.s < 42)
    || getContrastRatio(normalizedBase, popBackgroundColor) < 2.2
    || getContrastRatio(normalizedBase, popSurfaceColor) < 2.2;
  const blushCtaColor = hslToHex(popSignalHue, clamp(popFieldS + 6, 74, 82), 78);
  const popCtaColor = isBlushPop ? blushCtaColor : rawSeedTooQuiet ? brightPopColor : normalizedBase;
  const popCtaForegroundColor = chooseReadableText(popCtaColor);
  if (isPop) {
    brandLightness = popSignalLightness;
    accentLightness = popSignalLightness;
    ctaHoverLightness = clamp(popSignalLightness - 4, 28, 42);
  }
  const lowHarmonyLift = !isPop && harmonyScale < 1
    ? (1 - harmonyScale) * (isDark ? 10 : 12)
    : 0;
  const lowAccentLift = !isPop && accentScale < 1
    ? (1 - accentScale) * (isDark ? 8 : 10)
    : 0;
  const harmonyBrandLightness = clamp(
    brandLightness + lowHarmonyLift + lowAccentLift,
    1,
    isDark ? 86 : 64,
  );
  const harmonyAccentLightness = clamp(
    accentLightness + lowHarmonyLift + lowAccentLift,
    1,
    isDark ? 90 : 68,
  );

  const primary = isPop
    ? popBackgroundColor
    : normalizedBase;
  const paleBlushActionSeed = !isPop && hsl.l >= 76 && hsl.s >= 30 && (hsl.h >= 330 || hsl.h <= 8);
  const blushBrandHue = hsl.h;
  const blushSecondary = paleBlushActionSeed
    ? hslToHex(blushBrandHue, clamp(hsl.s * 0.44, 38, 54), isDark ? 68 : 72)
    : null;
  const blushAccent = paleBlushActionSeed
    ? hslToHex(blushBrandHue, clamp(hsl.s * 0.34, 30, 46), isDark ? 76 : 84)
    : null;
  const blushAccentStrong = paleBlushActionSeed
    ? hslToHex(blushBrandHue, clamp(hsl.s * 0.62, 56, 72), isDark ? 64 : 66)
    : null;
  const blushSupport = paleBlushActionSeed ? {
    accent1: hslToHex(blushBrandHue, clamp(hsl.s * 0.46, 40, 56), isDark ? 70 : 72),
    accent2: hslToHex(blushBrandHue, clamp(hsl.s * 0.54, 46, 62), isDark ? 64 : 64),
    accent3: hslToHex(blushBrandHue, clamp(hsl.s * 0.62, 54, 70), isDark ? 58 : 58),
    accentInk: hslToHex(blushBrandHue, clamp(hsl.s * 0.5, 42, 58), isDark ? 76 : 32),
    textAccent: hslToHex(blushBrandHue, clamp(hsl.s * 0.42, 38, 54), isDark ? 76 : 38),
    textAccentStrong: hslToHex(blushBrandHue, clamp(hsl.s * 0.46, 42, 58), isDark ? 84 : 30),
    link: hslToHex(blushBrandHue, clamp(hsl.s * 0.56, 50, 66), isDark ? 74 : 42),
    focusRing: hslToHex(blushBrandHue, clamp(hsl.s * 0.56, 50, 66), isDark ? 68 : 64),
  } : null;
  const secondary = isPop
    ? popSurfaceColor
    : paleBlushActionSeed
      ? blushSecondary
      : getColor(hsl, brandSecondaryHueShift, secondarySat * 0.96, harmonyBrandLightness);
  const accent = isPop
    ? normalizedBase
    : paleBlushActionSeed
      ? blushAccent
      : getColor(hsl, brandSignalHueShift, accentSat * 0.9, harmonyAccentLightness);
  const accentStrong = isPop
    ? brightPopColor
    : paleBlushActionSeed
      ? blushAccentStrong
      : getColor(hsl, brandSignalHueShift, (accentSat * 0.9) + 0.04, harmonyAccentLightness + 5);
  const actionHue = paleBlushActionSeed ? hsl.h : wrapHue(hsl.h + brandSignalHueShift);
  const actionSeedIsNeutral = hsl.s < 8;
  const darkPastelActionSeed = isDark && !isPop && hsl.l >= 72 && hsl.s >= 18;
  const lightActionSaturation = actionSeedIsNeutral
    ? 0
    : paleBlushActionSeed
      ? clamp(Math.max(hsl.s * 0.66, 58) * accentActionScale, 56, 76)
      : clamp(Math.max(hsl.s * 1.12, 54) * accentActionScale, 48, 92);
  const darkActionSaturation = actionSeedIsNeutral
    ? 0
    : paleBlushActionSeed
      ? clamp(Math.max(hsl.s * 0.68, 58) * accentActionScale, 56, 76)
      : darkPastelActionSeed
      ? clamp(Math.max(hsl.s * 1.25, 76) * accentActionScale, 70, 92)
      : clamp(Math.max(hsl.s * 0.98, 48) * accentActionScale, 42, 92);
  const lightPrimaryAction = pickActionColor({
    hue: actionHue,
    saturation: lightActionSaturation,
    preferredLightness: actionSeedIsNeutral ? 30 : paleBlushActionSeed ? 58 : 36,
    minLightness: paleBlushActionSeed ? 56 : 20,
    maxLightness: paleBlushActionSeed ? 60 : 48,
    surface: '#f7f7f7',
    targetContrast: paleBlushActionSeed ? 3.2 : 4.2,
  });
  const lightSecondaryAction = pickActionColor({
    hue: actionHue,
    saturation: actionSeedIsNeutral ? 0 : clamp(lightActionSaturation * 0.86, 36, 78),
    preferredLightness: actionSeedIsNeutral ? 34 : 32,
    minLightness: 20,
    maxLightness: 50,
    surface: '#f7f7f7',
    targetContrast: 3.5,
  });
  const darkPrimaryAction = pickActionColor({
    hue: actionHue,
    saturation: darkActionSaturation,
    preferredLightness: actionSeedIsNeutral ? 78 : paleBlushActionSeed ? 60 : darkPastelActionSeed ? 58 : 64,
    minLightness: darkPastelActionSeed ? 54 : 52,
    maxLightness: darkPastelActionSeed ? 66 : 86,
    surface: '#111827',
    targetContrast: 3.4,
  });
  const darkSecondaryAction = pickActionColor({
    hue: actionHue,
    saturation: actionSeedIsNeutral ? 0 : clamp(darkActionSaturation * 0.82, 34, darkPastelActionSeed ? 80 : 76),
    preferredLightness: actionSeedIsNeutral ? 72 : darkPastelActionSeed ? 66 : 70,
    minLightness: darkPastelActionSeed ? 52 : 48,
    maxLightness: darkPastelActionSeed ? 78 : 88,
    surface: '#111827',
    targetContrast: 3,
  });
  const cta = isPop
    ? popCtaColor
    : isDark
      ? darkPrimaryAction
      : lightPrimaryAction;
  const ctaRole = hexToHsl(cta);
  const ctaHover = isPop
    ? hslToHex(popSignalHue, isNeutralPop ? 0 : clamp(popFieldS + 4, 86, 98), clamp(hexToHsl(popCtaColor).l - 8, 28, 66))
    : paleBlushActionSeed
      ? pickActionColor({
        hue: actionHue,
        saturation: clamp(ctaRole.s + (isDark ? 4 : 2), ctaRole.s, isDark ? 80 : 78),
        preferredLightness: isDark ? clamp(ctaRole.l + 4, 56, 66) : clamp(ctaRole.l - 4, 52, 56),
        minLightness: isDark ? clamp(ctaRole.l + 2, 54, 64) : 50,
        maxLightness: isDark ? 68 : clamp(ctaRole.l - 2, 54, 58),
        surface: isDark ? '#111827' : '#f7f7f7',
        targetContrast: isDark ? 3.6 : 3.6,
      })
    : isDark
      ? pickActionColor({
        hue: actionHue,
        saturation: darkActionSaturation,
        preferredLightness: ctaHoverLightness,
        minLightness: 50,
        maxLightness: 88,
        surface: '#111827',
        targetContrast: 3.6,
      })
      : pickActionColor({
        hue: actionHue,
        saturation: lightActionSaturation,
        preferredLightness: ctaHoverLightness,
        minLightness: 20,
        maxLightness: 46,
        surface: '#f7f7f7',
        targetContrast: 4.4,
      });
  const gradientStart = getColor(hsl, 0, 1, isDark ? brandLightness + 5 : brandLightness + 8);
  const gradientEnd = getColor(hsl, brandSignalHueShift, accentSat * 0.9, isDark ? brandLightness - 4 : brandLightness - 2);

  const secondaryTarget = getColor(hsl, brandSecondaryHueShift, 1, hsl.l);
  const accentTarget = getColor(hsl, brandSignalHueShift, 1, hsl.l);

  // Use perceptual blending when the mix is strong enough to avoid muddy cross-wheel travel.
  const surfaceHue = resolvedSurfaceMix > 0.2
    ? hexToHsl(blendColorsPerceptual(normalizedBase, secondaryTarget, resolvedSurfaceMix)).h
    : blendHue(hsl.h, secH, resolvedSurfaceMix);
  const backgroundHue = resolvedBackgroundMix > 0.2
    ? hexToHsl(blendColorsPerceptual(normalizedBase, accentTarget, resolvedBackgroundMix)).h
    : blendHue(hsl.h, accH, resolvedBackgroundMix);
  const neutralShift = isDark ? 0 : (isPop ? 0 : LIGHT_TEMP_SHIFT);
  const neutralSurfaceHue = (surfaceHue + neutralShift) % 360;
  const neutralBackgroundHue = (backgroundHue + neutralShift) % 360;
  const backgroundSatScale = isDark ? 0.85 : (isPop ? 0.92 + (popBoost * 0.12) : 1.05);
  const backgroundBase = isPop
    ? popBackgroundRole
    : { h: neutralBackgroundHue, s: surfaceSat * backgroundSatScale, l: bgL };
  const surfaceBase = isPop
    ? popSurfaceRole
    : { h: neutralSurfaceHue, s: surfaceSat, l: bgL };
  const largeSurfaceBase = isPop ? popBackgroundRole : backgroundBase;
  const mediumSurfaceBase = isPop ? popSurfaceRole : surfaceBase;
  const lightPastelEntitySeed = isLight && !isPop && hsl.l >= 72 && hsl.s >= 18;
  const lightEntityHighlightHue = hsl.h;
  const lightEntityHighlightBgLightness = clamp(95 - ((neutralCurveScale - 1) * 2), 93, 96);
  const lightEntityHighlightBg = hslToHex(
    lightEntityHighlightHue,
    clamp(hsl.s * 0.22 * (0.9 + (accentChromaScale * 0.1)), 14, 24),
    lightEntityHighlightBgLightness,
  );
  const lightEntityHighlightAccent = hslToHex(
    lightEntityHighlightHue,
    clamp(hsl.s * 0.58 * accentChromaScale, 42, 56),
    38,
  );
  const lightEntityHighlightBorder = hslToHex(
    lightEntityHighlightHue,
    clamp(hsl.s * 0.36 * (0.85 + (accentChromaScale * 0.15)), 22, 42),
    79,
  );
  const lightEntityHighlightText = hslToHex(
    lightEntityHighlightHue,
    clamp(hsl.s * 0.36 * (0.9 + (accentChromaScale * 0.1)), 24, 42),
    28,
  );
  const neutralColor = (lightness, satMult = 0.3) => {
    const blushNeutralSat = paleBlushActionSeed
      ? clamp(
        lightness >= 90 ? 6 : lightness >= 70 ? 8 : lightness >= 50 ? 9 : 10,
        0,
        12,
      )
      : 0;
    return getColor(
      { h: neutralBackgroundHue, s: Math.max(surfaceSat * satMult, blushNeutralSat), l: lightness },
      0,
      1,
      lightness,
    );
  };
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
    : paleBlushActionSeed
    ? hslToHex(145, isDark ? 46 : 42, isDark ? 58 : 38)
    : (isDark ? hslToHex(145, 65, 45) : hslToHex(145, 65, 40)); 
  const warning = isApocalypse
    ? (isDark ? hslToHex(45, 100, 60) : hslToHex(45, 100, 50))
    : paleBlushActionSeed
    ? hslToHex(42, isDark ? 72 : 62, isDark ? 62 : 48)
    : (isDark ? hslToHex(45, 90, 50) : hslToHex(45, 90, 45));
  const error = isApocalypse
    ? (isDark ? hslToHex(0, 100, 65) : hslToHex(0, 100, 45))
    : paleBlushActionSeed
    ? hslToHex(358, isDark ? 64 : 58, isDark ? 66 : 52)
    : (isDark ? hslToHex(0, 70, 60) : hslToHex(0, 70, 50));
  const info = isApocalypse
    ? (isDark ? hslToHex(210, 100, 65) : hslToHex(210, 100, 50))
    : paleBlushActionSeed
    ? hslToHex(212, isDark ? 50 : 48, isDark ? 66 : 50)
    : (isDark ? hslToHex(210, 80, 60) : hslToHex(210, 80, 50));
  const statusStrong = {
    success: paleBlushActionSeed ? hslToHex(145, isDark ? 48 : 46, isDark ? 64 : 44) : getColor({ h: 145, s: 65, l: 50 }, 0, 1, isDark ? 52 : 48),
    warning: paleBlushActionSeed ? hslToHex(42, isDark ? 76 : 66, isDark ? 68 : 52) : getColor({ h: 45, s: 90, l: 55 }, 0, 1, isDark ? 52 : 50),
    error: paleBlushActionSeed ? hslToHex(358, isDark ? 68 : 62, isDark ? 70 : 56) : getColor({ h: 0, s: 72, l: 55 }, 0, 1, isDark ? 58 : 52),
  };
  const glassNoiseOpacity = isApocalypse ? '0.9' : (isDark ? '0.08' : '0.04');
  const glassBlur = isApocalypse ? '40px' : '16px';

  const interfaceAccentHue = isPop && popSignalProfile ? brandSignalHueShift : accH;
  const interfaceSupportHue = isPop && popSignalProfile ? brandSecondaryHueShift : secH;
  const accentHueMain = isPop && popSignalProfile ? (hsl.h + brandSignalHueShift + 360) % 360 : (hsl.h + accH + 360) % 360;
  const accentHueSecondary = isPop && popSignalProfile ? accentHueMain : (hsl.h + interfaceSupportHue + 360) % 360;
  const accentHueRoot = isPop && popSignalProfile ? accentHueMain : hsl.h;
  const accentLightSteps = isDark ? [68, 60, 52, 36] : [58, 52, 46, 32];
  const accentBaseSat = clamp(Math.max(20, hsl.s) * accentChromaScale, 10, 100);
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

  const ensureHueContrast = (fg, bg, target, { minL = 14, maxL = 88 } = {}) => {
    const { h, s, l } = hexToHsl(fg);
    const start = clamp(Math.round(l), minL, maxL);
    let best = hslToHex(h, s, start);
    let bestRatio = getContrastRatio(best, bg);
    let bestDistance = Math.abs(start - l);
    let meetsTarget = bestRatio >= target;

    for (let lightness = minL; lightness <= maxL; lightness += 1) {
      const candidate = hslToHex(h, s, lightness);
      const ratio = getContrastRatio(candidate, bg);
      const distance = Math.abs(lightness - l);
      const candidateMeetsTarget = ratio >= target;
      if (
        (candidateMeetsTarget && !meetsTarget)
        || (candidateMeetsTarget && meetsTarget && distance < bestDistance)
        || (!candidateMeetsTarget && !meetsTarget && ratio > bestRatio)
      ) {
        best = candidate;
        bestRatio = ratio;
        bestDistance = distance;
        meetsTarget = candidateMeetsTarget;
      }
    }

    return best;
  };

  const headerL = isDark
    ? bgL + 2
    : isPop
      ? clamp(bgL + 6, 48, 74)
      : clamp(bgL + 2, 94, 98);
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
        "accent-1": paleBlushActionSeed ? blushSupport.accent1 : accentColor(accentHueMain, satNormalizer * accSat * 0.9, accentLightSteps[0]),
        "accent-2": paleBlushActionSeed ? blushSupport.accent2 : accentColor(accentHueSecondary, satNormalizer * secSat * 0.98, accentLightSteps[1]),
        "accent-3": paleBlushActionSeed ? blushSupport.accent3 : accentColor(accentHueRoot, satNormalizer * accSat * 1.05, accentLightSteps[2]),
        "accent-ink": paleBlushActionSeed ? blushSupport.accentInk : accentColor(accentHueMain, satNormalizer * accSat * 1.2, accentLightSteps[3]),
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
      "link-color": isPop
        ? signalTextColor
        : paleBlushActionSeed
          ? blushSupport.link
          : getColor(hsl, interfaceAccentHue, linkBrandSat, isDark ? 70 : 45),
      "focus-ring": isPop
        ? hslToHex(stickerRole.h, stickerRole.s, isDark ? clamp(stickerRole.l + 2, 66, 76) : clamp(stickerRole.l - 8, 38, 52))
        : paleBlushActionSeed
        ? blushSupport.focusRing
        : getColor(hsl, interfaceAccentHue, focusRingSat, focusRingLight),
    },

    actions: {
      "primary": cta,
      "primary-hover": ctaHover,
      "primary-foreground": isPop ? popCtaForegroundColor : chooseReadableText(cta),
      "secondary": isPop ? stickerBorderColor : (isDark ? darkSecondaryAction : lightSecondaryAction),
      "secondary-foreground": isPop
        ? signalTextColor
        : chooseReadableText(isDark ? darkSecondaryAction : lightSecondaryAction),
      "secondary-border": isPop ? stickerBorderColor : (isDark ? darkSecondaryAction : lightSecondaryAction),
      "brand-accent": accent,
      "seed-accent": normalizedBase,
    },

    typography: {
      "heading": isPop ? popForegroundColor : getColor(hsl, 0, 0.1, textMainL),
      "text-strong": isPop ? popForegroundColor : getColor(hsl, 0, 0.1, isDark ? 90 : 15),
      "text-body": isPop ? hslToHex(popBackgroundRole.h, 12, 92) : getColor(hsl, 0, 0.1, isDark ? 80 : 25),
      "text-muted": isPop ? popMutedForegroundColor : getColor(hsl, 0, 0.1, textMutedL),
      "text-hint": isPop ? hslToHex(popBackgroundRole.h, 18, 74) : getColor(hsl, 0, 0.2, isDark ? 50 : 60),
      "text-disabled": isPop ? hslToHex(popBackgroundRole.h, 12, 62) : getColor(hsl, 0, 0.1, isDark ? 30 : 80),
      "text-accent": isPop
        ? popForegroundColor
        : paleBlushActionSeed
        ? blushSupport.textAccent
        : getColor(hsl, interfaceAccentHue, accentTextSat, isDark ? 75 : 40),
      "text-accent-strong": isPop
        ? popForegroundColor
        : paleBlushActionSeed
        ? blushSupport.textAccentStrong
        : getColor(hsl, interfaceAccentHue, accentTextStrongSat, isDark ? 85 : 30),
      "footer-text": isPop ? hslToHex(popBackgroundRole.h, 12, 90) : getColor(hsl, 0, 0.1, isDark ? 60 : 85),
      "footer-text-muted": isPop ? popMutedForegroundColor : getColor(hsl, 0, 0.1, isDark ? 40 : 60),
    },
    textPalette: {
      "text-primary": isPop ? popForegroundColor : getColor(hsl, 0, 0.1, isDark ? 92 : 18),
      "text-secondary": isPop ? hslToHex(popBackgroundRole.h, 12, 90) : getColor(hsl, 0, 0.1, isDark ? 86 : 24),
      "text-tertiary": isPop ? popMutedForegroundColor : getColor(hsl, 0, 0.1, isDark ? 78 : 32),
      "text-hint": isPop ? hslToHex(popBackgroundRole.h, 18, 74) : getColor(hsl, 0, 0.2, isDark ? 60 : 50),
      "text-disabled": isPop ? hslToHex(popBackgroundRole.h, 12, 62) : getColor(hsl, 0, 0.1, isDark ? 38 : 80),
      "text-accent": isPop
        ? popForegroundColor
        : paleBlushActionSeed
        ? blushSupport.textAccent
        : getColor(hsl, interfaceAccentHue, accentTextSat, isDark ? 75 : 40),
      "text-accent-strong": isPop
        ? popForegroundColor
        : paleBlushActionSeed
        ? blushSupport.textAccentStrong
        : getColor(hsl, interfaceAccentHue, accentTextStrongSat, isDark ? 85 : 30),
      "link-color": isPop
        ? popForegroundColor
        : paleBlushActionSeed
        ? blushSupport.link
        : getColor(hsl, interfaceAccentHue, linkTextSat, isDark ? 70 : 45),
    },

    borders: {
      "border-subtle": getColor(surfaceBase, 0, 0.9, borderL),
      "border-strong": getColor(surfaceBase, 0, 0.9, isDark ? borderL + 12 : borderL - 12),
      "border-accent-subtle": getColor(hsl, interfaceAccentHue, borderAccentSubtleSat, isDark ? borderL + 5 : borderL - 5),
      "border-accent-medium": isPop ? brightPopColor : getColor(hsl, interfaceAccentHue, borderAccentMediumSat, isDark ? borderL + 10 : borderL - 10),
      "border-accent-strong": isPop ? brightPopColor : getColor(hsl, interfaceAccentHue, borderAccentStrongSat, isDark ? borderL + 18 : borderL - 18),
      "border-accent-hover": isPop ? brightPopColor : getColor(hsl, interfaceAccentHue, borderAccentHoverSat, isDark ? borderL + 22 : borderL - 22),
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
      "card-panel-border-strong": getColor(surfaceBase, 0, 1, isDark ? borderL + 15 : (isPop ? clamp(borderL + 14, 40, 70) : 85)),
      "card-tag-bg": isPop
        ? stickerColor
        : isDark
        ? getColor(hsl, 0, 0.2, 20)
        : getColor(hsl, interfaceAccentHue, 0.12 + (popBoost * 0.2), 94),
      "card-tag-text": isPop ? '#111111' : getColor(hsl, 0, 0.4, isDark ? 80 : 30),
      "card-tag-border": isPop
        ? hslToHex(stickerRole.h, stickerRole.s, isDark ? clamp(stickerRole.l + 10, 72, 82) : clamp(stickerRole.l - 14, 34, 46))
        : isDark
        ? getColor(hsl, 0, 0.2, 30)
        : getColor(hsl, interfaceAccentHue, 0.18 + (popBoost * 0.2), 85),
    },

    glass: {
      "glass-surface": getColor(hsl, 0, 0.1, isDark ? 20 : (isPop ? clamp(surfaceL + 16, 48, 78) : 95)),
      "glass-surface-strong": getColor(hsl, 0, 0.1, isDark ? 30 : (isPop ? clamp(surfaceL + 10, 44, 72) : 90)),
      "glass-border": getColor(hsl, 0, 0.1, isDark ? 35 : (isPop ? clamp(borderL + 18, 46, 76) : 85)),
      "glass-border-strong": getColor(hsl, 0, 0.2, isDark ? 45 : (isPop ? clamp(borderL + 12, 42, 70) : 80)),
      "glass-hover": isPop ? frostedPopColor : getColor(hsl, interfaceAccentHue, 0.3, isDark ? 25 : 95),
      "glass-shadow": getColor(hsl, 0, 0.3, isDark ? 5 : (isPop ? clamp(surfaceL - 8, 16, 34) : 80)),
      "glass-highlight": getColor(hsl, 0, 0, isDark ? 30 : (isPop ? clamp(surfaceL + 24, 60, 92) : 99)),
      "glass-glow": isPop ? frostedPopColor : getColor(hsl, interfaceAccentHue, 0.5, isDark ? 28 : 72),
      "glass-shadow-soft": isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.1)',
      "glass-shadow-strong": isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.18)',
      "glass-blur": glassBlur,
      "glass-noise-opacity": glassNoiseOpacity,
    },

    entity: {
      "entity-card-surface": isPop
        ? highlightTintColor
        : getColor(hsl, interfaceSupportHue, 0.15, isDark ? 18 : 98),
      "entity-card-border": isPop
        ? stickerBorderColor
        : lightPastelEntitySeed
          ? lightEntityHighlightBorder
          : getColor(hsl, interfaceAccentHue, 0.22, isDark ? 35 : 85),
      "entity-card-glow": isPop
        ? hslToHex(highlightTintRole.h, clamp(highlightTintRole.s + 8, 20, 36), isDark ? clamp(highlightTintRole.l + 4, 22, 32) : clamp(highlightTintRole.l - 4, 84, 94))
        : getColor(hsl, interfaceAccentHue, 0.45, isDark ? 25 : 90),
      "entity-card-highlight": isPop
        ? stickerColor
        : lightPastelEntitySeed
          ? lightEntityHighlightBg
          : getColor(hsl, interfaceAccentHue, darkPastelActionSeed ? 0.55 : 0.35, isDark ? (darkPastelActionSeed ? 38 : 30) : 95),
      "entity-card-heading": isPop
        ? signalTextColor
        : getColor(hsl, interfaceAccentHue, 0.5, isDark ? 80 : 20),
      "entity-highlight-bg": isPop
        ? normalizedBase
        : lightPastelEntitySeed
          ? lightEntityHighlightBg
          : getColor(hsl, interfaceAccentHue, darkPastelActionSeed ? 0.55 : 0.35, isDark ? (darkPastelActionSeed ? 38 : 30) : 95),
      "entity-highlight-accent": isPop
        ? '#ffffff'
        : lightPastelEntitySeed
          ? lightEntityHighlightAccent
          : getColor(hsl, interfaceAccentHue, 0.5, isDark ? 80 : 20),
      "entity-highlight-text": isPop
        ? signalTextColor
        : lightPastelEntitySeed
          ? lightEntityHighlightText
          : getColor(hsl, interfaceAccentHue, 0.5, isDark ? 80 : 20),
      "entity-highlight-border": isPop
        ? stickerBorderColor
        : lightPastelEntitySeed
          ? lightEntityHighlightBorder
          : getColor(hsl, interfaceAccentHue, 0.22, isDark ? 35 : 85),
    },

    named: {
      "color-midnight": getColor(hsl, 0, 0.8, 10),
      "color-night": getColor(hsl, 10, 0.6, 15),
      "color-dusk": getColor(hsl, interfaceSupportHue, 0.4, 30),
      "color-ink": getColor(hsl, 0, 0.1, 20),
      "color-amethyst": getColor(hsl, interfaceAccentHue, 0.7, 60),
      "color-iris": getColor(hsl, interfaceAccentHue, 0.9, 75),
      "color-gold": getColor(hsl, 45, 0.8, 60),
      "color-rune": getColor(hsl, interfaceSupportHue, 0.6, 85),
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
      "admin-surface-base": getColor(isPop ? mediumSurfaceBase : backgroundBase, 0, 1, isDark ? bgL + 6 : (isPop ? clamp(bgL + 6, 48, 76) : Math.min(98, bgL + 3))),
      "admin-accent": getColor(hsl, interfaceAccentHue, isDark ? 0.95 : 0.85 + (popBoost * 0.35), isDark ? 64 : 54),
    },

    aliases: {
      "surface-panel-primary": getColor(mediumSurfaceBase, 0, 1, surfaceL),
      "surface-panel-secondary": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL + 4 : surfaceL - 2),
      "surface-card-hover": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL + 6 : surfaceL - 4),
      "surface-muted": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL - 2 : surfaceL + 2),
      "border-purple-subtle": getColor(hsl, interfaceAccentHue, purpleBorderSubtleSat, borderL),
      "border-purple-medium": getColor(hsl, interfaceAccentHue, purpleBorderMediumSat, isDark ? borderL + 8 : borderL - 8),
      "border-accent-subtle": getColor(hsl, interfaceAccentHue, aliasBorderSubtleSat, isDark ? borderL + 5 : borderL - 5),
      "border-accent-medium": isPop ? brightPopColor : getColor(hsl, interfaceAccentHue, aliasBorderMediumSat, isDark ? borderL + 10 : borderL - 10),
      "border-accent-strong": isPop ? brightPopColor : getColor(hsl, interfaceAccentHue, aliasBorderStrongSat, isDark ? borderL + 18 : borderL - 18),
      "border-accent-hover": isPop ? brightPopColor : getColor(hsl, interfaceAccentHue, aliasBorderHoverSat, isDark ? borderL + 22 : borderL - 22),
      "text-subtle": getColor(hsl, 0, 0.1, textMutedL),
      "text-accent-strong": isPop
        ? hslToHex(signalTextRole.h, signalTextRole.s, isDark ? 96 : clamp(signalTextRole.l - 4, 8, 20))
        : getColor(hsl, interfaceAccentHue, accentTextStrongSat, isDark ? 88 : 34),
      "accent-purple-strong": accentStrong,
      "accent-purple-soft": getColor(hsl, interfaceAccentHue, 0.7, isDark ? 75 : 70),
      "overlay-panel": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL + 2 : surfaceL),
      "overlay-panel-strong": getColor(mediumSurfaceBase, 0, 1, isDark ? surfaceL + 6 : surfaceL - 2),
      "focus-ring": isPop
        ? hslToHex(stickerRole.h, stickerRole.s, isDark ? clamp(stickerRole.l + 2, 66, 76) : clamp(stickerRole.l - 8, 38, 52))
        : getColor(hsl, interfaceAccentHue, focusRingSat, isDark ? 40 : 68 + (popBoost * 4)),
      "shadow-card": isDark ? '0 20px 50px -20px rgba(0,0,0,0.55)' : '0 12px 30px -18px rgba(0,0,0,0.15)',
      "shadow-card-hover": isDark ? '0 24px 60px -22px rgba(0,0,0,0.6)' : '0 14px 40px -20px rgba(0,0,0,0.2)',
      "chip-background": isDark
        ? getColor(surfaceBase, 0, 1, surfaceL - 2)
        : getColor(mediumSurfaceBase, 0, 1, surfaceL + 2),
      "chip-border": isDark
        ? getColor(surfaceBase, 0, 1, borderL + 6)
        : getColor(mediumSurfaceBase, 0, 1, borderL - 6),
      "sticker-border": isPop ? stickerBorderColor : (isDark ? darkSecondaryAction : lightSecondaryAction),
      "sticker-border-width": isPop ? '2px' : '1px',
    },

    pop: isPop ? {
      "seed-hsl": `${hsl.h} ${hsl.s}% ${hsl.l}%`,
      "choreography": popSignalProfile?.choreography || 'none',
      "family": popSignalProfile?.family || 'none',
      "pop-background": popBackgroundColor,
      "pop-foreground": popForegroundColor,
      "pop-muted-text": popMutedForegroundColor,
      "pop-surface": popSurfaceColor,
      "pop-surface-elevated": popSurfaceElevatedColor,
      "pop-accent": normalizedBase,
      "original-accent": normalizedBase,
      "pop-cta": popCtaColor,
      "pop-cta-foreground": popCtaForegroundColor,
      "pop-border": hslToHex(popBorderRole.h, popBorderRole.s, popBorderRole.l),
      "pop-highlight": brightPopColor,
      "bright-pop": brightPopColor,
      "frosted-pop": frostedPopColor,
      "pop-field": popFieldColor,
      "cutout-surface": cutoutColor,
      "semantic-tint": highlightTintColor,
      "highlight-surface": highlightTintColor,
      "skeleton-blush": skeletonBlushColor,
      "sticker-border": stickerBorderColor,
      "sticker-border-width": '2px',
      "sticker-accent": stickerColor,
      "gel-pen-ink": signalTextColor,
      "signal-text": signalTextColor,
      "harmonization-weight": String(popSignalProfile?.harmonizeWeight ?? 0),
    } : {},

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
      "accent-link": getColor(hsl, interfaceAccentHue, 1, 45),
      "accent-code": getColor(hsl, interfaceAccentHue, 0.95, 42),
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
    const accentSurface = tokens.cards['card-panel-surface'];
    tokens.brand['focus-ring'] = ensureHueContrast(tokens.brand['focus-ring'], accentSurface, 3.5);
    tokens.cards['card-tag-text'] = ensureContrast(tokens.cards['card-tag-text'], tokens.cards['card-tag-bg'], 4.5, false);
    tokens.entity['entity-card-heading'] = ensureContrast(tokens.entity['entity-card-heading'], tokens.entity['entity-card-surface'], 4.5, true);
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
