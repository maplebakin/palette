// Pure mathematical functions for color manipulation - no DOM dependencies
// Extracted from tokens.js and colorUtils.js to decouple logic from React

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const wrapHue = (value) => ((value % 360) + 360) % 360;
const hueDelta = (from, to) => ((to - from + 540) % 360) - 180;
const interpolateHue = (from, to, t) => wrapHue(from + hueDelta(from, to) * t);

const toLinear = (value) => {
  if (value <= 0.04045) return value / 12.92;
  return Math.pow((value + 0.055) / 1.055, 2.4);
};

const toSrgb = (value) => {
  const clamped = clamp01(value);
  if (clamped <= 0.0031308) return clamped * 12.92;
  return 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
};

const toByte = (value) => Math.round(clamp01(value) * 255);

/**
 * Convert hex color to HSL values
 * @param {string} hex - Hex color string (#RRGGBB or #RGB)
 * @returns {{h: number, s: number, l: number}} HSL values
 */
export const hexToHsl = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = '0x' + hex[1] + hex[1];
    g = '0x' + hex[2] + hex[2];
    b = '0x' + hex[3] + hex[3];
  } else if (hex.length === 7) {
    r = '0x' + hex[1] + hex[2];
    g = '0x' + hex[3] + hex[4];
    b = '0x' + hex[5] + hex[6];
  }
  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;
  let h = 0, s = 0, l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
};

/**
 * Convert HSL values to hex color
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color string (#RRGGBB)
 */
export const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255).toString(16);
  g = Math.round((g + m) * 255).toString(16);
  b = Math.round((b + m) * 255).toString(16);

  if (r.length === 1) r = '0' + r;
  if (g.length === 1) g = '0' + g;
  if (b.length === 1) b = '0' + b;

  return '#' + r + g + b;
};

/**
 * Get color with adjustments to hue, saturation, and lightness
 * @param {{h: number, s: number, l: number}} baseHsl - Base HSL values
 * @param {number} hueShift - Amount to shift hue (degrees)
 * @param {number} satMult - Factor to multiply saturation
 * @param {number|null} lightSet - Fixed lightness value (or null to use shift)
 * @param {number} lightShift - Amount to shift lightness
 * @returns {string} Hex color string
 */
export const getColor = (baseHsl, hueShift = 0, satMult = 1, lightSet = null, lightShift = 0) => {
  let h = (baseHsl.h + hueShift) % 360;
  if (h < 0) h += 360;
  const s = Math.max(0, Math.min(100, baseHsl.s * satMult));
  const l = lightSet !== null ? lightSet : Math.max(0, Math.min(100, baseHsl.l + lightShift));
  return hslToHex(h, s, l);
};

/**
 * Blend two hues with a given weight
 * @param {number} base - Base hue (degrees)
 * @param {number} shift - Shift amount (degrees)
 * @param {number} weight - Weight factor (0-1)
 * @returns {number} Blended hue
 */
export const blendHue = (base, shift, weight = 0) => {
  const origin = wrapHue(base);
  const target = wrapHue(base + shift);
  return interpolateHue(origin, target, weight);
};

/**
 * Calculate luminance of a hex color
 * @param {string} hex - Hex color string
 * @returns {number} Luminance value (0-1)
 */
export const getLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  const [r, g, b] = ['r', 'g', 'b'].map((channel) => {
    const val = rgb[channel] / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Calculate contrast ratio between two colors
 * @param {string} fg - Foreground hex color
 * @param {string} bg - Background hex color
 * @returns {number} Contrast ratio
 */
export const getContrastRatio = (fg, bg) => {
  try {
    const l1 = getLuminance(fg);
    const l2 = getLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  } catch (err) {
    console.warn('Contrast calculation failed:', err);
    return 1;
  }
};

/**
 * Normalize hex color format
 * @param {string} hex - Input hex color
 * @param {string} fallback - Fallback color if input is invalid
 * @returns {string} Normalized hex color
 */
export const normalizeHex = (hex, fallback = '#111827') => {
  if (typeof hex !== 'string') return fallback;
  const match = hex.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return fallback;
  const raw = match[1];
  if (raw.length === 3) {
    return '#' + raw.split('').map((c) => c + c).join('');
  }
  return '#' + raw.toLowerCase();
};

/**
 * Convert hex to RGB object
 * @param {string} hex - Hex color string
 * @returns {{r: number, g: number, b: number}} RGB values
 */
export const hexToRgb = (hex) => {
  const clean = normalizeHex(hex);
  const num = parseInt(clean.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

/**
 * Create RGBA string from hex and alpha
 * @param {string} hex - Hex color string
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA string
 */
export const hexWithAlpha = (hex, alpha = 1) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * Convert hex to OKLCH color space
 * @param {string} hex - Hex color string
 * @returns {{l: number, c: number, h: number}} OKLCH values
 */
export const hexToOklch = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const lr = toLinear(r / 255);
  const lg = toLinear(g / 255);
  const lb = toLinear(b / 255);

  const l = Math.cbrt((0.4122214708 * lr) + (0.5363325363 * lg) + (0.0514459929 * lb));
  const m = Math.cbrt((0.2119034982 * lr) + (0.6806995451 * lg) + (0.1073969566 * lb));
  const s = Math.cbrt((0.0883024619 * lr) + (0.2817188376 * lg) + (0.6299787005 * lb));

  const L = (0.2104542553 * l) + (0.793617785 * m) - (0.0040720468 * s);
  const a = (1.9779984951 * l) - (2.428592205 * m) + (0.4505937099 * s);
  const b2 = (0.0259040371 * l) + (0.7827717662 * m) - (0.808675766 * s);

  const C = Math.sqrt((a * a) + (b2 * b2));
  const h = C < 1e-7 ? 0 : wrapHue((Math.atan2(b2, a) * 180) / Math.PI);

  return { l: clamp01(L), c: C, h };
};

/**
 * Convert OKLCH to hex color
 * @param {{l: number, c: number, h: number}} param0 - OKLCH values
 * @returns {string} Hex color string
 */
export const oklchToHex = ({ l, c, h }) => {
  const hr = (wrapHue(h) * Math.PI) / 180;
  const a = Math.cos(hr) * Math.max(0, c);
  const b = Math.sin(hr) * Math.max(0, c);

  const l_ = l + (0.3963377774 * a) + (0.2158037573 * b);
  const m_ = l - (0.1055613458 * a) - (0.0638541728 * b);
  const s_ = l - (0.0894841775 * a) - (1.291485548 * b);

  const lr = l_ * l_ * l_;
  const lg = m_ * m_ * m_;
  const lb = s_ * s_ * s_;

  const r = toSrgb((4.0767416621 * lr) - (3.3077115913 * lg) + (0.2309699292 * lb));
  const g = toSrgb((-1.2684380046 * lr) + (2.6097574011 * lg) - (0.3413193965 * lb));
  const bChannel = toSrgb((-0.0041960863 * lr) - (0.7034186147 * lg) + (1.707614701 * lb));

  const toHex = (value) => toByte(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(bChannel)}`;
};

/**
 * Blend two colors in perceptually uniform space
 * @param {string} hex1 - First hex color
 * @param {string} hex2 - Second hex color
 * @param {number} weight - Blend weight (0-1)
 * @returns {string} Blended hex color
 */
export const blendColorsPerceptual = (hex1, hex2, weight = 0) => {
  const t = Math.max(0, Math.min(1, weight ?? 0));
  const colorA = hexToOklch(normalizeHex(hex1));
  const colorB = hexToOklch(normalizeHex(hex2));
  const preferredHue = colorA.c >= colorB.c ? colorA.h : colorB.h;
  const h1 = Number.isFinite(colorA.h) ? colorA.h : preferredHue;
  const h2 = Number.isFinite(colorB.h) ? colorB.h : preferredHue;

  const l = colorA.l + ((colorB.l - colorA.l) * t);
  const c = Math.max(0, colorA.c + ((colorB.c - colorA.c) * t));
  const h = interpolateHue(h1, h2, t);

  return oklchToHex({ l, c, h });
};

/**
 * Pick readable text color based on background
 * @param {string} bgHex - Background hex color
 * @param {string} light - Light text color
 * @param {string} dark - Dark text color
 * @param {number} threshold - Minimum contrast ratio
 * @returns {string} Readable text color
 */
export const pickReadableText = (bgHex, light = '#ffffff', dark = '#0f172a', threshold = 4.5) => {
  const ratioLight = getContrastRatio(light, bgHex);
  const ratioDark = getContrastRatio(dark, bgHex);
  if (ratioLight >= threshold || ratioLight >= ratioDark) return light;
  return dark;
};

/**
 * Generate harmony specifications for different color modes
 * @param {string} mode - Color harmony mode
 * @param {number} intensity - Intensity multiplier for apocalypse mode
 * @returns {Object} Harmony specification
 */
export const getHarmonySpec = (mode, intensity = 1) => {
  const harmonySpec = {
    Monochromatic: { 
      secH: 8, 
      accH: -8, 
      secSat: 0.9, 
      accSat: 0.95, 
      surfaceMix: 0.08, 
      backgroundMix: 0.06 
    },
    Analogous: { 
      secH: -30, 
      accH: 28, 
      secSat: 1.05, 
      accSat: 1.15, 
      surfaceMix: 0.28, 
      backgroundMix: 0.2 
    },
    Complementary: { 
      secH: 180, 
      accH: -150, 
      secSat: 1.08, 
      accSat: 1.2, 
      surfaceMix: 0.34, 
      backgroundMix: 0.28 
    },
    Tertiary: { 
      secH: 120, 
      accH: -120, 
      secSat: 1.12, 
      accSat: 1.18, 
      surfaceMix: 0.38, 
      backgroundMix: 0.32 
    },
    Apocalypse: { 
      secH: 180, 
      accH: 180, 
      secSat: 2.0 * intensity, 
      accSat: 2.2 * intensity, 
      surfaceMix: Math.min(0.6, 0.45 * intensity), 
      backgroundMix: Math.min(0.55, 0.35 * intensity) 
    },
  };
  
  return harmonySpec[mode] ?? { 
    secH: 0, 
    accH: 0, 
    secSat: 0.92, 
    accSat: 1.0, 
    surfaceMix: 0, 
    backgroundMix: 0 
  };
};

/**
 * Calculate lightness values based on theme mode and apocalypse status
 * @param {boolean} isDark - Whether theme is dark
 * @param {boolean} isApocalypse - Whether apocalypse mode is active
 * @param {boolean} isPop - Whether pop mode is active
 * @param {number} popScale - Pop intensity scale
 * @returns {{bgL: number, surfaceL: number, textMainL: number, textMutedL: number, borderL: number}} Lightness values
 */
export const calculateLightnessValues = (isDark, isApocalypse, isPop, popScale) => {
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
  
  if (isPop) {
    const basePop = clamp(56 + ((popScale - 1) * 6) - (isApocalypse ? 2 : 0), 42, 62);
    bgL = basePop;
    surfaceL = clamp(basePop - (isApocalypse ? 2 : 4), 38, 58);
    borderL = clamp(basePop - (isApocalypse ? 4 : 8), 32, 52);
  }
  
  return { bgL, surfaceL, textMainL, textMutedL, borderL };
};

/**
 * Calculate saturation values based on theme mode and apocalypse status
 * @param {Object} hsl - Base HSL values
 * @param {boolean} isDark - Whether theme is dark
 * @param {boolean} isApocalypse - Whether apocalypse mode is active
 * @param {boolean} isPop - Whether pop mode is active
 * @param {number} popBoost - Pop boost value
 * @returns {{surfaceSat: number, baseSurfaceSat: number}} Saturation values
 */
export const calculateSaturationValues = (hsl, isDark, isApocalypse, isPop, popBoost) => {
  let baseSurfaceSat = isApocalypse
    ? Math.max(32, Math.min(82, hsl.s * 0.8))
    : Math.max(14, Math.min(56, hsl.s * 0.42));
  const gammaLightSat = Math.pow(baseSurfaceSat / 100, 1.02) * 100;
  let surfaceSat = isDark
    ? baseSurfaceSat
    : Math.min(isApocalypse ? 32 : 24, Math.max(8, gammaLightSat * (isApocalypse ? 0.85 : 0.65)));
    
  if (isPop) {
    const popSurfaceCap = isApocalypse ? 38 : 34;
    const popSurfaceFloor = isApocalypse ? 14 : 10;
    const popSurfaceBoost = 1 + (popBoost * 1.4);
    surfaceSat = clamp(surfaceSat * popSurfaceBoost, popSurfaceFloor, popSurfaceCap);
  }
  
  return { surfaceSat, baseSurfaceSat };
};

/**
 * Calculate lightness for brand elements
 * @param {boolean} isDark - Whether theme is dark
 * @param {boolean} isApocalypse - Whether apocalypse mode is active
 * @param {boolean} isPop - Whether pop mode is active
 * @param {number} popBoost - Pop boost value
 * @returns {{brandLightness: number, accentLightness: number, ctaLightness: number, ctaHoverLightness: number}} Lightness values
 */
export const calculateBrandLightness = (isDark, isApocalypse, isPop, popBoost) => {
  let brandLightness = isApocalypse ? (isDark ? 75 : 52) : (isDark ? 60 : 50);
  let accentLightness = isApocalypse ? (isDark ? 78 : 56) : (isDark ? 67 : 55);
  let ctaLightness = isApocalypse ? (isDark ? 78 : 54) : (isDark ? 62 : 52);
  let ctaHoverLightness = isApocalypse ? (isDark ? 82 : 50) : (isDark ? 68 : 48);

  if (isPop) {
    brandLightness = clamp(brandLightness + (popBoost * 6) - 2, 46, 70);
    accentLightness = clamp(accentLightness + (popBoost * 6) - 2, 48, 72);
    ctaLightness = clamp(ctaLightness + (popBoost * 5) - 2, 46, 68);
    ctaHoverLightness = clamp(ctaHoverLightness + (popBoost * 4) - 2, 44, 66);
  }

  return { brandLightness, accentLightness, ctaLightness, ctaHoverLightness };
};

/**
 * Calculate saturation for brand elements
 * @param {boolean} isDark - Whether theme is dark
 * @param {boolean} isApocalypse - Whether apocalypse mode is active
 * @param {number} accentScale - Accent strength scale
 * @param {number} harmonyScale - Harmony intensity scale
 * @param {number} satNormalizer - Saturation normalizer
 * @param {Object} harmonySpec - Harmony specification
 * @param {boolean} isPop - Whether pop mode is active
 * @param {number} popBoost - Pop boost value
 * @returns {{primarySat: number, secondarySat: number, accentSat: number}} Saturation values
 */
export const calculateBrandSaturation = (isDark, isApocalypse, accentScale, harmonyScale, satNormalizer, harmonySpec, isPop, popBoost) => {
  const { secSat, accSat } = harmonySpec;
  
  let primarySat = (isApocalypse ? 1.5 : 0.9) * accentScale;
  let secondarySat = secSat * satNormalizer * harmonyScale * accentScale;
  let accentSat = accSat * satNormalizer * harmonyScale * accentScale;

  if (isPop) {
    const satBoost = 1 + (popBoost * 1.3);
    primarySat *= satBoost;
    secondarySat *= satBoost * 1.1;
    accentSat *= satBoost * 1.25;
  }

  return { primarySat, secondarySat, accentSat };
};

/**
 * Ensure minimum contrast ratio between foreground and background colors
 * @param {string} fg - Foreground color
 * @param {string} bg - Background color
 * @param {number} target - Target contrast ratio
 * @param {boolean} preferLighten - Whether to prefer lightening the color
 * @returns {string} Adjusted color that meets contrast requirements
 */
export const ensureContrast = (fg, bg, target, preferLighten) => {
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

/**
 * Generate neutral color steps based on lightness and saturation
 * @param {number} hue - Base hue
 * @param {number} sat - Saturation
 * @param {number} lightness - Base lightness
 * @param {number} satMult - Saturation multiplier
 * @returns {string} Hex color
 */
export const neutralColor = (hue, sat, lightness, satMult = 0.3) => {
  return getColor({ h: hue, s: sat * satMult, l: lightness }, 0, 1, lightness);
};

/**
 * Generate neutral steps based on theme mode and apocalypse status
 * @param {boolean} isDark - Whether theme is dark
 * @param {boolean} isApocalypse - Whether apocalypse mode is active
 * @param {number} neutralCurveScale - Neutral curve scale
 * @returns {number[]} Array of neutral lightness steps
 */
export const generateNeutralSteps = (isDark, isApocalypse, neutralCurveScale) => {
  const lightNeutralSteps = isApocalypse
    ? [98, 96, 92, 84, 70, 56, 40, 28, 18, 10]
    : [98, 95, 90, 78, 66, 52, 38, 26, 16, 10];
  const baseNeutralSteps = isDark
    ? (isApocalypse ? [94, 80, 64, 50, 40, 30, 18, 10, 6, 3] : [96, 88, 78, 68, 55, 45, 32, 22, 14, 8])
    : lightNeutralSteps;
  const neutralPivot = isDark ? 55 : 50;
  return baseNeutralSteps.map((val) => clamp(neutralPivot + ((val - neutralPivot) * neutralCurveScale), 1, 99));
};

/**
 * Generate status colors based on theme mode and apocalypse status
 * @param {boolean} isDark - Whether theme is dark
 * @param {boolean} isApocalypse - Whether apocalypse mode is active
 * @returns {{success: string, warning: string, error: string, info: string}} Status colors
 */
export const generateStatusColors = (isDark, isApocalypse) => {
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
    
  return { success, warning, error, info };
};