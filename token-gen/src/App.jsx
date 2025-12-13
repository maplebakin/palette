import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Copy, Check, Sun, Moon, Palette, Type, Box, Grid, Layers, Droplet, Download, Wand2, Printer, FileText, Image, EyeOff, Shuffle, AlertCircle, Eye } from 'lucide-react';

// --- Color Utility Functions ---

const hexToHsl = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = "0x" + hex[1] + hex[1];
    g = "0x" + hex[2] + hex[2];
    b = "0x" + hex[3] + hex[3];
  } else if (hex.length === 7) {
    r = "0x" + hex[1] + hex[2];
    g = "0x" + hex[3] + hex[4];
    b = "0x" + hex[5] + hex[6];
  }
  r /= 255; g /= 255; b /= 255;
  let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
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

const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2,
      r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255).toString(16);
  g = Math.round((g + m) * 255).toString(16);
  b = Math.round((b + m) * 255).toString(16);

  if (r.length === 1) r = "0" + r;
  if (g.length === 1) g = "0" + g;
  if (b.length === 1) b = "0" + b;

  return "#" + r + g + b;
};

// Helper to generate a color with adjustments
// lightSet: absolute lightness value (0-100)
// lightShift: relative adjustment to base lightness
const getColor = (baseHsl, hueShift = 0, satMult = 1, lightSet = null, lightShift = 0) => {
  let h = (baseHsl.h + hueShift) % 360;
  if (h < 0) h += 360;
  let s = Math.max(0, Math.min(100, baseHsl.s * satMult));
  let l = lightSet !== null ? lightSet : Math.max(0, Math.min(100, baseHsl.l + lightShift));
  return hslToHex(h, s, l);
};

const blendHue = (base, shift, weight = 0) => {
  const target = (base + shift + 360) % 360;
  const h = (base * (1 - weight)) + (target * weight);
  return (h + 360) % 360;
};

// Flatten tokens and add minimal typing so Penpot can ingest them
const getPenpotType = (name, value) => {
  if (typeof value === 'number') return 'number';
  const val = String(value);
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val) || /^rgba?\(/i.test(val) || /^hsla?\(/i.test(val)) return 'color';
  if (/shadow/i.test(name)) return 'string';
  if (/(px|rem|em|vh|vw|%)$/i.test(val)) return 'dimension';
  if (/opacity/i.test(name)) return 'opacity';
  return 'string';
};

const flattenTokens = (obj, prefix = []) => {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const path = [...prefix, key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ('type' in val && 'value' in val) {
        return acc.concat({ name: path.join('/'), value: val });
      }
      return acc.concat(flattenTokens(val, path));
    }
    return acc.concat({ name: path.join('/'), value: val });
  }, []);
};

const buildWitchcraftPayload = (tokens, themeName, mode, isDark) => {
  const slug = themeName.toLowerCase().replace(/\s+/g, '-');
  const settings = {
    primary: tokens.brand.primary,
    accent: tokens.brand.accent,
    background: tokens.surfaces.background,
    fontSerif: "Literata",
    fontScript: "Parisienne",
    textPrimary: tokens.textPalette['text-primary'],
    textHeading: tokens.typography.heading,
    textMuted: tokens.typography['text-muted'],
    fontHeading: "Cinzel",
    fontAccent: "Cormorant Garamond",
    colorMidnight: tokens.named['color-midnight'],
    colorNight: tokens.named['color-night'],
    colorIris: tokens.named['color-iris'],
    colorAmethyst: tokens.named['color-amethyst'],
    colorDusk: tokens.named['color-dusk'],
    colorGold: tokens.named['color-gold'],
    colorRune: tokens.named['color-rune'],
    colorFog: tokens.named['color-fog'],
    colorInk: tokens.named['color-ink'],
    surfacePlain: tokens.surfaces['surface-plain'],
    cardPanelSurface: tokens.cards['card-panel-surface'],
    cardPanelSurfaceStrong: tokens.cards['card-panel-surface-strong'],
    cardPanelBorder: tokens.cards['card-panel-border'],
    cardPanelBorderStrong: tokens.cards['card-panel-border-strong'],
    cardPanelBorderSoft: tokens.cards['card-panel-border-soft'],
    glassSurface: tokens.glass['glass-surface'],
    glassSurfaceStrong: tokens.glass['glass-surface-strong'],
    glassCard: tokens.glass['glass-surface'],
    glassHover: tokens.glass['glass-hover'],
    glassBorder: tokens.glass['glass-border'],
    glassBorderStrong: tokens.glass['glass-border-strong'],
    glassHighlight: tokens.glass['glass-highlight'],
    glassGlow: tokens.glass['glass-glow'],
    glassShadowSoft: tokens.glass['glass-shadow-soft'],
    glassShadowStrong: tokens.glass['glass-shadow-strong'],
    glassBlur: tokens.glass['glass-blur'],
    glassNoiseOpacity: tokens.glass['glass-noise-opacity'],
    textSecondary: tokens.textPalette['text-secondary'],
    textTertiary: tokens.textPalette['text-tertiary'],
    textStrong: tokens.typography['text-strong'],
    textBody: tokens.typography['text-body'],
    textSubtle: tokens.typography['text-muted'],
    textAccent: tokens.typography['text-accent'],
    textAccentStrong: tokens.typography['text-accent-strong'],
    inkBody: tokens.named['color-ink'],
    inkStrong: tokens.named['color-midnight'],
    inkMuted: tokens.named['color-dusk'],
    linkColor: tokens.brand['link-color'],
    cardBadgeBg: tokens.cards['card-tag-bg'],
    cardBadgeBorder: tokens.cards['card-tag-border'],
    cardBadgeText: tokens.cards['card-tag-text'],
    cardTagBg: tokens.cards['card-tag-bg'],
    cardTagBorder: tokens.cards['card-tag-border'],
    cardTagText: tokens.cards['card-tag-text'],
    focusRingColor: tokens.brand['focus-ring'],
    cardFocusOutline: tokens.brand['focus-ring'],
    success: tokens.status.success,
    warning: tokens.status.warning,
    error: tokens.status.error,
    info: tokens.status.info,
    headerBackground: tokens.surfaces['header-background'],
    headerBorder: tokens.surfaces['surface-plain-border'],
    headerText: tokens.typography['text-strong'],
    headerTextHover: tokens.typography['text-accent'],
    footerBackground: tokens.cards['card-panel-surface-strong'],
    footerBorder: tokens.cards['card-panel-border'],
    footerText: tokens.typography['footer-text'],
    footerTextMuted: tokens.typography['footer-text-muted'],
  };

  return {
    label: themeName,
    slug,
    mode: isDark ? 'midnight' : 'daylight',
    category: 'custom',
    settings,
  };
};

const buildPenpotPayload = (tokens, orderedHandoff = [], meta = null) => {
  const flat = flattenTokens(tokens);
  const clean = (segment) => {
    const stripped = segment.replace(/[^a-zA-Z0-9]+/g, '');
    return stripped || 'token';
  };
  const payload = flat.reduce((sets, { name, value }) => {
    const [rawSet, ...rest] = name.split('/');
    const setName = clean(rawSet);
    const tokenSegments = rest.length ? rest : [rawSet];
    const tokenName = tokenSegments.map(clean).join('.');
    if (!sets[setName]) sets[setName] = {};
    const explicitType = value && typeof value === 'object' && 'type' in value ? value.type : null;
    const tokenValue = value && typeof value === 'object' && 'value' in value ? value.value : value;
    sets[setName][tokenName] = { type: explicitType ?? getPenpotType(name, tokenValue), value: tokenValue };
    return sets;
  }, {});

  if (orderedHandoff.length) {
    payload.handoff = orderedHandoff.reduce((acc, item, idx) => {
      const key = `${String(idx + 1).padStart(2, '0')}-${clean(item.name)}`;
      acc[key] = {
        type: getPenpotType(item.name, item.value),
        value: item.value,
        source: item.path,
      };
      return acc;
    }, {});
  }

  if (meta) {
    const metaSet = payload.meta ?? {};
    Object.entries(meta).forEach(([key, val]) => {
      metaSet[clean(key)] = { type: getPenpotType(key, val), value: val };
    });
    payload.meta = metaSet;
  }

  return payload;
};

const normalizeHex = (hex, fallback = '#111827') => {
  if (typeof hex !== 'string') return fallback;
  const match = hex.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return fallback;
  const raw = match[1];
  if (raw.length === 3) {
    return '#' + raw.split('').map((c) => c + c).join('');
  }
  return '#' + raw.toLowerCase();
};

const hexToRgb = (hex) => {
  const clean = normalizeHex(hex);
  const num = parseInt(clean.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

// --- WCAG Contrast Utilities ---
const getLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  const [r, g, b] = ['r', 'g', 'b'].map((channel) => {
    const val = rgb[channel] / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const getContrastRatio = (fg, bg) => {
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

const getWCAGBadge = (ratio) => {
  if (ratio >= 7) return { text: 'AAA', color: 'text-green-600 bg-green-100' };
  if (ratio >= 4.5) return { text: 'AA', color: 'text-amber-600 bg-amber-100' };
  if (ratio >= 3) return { text: 'AA18', color: 'text-orange-600 bg-orange-100' };
  return { text: 'FAIL', color: 'text-red-600 bg-red-100' };
};

const hexWithAlpha = (hex, alpha = 1) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

const escapeXml = (str = '') => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const encoder = new TextEncoder();
const encodeText = (str) => encoder.encode(str);

const concatUint8 = (arrays) => {
  const total = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  arrays.forEach((arr) => {
    out.set(arr, offset);
    offset += arr.length;
  });
  return out;
};

const writeOctal = (buffer, offset, length, value) => {
  const octal = value.toString(8).padStart(length - 1, '0');
  const chars = `${octal} `;
  for (let i = 0; i < length; i += 1) {
    buffer[offset + i] = i < chars.length ? chars.charCodeAt(i) : 0;
  }
};

const writeString = (buffer, offset, length, value) => {
  const bytes = encodeText(value);
  const len = Math.min(bytes.length, length);
  buffer.set(bytes.subarray(0, len), offset);
};

const createTarArchive = (files) => {
  const blocks = [];

  files.forEach(({ name, data }) => {
    const header = new Uint8Array(512);
    writeString(header, 0, 100, name);
    writeOctal(header, 100, 8, 0o644);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, data.length);
    writeOctal(header, 136, 12, Math.floor(Date.now() / 1000));
    writeString(header, 156, 1, '0');
    writeString(header, 257, 6, 'ustar\0');
    writeString(header, 263, 2, '00');
    for (let i = 148; i < 156; i += 1) header[i] = 32;
    let sum = 0;
    for (let i = 0; i < 512; i += 1) sum += header[i];
    writeOctal(header, 148, 8, sum);

    blocks.push(header);
    blocks.push(data);

    const remainder = data.length % 512;
    if (remainder !== 0) {
      blocks.push(new Uint8Array(512 - remainder));
    }
  });

  blocks.push(new Uint8Array(1024));
  return concatUint8(blocks);
};

const renderPaletteCardPng = async (theme) => {
  const brand = theme.tokens.brand ?? {};
  const surfaces = theme.tokens.surfaces ?? {};
  const typography = theme.tokens.typography ?? {};
  const base = normalizeHex(theme.baseColor || '#6366f1');
  const primary = normalizeHex(brand.primary || '#6366f1');
  const secondary = normalizeHex(brand.secondary || '#8b5cf6');
  const accent = normalizeHex(brand.accent || '#22d3ee');
  const bg = normalizeHex(surfaces['background'] || '#0b1021');
  const card = normalizeHex(surfaces['card-panel-surface'] || '#111827');
  const text = normalizeHex(typography['text-strong'] || '#0f172a');
  const muted = normalizeHex(typography['text-muted'] || '#64748b');

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  // Backgrounds
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 800);
  ctx.fillStyle = card;
  ctx.beginPath();
  ctx.roundRect(60, 60, 1080, 680, 28);
  ctx.fill();
  ctx.strokeStyle = hexWithAlpha(primary, 0.13);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Accents
  ctx.fillStyle = hexWithAlpha(primary, 0.13);
  ctx.beginPath();
  ctx.roundRect(60, 140, 1080, 18, 9);
  ctx.fill();
  ctx.fillStyle = hexWithAlpha(primary, 0.2);
  ctx.beginPath();
  ctx.roundRect(60, 100, 360, 28, 14);
  ctx.fill();

  // Text
  ctx.fillStyle = text;
  ctx.font = '700 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(theme.name, 80, 120);
  ctx.fillStyle = muted;
  ctx.font = '500 14px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`Base ${base} • ${theme.mode} • ${theme.isDark ? 'Dark' : 'Light'}`, 80, 170);

  // Gradient card
  const grad = ctx.createLinearGradient(720, 200, 1080, 520);
  grad.addColorStop(0, hexWithAlpha(primary, 0.95));
  grad.addColorStop(0.5, hexWithAlpha(secondary, 0.9));
  grad.addColorStop(1, hexWithAlpha(accent, 0.85));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(720, 200, 360, 320, 24);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '800 32px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Primary', 760, 250);
  ctx.font = '600 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(primary.toUpperCase(), 760, 290);
  ctx.fillText(secondary.toUpperCase(), 760, 330);
  ctx.fillText(accent.toUpperCase(), 760, 370);

  // Surface card
  ctx.fillStyle = card;
  ctx.strokeStyle = hexWithAlpha(primary, 0.2);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(120, 240, 520, 280, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = text;
  ctx.font = '800 24px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Surfaces & Typography', 150, 280);
  ctx.fillStyle = muted;
  ctx.font = '500 16px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`Background ${bg}`, 150, 320);
  ctx.fillText(`Surface ${card}`, 150, 350);
  ctx.fillText(`Text ${text}`, 150, 380);
  ctx.fillText(`Muted ${muted}`, 150, 410);

  // Swatch circles
  const circles = [primary, secondary, accent, base];
  circles.forEach((c, idx) => {
    const x = 220 + idx * 100;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, 520, 38, 0, Math.PI * 2);
    ctx.fill();
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas export failed; no blob returned.'));
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
    }, 'image/png');
  });
};

const renderStripPng = async (theme) => {
  const brand = theme.tokens.brand ?? {};
  const foundation = theme.tokens.foundation?.neutrals ?? {};
  const swatches = [
    brand.primary,
    brand.secondary,
    brand.accent,
    theme.baseColor,
    foundation['neutral-2'],
    foundation['neutral-4'],
    foundation['neutral-6'],
    foundation['neutral-8'],
  ].filter(Boolean).slice(0, 8).map((c) => normalizeHex(c));

  const canvas = document.createElement('canvas');
  canvas.width = 1500;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1500, 420);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 22px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`${theme.name} • Swatch Strip`, 60, 60);

  swatches.forEach((color, idx) => {
    const x = 40 + idx * 170;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, 80, 140, 240, 22);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 14px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(color.toUpperCase(), x + 70, 340);
    ctx.textAlign = 'start';
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas export failed; no blob returned.'));
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
    }, 'image/png');
  });
};

const buildPaletteCardSvg = (theme) => {
  const brand = theme.tokens.brand ?? {};
  const surfaces = theme.tokens.surfaces ?? {};
  const typography = theme.tokens.typography ?? {};
  const base = normalizeHex(theme.baseColor || '#6366f1');
  const primary = normalizeHex(brand.primary || '#6366f1');
  const secondary = normalizeHex(brand.secondary || '#8b5cf6');
  const accent = normalizeHex(brand.accent || '#22d3ee');
  const bg = normalizeHex(surfaces['background'] || '#0b1021');
  const card = normalizeHex(surfaces['card-panel-surface'] || '#111827');
  const text = normalizeHex(typography['text-strong'] || '#0f172a');
  const muted = normalizeHex(typography['text-muted'] || '#64748b');

  const header = escapeXml(theme.name);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="${secondary}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" rx="32" fill="${bg}" />
  <rect x="60" y="60" width="1080" height="680" rx="28" fill="${card}" stroke="${hexWithAlpha(primary, 0.13)}" stroke-width="2"/>
  <rect x="60" y="140" width="1080" height="18" rx="9" fill="${hexWithAlpha(primary, 0.13)}"/>
  <rect x="60" y="100" width="360" height="28" rx="14" fill="${hexWithAlpha(primary, 0.2)}"/>
  <text x="80" y="120" fill="${text}" font-family="Inter, system-ui" font-weight="700" font-size="18">${header}</text>
  <text x="80" y="170" fill="${muted}" font-family="Inter, system-ui" font-weight="500" font-size="14">Base ${base} • ${escapeXml(theme.mode)} • ${theme.isDark ? 'Dark' : 'Light'}</text>
  <rect x="720" y="200" width="360" height="320" rx="24" fill="url(#grad)" opacity="0.9"/>
  <text x="760" y="250" fill="#fff" font-family="Inter, system-ui" font-size="32" font-weight="800">Primary</text>
  <text x="760" y="290" fill="#fff" font-family="Inter, system-ui" font-size="18" font-weight="600">${primary}</text>
  <text x="760" y="330" fill="#fff" font-family="Inter, system-ui" font-size="18" font-weight="600">${secondary}</text>
  <text x="760" y="370" fill="#fff" font-family="Inter, system-ui" font-size="18" font-weight="600">${accent}</text>
  <rect x="120" y="240" width="520" height="280" rx="24" fill="${card}" stroke="${primary}33" stroke-width="2"/>
  <text x="150" y="280" fill="${text}" font-family="Inter, system-ui" font-size="24" font-weight="800">Surfaces & Typography</text>
  <text x="150" y="320" fill="${muted}" font-family="Inter, system-ui" font-size="16" font-weight="500">Background ${bg}</text>
  <text x="150" y="350" fill="${muted}" font-family="Inter, system-ui" font-size="16" font-weight="500">Surface ${card}</text>
  <text x="150" y="380" fill="${muted}" font-family="Inter, system-ui" font-size="16" font-weight="500">Text ${text}</text>
  <text x="150" y="410" fill="${muted}" font-family="Inter, system-ui" font-size="16" font-weight="500">Muted ${muted}</text>
  <circle cx="220" cy="520" r="38" fill="${primary}" />
  <circle cx="320" cy="520" r="38" fill="${secondary}" />
  <circle cx="420" cy="520" r="38" fill="${accent}" />
  <circle cx="520" cy="520" r="38" fill="${base}" />
</svg>`;
};

const buildStripSvg = (theme) => {
  const brand = theme.tokens.brand ?? {};
  const foundation = theme.tokens.foundation?.neutrals ?? {};
  const primaries = [
    brand.primary,
    brand.secondary,
    brand.accent,
    theme.baseColor,
    foundation['neutral-2'],
    foundation['neutral-4'],
    foundation['neutral-6'],
    foundation['neutral-8'],
  ].filter(Boolean);

  const swatches = primaries.slice(0, 8).map((color) => normalizeHex(color));
  const rects = swatches.map((color, idx) => {
    const x = 40 + idx * 170;
    return `<g>
      <rect x="${x}" y="80" width="140" height="240" rx="22" fill="${color}" />
      <text x="${x + 70}" y="340" fill="#0f172a" font-family="Inter, system-ui" font-size="14" font-weight="700" text-anchor="middle">${color.toUpperCase()}</text>
    </g>`;
  }).join('\\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1500" height="420" viewBox="0 0 1500 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="1500" height="420" rx="32" fill="#f8fafc" />
  <text x="60" y="60" fill="#0f172a" font-family="Inter, system-ui" font-size="22" font-weight="800">${escapeXml(theme.name)} • Swatch Strip</text>
  ${rects}
</svg>`;
};

const getPrintTimestamps = () => {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return { date, dateTime: `${date} ${time}` };
};

const orderedSwatchSpec = [
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

const buildOrderedStack = (tokens) => orderedSwatchSpec
  .map((item) => {
    const resolved = readTokenValue(tokens, item.path) ?? (item.fallbackPath ? readTokenValue(tokens, item.fallbackPath) : item.fallbackValue ?? null);
    if (resolved === null || resolved === undefined) return null;
    return { name: item.name, path: item.path, value: resolved };
  })
  .filter(Boolean);

// --- Token Generation Logic ---

const generateTokens = (baseColor, mode, isDark, apocalypseIntensity = 100) => {
  const meatMode = baseColor.toLowerCase() === '#beefbeef';
  const normalizedBase = meatMode
    ? '#beefbe'
    : (baseColor.length === 9 && baseColor.startsWith('#') ? baseColor.slice(0, 7) : baseColor);
  const hsl = hexToHsl(normalizedBase);
  const isApocalypse = mode === 'Apocalypse';
  const intensity = isApocalypse ? (Math.max(20, Math.min(150, apocalypseIntensity)) / 100) : 1;
  
  // Harmony Offsets & saturation tweaks tuned for clearer stylistic separation
  const harmony = {
    Monochromatic: { secH: 0, accH: 0, secSat: 0.92, accSat: 1.0, surfaceMix: 0, backgroundMix: 0 },
    Analogous: { secH: -20, accH: 20, secSat: 0.98, accSat: 1.05, surfaceMix: 0.35, backgroundMix: 0.25 },
    Complementary: { secH: 180, accH: 180, secSat: 1.05, accSat: 1.1, surfaceMix: 0.28, backgroundMix: 0.22 },
    Tertiary: { secH: 120, accH: -120, secSat: 0.96, accSat: 1.08, surfaceMix: 0.32, backgroundMix: 0.24 },
    Apocalypse: { secH: 180, accH: 180, secSat: 2.0 * intensity, accSat: 2.2 * intensity, surfaceMix: Math.min(0.6, 0.45 * intensity), backgroundMix: Math.min(0.55, 0.35 * intensity) },
  }[mode] ?? { secH: 0, accH: 0, secSat: 0.92, accSat: 1.0, surfaceMix: 0, backgroundMix: 0 };
  const { secH, accH, secSat, accSat, surfaceMix, backgroundMix } = harmony;

  // --- Light/Dark Logic Inversion ---
  // In Dark mode, surfaces are dark (L ~ 10-20), Text is light (L ~ 80-90)
  // In Light mode, surfaces are light (L ~ 95-100), Text is dark (L ~ 10-20)
  
  const bgL = isApocalypse ? (isDark ? 2 : 99) : (isDark ? 10 : 98); // Page Background
  const surfaceL = isApocalypse ? (isDark ? 6 : 98) : (isDark ? 16 : 93); // Cards (light mode keeps tint; avoid pure white)
  const textMainL = isApocalypse ? (isDark ? 98 : 8) : (isDark ? 95 : 10);
  const textMutedL = isApocalypse ? (isDark ? 70 : 35) : (isDark ? 65 : 40);
  const borderL = isApocalypse ? (isDark ? 10 : 88) : (isDark ? 25 : 90);
  
  // Balance tint between modes: use a shared base, then boost light mode so it matches dark-mode intensity at higher lightness
  const baseSurfaceSat = isApocalypse
    ? Math.max(32, Math.min(82, hsl.s * 0.8))
    : Math.max(14, Math.min(56, hsl.s * 0.42));
  const gammaLightSat = Math.pow(baseSurfaceSat / 100, 1.02) * 100; // Small curve to hold perceived saturation at high lightness
  const surfaceSat = isDark
    ? baseSurfaceSat
    : Math.min(isApocalypse ? 88 : 72, Math.max(24, gammaLightSat * (isApocalypse ? 1.8 : 1.45)));

  // Primary colors often need to be lighter in dark mode to stand out against dark bg
  const brandLightness = isApocalypse ? (isDark ? 75 : 52) : (isDark ? 60 : 50); 
  const accentLightness = isApocalypse ? (isDark ? 78 : 56) : (isDark ? 65 : 55);
  const ctaLightness = isApocalypse ? (isDark ? 78 : 54) : (isDark ? 62 : 52);
  const ctaHoverLightness = isApocalypse ? (isDark ? 82 : 50) : (isDark ? 68 : 48);

  // Normalize saturation across hues for a more even visual balance
  const satNormalizer = isApocalypse ? (isDark ? 1.35 : 1.5) : (isDark ? 0.92 : 0.86);
  const primarySat = isApocalypse ? 1.5 : 0.9;
  const secondarySat = secSat * satNormalizer;
  const accentSat = accSat * satNormalizer;

  // Define Palette Bases
  const primary = getColor(hsl, 0, primarySat, brandLightness); 
  const secondary = getColor(hsl, secH, secondarySat * 0.96, brandLightness);
  const accent = getColor(hsl, accH, accentSat * 0.9, accentLightness);
  const accentStrong = getColor(hsl, accH, (accentSat * 0.9) + 0.04, accentLightness + 5);
  const cta = getColor(hsl, accH, (accentSat * 0.88) + 0.02, ctaLightness);
  const ctaHover = getColor(hsl, accH, (accentSat * 0.88) + 0.05, ctaHoverLightness);
  const gradientStart = getColor(hsl, 0, 1, isDark ? brandLightness + 5 : brandLightness + 8);
  const gradientEnd = getColor(hsl, accH, accentSat * 0.9, isDark ? brandLightness - 4 : brandLightness - 2);

  // Neutrals (Tinted by hue)
  const surfaceHue = blendHue(hsl.h, secH, surfaceMix);
  const backgroundHue = blendHue(hsl.h, accH, backgroundMix);
  const backgroundBase = { h: backgroundHue, s: surfaceSat * (isDark ? 0.85 : 1.2), l: bgL };
  const surfaceBase = { h: surfaceHue, s: surfaceSat, l: bgL };
  const neutralColor = (lightness, satMult = 0.3) =>
    getColor({ h: backgroundHue, s: surfaceSat * satMult, l: lightness }, 0, 1, lightness);
  const neutralSteps = isDark
    ? (isApocalypse ? [94, 80, 64, 50, 40, 30, 18, 10, 6, 3] : [96, 88, 78, 68, 55, 45, 32, 22, 14, 8])
    : (isApocalypse ? [100, 98, 94, 84, 70, 56, 40, 28, 16, 8] : [100, 96, 90, 78, 66, 52, 38, 26, 16, 10]);

  // Functional Colors
  // In dark mode, error/success often need to be slightly pastel to be readable
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

  const tokens = {
    foundation: {
      hue: hsl.h,
      neutrals: meatMode ? {
        "neutral-0": "#ffd7e0", // rosé
        "neutral-1": "#ffb3c4",
        "neutral-2": "#ff8aa3",
        "neutral-3": "#ff5b79",
        "neutral-4": "#e63a52",
        "neutral-5": "#c2203b", // blood
        "neutral-6": "#991a32",
        "neutral-7": "#6e1326",
        "neutral-8": "#470d1b",
        "neutral-9": "#f5ede2", // bone
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
        "accent-1": getColor(hsl, accH, 0.8 * satNormalizer, isDark ? 70 : 62),
        "accent-2": getColor(hsl, accH + 8, 0.95 * satNormalizer, isDark ? 62 : 56),
        "accent-3": getColor(hsl, accH - 10, 1.05 * satNormalizer, isDark ? 54 : 50),
        "accent-ink": getColor(hsl, accH - 18, 1.08 * satNormalizer, isDark ? 38 : 34),
      },
      status: {
        success,
        warning,
        error,
        info,
      },
    },

    // --- Core Brand ---
    brand: {
      primary: primary,
      secondary: secondary,
      accent: accent,
      "accent-strong": accentStrong,
      "cta": cta,
      "cta-hover": ctaHover,
      "gradient-start": gradientStart,
      "gradient-end": gradientEnd,
      "link-color": getColor(hsl, accH, 1, isDark ? 70 : 45), // Lighter link in dark mode
      "focus-ring": getColor(hsl, accH, 1, isDark ? 40 : 70),
    },

    // --- Typography ---
    typography: {
      "heading": getColor(hsl, 0, 0.1, textMainL),
      "text-strong": getColor(hsl, 0, 0.1, isDark ? 90 : 15),
      "text-body": getColor(hsl, 0, 0.1, isDark ? 80 : 25),
      "text-muted": getColor(hsl, 0, 0.1, textMutedL),
      "text-hint": getColor(hsl, 0, 0.2, isDark ? 50 : 60),
      "text-disabled": getColor(hsl, 0, 0.1, isDark ? 30 : 80),
      "text-accent": getColor(hsl, accH, 1, isDark ? 75 : 40),
      "text-accent-strong": getColor(hsl, accH, 1, isDark ? 85 : 30),
      "footer-text": getColor(hsl, 0, 0.1, isDark ? 60 : 85),
      "footer-text-muted": getColor(hsl, 0, 0.1, isDark ? 40 : 60),
    },
    textPalette: {
      "text-primary": getColor(hsl, 0, 0.1, isDark ? 92 : 18),
      "text-secondary": getColor(hsl, 0, 0.1, isDark ? 86 : 24),
      "text-tertiary": getColor(hsl, 0, 0.1, isDark ? 78 : 32),
      "text-hint": getColor(hsl, 0, 0.2, isDark ? 60 : 50),
      "text-disabled": getColor(hsl, 0, 0.1, isDark ? 38 : 80),
      "text-accent": getColor(hsl, accH, 1, isDark ? 75 : 40),
      "text-accent-strong": getColor(hsl, accH, 1, isDark ? 85 : 30),
      "link-color": getColor(hsl, accH, 1, isDark ? 70 : 45),
    },

    // --- Borders ---
    borders: {
      "border-subtle": getColor(surfaceBase, 0, 0.9, borderL),
      "border-strong": getColor(surfaceBase, 0, 0.9, isDark ? borderL + 12 : borderL - 12),
      "border-accent-subtle": getColor(hsl, accH, 0.15, isDark ? borderL + 5 : borderL - 5),
      "border-accent-medium": getColor(hsl, accH, 0.25, isDark ? borderL + 10 : borderL - 10),
      "border-accent-strong": getColor(hsl, accH, 0.35, isDark ? borderL + 18 : borderL - 18),
      "border-accent-hover": getColor(hsl, accH, 0.4, isDark ? borderL + 22 : borderL - 22),
    },

    // --- Backgrounds & Surfaces ---
    surfaces: {
      "background": getColor(backgroundBase, 0, 1, bgL),
      "page-background": getColor(backgroundBase, 0, 1, isDark ? bgL - 2 : bgL - 2),
      "header-background": getColor(backgroundBase, 0, 1, isDark ? bgL + 2 : 99),
      "surface-plain": getColor(surfaceBase, 0, 1, surfaceL),
      "surface-plain-border": getColor(surfaceBase, 0, 1, borderL),
    },

    // --- Cards & Panels ---
    cards: {
      "card-panel-surface": getColor(surfaceBase, 0, 1, surfaceL),
      "card-panel-surface-strong": getColor(surfaceBase, 0, 1, isDark ? surfaceL + 5 : 97),
      "card-panel-border": getColor(surfaceBase, 0, 1, borderL),
      "card-panel-border-soft": getColor(surfaceBase, 0, 1, isDark ? borderL - 5 : 95),
      "card-panel-border-strong": getColor(surfaceBase, 0, 1, isDark ? borderL + 15 : 85),
      "card-tag-bg": getColor(hsl, 0, 0.2, isDark ? 20 : 94),
      "card-tag-text": getColor(hsl, 0, 0.4, isDark ? 80 : 30),
      "card-tag-border": getColor(hsl, 0, 0.2, isDark ? 30 : 85),
    },

    // --- Glass Layers (Simulated) ---
    // In dark mode, glass is usually a light white tint with low opacity
    // In light mode, glass is usually a white tint or dark tint depending on design
    glass: {
      "glass-surface": getColor(hsl, 0, 0.1, isDark ? 20 : 95),
      "glass-surface-strong": getColor(hsl, 0, 0.1, isDark ? 30 : 90),
      "glass-border": getColor(hsl, 0, 0.1, isDark ? 35 : 85),
      "glass-border-strong": getColor(hsl, 0, 0.2, isDark ? 45 : 80),
      "glass-hover": getColor(hsl, accH, 0.3, isDark ? 25 : 95),
      "glass-shadow": getColor(hsl, 0, 0.3, isDark ? 5 : 80), // Shadows are dark in both, but deeper in dark mode
      "glass-highlight": getColor(hsl, 0, 0, isDark ? 30 : 99),
      "glass-glow": getColor(hsl, accH, 0.5, isDark ? 28 : 72),
      "glass-shadow-soft": isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.1)',
      "glass-shadow-strong": isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.18)',
      "glass-blur": glassBlur,
      "glass-noise-opacity": glassNoiseOpacity,
    },

    // --- Entity Special ---
    entity: {
      "entity-card-surface": getColor(hsl, secH, 0.15, isDark ? 18 : 98),
      "entity-card-border": getColor(hsl, secH, 0.2, isDark ? 35 : 85),
      "entity-card-glow": getColor(hsl, secH, 0.6, isDark ? 25 : 90), // Glows are darker in value but act as light sources in dark mode
      "entity-card-highlight": getColor(hsl, secH, 0.4, isDark ? 30 : 95),
      "entity-card-heading": getColor(hsl, secH, 0.5, isDark ? 80 : 20),
    },

    // --- The "Named" Palette (Swatches) ---
    // These need to shift meaning slightly. 
    // "Midnight" is always dark. "Fog" is always light.
    // However, their USE changes.
    named: {
      "color-midnight": getColor(hsl, 0, 0.8, 10),  // Always Dark
      "color-night": getColor(hsl, 10, 0.6, 15),    // Always Dark
      "color-dusk": getColor(hsl, secH, 0.4, 30),   // Always Darkish
      "color-ink": getColor(hsl, 0, 0.1, 20),       // Always Dark
      "color-amethyst": getColor(hsl, accH, 0.7, 60), 
      "color-iris": getColor(hsl, accH, 0.9, 75),     
      "color-gold": getColor(hsl, 45, 0.8, 60),     
      "color-rune": getColor(hsl, secH, 0.6, 85),   // Always Light
      "color-fog": getColor(hsl, 0, 0.1, 90),       // Always Light
    },

    // --- Status ---
    status: {
      "success": success,
      "warning": warning,
      "error": error,
      "info": info,
      "success-strong": statusStrong.success,
      "warning-strong": statusStrong.warning,
      "error-strong": statusStrong.error,
    },

    // --- Admin Palette ---
    admin: {
      "admin-surface-base": getColor(backgroundBase, 0, 1, isDark ? bgL + 6 : 99),
      "admin-accent": getColor(hsl, accH, 0.95, isDark ? 64 : 54),
    },

    // --- Back-Compat Aliases ---
    aliases: {
      "surface-panel-primary": getColor(surfaceBase, 0, 1, surfaceL),
      "surface-panel-secondary": getColor(surfaceBase, 0, 1, isDark ? surfaceL + 4 : surfaceL - 2),
      "surface-card-hover": getColor(surfaceBase, 0, 1, isDark ? surfaceL + 6 : surfaceL - 4),
      "surface-muted": getColor(surfaceBase, 0, 1, isDark ? surfaceL - 2 : surfaceL + 2),
      "border-purple-subtle": getColor(hsl, accH, 0.25, borderL),
      "border-purple-medium": getColor(hsl, accH, 0.35, isDark ? borderL + 8 : borderL - 8),
      "border-accent-subtle": getColor(hsl, accH, 0.2, isDark ? borderL + 5 : borderL - 5),
      "border-accent-medium": getColor(hsl, accH, 0.35, isDark ? borderL + 10 : borderL - 10),
      "border-accent-strong": getColor(hsl, accH, 0.5, isDark ? borderL + 18 : borderL - 18),
      "border-accent-hover": getColor(hsl, accH, 0.6, isDark ? borderL + 22 : borderL - 22),
      "text-subtle": getColor(hsl, 0, 0.1, textMutedL),
      "text-accent-strong": getColor(hsl, accH, 1.05, isDark ? 88 : 34),
      "accent-purple-strong": accentStrong,
      "accent-purple-soft": getColor(hsl, accH, 0.7, isDark ? 75 : 70),
      "overlay-panel": getColor(surfaceBase, 0, 1, isDark ? surfaceL + 2 : surfaceL),
      "overlay-panel-strong": getColor(surfaceBase, 0, 1, isDark ? surfaceL + 6 : surfaceL - 2),
      "focus-ring": getColor(hsl, accH, 1, isDark ? 40 : 70),
      "shadow-card": isDark ? '0 20px 50px -20px rgba(0,0,0,0.55)' : '0 12px 30px -18px rgba(0,0,0,0.15)',
      "shadow-card-hover": isDark ? '0 24px 60px -22px rgba(0,0,0,0.6)' : '0 14px 40px -20px rgba(0,0,0,0.2)',
      "chip-background": getColor(surfaceBase, 0, 1, isDark ? surfaceL - 2 : surfaceL + 2),
      "chip-border": getColor(surfaceBase, 0, 1, isDark ? borderL + 6 : borderL - 6),
    },

    // --- Dawn (Light) Overrides ---
    dawn: {
      "surface-base": getColor({ h: backgroundHue, s: Math.max(surfaceSat * 0.55, 10), l: 98 }, 0, 1, 98),
      "surface-panel": getColor({ h: backgroundHue, s: Math.max(surfaceSat * 0.55, 10), l: 98 }, 0, 1, 98),
      "surface-card": getColor({ h: backgroundHue, s: Math.max(surfaceSat * 0.6, 12), l: 97 }, 0, 1, 97),
      "surface-elevated": getColor({ h: backgroundHue, s: Math.max(surfaceSat * 0.6, 12), l: 96 }, 0, 1, 96),
      "surface-hover": getColor({ h: backgroundHue, s: Math.max(surfaceSat * 0.5, 10), l: 94 }, 0, 1, 94),
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

  return tokens;
};

const addPrintMode = (tokensObj, baseColorInput, modeName, isDark) => {
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
    'coat/gloss-overlay': { type: 'color', value: 'rgba(0,0,0,0.04)' }, // fake spot gloss
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

const ColorSwatch = ({ name, color }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(color ?? ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isColorString = (val) => typeof val === 'string' && (
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(val) ||
    /^rgba?\(/i.test(val) ||
    /^hsla?\(/i.test(val)
  );

  const isDark = (c) => {
    if(!c || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return false;
    const rgb = parseInt(c.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; 
    return luma < 120;
  };

  const displayColor = typeof color === 'string' ? color : String(color ?? '');
  const swatchBg = isColorString(color) ? color : '#f8fafc';

  return (
    <div 
      onClick={handleCopy}
      className={`group cursor-pointer flex items-center justify-between p-2 rounded-md transition-all hover:scale-[1.02] active:scale-95 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm`}
    >
      <div className="flex items-center gap-3 w-full">
        <div 
          className="h-10 w-10 rounded-full border border-black/10 shadow-inner flex items-center justify-center shrink-0"
          style={{ backgroundColor: swatchBg }}
        >
          {copied && <Check size={16} className={isDark(color) ? "text-white" : "text-black"} />}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{name}</span>
          <span className="text-sm font-mono text-slate-700 dark:text-slate-200 truncate">{displayColor}</span>
        </div>
      </div>
      <Copy size={14} className="opacity-0 group-hover:opacity-30 text-slate-500" />
    </div>
  );
};

const Section = ({ title, icon, children }) => (
  <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
      {icon}
      <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-sm">{title}</h3>
    </div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {children}
    </div>
  </div>
);

const PaletteRow = ({ title, colors }) => (
  <div className="p-4 rounded-lg border shadow-sm bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm border-slate-200/70 dark:border-slate-800/70">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{title}</span>
      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{colors.length} swatches</span>
    </div>
    <div className="flex gap-1 mb-3">
      {colors.map(({ name, color }, index) => (
        <div 
          key={`${name}-${index}`}
          className="flex-1 h-8 rounded-sm border shadow-inner"
          style={{ backgroundColor: color, borderColor: 'rgba(0,0,0,0.08)' }}
          title={`${name}: ${color}`}
        />
      ))}
    </div>
    <div className="flex flex-wrap gap-2">
      {colors.map(({ name, color }, index) => (
        <span 
          key={`${name}-${index}`}
          className="text-[11px] px-2 py-1 rounded-full border"
          style={{ borderColor: color, color }}
        >
          {name}
        </span>
      ))}
    </div>
  </div>
);

// --- Presets ---
const presets = [
  { name: 'Midnight Indigo', base: '#6366f1', mode: 'Monochromatic', dark: true },
  { name: 'Solar Flare', base: '#f59e0b', mode: 'Analogous', dark: false },
  { name: 'Beef Ritual', base: '#beefbe', mode: 'Monochromatic', dark: true },
  { name: 'Corporate Compliance', base: '#000000', mode: 'Monochromatic', dark: true },
];

export default function App() {
  const [baseColor, setBaseColor] = useState('#6366f1');
  const [mode, setMode] = useState('Monochromatic');
  const [isDark, setIsDark] = useState(false); // Controls the GENERATED tokens
  const [printMode, setPrintMode] = useState(false);
  const [customThemeName, setCustomThemeName] = useState('');
  const [showContrast, setShowContrast] = useState(true);
  const [apocalypseIntensity, setApocalypseIntensity] = useState(100);
  const [isExportingAssets, setIsExportingAssets] = useState(false);
  const [printMeta, setPrintMeta] = useState(() => getPrintTimestamps());
  const savedTitleRef = useRef('');
  const pickerColor = baseColor.length === 9 && baseColor.startsWith('#') ? baseColor.slice(0, 7) : baseColor;
  // Controls the UI theme (preview background)
  // Usually we want this to sync with generated tokens for best preview, but nice to keep separate for inspection
  // For this UX, I will sync them. When you generate Dark Tokens, the UI becomes dark.
  
  const sanitizeColorInput = useCallback((value, fallback) => {
    if (typeof value !== 'string') return fallback;
    const match = value.match(/#[0-9a-fA-F]{3,8}/);
    if (match) {
      const hex = match[0];
      if (hex.length === 4 || hex.length === 7 || hex.length === 9) return hex;
      if (hex.length > 7) return hex.slice(0, 7);
    }
    return fallback;
  }, []);

  const autoThemeName = useMemo(() => `${mode} ${isDark ? 'Dark' : 'Light'}`, [mode, isDark]);
  const displayThemeName = customThemeName || autoThemeName;
  const tokens = useMemo(() => generateTokens(baseColor, mode, isDark, mode === 'Apocalypse' ? apocalypseIntensity : 100), [baseColor, mode, isDark, apocalypseIntensity]);
  const finalTokens = useMemo(
    () => (printMode ? addPrintMode(tokens, baseColor, mode, isDark) : tokens),
    [tokens, printMode, baseColor, mode, isDark]
  );
  const currentTheme = useMemo(() => ({
    name: displayThemeName,
    mode,
    isDark,
    baseColor,
    tokens: finalTokens,
    printMode,
  }), [displayThemeName, mode, isDark, baseColor, finalTokens, printMode]);
  const orderedStack = useMemo(() => buildOrderedStack(finalTokens), [finalTokens]);
  const orderedSwatches = useMemo(
    () => orderedStack.map(({ name, value }) => ({ name, color: value })),
    [orderedStack]
  );
  const printAssetPack = useMemo(() => ([
    { icon: <Image size={14} />, name: 'Palette card', files: 'palette-card.svg + palette-card.png', note: 'Hero palette overview built from the print palette.' },
    { icon: <Image size={14} />, name: 'Swatch strip', files: 'swatch-strip.svg + swatch-strip.png', note: '8-swatch strip for quick brand references.' },
    { icon: <FileText size={14} />, name: 'Tokens JSON', files: 'tokens.json', note: 'Penpot-ready tokens including the print layer & foil markers.' },
  ]), []);
  const canvaPrintHexes = useMemo(() => {
    const readColor = (path, fallback) => {
      const val = finalTokens.print?.[path]?.value ?? fallback;
      return typeof val === 'string' ? normalizeHex(val, val) : null;
    };
    const baseList = [
      { name: 'Primary', path: 'brand/primary', fallback: tokens.brand.primary },
      { name: 'Secondary', path: 'brand/secondary', fallback: tokens.brand.secondary },
      { name: 'Accent', path: 'brand/accent', fallback: tokens.brand.accent },
      { name: 'CTA', path: 'brand/cta', fallback: tokens.brand.cta },
      { name: 'Background', path: 'surfaces/background', fallback: tokens.surfaces["background"] },
      { name: 'Surface', path: 'cards/card-panel-surface', fallback: tokens.cards["card-panel-surface"] },
      { name: 'Text', path: 'typography/text-strong', fallback: tokens.typography["text-strong"] },
      { name: 'Muted Text', path: 'typography/text-muted', fallback: tokens.typography["text-muted"] },
    ];
    return baseList.map((entry) => ({ name: entry.name, color: readColor(entry.path, entry.fallback) }))
      .filter(({ color }) => Boolean(color));
  }, [finalTokens, tokens]);
  const paletteRows = useMemo(() => ([
    { 
      title: 'Foundation Neutrals', 
      colors: Object.entries(tokens.foundation.neutrals).map(([name, color]) => ({ name, color }))
    },
    { 
      title: 'Foundation Accents', 
      colors: Object.entries(tokens.foundation.accents).map(([name, color]) => ({ name, color }))
    },
    { 
      title: 'Brand Core', 
      colors: ['primary', 'secondary', 'accent', 'accent-strong', 'cta', 'cta-hover'].map((key) => ({ name: key, color: tokens.brand[key] })).filter(({ color }) => Boolean(color))
    },
    { 
      title: 'Text Palette', 
      colors: ['heading', 'text-strong', 'text-body', 'text-muted', 'text-accent', 'text-accent-strong'].map((key) => ({ name: key, color: tokens.typography[key] })).filter(({ color }) => Boolean(color))
    },
    { 
      title: 'Status & Feedback', 
      colors: Object.entries(tokens.status).map(([name, color]) => ({ name, color }))
    }
  ]), [tokens]);


  const contrastChecks = useMemo(() => {
    const bg = finalTokens.surfaces.background;
    const card = finalTokens.cards['card-panel-surface'];
    const textStrong = finalTokens.typography['text-strong'];
    const textBody = finalTokens.typography['text-body'];
    const textMuted = finalTokens.typography['text-muted'];
    return [
      { label: 'Text on Background', fg: textStrong, bg, ratio: getContrastRatio(textStrong, bg) },
      { label: 'Text on Card', fg: textBody, bg: card, ratio: getContrastRatio(textBody, card) },
      { label: 'Muted on Card', fg: textMuted, bg: card, ratio: getContrastRatio(textMuted, card) },
    ];
  }, [finalTokens]);

  const applyPreset = useCallback((presetName) => {
    const p = presets.find((x) => x.name === presetName);
    if (!p) return;
    setBaseColor(p.base);
    setMode(p.mode);
    setIsDark(p.dark);
    setCustomThemeName(p.name);
  }, []);

  const randomize = useCallback(() => {
    const hues = ['#ef4444', '#f59e0b', '#84cc16', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
    const modes = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
    const nextBase = hues[Math.floor(Math.random() * hues.length)];
    const nextMode = modes[Math.floor(Math.random() * modes.length)];
    const nextDark = Math.random() > 0.5;

    setBaseColor(nextBase);
    setMode(nextMode);
    setIsDark(nextDark);

    if (nextMode === 'Apocalypse') {
      setApocalypseIntensity(Math.round(50 + Math.random() * 100));
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const updatePrintMeta = useCallback(() => {
    const next = getPrintTimestamps();
    setPrintMeta(next);
    return next;
  }, []);

  useEffect(() => {
    const handleBeforePrint = () => {
      const meta = updatePrintMeta();
      if (!savedTitleRef.current) savedTitleRef.current = document.title;
      document.title = `${displayThemeName} • ${meta.date}`;
    };
    const handleAfterPrint = () => {
      if (savedTitleRef.current) {
        document.title = savedTitleRef.current;
        savedTitleRef.current = '';
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [displayThemeName, updatePrintMeta]);

  const buildExportPayload = useCallback(() => buildPenpotPayload(
    finalTokens,
    orderedStack,
    {
      themeName: displayThemeName,
      mode,
      baseColor,
      isDark,
      printMode,
      generatedAt: new Date().toISOString(),
    }
  ), [finalTokens, orderedStack, displayThemeName, mode, baseColor, isDark, printMode]);

  const exportJson = (filename) => {
    const penpotPayload = buildExportPayload();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(penpotPayload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportWitchcraftJson = (filename) => {
    const witchcraftPayload = buildWitchcraftPayload(finalTokens, displayThemeName, mode, isDark);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(witchcraftPayload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportAllAssets = useCallback(async () => {
    setIsExportingAssets(true);
    try {
      const slug = (currentTheme.name || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'theme';
      const paletteSvg = buildPaletteCardSvg(currentTheme);
      const stripSvg = buildStripSvg(currentTheme);
      const [palettePng, stripPng] = await Promise.all([
        renderPaletteCardPng(currentTheme),
        renderStripPng(currentTheme),
      ]);

      const files = [
        { name: `${slug}/palette-card.svg`, data: encodeText(paletteSvg) },
        { name: `${slug}/palette-card.png`, data: palettePng },
        { name: `${slug}/swatch-strip.svg`, data: encodeText(stripSvg) },
        { name: `${slug}/swatch-strip.png`, data: stripPng },
        { name: `${slug}/tokens.json`, data: encodeText(JSON.stringify(buildExportPayload(), null, 2)) },
      ];

      const tarData = createTarArchive(files);
      const blob = new Blob([tarData], { type: 'application/x-tar' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${slug}-asset-pack.tar`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Asset export failed. Check console for details.');
      console.error('Asset export failed', err);
    } finally {
      setIsExportingAssets(false);
    }
  }, [buildExportPayload, currentTheme]);

  const handleExportPdf = () => {
    const meta = updatePrintMeta();
    const originalTitle = document.title;
    savedTitleRef.current = originalTitle;
    document.title = `${displayThemeName} • ${meta.date}`;
    window.print();
    setTimeout(() => {
      if (savedTitleRef.current) {
        document.title = savedTitleRef.current;
        savedTitleRef.current = '';
      }
    }, 200);
  };

  return (
    <div 
      className={`min-h-screen transition-colors duration-500 ${isDark ? 'dark' : ''}`}
      style={{
        backgroundColor: printMode ? '#fdfdf9' : tokens.surfaces["page-background"],
        backgroundImage: printMode
          ? 'radial-gradient(circle at 25% 25%, #f0f0f0 1px, transparent 1px), radial-gradient(circle at 75% 75%, #e0e0e0 1px, transparent 1px)'
          : 'none',
        backgroundSize: printMode ? '40px 40px' : 'auto',
      }}
    >
      <div 
        className="hidden print:flex items-start justify-between gap-6 max-w-7xl mx-auto px-6 py-4 mb-4 rounded-xl border print-header"
        style={{ 
          backgroundColor: tokens.cards["card-panel-surface"],
          color: tokens.typography["text-strong"],
          borderColor: tokens.cards["card-panel-border"]
        }}
      >
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Theme</p>
          <p className="text-lg font-bold leading-tight">{displayThemeName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300 opacity-80">Base color: {baseColor.toUpperCase()}</p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Mode</p>
          <p className="text-sm font-bold">{mode}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300 opacity-80">{printMeta.dateTime}</p>
        </div>
      </div>

      {/* Header */}
      <header 
        className="sticky top-0 z-20 backdrop-blur-md border-b"
        style={{ 
          backgroundColor: tokens.surfaces["header-background"] + 'CC',
          borderColor: tokens.surfaces["surface-plain-border"]
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${tokens.brand["gradient-start"]} 0%, ${tokens.brand.secondary} 50%, ${tokens.brand["gradient-end"]} 100%)`,
                  boxShadow: `0 10px 30px -10px ${tokens.brand.primary}99`
                }}
              >
                <Palette className="text-white drop-shadow-sm" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">Token Gen</h1>
                <p className="text-xs text-slate-500 font-medium">Design System Palette Generator</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Color Input */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <input 
                  type="color" 
                  value={pickerColor} 
                  onChange={(e) => setBaseColor(sanitizeColorInput(e.target.value, baseColor))}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-none outline-none" 
                />
                <input 
                  type="text" 
                  value={baseColor}
                  onChange={(e) => setBaseColor(sanitizeColorInput(e.target.value, baseColor))}
                  className="w-32 bg-transparent text-sm font-mono text-slate-700 dark:text-slate-300 outline-none uppercase"
                />
              </div>


              {/* Theme Name */}
              <input
                type="text"
                value={customThemeName}
                onChange={(e) => setCustomThemeName(e.target.value)}
                placeholder={autoThemeName}
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              />

              {/* Presets */}
              <select
                onChange={(e) => applyPreset(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                defaultValue=""
              >
                <option value="" disabled>Presets…</option>
                {presets.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={randomize}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Randomize"
              >
                <Shuffle size={18} />
              </button>

              {/* Mode Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      mode === m 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              
              {mode === 'Apocalypse' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Intensity</span>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    value={apocalypseIntensity}
                    onChange={(e) => setApocalypseIntensity(Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-xs w-10 text-right font-mono text-slate-600 dark:text-slate-300">{apocalypseIntensity}%</span>
                </div>
              )}

{/* Dark/Light Toggle */}
               <button 
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
              >
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
                <span className="text-xs font-bold">{isDark ? "Dark Mode" : "Light Mode"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowContrast((v) => !v)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                title="Toggle contrast diagnostics"
              >
                {showContrast ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={printMode} 
                    onChange={(e) => setPrintMode(e.target.checked)} 
                    className="accent-indigo-500 h-4 w-4"
                  />
                  <span>Print Mode (CMYK-safe + foil tokens)</span>
                </label>
                <button 
                  onClick={() => exportJson(`${displayThemeName}${printMode ? '-PRINT' : ''}.json`)}
                  className="px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
                  style={{ 
                    backgroundColor: tokens.brand["cta"],
                    color: tokens.typography["text-strong"],
                    borderColor: tokens.brand["cta-hover"]
                  }}
                >
                  <Download size={14} />
                  {printMode ? 'Export Penpot PRINT json' : 'Export Penpot json'}
                </button>
                <button 
                  onClick={() => exportWitchcraftJson(`witchcraft-theme.json`)}
                  className="px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all border flex items-center gap-2"
                  style={{ 
                    backgroundColor: tokens.brand["cta"],
                    color: tokens.typography["text-strong"],
                    borderColor: tokens.brand["cta-hover"]
                  }}
                >
                  <Download size={14} />
                  Export Witchcraft Theme json
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <button 
          onClick={exportAllAssets}
          disabled={isExportingAssets}
          className="print:hidden fixed bottom-20 right-6 z-50 px-8 py-5 rounded-2xl shadow-2xl hover:scale-110 transition-all font-bold text-2xl flex items-center gap-4 backdrop-blur-xl"
          style={{ 
            backgroundColor: tokens.brand.primary,
            color: '#fff',
            boxShadow: `0 20px 50px -20px ${tokens.brand.primary}`
          }}
        >
          <Wand2 size={32} />
          {isExportingAssets ? 'Building assets…' : (printMode ? 'FORGE THE RELICS (Print + Foil Pack)' : 'BIRTH THE ASSETS (SVG + PNG pack)')}
        </button>

        <button
          type="button"
          onClick={handleExportPdf}
          className="print:hidden fixed bottom-6 right-6 z-30 px-4 py-3 rounded-full shadow-xl hover:translate-y-[-2px] active:translate-y-[1px] transition-all border flex items-center gap-2 text-sm font-semibold"
          style={{ 
            backgroundColor: tokens.brand.primary,
            color: tokens.typography["text-strong"],
            borderColor: tokens.brand["cta-hover"],
            boxShadow: `0 18px 40px -18px ${tokens.brand.primary}`
          }}
          aria-label="Export palette as PDF"
        >
          <Download size={16} />
          Export PDF
        </button>

        {showContrast && (
          <div className="print:hidden mb-10 max-w-7xl mx-auto">
            <div className="p-6 rounded-2xl border shadow-sm bg-white/80 dark:bg-slate-900/60 backdrop-blur"
              style={{ borderColor: finalTokens.cards["card-panel-border"] }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Live WCAG Contrast Checks</h3>
                <div className="text-[11px] px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  Based on your current tokens
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {contrastChecks.map((c) => {
                  const badge = getWCAGBadge(c.ratio);
                  return (
                    <div key={c.label} className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{c.label}</div>
                      <div className="text-2xl font-bold my-2 text-slate-900 dark:text-white">{c.ratio.toFixed(2)}:1</div>
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${badge.color}`}>{badge.text}</div>
                      <div className="mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {c.fg.toUpperCase()} on {c.bg.toUpperCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {printMode && (
          <div 
            className="print:hidden mb-10 p-6 rounded-2xl border shadow-sm bg-amber-50/80 dark:bg-slate-900/60 backdrop-blur-sm"
            style={{ 
              borderColor: tokens.cards["card-panel-border"],
              boxShadow: `0 12px 40px -24px ${tokens.brand.primary}`
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Printer size={16} />
                  <span>Print asset pack preview</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  With Print Mode enabled, exports stay CMYK-safe and add foil + ink tokens. The tarball will include:
                </p>
                <div className="space-y-2">
                  {printAssetPack.map((item) => (
                    <div 
                      key={item.name}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-white/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <div className="mt-0.5 text-indigo-500 dark:text-indigo-300">
                        {item.icon}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.name}</div>
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.files}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{item.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Palette size={16} />
                  <span>Brand hex set for Canva</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Click any swatch to copy the print-tuned hex values for quick brand kits in Canva.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {canvaPrintHexes.map(({ name, color }) => (
                    <ColorSwatch key={name} name={name} color={color} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div 
          className="mb-12 p-6 rounded-2xl border shadow-sm bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm"
          style={{ 
            borderColor: tokens.cards["card-panel-border"]
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Ordered token stack</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Aligned to the requested handoff order for quick scanning.</p>
            </div>
            <div className="text-[11px] px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">Click swatches to copy</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {orderedSwatches.map(({ name, color }, index) => (
              <ColorSwatch key={`${name}-${index}`} name={name} color={color} />
            ))}
          </div>
        </div>
        
        {/* Swatch Preview Grid */}
        <div 
          className="mb-12 p-6 rounded-2xl border shadow-sm transition-colors duration-500"
          style={{ 
            backgroundColor: tokens.cards["card-panel-surface"],
            borderColor: tokens.cards["card-panel-border"]
          }}
        >
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Harmony Preview</h2>
              <div className="h-1 flex-1 mx-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent w-full opacity-50"></div>
              </div>
           </div>
           
           {/* Live Preview Card */}
           <div className="relative rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 shadow-2xl transition-all duration-500"
                style={{ backgroundColor: tokens.surfaces["background"] }}
           >
              {/* Fake Navigation */}
              <div className="h-12 border-b flex items-center px-4 gap-4" style={{ borderColor: tokens.surfaces["surface-plain-border"] }}>
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Sidebar Simulation */}
                  <div className="space-y-4">
                      <div className="h-8 w-3/4 rounded mb-6" style={{ backgroundColor: tokens.brand.primary, opacity: 0.2 }}></div>
                      <div className="h-4 w-full rounded" style={{ backgroundColor: tokens.typography["text-muted"], opacity: 0.1 }}></div>
                      <div className="h-4 w-5/6 rounded" style={{ backgroundColor: tokens.typography["text-muted"], opacity: 0.1 }}></div>
                      <div className="h-4 w-4/6 rounded" style={{ backgroundColor: tokens.typography["text-muted"], opacity: 0.1 }}></div>
                  </div>

                  {/* Main Card Simulation */}
                  <div className="col-span-2 p-6 rounded-lg border shadow-sm transition-colors duration-500"
                       style={{ 
                         backgroundColor: tokens.cards["card-panel-surface"],
                         borderColor: tokens.cards["card-panel-border"]
                       }}
                  >
                      <h3 className="text-2xl font-bold mb-2" style={{ color: tokens.typography["heading"] }}>Thematic Output</h3>
                      <p className="mb-6" style={{ color: tokens.typography["text-body"] }}>
                        This is a live preview of how your tokens interact. Note the contrast between the surface, the text, and the primary actions.
                      </p>
                      
                      <div className="flex gap-3">
                        <button className="px-4 py-2 rounded font-medium transition-transform active:scale-95"
                                style={{ backgroundColor: tokens.brand.primary, color: '#fff' }}>
                          Primary Action
                        </button>
                        <button className="px-4 py-2 rounded font-medium border transition-transform active:scale-95"
                                style={{ 
                                  borderColor: tokens.brand.primary, 
                                  color: tokens.brand.primary 
                                }}>
                          Secondary
                        </button>
                      </div>

                      <div className="mt-8 p-4 rounded border flex items-center gap-3"
                           style={{ 
                             backgroundColor: tokens.entity["entity-card-surface"],
                             borderColor: tokens.entity["entity-card-border"]
                           }}
                      >
                         <div className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: tokens.brand.accent, color: '#fff' }}>
                            <Check size={20} />
                         </div>
                         <div>
                           <div className="font-bold text-sm" style={{ color: tokens.entity["entity-card-heading"] }}>Entity Highlight</div>
                           <div className="text-xs opacity-70" style={{ color: tokens.typography["text-body"] }}>Unique component tokens</div>
                         </div>
                      </div>
                  </div>
              </div>
           </div>
        </div>

        {/* Cohesive Palette Overview */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Cohesive Palette</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quick scan of the main token families</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paletteRows.map((row) => (
              <PaletteRow key={row.title} title={row.title} colors={row.colors} />
            ))}
          </div>
        </div>

        {/* Token Sections */}
        <div className="space-y-2">
          
          <Section title="Foundation: Neutral Ladder" icon={<Layers size={18} className="text-slate-400" />}>
            {Object.entries(tokens.foundation.neutrals).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Foundation: Accents" icon={<Droplet size={18} className="text-slate-400" />}>
            {Object.entries(tokens.foundation.accents).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Brand & Core" icon={<Droplet size={18} className="text-slate-400" />}>
            {Object.entries(tokens.brand).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Text Palette" icon={<Type size={18} className="text-slate-400" />}>
            {Object.entries(tokens.textPalette).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Typography" icon={<Type size={18} className="text-slate-400" />}>
            {Object.entries(tokens.typography).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Borders" icon={<Grid size={18} className="text-slate-400" />}>
            {Object.entries(tokens.borders).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Surfaces & Backgrounds" icon={<Layers size={18} className="text-slate-400" />}>
            {Object.entries(tokens.surfaces).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Components: Cards & Tags" icon={<Grid size={18} className="text-slate-400" />}>
            {Object.entries(tokens.cards).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Components: Glass" icon={<Box size={18} className="text-slate-400" />}>
            {Object.entries(tokens.glass).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

           <Section title="Components: Entity" icon={<Box size={18} className="text-slate-400" />}>
            {Object.entries(tokens.entity).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Status & Feedback" icon={<Check size={18} className="text-slate-400" />}>
             {Object.entries(tokens.status).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Admin Palette" icon={<Box size={18} className="text-slate-400" />}>
            {Object.entries(tokens.admin).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Back-Compat Aliases" icon={<Box size={18} className="text-slate-400" />}>
            {Object.entries(tokens.aliases).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Dawn Overrides" icon={<Sun size={18} className="text-slate-400" />}>
            {Object.entries(tokens.dawn).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>

          <Section title="Legacy Palette" icon={<Box size={18} className="text-slate-400" />}>
            {Object.entries(tokens.named).map(([key, val]) => (
              <ColorSwatch key={key} name={key} color={val} />
            ))}
          </Section>
        </div>
      </main>
    </div>
  );
}
