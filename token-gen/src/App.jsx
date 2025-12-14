import React, { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { Sun, Moon, Palette, Type, Box, Grid, Layers, Droplet, Printer, FileText, Image, EyeOff, Shuffle, Eye, Save, FolderOpen, Link as LinkIcon, Check, Download } from 'lucide-react';
import ColorSwatch from './components/ColorSwatch';
import Section from './components/Section';
const ExportsPanel = lazy(() => import('./components/ExportsPanel'));
const ContrastPanel = lazy(() => import('./components/ContrastPanel'));
import ErrorBoundary from './components/ErrorBoundary.jsx';
import useDarkClassSync from './hooks/useDarkClassSync';
import { useNotification } from './context/NotificationContext.jsx';
import {
  escapeXml,
  getContrastRatio,
  getWCAGBadge,
  hexWithAlpha,
  normalizeHex,
  pickReadableText,
} from './lib/colorUtils';
import { addPrintMode, buildOrderedStack, generateTokens } from './lib/tokens';
import { buildGenericPayload, buildPenpotPayload, buildWitchcraftPayload, buildFigmaTokensPayload, buildStyleDictionaryPayload } from './lib/payloads';

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

const STORAGE_KEYS = {
  current: 'token-gen/current-palette',
  saved: 'token-gen/saved-palettes',
};

const clampValue = (val, min, max) => Math.min(max, Math.max(min, Number(val)));
const sanitizeHexInput = (value, fallback = null) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!match) return fallback;
  let hex = match[1].toLowerCase();
  if (hex.length === 8) hex = hex.slice(0, 6);
  return `#${hex}`;
};
const sanitizeThemeName = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return clean || fallback;
};
const sanitizePrefix = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-z0-9_.-]/gi, '').slice(0, 32);
};
const downloadFile = (filename, content, mime = 'text/plain') => {
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
const buildCssVariables = (stack, prefix = '') => {
  const safePrefix = prefix ? `${prefix}-` : '';
  const lines = stack.map(({ path, value }) => `  --${safePrefix}${path.replace(/\./g, '-')}: ${value};`);
  return `:root {\n${lines.join('\n')}\n}\n`;
};

const SectionFallback = ({ reset, message, label }) => (
  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
    <p className="font-semibold text-sm">{label ? `${label} failed to render.` : 'This section failed to render.'}</p>
    {message && <p className="text-xs mt-1">{message}</p>}
    <button
      type="button"
      onClick={reset}
      className="mt-3 inline-flex items-center px-3 py-1 rounded bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
    >
      Retry
    </button>
  </div>
);

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

const renderStripPng = async (theme) => {
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

const buildPaletteCardSvg = (theme) => {
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
  <rect x="60" y="60" width="1080" height="680" rx="28" fill="${card}" stroke="${hexWithAlpha(primary, 0.13)}" stroke-width="2"/>
  <rect x="60" y="140" width="1080" height="18" rx="9" fill="${hexWithAlpha(primary, 0.13)}"/>
  <rect x="60" y="100" width="360" height="28" rx="14" fill="${hexWithAlpha(primary, 0.2)}"/>
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

const buildStripSvg = (theme) => {
  const brand = theme.tokens.brand ?? {};
  const foundation = theme.tokens.foundation?.neutrals ?? {};
  const safeName = sanitizeThemeName(theme.name || 'Palette', 'Palette');
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
  <text x="60" y="60" fill="#0f172a" font-family="Inter, system-ui" font-size="22" font-weight="800">${escapeXml(safeName)} • Swatch Strip</text>
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
  { name: 'Beef Ritual', base: '#7b241c', mode: 'Monochromatic', dark: true },
  { name: 'Solar Flare', base: '#f59e0b', mode: 'Analogous', dark: false },
  { name: 'Terracotta Sunrise', base: '#e2725b', mode: 'Analogous', dark: false },
  { name: 'Vapor Dream', base: '#ff8b94', mode: 'Tertiary', dark: false },
  { name: 'Nuclear Winter', base: '#a7f432', mode: 'Apocalypse', dark: true },
  { name: 'Corporate Compliance', base: '#000000', mode: 'Monochromatic', dark: true },
];

export default function App() {
  const { notify } = useNotification();
  const isInternal = import.meta.env.VITE_INTERNAL === 'true';
  const [baseColor, setBaseColor] = useState('#7b241c');
  const [baseInput, setBaseInput] = useState('#7b241c');
  const [baseError, setBaseError] = useState('');
  const [mode, setMode] = useState('Monochromatic');
  const [themeMode, setThemeMode] = useState('dark'); // light | dark | pop
  const [printMode, setPrintMode] = useState(false);
  const [customThemeName, setCustomThemeName] = useState('');
  const [showContrast, setShowContrast] = useState(true);
  const [harmonyIntensity, setHarmonyIntensity] = useState(100);
  const [apocalypseIntensity, setApocalypseIntensity] = useState(100);
  const [neutralCurve, setNeutralCurve] = useState(100);
  const [accentStrength, setAccentStrength] = useState(100);
  const [popIntensity, setPopIntensity] = useState(100);
  const [harmonyInput, setHarmonyInput] = useState(100);
  const [neutralInput, setNeutralInput] = useState(100);
  const [accentInput, setAccentInput] = useState(100);
  const [apocalypseInput, setApocalypseInput] = useState(100);
  const [popInput, setPopInput] = useState(100);
  const [activeTab, setActiveTab] = useState('Quick view');
  const [tokenPrefix, setTokenPrefix] = useState('');
  const [savedPalettes, setSavedPalettes] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [storageAvailable, setStorageAvailable] = useState(null);
  const [storageCorrupt, setStorageCorrupt] = useState(false);
  const [storageQuotaExceeded, setStorageQuotaExceeded] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportBlocked, setExportBlocked] = useState(false);
  const [printSupported, setPrintSupported] = useState(true);
  const [isExportingAssets, setIsExportingAssets] = useState(false);
  const [printMeta, setPrintMeta] = useState(() => getPrintTimestamps());
  const savedTitleRef = useRef('');
  const exportsSectionRef = useRef(null);
  const [showFineTune, setShowFineTune] = useState(false);
  const statusTimerRef = useRef(null);
  const harmonyDebounceRef = useRef(null);
  const neutralDebounceRef = useRef(null);
  const accentDebounceRef = useRef(null);
  const apocalypseDebounceRef = useRef(null);
  const popDebounceRef = useRef(null);
  const pickerColor = baseColor.length === 9 && baseColor.startsWith('#') ? baseColor.slice(0, 7) : baseColor;
  // Controls the UI theme (preview background)
  // Usually we want this to sync with generated tokens for best preview, but nice to keep separate for inspection
  // For this UX, I will sync them. When you generate Dark Tokens, the UI becomes dark.

  const setStatusMessage = useCallback((message, tone = 'info') => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setSaveStatus(message);
    notify(message, tone);
    statusTimerRef.current = setTimeout(() => setSaveStatus(''), 2400);
  }, [notify]);

  const isDark = themeMode === 'dark';
  useDarkClassSync(isDark);

  const applySavedPalette = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return;
    const sanitized = sanitizeHexInput(payload.baseColor, '#6366f1');
    setBaseColor(sanitized);
    setBaseInput(sanitized);
    setBaseError('');
    setMode(payload.mode || 'Monochromatic');
    const savedThemeMode = payload.themeMode || (payload.isDark ? 'dark' : 'light');
    setThemeMode(savedThemeMode);
    setPrintMode(Boolean(payload.printMode));
    setCustomThemeName(sanitizeThemeName(payload.customThemeName || '', ''));
    const nextHarmony = payload.harmonyIntensity ?? 100;
    const nextApoc = payload.apocalypseIntensity ?? 100;
    const nextNeutral = payload.neutralCurve ?? 100;
    const nextAccent = payload.accentStrength ?? 100;
    const nextPop = payload.popIntensity ?? 100;
    setHarmonyIntensity(nextHarmony);
    setApocalypseIntensity(nextApoc);
    setNeutralCurve(nextNeutral);
    setAccentStrength(nextAccent);
    setPopIntensity(nextPop);
    setHarmonyInput(nextHarmony);
    setApocalypseInput(nextApoc);
    setNeutralInput(nextNeutral);
    setAccentInput(nextAccent);
    setPopInput(nextPop);
    setTokenPrefix(sanitizePrefix(payload.tokenPrefix || ''));
  }, []);

  const handleBaseColorChange = useCallback((value) => {
    setBaseInput(value);
    const sanitized = sanitizeHexInput(value);
    if (!sanitized) {
      setBaseError('Enter a hex value like #FF00FF or #ABC');
      return;
    }
    setBaseError('');
    setBaseColor(sanitized);
  }, []);

  useEffect(() => {
    try {
      const key = '__token-gen-check__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      setStorageAvailable(true);
    } catch (err) {
      console.warn('Local storage unavailable', err);
      setStorageAvailable(false);
      notify('Local storage is blocked in this session', 'warn');
    }
    setPrintSupported(typeof window !== 'undefined' && typeof window.print === 'function');
  }, [notify]);

  useEffect(() => {
    if (storageAvailable !== true) return;
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEYS.saved);
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          if (Array.isArray(parsed)) {
            const safe = parsed.filter((item) => item && typeof item === 'object');
            setSavedPalettes(safe);
          } else {
            setStorageCorrupt(true);
          }
        } catch (parseErr) {
          console.warn('Saved palettes corrupted', parseErr);
          setStorageCorrupt(true);
        }
      }
      const currentRaw = localStorage.getItem(STORAGE_KEYS.current);
      if (currentRaw) {
        try {
          const parsed = JSON.parse(currentRaw);
          applySavedPalette(parsed);
        } catch (parseErr) {
          console.warn('Current palette corrupted', parseErr);
          setStorageCorrupt(true);
          notify('Current palette could not be restored', 'warn');
        }
      }
    } catch (err) {
      console.warn('Failed to hydrate palette state', err);
      setStorageCorrupt(true);
      notify('Could not load saved palettes; storage may be blocked or corrupted', 'warn');
    }
  }, [applySavedPalette, notify, storageAvailable]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefix = '#palette=';
    const hash = window.location.hash || '';
    if (!hash.startsWith(prefix)) return;
    try {
      const decoded = decodeURIComponent(escape(atob(hash.slice(prefix.length))));
      const payload = JSON.parse(decoded);
      applySavedPalette(payload);
      notify('Palette loaded from link', 'success');
    } catch (err) {
      console.warn('Failed to parse shared palette', err);
      notify('Share link was invalid', 'warn');
    }
  }, [applySavedPalette, notify]);

  useEffect(() => {
    if (storageAvailable !== true) return;
    try {
      const payload = {
        baseColor,
        mode,
        themeMode,
        printMode,
        customThemeName: sanitizeThemeName(customThemeName, ''),
        harmonyIntensity,
        apocalypseIntensity,
        neutralCurve,
        accentStrength,
        popIntensity,
        tokenPrefix: sanitizePrefix(tokenPrefix),
      };
      localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to persist palette state', err);
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        setStorageQuotaExceeded(true);
        setStatusMessage('Storage quota exceeded — clear saved data to resume saving', 'warn');
      } else {
        setStorageAvailable(false);
        notify('Saving is unavailable; storage is blocked', 'warn');
      }
    }
  }, [baseColor, mode, themeMode, printMode, customThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve, accentStrength, popIntensity, tokenPrefix, notify, storageAvailable, setStatusMessage]);

  useEffect(() => {
    setHarmonyInput(harmonyIntensity);
    setNeutralInput(neutralCurve);
    setAccentInput(accentStrength);
    setApocalypseInput(apocalypseIntensity);
    setPopInput(popIntensity);
  }, [harmonyIntensity, neutralCurve, accentStrength, apocalypseIntensity, popIntensity]);

  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (harmonyDebounceRef.current) clearTimeout(harmonyDebounceRef.current);
    if (neutralDebounceRef.current) clearTimeout(neutralDebounceRef.current);
    if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
    if (apocalypseDebounceRef.current) clearTimeout(apocalypseDebounceRef.current);
    if (popDebounceRef.current) clearTimeout(popDebounceRef.current);
  }, []);

  const autoThemeName = useMemo(() => `${mode} ${themeMode === 'dark' ? 'Dark' : themeMode === 'pop' ? 'Pop' : 'Light'}`, [mode, themeMode]);
  const safeCustomThemeName = useMemo(() => sanitizeThemeName(customThemeName, ''), [customThemeName]);
  const displayThemeName = safeCustomThemeName || autoThemeName;
  const tokens = useMemo(
    () => generateTokens(baseColor, mode, themeMode, apocalypseIntensity, {
      harmonyIntensity,
      neutralCurve,
      accentStrength,
      popIntensity,
    }),
    [baseColor, mode, themeMode, apocalypseIntensity, harmonyIntensity, neutralCurve, accentStrength, popIntensity]
  );
  const serializePalette = useCallback(() => ({
    id: Date.now(),
    name: displayThemeName,
    baseColor,
    mode,
    themeMode,
    isDark,
    printMode,
    customThemeName: safeCustomThemeName,
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    tokenPrefix: sanitizePrefix(tokenPrefix),
  }), [displayThemeName, baseColor, mode, themeMode, isDark, printMode, safeCustomThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve, accentStrength, popIntensity, tokenPrefix]);
  const shareState = useMemo(() => ({
    baseColor,
    mode,
    themeMode,
    isDark,
    printMode,
    customThemeName: safeCustomThemeName,
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    popIntensity,
    tokenPrefix: sanitizePrefix(tokenPrefix),
  }), [baseColor, mode, themeMode, isDark, printMode, safeCustomThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve, accentStrength, popIntensity, tokenPrefix]);
  const buildShareHash = useCallback(() => {
    const json = JSON.stringify(shareState);
    const encoded = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : '';
    return encoded ? `#palette=${encoded}` : '';
  }, [shareState]);
  const quickEssentials = useMemo(() => ([
    { key: 'Primary', color: tokens.brand.primary },
    { key: 'Secondary', color: tokens.brand.secondary },
    { key: 'Accent', color: tokens.brand.accent },
    { key: 'Base', color: baseColor },
    { key: 'Neutral 2', color: tokens.foundation.neutrals['neutral-2'] },
    { key: 'Neutral 4', color: tokens.foundation.neutrals['neutral-4'] },
    { key: 'Neutral 6', color: tokens.foundation.neutrals['neutral-6'] },
    { key: 'Neutral 8', color: tokens.foundation.neutrals['neutral-8'] },
    { key: 'Text strong', color: tokens.typography['text-strong'] },
    { key: 'Text muted', color: tokens.typography['text-muted'] },
  ]).filter(({ color }) => Boolean(color)), [tokens, baseColor]);
  const tabOptions = useMemo(() => (['Quick view', 'Full system', 'Print assets', 'Exports']), []);
  const tabIds = useMemo(() => ({
    'Quick view': 'tab-quick',
    'Full system': 'tab-full',
    'Print assets': 'tab-print',
    'Exports': 'tab-exports',
  }), []);
  const getTabId = useCallback((tab) => tabIds[tab] || `tab-${tab.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`, [tabIds]);
  const handleJumpToExports = useCallback(() => {
    setActiveTab('Exports');
    requestAnimationFrame(() => {
      if (exportsSectionRef.current) {
        exportsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const tabEl = document.getElementById(getTabId('Exports'));
        if (tabEl) tabEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [getTabId]);

  const saveCurrentPalette = useCallback(() => {
    if (storageAvailable !== true || storageCorrupt) {
      setStatusMessage('Saving is unavailable; storage is blocked', 'warn');
      return;
    }
    try {
      const payload = serializePalette();
      setSavedPalettes((prev) => {
        const filtered = prev.filter((item) => item.name !== payload.name);
        const next = [payload, ...filtered].slice(0, 20);
        localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(next));
        return next;
      });
      setStatusMessage('Palette saved to this browser', 'success');
    } catch (err) {
      console.warn('Failed to save palette', err);
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        setStorageQuotaExceeded(true);
        setStatusMessage('Storage quota exceeded — clear saved data to resume saving', 'warn');
      } else {
        setStatusMessage('Save failed — check storage permissions', 'error');
        setStorageCorrupt(true);
      }
    }
  }, [serializePalette, setStatusMessage, storageAvailable, storageCorrupt]);

  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.saved);
      localStorage.removeItem(STORAGE_KEYS.current);
      setSavedPalettes([]);
      setStorageCorrupt(false);
      setStorageQuotaExceeded(false);
      setStatusMessage('Saved data cleared', 'success');
    } catch (err) {
      console.warn('Failed to clear saved data', err);
      setStatusMessage('Failed to clear saved data', 'error');
    }
  }, [setStatusMessage]);

  const loadSavedPalette = useCallback((id) => {
    if (!id) return;
    const numericId = Number(id);
    const target = savedPalettes.find((item) => item.id === numericId);
    if (!target) {
      setStatusMessage('Saved palette not found', 'warn');
      return;
    }
    applySavedPalette(target);
    setStatusMessage(`Loaded "${target.name}"`, 'success');
  }, [savedPalettes, applySavedPalette, setStatusMessage]);
  const finalTokens = useMemo(
    () => (printMode ? addPrintMode(tokens, baseColor, mode, isDark) : tokens),
    [tokens, printMode, baseColor, mode, isDark]
  );
  const currentTheme = useMemo(() => ({
    name: displayThemeName,
    mode,
    themeMode,
    isDark,
    baseColor,
    tokens: finalTokens,
    printMode,
  }), [displayThemeName, mode, themeMode, isDark, baseColor, finalTokens, printMode]);
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
  const ctaTextColor = useMemo(() => pickReadableText(tokens.brand.primary), [tokens.brand.primary]);
  const neutralButtonText = useMemo(() => pickReadableText(tokens.cards['card-panel-surface'], '#0f172a', '#ffffff'), [tokens.cards]);
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
    ].map((entry) => ({ ...entry, badge: getWCAGBadge(entry.ratio) }));
  }, [finalTokens]);

  const applyPreset = useCallback((presetName) => {
    const p = presets.find((x) => x.name === presetName);
    if (!p) return;
    setBaseColor(p.base);
    setMode(p.mode);
    setThemeMode(p.dark ? 'dark' : 'light');
    setCustomThemeName(p.name);
    setHarmonyIntensity(100);
    setNeutralCurve(100);
    setAccentStrength(100);
    setApocalypseIntensity(100);
    setStatusMessage(`Preset "${p.name}" applied`, 'success');
  }, [setStatusMessage]);

  const randomize = useCallback(() => {
    const hues = ['#ef4444', '#f59e0b', '#84cc16', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
    const modes = ['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'];
    const nextBase = hues[Math.floor(Math.random() * hues.length)];
    const nextMode = modes[Math.floor(Math.random() * modes.length)];
    const nextDark = Math.random() > 0.5;

    setBaseColor(nextBase);
    setMode(nextMode);
    setThemeMode(nextDark ? 'dark' : 'light');
    setHarmonyIntensity(Math.round(70 + Math.random() * 80));
    setNeutralCurve(Math.round(80 + Math.random() * 50));
    setAccentStrength(Math.round(80 + Math.random() * 50));

    if (nextMode === 'Apocalypse') {
      setApocalypseIntensity(Math.round(50 + Math.random() * 100));
    }
  }, []);
  const debouncedHarmonyChange = useCallback((value) => {
    const next = clampValue(value, 50, 160);
    setHarmonyInput(next);
    if (harmonyDebounceRef.current) clearTimeout(harmonyDebounceRef.current);
    harmonyDebounceRef.current = setTimeout(() => setHarmonyIntensity(next), 120);
  }, []);
  const debouncedNeutralChange = useCallback((value) => {
    const next = clampValue(value, 60, 140);
    setNeutralInput(next);
    if (neutralDebounceRef.current) clearTimeout(neutralDebounceRef.current);
    neutralDebounceRef.current = setTimeout(() => setNeutralCurve(next), 120);
  }, []);
  const debouncedAccentChange = useCallback((value) => {
    const next = clampValue(value, 60, 140);
    setAccentInput(next);
    if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
    accentDebounceRef.current = setTimeout(() => setAccentStrength(next), 120);
  }, []);
  const debouncedApocalypseChange = useCallback((value) => {
    const next = clampValue(value, 20, 150);
    setApocalypseInput(next);
    if (apocalypseDebounceRef.current) clearTimeout(apocalypseDebounceRef.current);
    apocalypseDebounceRef.current = setTimeout(() => setApocalypseIntensity(next), 120);
  }, []);
  const debouncedPopChange = useCallback((value) => {
    const next = clampValue(value, 60, 140);
    setPopInput(next);
    if (popDebounceRef.current) clearTimeout(popDebounceRef.current);
    popDebounceRef.current = setTimeout(() => setPopIntensity(next), 120);
  }, []);

  const updatePrintMeta = useCallback(() => {
    const next = getPrintTimestamps();
    setPrintMeta(next);
    return next;
  }, []);
  const copyHexValue = useCallback(async (value, label = 'Value') => {
    const text = String(value ?? '').trim();
    if (!text) {
      notify('Nothing to copy', 'warn');
      return;
    }
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn('Primary clipboard copy failed, using fallback', err);
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (fallbackErr) {
        console.warn('Copy failed', fallbackErr);
        notify('Copy failed — check browser permissions', 'warn');
        return;
      }
    }
    notify(`${label} copied`, 'success', 1600);
  }, [notify]);
  const copyAllEssentials = useCallback(async () => {
    const list = quickEssentials.map(({ color }) => normalizeHex(color, color)).filter(Boolean);
    if (!list.length) {
      notify('No colors to copy', 'warn');
      return;
    }
    await copyHexValue(list.join('\n'), 'Hex list');
  }, [copyHexValue, notify, quickEssentials]);
  const randomRitual = useCallback(() => {
    randomize();
    notify('Ritual complete. The colors are judging you.', 'info');
  }, [randomize, notify]);
  const crankApocalypse = useCallback(() => {
    const boostedApoc = 130;
    const boostedAccent = 120;
    setMode('Apocalypse');
    setThemeMode('dark');
    setPrintMode(false);
    setApocalypseIntensity(boostedApoc);
    setApocalypseInput(boostedApoc);
    setAccentStrength((prev) => Math.max(prev, boostedAccent));
    setAccentInput((prev) => Math.max(prev, boostedAccent));
    notify('Apocalypse cranked. Wear goggles.', 'warn');
  }, [notify]);
  const copyEssentialsList = useCallback(() => {
    copyAllEssentials();
    notify('Quick kit copied. Handle with care.', 'success');
  }, [copyAllEssentials, notify]);

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
      tokenPrefix: tokenPrefix || undefined,
    },
    { namingPrefix: tokenPrefix }
  ), [finalTokens, orderedStack, displayThemeName, mode, baseColor, isDark, printMode, tokenPrefix]);

  const exportJson = (filename) => {
    const penpotPayload = buildExportPayload();
    downloadFile(filename, JSON.stringify(penpotPayload, null, 2), 'application/json');
  };

  const exportGenericJson = (filename) => {
    const payload = buildGenericPayload(finalTokens, {
      themeName: displayThemeName,
      mode,
      baseColor,
      isDark,
      printMode,
      generatedAt: new Date().toISOString(),
      tokenPrefix: tokenPrefix || undefined,
    });
    downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json');
  };

  const exportWitchcraftJson = (filename) => {
    const witchcraftPayload = buildWitchcraftPayload(finalTokens, displayThemeName, mode, isDark);
    downloadFile(filename, JSON.stringify(witchcraftPayload, null, 2), 'application/json');
  };

  const exportFigmaTokensJson = (filename) => {
    const payload = buildFigmaTokensPayload(finalTokens, { namingPrefix: tokenPrefix || undefined });
    downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json');
  };

  const exportStyleDictionaryJson = (filename) => {
    const payload = buildStyleDictionaryPayload(finalTokens, { namingPrefix: tokenPrefix || undefined });
    downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json');
  };
  const exportCssVars = () => {
    const css = buildCssVariables(orderedStack, sanitizePrefix(tokenPrefix));
    const slugBase = sanitizeThemeName(displayThemeName || 'theme', 'theme');
    const slug = slugBase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'theme';
    downloadFile(`${slug}-tokens.css`, css, 'text/css');
    setStatusMessage('CSS variables exported', 'success');
  };

  const copyShareLink = useCallback(async () => {
    try {
      const hash = buildShareHash();
      if (!hash) throw new Error('Share link unavailable');
      const url = `${window.location.origin}${window.location.pathname}${hash}`;
      if (url.length > 1900) {
        notify('Share link too long; try shorter names/prefix', 'warn');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      notify('Share link copied', 'success');
    } catch (err) {
      console.warn('Failed to copy share link', err);
      notify('Could not copy share link', 'error');
    }
  }, [buildShareHash, notify]);

  const exportAllAssets = useCallback(async () => {
    if (typeof Blob === 'undefined') {
      const msg = 'File export is not supported in this browser';
      notify(msg, 'error');
      setExportError(msg);
      setExportBlocked(true);
      return;
    }
    const canvas = document.createElement('canvas');
    if (!canvas?.getContext) {
      const msg = 'Canvas is not supported; cannot render assets';
      notify(msg, 'error');
      setExportError(msg);
      setExportBlocked(true);
      return;
    }
    setExportError('');
    setExportBlocked(false);
    setIsExportingAssets(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const slugBase = sanitizeThemeName(currentTheme.name || 'theme', 'theme');
      const slug = slugBase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'theme';
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
      notify('Asset export failed. Check console for details.', 'error', 4000);
      console.error('Asset export failed', err);
    } finally {
      setIsExportingAssets(false);
    }
  }, [buildExportPayload, currentTheme, notify]);

  const handleExportPdf = () => {
    if (typeof window.print !== 'function') {
      notify('Print is not supported in this browser', 'error');
      setExportError('Print is not supported in this browser');
      return;
    }
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
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-indigo-600 text-white px-3 py-2 rounded">Skip to content</a>
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

        {(storageAvailable === false || storageCorrupt) && (
          <div className="max-w-7xl mx-auto px-6 py-3 mb-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 flex items-center justify-between gap-3" role="status" aria-live="polite">
            <div className="text-sm font-semibold">
              {storageCorrupt ? 'Saved palettes look corrupted. Save/load is disabled.' : 'Local storage is blocked; saving is disabled.'}
              {storageQuotaExceeded && ' Storage quota exceeded; clear saved data to re-enable saving.'}
            </div>
            <button
              type="button"
              onClick={clearSavedData}
              className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              Clear saved data
            </button>
          </div>
        )}

      {/* Header */}
      <header 
        className="sticky top-0 z-20 backdrop-blur-md border-b"
        style={{ 
          backgroundColor: tokens.surfaces["header-background"] + 'CC',
          borderColor: tokens.surfaces["surface-plain-border"]
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Header" reset={reset} message={message} />}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3">
                  <div 
                    className="p-2 rounded-lg shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${tokens.brand["gradient-start"]} 0%, ${tokens.brand.secondary} 50%, ${tokens.brand["gradient-end"]} 100%)`,
                      boxShadow: `0 10px 30px -10px ${tokens.brand.primary}99`
                    }}
                  >
                    <Palette className="text-white drop-shadow-sm" size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Welcome to</p>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">Apocapalette</h1>
                    <p className="text-xs text-slate-500 font-medium">Spin the chaos wheel, keep the pretty bits.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:ml-4">
                    <button
                      type="button"
                      onClick={randomRitual}
                      className="px-3 py-2 rounded-full text-[11px] font-bold shadow-md hover:-translate-y-[1px] active:scale-95 transition border"
                      style={{
                        backgroundImage: `linear-gradient(120deg, ${tokens.brand.primary} 0%, ${tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary} 100%)`,
                        color: ctaTextColor,
                        borderColor: tokens.brand['cta-hover'] || tokens.brand.primary,
                      }}
                    >
                      Random ritual
                    </button>
                    <button
                      type="button"
                      onClick={crankApocalypse}
                      className="px-3 py-2 rounded-full text-[11px] font-bold border bg-slate-900 text-white shadow-md hover:bg-slate-800 active:scale-95 transition"
                    >
                      Crank Apocalypse
                    </button>
                    <button
                      type="button"
                      onClick={copyEssentialsList}
                      className="px-3 py-2 rounded-full text-[11px] font-bold border bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-100 shadow-sm hover:-translate-y-[1px] active:scale-95 transition"
                      style={{ borderColor: tokens.cards["card-panel-border"] }}
                    >
                      Copy quick kit
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleJumpToExports}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:-translate-y-[1px] active:scale-95 transition border focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    style={{
                      backgroundImage: `linear-gradient(120deg, ${tokens.brand.primary} 0%, ${tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary} 100%)`,
                      color: ctaTextColor,
                      borderColor: tokens.brand['cta-hover'] || tokens.brand.primary,
                      boxShadow: `0 18px 35px -22px ${tokens.brand.primary}`,
                    }}
                    aria-label="Jump to exports"
                  >
                    <Download size={14} />
                    Exports
                  </button>
                  <button
                    type="button"
                    onClick={saveCurrentPalette}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    aria-label="Save current palette to browser"
                    disabled={storageAvailable !== true || storageCorrupt || storageQuotaExceeded}
                  >
                    <Save size={14} />
                    Save
                  </button>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-slate-900 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    <FolderOpen size={14} className="text-slate-500" aria-hidden />
                    <select
                      onChange={(e) => { loadSavedPalette(e.target.value); e.target.value = ''; }}
                      className="bg-transparent outline-none text-xs"
                      defaultValue=""
                      aria-label="Load a saved palette"
                      disabled={storageAvailable !== true || storageCorrupt}
                    >
                      <option value="" disabled>Load saved…</option>
                      {savedPalettes.map((palette) => (
                        <option key={palette.id} value={palette.id}>
                          {palette.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-slate-900 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    title="Copy a shareable link to this palette"
                  >
                    <LinkIcon size={14} />
                    Copy share link
                  </button>
                  <a
                    href="docs/README.md"
                    className="px-3 py-2 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    Docs
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                  {saveStatus && (
                    <span role="status" aria-live="polite">{saveStatus}</span>
                  )}
                  {storageAvailable === false && (
                    <span role="alert" className="text-amber-700 dark:text-amber-300">
                      Saving disabled (storage blocked)
                    </span>
                  )}
                  {storageQuotaExceeded && (
                    <span role="alert" className="text-amber-700 dark:text-amber-300">
                      Storage quota exceeded — clear saved data to resume saving
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <div
                className="flex flex-col gap-3 p-3 rounded-xl border bg-white/70 dark:bg-slate-900/50 backdrop-blur-sm"
                style={{ borderColor: tokens.cards["card-panel-border"] }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <input 
                      type="color" 
                      value={pickerColor} 
                      onChange={(e) => handleBaseColorChange(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" 
                      aria-label="Choose base color"
                    />
                    <input 
                      type="text" 
                      value={baseInput}
                      onChange={(e) => handleBaseColorChange(e.target.value)}
                      className={`w-28 bg-transparent text-sm font-mono text-slate-700 dark:text-slate-300 outline-none uppercase ${baseError ? 'border-b border-rose-500' : ''}`}
                      aria-label="Base color hex value"
                      aria-invalid={Boolean(baseError)}
                    />
                  </div>
                  <select
                    onChange={(e) => applyPreset(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    defaultValue=""
                    aria-label="Choose a preset palette"
                  >
                    <option value="" disabled>Presets…</option>
                    {presets.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {baseError && <p className="text-xs text-rose-600 font-semibold" role="alert">{baseError}</p>}
                <div className="flex flex-wrap gap-3">
                  <label className="flex-1 min-w-[180px] flex flex-col text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="sr-only">Theme name</span>
                    <input
                      type="text"
                      value={customThemeName}
                      onChange={(e) => setCustomThemeName(sanitizeThemeName(e.target.value, ''))}
                      placeholder={autoThemeName}
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      aria-label="Theme name"
                      maxLength={60}
                    />
                  </label>
                  <label className="flex-1 min-w-[160px] flex flex-col text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="sr-only">Token prefix</span>
                    <input
                      type="text"
                      value={tokenPrefix}
                      onChange={(e) => setTokenPrefix(sanitizePrefix(e.target.value))}
                      placeholder="Prefix"
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      aria-label="Token prefix"
                      maxLength={32}
                    />
                  </label>
                </div>
              </div>

              <div
                className="flex flex-col gap-3 p-3 rounded-xl border bg-white/70 dark:bg-slate-900/50 backdrop-blur-sm"
                style={{ borderColor: tokens.cards["card-panel-border"] }}
              >
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex-wrap" role="group" aria-label="Harmony mode">
                  {['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        mode === m 
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      } focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
                      aria-pressed={mode === m}
                      aria-label={`Set harmony mode to ${m}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFineTune((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 text-xs font-bold px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    Fine-tune sliders
                    <span className="text-[10px]">{showFineTune ? '▲' : '▼'}</span>
                  </button>
                  {showFineTune && (
                    <div className="mt-3 grid grid-cols-1 gap-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-3 shadow-xl">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Harmony spread</span>
                        <input
                          type="range"
                          min="50"
                          max="160"
                          value={harmonyInput}
                          onChange={(e) => debouncedHarmonyChange(e.target.value)}
                          className="w-32 focus-visible:ring-2 focus-visible:ring-indigo-500"
                          aria-label="Adjust harmony spread"
                          aria-valuemin={50}
                          aria-valuemax={160}
                          aria-valuenow={harmonyInput}
                        />
                        <span className="text-xs w-10 text-right font-mono text-slate-600 dark:text-slate-300">{harmonyInput}%</span>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Neutral depth</span>
                        <input
                          type="range"
                          min="60"
                          max="140"
                          value={neutralInput}
                          onChange={(e) => debouncedNeutralChange(e.target.value)}
                          className="w-32 focus-visible:ring-2 focus-visible:ring-indigo-500"
                          aria-label="Adjust neutral depth"
                          aria-valuemin={60}
                          aria-valuemax={140}
                          aria-valuenow={neutralInput}
                        />
                        <span className="text-xs w-10 text-right font-mono text-slate-600 dark:text-slate-300">{neutralInput}%</span>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Accent punch</span>
                        <input
                          type="range"
                          min="60"
                          max="140"
                          value={accentInput}
                          onChange={(e) => debouncedAccentChange(e.target.value)}
                          className="w-32 focus-visible:ring-2 focus-visible:ring-indigo-500"
                          aria-label="Adjust accent punch"
                          aria-valuemin={60}
                          aria-valuemax={140}
                          aria-valuenow={accentInput}
                        />
                        <span className="text-xs w-10 text-right font-mono text-slate-600 dark:text-slate-300">{accentInput}%</span>
                      </div>

                      {mode === 'Apocalypse' && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-slate-800 border border-rose-200 dark:border-rose-800">
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Apocalypse drive</span>
                          <input
                            type="range"
                            min="20"
                            max="150"
                            value={apocalypseInput}
                            onChange={(e) => debouncedApocalypseChange(e.target.value)}
                            className="w-32 accent-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500"
                            aria-label="Adjust apocalypse intensity"
                            aria-valuemin={20}
                            aria-valuemax={150}
                            aria-valuenow={apocalypseInput}
                          />
                          <span className="text-xs w-10 text-right font-mono text-rose-700 dark:text-rose-200">{apocalypseInput}%</span>
                        </div>
                      )}

                      {themeMode === 'pop' && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-fuchsia-50 dark:bg-slate-800 border border-fuchsia-200 dark:border-fuchsia-700">
                          <span className="text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300">Pop intensity</span>
                          <input
                            type="range"
                            min="60"
                            max="140"
                            value={popInput}
                            onChange={(e) => debouncedPopChange(e.target.value)}
                            className="w-32 accent-fuchsia-500 focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                            aria-label="Adjust pop intensity"
                            aria-valuemin={60}
                            aria-valuemax={140}
                            aria-valuenow={popInput}
                          />
                          <span className="text-xs w-10 text-right font-mono text-fuchsia-700 dark:text-fuchsia-200">{popInput}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div
                className="flex flex-col gap-3 p-3 rounded-xl border bg-white/70 dark:bg-slate-900/50 backdrop-blur-sm"
                style={{ borderColor: tokens.cards["card-panel-border"] }}
              >
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex-wrap" role="group" aria-label="Theme mode">
                  {[
                    { key: 'light', label: 'Light', icon: <Sun size={14} /> },
                    { key: 'dark', label: 'Dark', icon: <Moon size={14} /> },
                    { key: 'pop', label: 'Pop', icon: <Palette size={14} /> },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setThemeMode(item.key)}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                        themeMode === item.key 
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      } focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
                      aria-pressed={themeMode === item.key}
                      aria-label={`Set theme mode to ${item.label}`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <input 
                      type="checkbox" 
                      checked={printMode} 
                      onChange={(e) => setPrintMode(e.target.checked)} 
                      className="accent-indigo-500 h-4 w-4"
                      aria-label="Toggle print mode"
                    />
                    Print
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowContrast((v) => !v)}
                    className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    title="Toggle contrast diagnostics"
                    aria-pressed={showContrast}
                    aria-label="Toggle contrast diagnostics panel"
                  >
                    {showContrast ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={copyEssentialsList}
                    className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border bg-white/90 dark:bg-slate-900 text-slate-700 dark:text-slate-100 hover:-translate-y-[1px] active:scale-95 transition"
                    style={{ borderColor: tokens.cards["card-panel-border"] }}
                  >
                    <FileText size={14} />
                    Copy quick kit
                  </button>
                </div>
              </div>
            </div>
          </div>
          </ErrorBoundary>
        </div>
      </header>

        {/* Main Content */}
        <main id="main-content" className="max-w-7xl mx-auto px-6 py-12 space-y-10">
          <section 
            className="relative overflow-hidden rounded-3xl border shadow-[0_40px_140px_-80px_rgba(0,0,0,0.6)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-500"
            style={{ 
              boxShadow: `0 35px 120px -80px ${tokens.brand.primary}aa`,
              backgroundImage: `linear-gradient(140deg, ${hexWithAlpha(tokens.surfaces["background"], 1)} 0%, ${hexWithAlpha(tokens.brand.primary, 0.32)} 45%, ${hexWithAlpha(tokens.brand.accent || tokens.brand.secondary || tokens.brand.primary, 0.32)} 90%)`,
              borderColor: tokens.cards["card-panel-border"]
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 20% 20%, ${hexWithAlpha('#ffffff', 0.08)}, transparent 35%)` }} />
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(120deg, ${hexWithAlpha(tokens.brand.secondary || tokens.brand.primary, 0.18)}, transparent 50%)` }} />
            <div className="relative p-6 md:p-10 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Apocapalette live</p>
                  <h2 className="text-3xl md:text-4xl font-black text-white">{displayThemeName}</h2>
                  <p className="text-sm text-slate-300">Base {baseColor.toUpperCase()} • {mode} • {themeMode === 'pop' ? 'Pop' : (isDark ? 'Dark' : 'Light')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-100">
                  <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/10">Live preview</span>
                  <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/10">Chaos tuned</span>
                </div>
              </div>
              <div 
                className="relative rounded-2xl overflow-hidden ring-1 bg-white/5 backdrop-blur-md transition-all duration-500 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
                style={{ 
                  backgroundColor: hexWithAlpha(tokens.surfaces["background"], 0.65),
                  boxShadow: `0 24px 70px -50px ${tokens.brand.primary}`,
                  borderColor: hexWithAlpha(tokens.cards["card-panel-border"], 0.5),
                  color: tokens.typography["text-strong"]
                }}
                aria-label={`Live palette preview showing ${displayThemeName}`}
              >
                {/* Fake Navigation */}
                <div className="h-12 border-b flex items-center px-4 gap-4" style={{ borderColor: tokens.surfaces["surface-plain-border"], backgroundColor: hexWithAlpha(tokens.surfaces["background"], 0.7) }}>
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                  <span className="text-xs font-semibold text-slate-200">Preview • Instant harmony</span>
                </div>

                <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Sidebar Simulation */}
                  <div className="space-y-4">
                    <div className="h-8 w-3/4 rounded mb-6" style={{ backgroundColor: tokens.brand.primary, opacity: 0.25 }}></div>
                    <div className="h-4 w-full rounded" style={{ backgroundColor: tokens.typography["text-muted"], opacity: 0.12 }}></div>
                    <div className="h-4 w-5/6 rounded" style={{ backgroundColor: tokens.typography["text-muted"], opacity: 0.12 }}></div>
                    <div className="h-4 w-4/6 rounded" style={{ backgroundColor: tokens.typography["text-muted"], opacity: 0.12 }}></div>
                  </div>

                  {/* Main Card Simulation */}
                  <div 
                    className="col-span-2 p-6 rounded-xl border shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_30px_90px_-60px_rgba(0,0,0,0.5)]"
                    style={{ 
                      backgroundColor: tokens.cards["card-panel-surface"],
                      borderColor: tokens.cards["card-panel-border"]
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-2xl font-extrabold" style={{ color: tokens.typography["heading"] }}>Thematic Output</h3>
                      <span className="text-[11px] px-3 py-1 rounded-full border" style={{ borderColor: tokens.brand.primary, color: tokens.brand.primary }}>Instant copy</span>
                    </div>
                    <p className="mb-6" style={{ color: tokens.typography["text-body"] }}>
                      Feel the palette first; tweak later. Surfaces, text, and primary action sit in balance so you can decide fast.
                    </p>
                    
                    <div className="flex flex-wrap gap-3">
                      <button className="px-4 py-2 rounded-lg font-semibold transition-transform active:scale-95 shadow-[0_10px_40px_-20px]" style={{ backgroundColor: tokens.brand.primary, color: '#fff', boxShadow: `0 12px 30px -18px ${tokens.brand.primary}` }}>
                        Primary Action
                      </button>
                      <button className="px-4 py-2 rounded-lg font-semibold border transition-transform active:scale-95"
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
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner"
                           style={{ backgroundColor: tokens.brand.accent, color: '#fff' }}>
                        <Check size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: tokens.entity["entity-card-heading"] }}>Entity Highlight</div>
                        <div className="text-xs opacity-80" style={{ color: tokens.typography["text-body"] }}>Unique component tokens</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick essentials */}
          <section className="space-y-3 motion-safe:animate-in motion-safe:fade-in duration-500">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Quick essentials</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tap to copy. Instant gratification before the deep dive.</p>
              </div>
              <button
                type="button"
                onClick={copyAllEssentials}
                className="text-xs font-bold px-4 py-2 rounded-full bg-slate-900 text-white hover:-translate-y-[2px] transition shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Copy all as hex list
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3">
              {quickEssentials.slice(0, 10).map(({ key, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => copyHexValue(color, `${key} hex`)}
                  className="group relative p-3 rounded-xl border shadow-sm flex flex-col gap-2 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl bg-white/80 dark:bg-slate-900/70"
                  style={{ borderColor: tokens.cards["card-panel-border"] }}
                  aria-label={`Copy ${key} ${color}`}
                >
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">{key}</span>
                  <div className="h-12 rounded-lg border" style={{ backgroundColor: color, borderColor: hexWithAlpha(color, 0.18) }} />
                  <span className="text-[11px] font-mono text-slate-700 dark:text-slate-100 uppercase tracking-wide">{color}</span>
                  <span className="absolute right-3 top-3 text-[10px] opacity-0 group-hover:opacity-80 text-slate-500">Copy</span>
                </button>
              ))}
            </div>
          </section>

          {/* Pinned swatch strip */}
          <div className="sticky top-16 z-10">
            <div
              className="rounded-2xl border bg-white/80 dark:bg-slate-900/70 shadow-sm px-4 py-3 flex items-center gap-3 overflow-x-auto snap-x snap-mandatory"
              aria-label="Pinned swatch strip — quick palette preview"
            >
              {quickEssentials.slice(0, 8).map(({ key, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => copyHexValue(color, `${key} hex`)}
                  className="min-w-[120px] flex-1 rounded-xl p-2 border shadow-sm snap-start text-left hover:-translate-y-0.5 transition"
                  style={{ backgroundColor: color, borderColor: hexWithAlpha(color, 0.25) }}
                  aria-label={`Copy ${key} ${color}`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-tight bg-white/80 text-slate-800 px-2 py-1 rounded-full inline-block shadow-sm">
                    {color}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex justify-center">
            <div
              role="tablist"
              aria-label="Palette views"
              className="inline-flex gap-2 p-1 rounded-full border bg-white/80 dark:bg-slate-900/60 shadow-sm"
            >
              {tabOptions.map((tab, index) => (
                <button
                  key={tab}
                  id={getTabId(tab)}
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`tab-panel-${index}`}
                  tabIndex={activeTab === tab ? 0 : -1}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      const dir = e.key === 'ArrowRight' ? 1 : -1;
                      const next = (index + dir + tabOptions.length) % tabOptions.length;
                      setActiveTab(tabOptions[next]);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                    activeTab === tab
                      ? 'bg-slate-900 text-white shadow-md dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-10">
            <div id="tab-panel-0" role="tabpanel" aria-labelledby={getTabId('Quick view')} hidden={activeTab !== 'Quick view'}>
              {activeTab === 'Quick view' && (
              <>
                <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Ordered stack" reset={reset} message={message} />}>
                  <div 
                    className="p-6 rounded-2xl border shadow-sm bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm"
                    style={{ 
                      borderColor: tokens.cards["card-panel-border"]
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Ordered token stack</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Aligned to the handoff order for quick scanning.</p>
                      </div>
                      <div className="text-[11px] px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">Click swatches to copy</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" role="list" aria-label="Ordered tokens">
                      {orderedSwatches.map(({ name, color }, index) => (
                        <ColorSwatch key={`${name}-${index}`} name={name} color={color} />
                      ))}
                    </div>
                  </div>
                </ErrorBoundary>

                {showContrast && (
                  <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Contrast checks" reset={reset} message={message} />}>
                    <Suspense fallback={<div className="p-4 rounded-lg border bg-white/70 dark:bg-slate-900/60 text-sm">Loading contrast…</div>}>
                      <ContrastPanel contrastChecks={contrastChecks} finalTokens={finalTokens} />
                    </Suspense>
                  </ErrorBoundary>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Cohesive palette</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Main families at a glance</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paletteRows.map((row) => (
                      <PaletteRow key={row.title} title={row.title} colors={row.colors} />
                    ))}
                  </div>
                </div>
              </>
            )}

            </div>

            <div id="tab-panel-1" role="tabpanel" aria-labelledby={getTabId('Full system')} hidden={activeTab !== 'Full system'}>
              {activeTab === 'Full system' && (
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

                {isInternal && (
                  <>
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
                  </>
                )}
              </div>
            )}

            </div>

            <div id="tab-panel-2" role="tabpanel" aria-labelledby={getTabId('Print assets')} hidden={activeTab !== 'Print assets'}>
              {activeTab === 'Print assets' && (
              <div className="space-y-4">
                {printMode ? (
                  <div 
                    className="print:hidden p-6 rounded-2xl border shadow-sm bg-amber-50/80 dark:bg-slate-900/60 backdrop-blur-sm"
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list" aria-label="Print hex swatches">
                          {canvaPrintHexes.map(({ name, color }) => (
                            <ColorSwatch key={name} name={name} color={color} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border shadow-sm bg-white/80 dark:bg-slate-900/60 text-sm text-slate-700 dark:text-slate-200">
                    <p className="font-semibold mb-2">Enable Print Mode to unlock the asset pack preview.</p>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">We’ll tune tokens for CMYK-safe values and add foil + ink layers before exporting.</p>
                    <button
                      type="button"
                      onClick={() => setPrintMode(true)}
                      className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:-translate-y-[1px] transition shadow"
                    >
                      Turn on Print Mode
                    </button>
                  </div>
                )}
              </div>
            )}

            </div>

            <div
              id="tab-panel-3"
              ref={exportsSectionRef}
              role="tabpanel"
              aria-labelledby={getTabId('Exports')}
              hidden={activeTab !== 'Exports'}
            >
              {activeTab === 'Exports' && (
              <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Exports" reset={reset} message={message} />}>
                <Suspense fallback={<div className="p-4 rounded-lg border bg-white/70 dark:bg-slate-900/60 text-sm">Loading exports…</div>}>
                  <ExportsPanel
                    tokens={finalTokens}
                    printMode={printMode}
                    isExporting={isExportingAssets}
                    exportError={exportError}
                    exportBlocked={exportBlocked}
                    canPrint={printSupported}
                    ctaTextColor={ctaTextColor}
                    neutralButtonTextColor={neutralButtonText}
                    onExportAssets={exportAllAssets}
                    onRetryAssets={exportAllAssets}
                    onExportPdf={handleExportPdf}
                    onExportPenpot={() => exportJson(`${displayThemeName}${printMode ? '-PRINT' : ''}.json`)}
                    onExportGeneric={() => exportGenericJson('generic-tokens.json')}
                    onExportFigmaTokens={() => exportFigmaTokensJson('figma-tokens.json')}
                    onExportStyleDictionary={() => exportStyleDictionaryJson('style-dictionary.json')}
                    onExportCssVars={exportCssVars}
                    onExportWitchcraft={() => exportWitchcraftJson('witchcraft-theme.json')}
                    isInternal={isInternal}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
            </div>
          </div>
        </main>
      </div>
  );
}
