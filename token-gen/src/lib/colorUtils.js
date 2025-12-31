// Color helpers for palette generation and contrast checks.
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

export const getColor = (baseHsl, hueShift = 0, satMult = 1, lightSet = null, lightShift = 0) => {
  let h = (baseHsl.h + hueShift) % 360;
  if (h < 0) h += 360;
  const s = Math.max(0, Math.min(100, baseHsl.s * satMult));
  const l = lightSet !== null ? lightSet : Math.max(0, Math.min(100, baseHsl.l + lightShift));
  return hslToHex(h, s, l);
};

export const blendHue = (base, shift, weight = 0) => {
  const origin = wrapHue(base);
  const target = wrapHue(base + shift);
  return interpolateHue(origin, target, weight);
};

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

export const hexToRgb = (hex) => {
  const clean = normalizeHex(hex);
  const num = parseInt(clean.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

export const hexWithAlpha = (hex, alpha = 1) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

const hexToOklch = (hex) => {
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

const oklchToHex = ({ l, c, h }) => {
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

export const pickReadableText = (bgHex, light = '#ffffff', dark = '#0f172a', threshold = 4.5) => {
  const ratioLight = getContrastRatio(light, bgHex);
  const ratioDark = getContrastRatio(dark, bgHex);
  if (ratioLight >= threshold || ratioLight >= ratioDark) return light;
  return dark;
};

export const getLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  const [r, g, b] = ['r', 'g', 'b'].map((channel) => {
    const val = rgb[channel] / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

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

export const getWCAGBadge = (ratio) => {
  if (ratio >= 7) {
    return { text: 'AAA', color: 'text-[var(--status-success-text)] bg-[var(--status-success)]' };
  }
  if (ratio >= 4.5) {
    return { text: 'AA', color: 'text-[var(--status-warning-text)] bg-[var(--status-warning)]' };
  }
  if (ratio >= 3) {
    return { text: 'AA18', color: 'text-[var(--status-info-text)] bg-[var(--status-info)]' };
  }
  return { text: 'FAIL', color: 'text-[var(--status-error-text)] bg-[var(--status-error)]' };
};

export const escapeXml = (str = '') => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export const downloadFile = (filename, content, mime = 'text/plain') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
