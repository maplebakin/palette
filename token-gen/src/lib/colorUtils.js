// Color helpers for palette generation and contrast checks.
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
  const target = (base + shift + 360) % 360;
  const h = (base * (1 - weight)) + (target * weight);
  return (h + 360) % 360;
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
  if (ratio >= 7) return { text: 'AAA', color: 'text-green-600 bg-green-100' };
  if (ratio >= 4.5) return { text: 'AA', color: 'text-amber-600 bg-amber-100' };
  if (ratio >= 3) return { text: 'AA18', color: 'text-orange-600 bg-orange-100' };
  return { text: 'FAIL', color: 'text-red-600 bg-red-100' };
};

export const escapeXml = (str = '') => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');
