import { exportAssets, buildExportFilename, slugifyFilename, normalizeHex } from './exportUtils.js';
import { sanitizeThemeName } from '../utils/stringUtils.js';
import { hexWithAlpha } from '../colorUtils.js';



/**
 * Captures DOM node as PNG image
 * @param {HTMLElement} node - DOM element to capture
 * @param {Object} options - html-to-image options
 * @returns {Promise<Uint8Array>} Image bytes
 */
export const captureNodeAsImage = async (node, options = {}) => {
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    ...options,
  });
  const res = await fetch(dataUrl);
  return new Uint8Array(await res.arrayBuffer());
};

/**
 * Exports DOM element as PNG image
 * @param {Object} options
 * @param {HTMLElement} options.node - Element to capture
 * @param {string} options.themeName - Theme name for filename
 * @param {number} options.width - Image width
 * @param {number} options.height - Image height
 * @param {string} options.backgroundColor - Background color
 * @returns {Promise<void>}
 */
export const exportImage = async (options) => {
  const { node, themeName, width, height, backgroundColor } = options;

  if (!node) {
    throw new Error('Node is required for image export');
  }

  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not supported in this environment');
  }

  const imageBytes = await captureNodeAsImage(node, {
    width,
    height,
    backgroundColor,
  });

  const blob = new Blob([imageBytes], { type: 'image/png' });
  const filename = buildExportFilename(
    slugifyFilename(themeName || 'theme', 'theme'),
    '-preview',
    'png'
  );

  exportAssets({ data: blob, filename, mime: 'image/png' });
};


// --- Original App.jsx render functions, adapted for export ---

/**
 * Renders a palette card to a PNG Uint8Array.
 * @param {Object} theme - The theme object.
 * @returns {Promise<Uint8Array>} PNG image as Uint8Array.
 */
export const renderPaletteCardToPng = async (theme) => {
  const brand = theme.tokens.brand ?? {};
  const surfaces = theme.tokens.surfaces ?? {};
  const typography = theme.tokens.typography ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette');
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
  ctx.fillText(safeName, 80, 120);
  ctx.fillStyle = muted;
  ctx.font = '500 14px system-ui, -apple-system, Segoe UI, sans-serif';
  const themeLabel = theme.themeMode === 'pop' ? 'Pop' : (theme.isDark ? 'Dark' : 'Light');
  ctx.fillText(`Base ${base} • ${theme.mode} • ${themeLabel}`, 80, 170);

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

/**
 * Renders a swatch strip to a PNG Uint8Array.
 * @param {Object} theme - The theme object.
 * @returns {Promise<Uint8Array>} PNG image as Uint8Array.
 */
export const renderStripToPng = async (theme) => {
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
  ].filter(Boolean).slice(0, 8).map((c) => normalizeHex(c));

  const canvas = document.createElement('canvas');
  canvas.width = 1500;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1500, 420);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 22px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`${safeName} • Swatch Strip`, 60, 60);

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