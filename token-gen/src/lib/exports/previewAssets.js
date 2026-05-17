import {
  escapeXml,
  hexWithAlpha,
  normalizeHex,
} from '../colorUtils.js';
import { sanitizeThemeName } from '../appState.js';

const encoder = new TextEncoder();

export const encodeText = (str) => encoder.encode(str);

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

export const createTarArchive = (files) => {
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

export const renderPaletteCardPng = async (theme) => {
  const brand = theme.tokens.brand ?? {};
  const surfaces = theme.tokens.surfaces ?? {};
  const typography = theme.tokens.typography ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette');
  const base = normalizeHex(theme.baseColor || '#6366f1');
  const primary = normalizeHex(brand.primary || '#6366f1');
  const secondary = normalizeHex(brand.secondary || '#8b5cf6');
  const accent = normalizeHex(brand.accent || '#22d3ee');
  const bg = normalizeHex(surfaces.background || '#0b1021');
  const card = normalizeHex(surfaces['card-panel-surface'] || '#111827');
  const text = normalizeHex(typography['text-strong'] || '#0f172a');
  const muted = normalizeHex(typography['text-muted'] || '#64748b');

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 800);
  ctx.fillStyle = card;
  ctx.beginPath();
  ctx.roundRect(60, 60, 1080, 680, 28);
  ctx.fill();
  ctx.strokeStyle = hexWithAlpha(primary, 0.13);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = hexWithAlpha(primary, 0.13);
  ctx.beginPath();
  ctx.roundRect(60, 140, 1080, 18, 9);
  ctx.fill();
  ctx.fillStyle = hexWithAlpha(primary, 0.2);
  ctx.beginPath();
  ctx.roundRect(60, 100, 360, 28, 14);
  ctx.fill();

  ctx.fillStyle = text;
  ctx.font = '700 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(safeName, 80, 120);
  ctx.fillStyle = muted;
  ctx.font = '500 14px system-ui, -apple-system, Segoe UI, sans-serif';
  const themeLabel = theme.themeMode === 'pop' ? 'Pop' : (theme.isDark ? 'Dark' : 'Light');
  ctx.fillText(`Base ${base} • ${theme.mode} • ${themeLabel}`, 80, 170);

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

  [primary, secondary, accent, base].forEach((color, index) => {
    const x = 220 + index * 100;
    ctx.fillStyle = color;
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

export const renderStripPng = async (theme) => {
  const brand = theme.tokens.brand ?? {};
  const foundation = theme.tokens.foundation?.neutrals ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette');
  const swatches = [
    brand.primary,
    brand.secondary,
    brand.accent,
    theme.baseColor,
    foundation['neutral-2'],
    foundation['neutral-4'],
    foundation['neutral-6'],
    foundation['neutral-8'],
  ].filter(Boolean).slice(0, 8).map((color) => normalizeHex(color));

  const canvas = document.createElement('canvas');
  canvas.width = 1500;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1500, 420);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 22px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`${safeName} • Swatch Strip`, 60, 60);

  swatches.forEach((color, index) => {
    const x = 40 + index * 170;
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

export const buildPaletteCardSvg = (theme) => {
  const brand = theme.tokens.brand ?? {};
  const cards = theme.tokens.cards ?? {};
  const foundation = theme.tokens.foundation ?? {};
  const surfaces = theme.tokens.surfaces ?? {};
  const typography = theme.tokens.typography ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette');
  const base = normalizeHex(theme.baseColor || '#6366f1');
  const primary = normalizeHex(brand.primary || '#6366f1');
  const secondary = normalizeHex(brand.secondary || '#8b5cf6');
  const accent = normalizeHex(brand.accent || '#22d3ee');
  const bg = normalizeHex(surfaces.background || '#0b1021');
  const panel = normalizeHex(cards['card-panel-surface'] || surfaces.surface || '#111827');
  const panelStrong = normalizeHex(cards['card-panel-surface-strong'] || panel);
  const text = normalizeHex(typography['text-strong'] || typography.heading || '#f8fafc');
  const muted = normalizeHex(typography['text-muted'] || '#64748b');
  const bodyText = normalizeHex(typography['text-body'] || text);
  const neutral = foundation.neutrals ?? {};
  const themeLabel = theme.themeMode === 'pop' ? 'Pop' : (theme.isDark ? 'Dark' : 'Light');
  const swatches = [
    { label: 'Primary', color: primary },
    { label: 'Secondary', color: secondary },
    { label: 'Accent', color: accent },
    { label: 'Base', color: base },
    { label: 'Background', color: bg },
    { label: 'Surface', color: panel },
    { label: 'Text', color: bodyText },
    { label: 'Muted', color: muted },
  ];
  const neutralSwatches = [
    neutral['neutral-1'],
    neutral['neutral-3'],
    neutral['neutral-5'],
    neutral['neutral-7'],
    neutral['neutral-9'],
  ].filter(Boolean).map((color) => normalizeHex(color));

  const swatchGrid = swatches.map((swatch, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = 80 + col * 142;
    const y = 528 + row * 98;
    return `<g>
      <rect x="${x}" y="${y}" width="112" height="54" rx="14" fill="${swatch.color}" stroke="${hexWithAlpha(text, 0.16)}" stroke-width="1"/>
      <text x="${x}" y="${y + 78}" fill="${text}" font-family="Inter, system-ui" font-size="13" font-weight="800">${escapeXml(swatch.label)}</text>
      <text x="${x}" y="${y + 96}" fill="${muted}" font-family="Inter, system-ui" font-size="12" font-weight="700">${swatch.color.toUpperCase()}</text>
    </g>`;
  }).join('\n');

  const neutralStrip = neutralSwatches.map((color, index) => {
    const x = 722 + index * 56;
    return `<rect x="${x}" y="610" width="44" height="88" rx="14" fill="${color}" stroke="${hexWithAlpha(text, 0.12)}" stroke-width="1"/>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="${secondary}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.85"/>
    </linearGradient>
    <linearGradient id="pageGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${hexWithAlpha(primary, 0.28)}"/>
      <stop offset="52%" stop-color="${hexWithAlpha(accent, 0.16)}"/>
      <stop offset="100%" stop-color="${hexWithAlpha(bg, 0)}"/>
    </linearGradient>
    <filter id="softShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="28" stdDeviation="26" flood-color="#000000" flood-opacity="0.28"/>
    </filter>
  </defs>
  <rect width="1200" height="800" rx="32" fill="${bg}" />
  <rect width="1200" height="800" rx="32" fill="url(#pageGlow)" />
  <rect x="54" y="54" width="1092" height="692" rx="34" fill="${panel}" stroke="${hexWithAlpha(text, 0.11)}" stroke-width="1.5" filter="url(#softShadow)"/>
  <rect x="80" y="80" width="1040" height="232" rx="28" fill="url(#heroGrad)" opacity="0.94"/>
  <rect x="80" y="80" width="1040" height="232" rx="28" fill="#000000" opacity="0.08"/>
  <text x="112" y="128" fill="#ffffff" font-family="Inter, system-ui" font-weight="800" font-size="16" letter-spacing="0.08em">APOCAPALETTE THEME PACK</text>
  <text x="112" y="194" fill="#ffffff" font-family="Inter, system-ui" font-weight="900" font-size="62">${escapeXml(safeName)}</text>
  <text x="114" y="238" fill="${hexWithAlpha('#ffffff', 0.88)}" font-family="Inter, system-ui" font-weight="650" font-size="22">Marketplace-ready color tokens for product, design, and document workflows.</text>
  <text x="114" y="278" fill="${hexWithAlpha('#ffffff', 0.82)}" font-family="Inter, system-ui" font-weight="700" font-size="17">Base ${base.toUpperCase()} • ${escapeXml(theme.mode)} • ${themeLabel}</text>

  <rect x="80" y="348" width="552" height="348" rx="26" fill="${panelStrong}" stroke="${hexWithAlpha(text, 0.1)}" stroke-width="1"/>
  <text x="112" y="394" fill="${text}" font-family="Inter, system-ui" font-size="24" font-weight="900">Main palette</text>
  <text x="112" y="424" fill="${muted}" font-family="Inter, system-ui" font-size="15" font-weight="650">Core brand, surface, and type tokens.</text>
  ${swatchGrid}

  <rect x="670" y="348" width="450" height="348" rx="26" fill="${panelStrong}" stroke="${hexWithAlpha(text, 0.1)}" stroke-width="1"/>
  <text x="702" y="394" fill="${text}" font-family="Inter, system-ui" font-size="24" font-weight="900">Token categories</text>
  <text x="702" y="424" fill="${muted}" font-family="Inter, system-ui" font-size="15" font-weight="650">CSS, JSON, Figma, Penpot, LibreOffice</text>
  <rect x="704" y="462" width="180" height="68" rx="18" fill="${hexWithAlpha(primary, 0.18)}" stroke="${hexWithAlpha(primary, 0.42)}" stroke-width="1"/>
  <text x="726" y="490" fill="${text}" font-family="Inter, system-ui" font-size="15" font-weight="900">Brand</text>
  <text x="726" y="514" fill="${muted}" font-family="Inter, system-ui" font-size="13" font-weight="700">primary / accent</text>
  <rect x="908" y="462" width="180" height="68" rx="18" fill="${hexWithAlpha(accent, 0.14)}" stroke="${hexWithAlpha(accent, 0.38)}" stroke-width="1"/>
  <text x="930" y="490" fill="${text}" font-family="Inter, system-ui" font-size="15" font-weight="900">Typography</text>
  <text x="930" y="514" fill="${muted}" font-family="Inter, system-ui" font-size="13" font-weight="700">body / muted</text>
  <rect x="704" y="548" width="384" height="44" rx="16" fill="${hexWithAlpha(text, 0.07)}" stroke="${hexWithAlpha(text, 0.1)}" stroke-width="1"/>
  <text x="726" y="576" fill="${muted}" font-family="Inter, system-ui" font-size="13" font-weight="800">Neutral scale</text>
  ${neutralStrip}
  <text x="704" y="722" fill="${muted}" font-family="Inter, system-ui" font-size="13" font-weight="700">Preview artwork • Token reference • Listing image source</text>
</svg>`;
};

export const buildStripSvg = (theme) => {
  const brand = theme.tokens.brand ?? {};
  const foundation = theme.tokens.foundation?.neutrals ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette');
  const swatches = [
    brand.primary,
    brand.secondary,
    brand.accent,
    theme.baseColor,
    foundation['neutral-2'],
    foundation['neutral-4'],
    foundation['neutral-6'],
    foundation['neutral-8'],
  ].filter(Boolean).slice(0, 8).map((color) => normalizeHex(color));

  const rects = swatches.map((color, index) => {
    const x = 40 + index * 170;
    return `<g>
      <rect x="${x}" y="80" width="140" height="240" rx="22" fill="${color}" />
      <text x="${x + 70}" y="340" fill="#0f172a" font-family="Inter, system-ui" font-size="14" font-weight="700" text-anchor="middle">${color.toUpperCase()}</text>
    </g>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1500" height="420" viewBox="0 0 1500 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="1500" height="420" rx="32" fill="#f8fafc" />
  <text x="60" y="60" fill="#0f172a" font-family="Inter, system-ui" font-size="22" font-weight="800">${escapeXml(safeName)} • Swatch Strip</text>
  ${rects}
</svg>`;
};
