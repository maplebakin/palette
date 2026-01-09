import { exportAssets, buildExportFilename, slugifyFilename } from './exportUtils.js';
import { normalizeHex } from '../colorUtils.js'; // Assuming normalizeHex is in colorUtils
import { escapeXml, sanitizeThemeName } from '../utils/stringUtils.js'; // Assuming sanitizeThemeName is also here

/**
 * Exports SVG content as a downloadable file.
 * @param {Object} options
 * @param {string} options.svgContent - The SVG content as a string.
 * @param {string} options.themeName - Theme name for filename.
 * @param {string} options.suffix - Suffix for the filename (e.g., '-palette').
 */
export const exportSVG = ({ svgContent, themeName, suffix }) => {
  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not supported in this environment');
  }

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const filename = buildExportFilename(
    slugifyFilename(themeName || 'theme', 'theme'),
    suffix,
    'svg'
  );

  exportAssets({ data: blob, filename, mime: 'image/svg+xml' });
};

/**
 * Builds an SVG representation of a palette card.
 * @param {Object} theme - The theme object containing tokens and other details.
 * @returns {string} SVG content as a string.
 */
export const buildPaletteCardSvg = (theme) => {
  const brand = theme.tokens.brand ?? {};
  const surfaces = theme.tokens.surfaces ?? {};
  const typography = theme.tokens.typography ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette'); // Use imported sanitizeThemeName
  const base = normalizeHex(theme.baseColor || '#6366f1'); // Use imported normalizeHex
  const primary = normalizeHex(brand.primary || '#6366f1');
  const secondary = normalizeHex(brand.secondary || '#8b5cf6');
  const accent = normalizeHex(brand.accent || '#22d3ee');
  const bg = normalizeHex(surfaces['background'] || '#0b1021');
  const card = normalizeHex(surfaces['card-panel-surface'] || '#111827');
  const text = normalizeHex(typography['text-strong'] || '#0f172a');
  const muted = normalizeHex(typography['text-muted'] || '#64748b');

  const header = escapeXml(safeName);

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
  <rect x="60" y="60" width="1080" height="680" rx="28" fill="${card}" stroke="${primary}21" stroke-width="2"/>
  <rect x="60" y="140" width="1080" height="18" rx="9" fill="${primary}21"/>
  <rect x="60" y="100" width="360" height="28" rx="14" fill="${primary}33"/>
  <text x="80" y="120" fill="${text}" font-family="Inter, system-ui" font-weight="700" font-size="18">${header}</text>
  <text x="80" y="170" fill="${muted}" font-family="Inter, system-ui" font-weight="500" font-size="14">Base ${base} • ${escapeXml(theme.mode)} • ${theme.themeMode === 'pop' ? 'Pop' : (theme.isDark ? 'Dark' : 'Light')}</text>
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

/**
 * Builds an SVG representation of a swatch strip.
 * @param {Object} theme - The theme object containing tokens and other details.
 * @returns {string} SVG content as a string.
 */
export const buildStripSvg = (theme) => {
  const brand = theme.tokens.brand ?? {};
  const foundation = theme.tokens.foundation?.neutrals ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette'); // Use imported sanitizeThemeName
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

  const swatches = primaries.slice(0, 8); // Colors are already normalized by buildPaletteCardSvg
  const rects = swatches.map((color, idx) => {
    const x = 40 + idx * 170;
    return `<g>
      <rect x="${x}" y="80" width="140" height="240" rx="22" fill="${color}" />
      <text x="${x + 70}" y="340" fill="#0f172a" font-family="Inter, system-ui" font-size="14" font-weight="700" text-anchor="middle">${escapeXml(color.toUpperCase())}</text>
    </g>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1500" height="420" viewBox="0 0 1500 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="1500" height="420" rx="32" fill="#f8fafc" />
  <text x="60" y="60" fill="#0f172a" font-family="Inter, system-ui" font-size="22" font-weight="800">${escapeXml(safeName)} • Swatch Strip</text>
  ${rects}
</svg>`;
};
