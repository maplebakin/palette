/**
 * colorConversion.js
 * Pure color conversion utilities shared across the application.
 * Each function returns immutable plain objects to avoid accidental mutation.
 */

/**
 * Clamp helper for keeping a value within a range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Convert HEX color string to RGB object.
 * @param {string} hex
 * @returns {{r:number,g:number,b:number}}
 */
export function hexToRgb(hex) {
  let sanitized = hex.trim().replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized.split('').map((ch) => ch + ch).join('');
  }
  if (!/^([0-9a-fA-F]{6})$/.test(sanitized)) {
    throw new Error('Invalid HEX color');
  }
  const intVal = parseInt(sanitized, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

/**
 * Convert RGB object to HEX string.
 * @param {{r:number,g:number,b:number}} rgb
 * @returns {string}
 */
export function rgbToHex({ r, g, b }) {
  const toHex = (channel) => channel.toString(16).padStart(2, '0');
  return `#${toHex(clamp(Math.round(r), 0, 255))}${toHex(clamp(Math.round(g), 0, 255))}${toHex(clamp(Math.round(b), 0, 255))}`.toUpperCase();
}

/**
 * Convert RGB to HSL representation.
 * Implementation follows the W3C CSS Color Module specification.
 * @param {{r:number,g:number,b:number}} rgb
 * @returns {{h:number,s:number,l:number}}
 */
export function rgbToHsl({ r, g, b }) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0));
        break;
      case gNorm:
        h = (bNorm - rNorm) / delta + 2;
        break;
      default:
        h = (rNorm - gNorm) / delta + 4;
        break;
    }
    h *= 60;
    s = delta / (1 - Math.abs(2 * l - 1));
  }

  return { h: Math.round(h) % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Convert HSL to RGB using standard algorithm.
 * @param {{h:number,s:number,l:number}} hsl
 * @returns {{r:number,g:number,b:number}}
 */
export function hslToRgb({ h, s, l }) {
  const sat = clamp(s / 100, 0, 1);
  const light = clamp(l / 100, 0, 1);
  const hue = ((h % 360) + 360) % 360;

  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue >= 0 && hue < 60) {
    r = chroma;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = chroma;
  } else if (hue < 180) {
    g = chroma;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = chroma;
  } else if (hue < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Convert RGB to CMYK approximation.
 * This is adequate for screen-to-print approximations and keeps K stable.
 * @param {{r:number,g:number,b:number}} rgb
 * @returns {{c:number,m:number,y:number,k:number}}
 */
export function rgbToCmyk({ r, g, b }) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const c = (1 - rNorm - k) / (1 - k);
  const m = (1 - gNorm - k) / (1 - k);
  const y = (1 - bNorm - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

/**
 * Convert RGB to LAB via XYZ (D65).
 * Useful for perceptual comparisons (e.g., distance heuristics).
 * @param {{r:number,g:number,b:number}} rgb
 * @returns {{l:number,a:number,b:number}}
 */
export function rgbToLab({ r, g, b }) {
  const pivot = (value) => {
    const v = value > 0.04045 ? Math.pow((value + 0.055) / 1.055, 2.4) : value / 12.92;
    return v * 100;
  };
  const rLin = pivot(r / 255);
  const gLin = pivot(g / 255);
  const bLin = pivot(b / 255);
  const x = rLin * 0.4124 + gLin * 0.3576 + bLin * 0.1805;
  const y = rLin * 0.2126 + gLin * 0.7152 + bLin * 0.0722;
  const z = rLin * 0.0193 + gLin * 0.1192 + bLin * 0.9505;
  const ref = { x: 95.047, y: 100.0, z: 108.883 };
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116);
  const fx = f(x / ref.x);
  const fy = f(y / ref.y);
  const fz = f(z / ref.z);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * Calculate relative luminance according to WCAG 2.1.
 * @param {{r:number,g:number,b:number}} rgb
 * @returns {number}
 */
export function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rLum = channel(r);
  const gLum = channel(g);
  const bLum = channel(b);
  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
}

/**
 * Compute WCAG contrast ratio between two HEX colors.
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
export function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Helper to compute LAB Delta E distance.
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
export function deltaE(hexA, hexB) {
  const labA = rgbToLab(hexToRgb(hexA));
  const labB = rgbToLab(hexToRgb(hexB));
  return Math.sqrt(
    Math.pow(labA.l - labB.l, 2) +
      Math.pow(labA.a - labB.a, 2) +
      Math.pow(labA.b - labB.b, 2)
  );
}

/**
 * Attempt to map a HEX color to a friendly name based on simple distance
 * against a curated list of common colors. Keeps the list small for perf.
 */
const NAMED_COLORS = [
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Coal Black', hex: '#000000' },
  { name: 'Soft Gray', hex: '#B0BEC5' },
  { name: 'Charcoal', hex: '#37474F' },
  { name: 'Coral', hex: '#FF6B6B' },
  { name: 'Sunflower', hex: '#FFC312' },
  { name: 'Sky Blue', hex: '#60A5FA' },
  { name: 'Ocean', hex: '#0EA5E9' },
  { name: 'Lavender', hex: '#A78BFA' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Forest', hex: '#065F46' },
  { name: 'Rose', hex: '#F472B6' },
  { name: 'Clay', hex: '#B5651D' },
  { name: 'Slate', hex: '#64748B' },
  { name: 'Azure', hex: '#3A7BD5' },
  { name: 'Amber', hex: '#FFB300' },
  { name: 'Mint', hex: '#34D399' },
  { name: 'Crimson', hex: '#DC2626' },
  { name: 'Saffron', hex: '#F59E0B' },
];

/**
 * Approximate color name from HEX input by selecting the closest candidate.
 * @param {string} hex
 * @returns {string}
 */
export function approximateName(hex) {
  let best = NAMED_COLORS[0];
  let shortest = Infinity;
  for (const candidate of NAMED_COLORS) {
    const distance = deltaE(hex, candidate.hex);
    if (distance < shortest) {
      shortest = distance;
      best = candidate;
    }
  }
  return `${best.name}${shortest > 10 ? ' ~' : ''}`;
}

/**
 * Parse any input string into a normalized HEX color.
 * Supports raw HEX, rgb(), hsl() and comma separated values.
 * @param {string} value
 * @returns {string}
 */
export function parseColor(value) {
  const trimmed = value.trim();
  if (/^#/.test(trimmed)) {
    return rgbToHex(hexToRgb(trimmed));
  }
  const rgbMatch = trimmed.match(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/i);
  if (rgbMatch) {
    return rgbToHex({
      r: clamp(Number(rgbMatch[1]), 0, 255),
      g: clamp(Number(rgbMatch[2]), 0, 255),
      b: clamp(Number(rgbMatch[3]), 0, 255),
    });
  }
  const hslMatch = trimmed.match(/^hsl\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%\)$/i);
  if (hslMatch) {
    return rgbToHex(
      hslToRgb({
        h: clamp(Number(hslMatch[1]), 0, 360),
        s: clamp(Number(hslMatch[2]), 0, 100),
        l: clamp(Number(hslMatch[3]), 0, 100),
      })
    );
  }
  throw new Error('Unsupported color format');
}

export default {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToCmyk,
  rgbToLab,
  relativeLuminance,
  contrastRatio,
  deltaE,
  approximateName,
  parseColor,
};
