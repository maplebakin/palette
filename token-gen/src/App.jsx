import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Check, Sun, Moon, Palette, Type, Box, Grid, Layers, Droplet, Download, Wand2, Printer, FileText, Image, EyeOff, Shuffle, Eye, Save, FolderOpen } from 'lucide-react';
import ColorSwatch from './components/ColorSwatch';
import Section from './components/Section';
import ExportsPanel from './components/ExportsPanel';
import ContrastPanel from './components/ContrastPanel';
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
  const { notify } = useNotification();
  const isInternal = import.meta.env.VITE_INTERNAL === 'true';
  const [baseColor, setBaseColor] = useState('#6366f1');
  const [baseInput, setBaseInput] = useState('#6366f1');
  const [baseError, setBaseError] = useState('');
  const [mode, setMode] = useState('Monochromatic');
  const [isDark, setIsDark] = useState(false); // Controls the GENERATED tokens
  const [printMode, setPrintMode] = useState(false);
  const [customThemeName, setCustomThemeName] = useState('');
  const [showContrast, setShowContrast] = useState(true);
  const [harmonyIntensity, setHarmonyIntensity] = useState(100);
  const [apocalypseIntensity, setApocalypseIntensity] = useState(100);
  const [neutralCurve, setNeutralCurve] = useState(100);
  const [accentStrength, setAccentStrength] = useState(100);
  const [tokenPrefix, setTokenPrefix] = useState('');
  const [savedPalettes, setSavedPalettes] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageCorrupt, setStorageCorrupt] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportBlocked, setExportBlocked] = useState(false);
  const [printSupported, setPrintSupported] = useState(true);
  const [isExportingAssets, setIsExportingAssets] = useState(false);
  const [printMeta, setPrintMeta] = useState(() => getPrintTimestamps());
  const savedTitleRef = useRef('');
  const statusTimerRef = useRef(null);
  const pickerColor = baseColor.length === 9 && baseColor.startsWith('#') ? baseColor.slice(0, 7) : baseColor;
  // Controls the UI theme (preview background)
  // Usually we want this to sync with generated tokens for best preview, but nice to keep separate for inspection
  // For this UX, I will sync them. When you generate Dark Tokens, the UI becomes dark.

  useDarkClassSync(isDark);

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

  const applySavedPalette = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return;
    const sanitized = sanitizeColorInput(payload.baseColor, '#6366f1');
    setBaseColor(sanitized);
    setBaseInput(sanitized);
    setBaseError('');
    setMode(payload.mode || 'Monochromatic');
    setIsDark(Boolean(payload.isDark));
    setPrintMode(Boolean(payload.printMode));
    setCustomThemeName(payload.customThemeName || '');
    setHarmonyIntensity(payload.harmonyIntensity ?? 100);
    setApocalypseIntensity(payload.apocalypseIntensity ?? 100);
    setNeutralCurve(payload.neutralCurve ?? 100);
    setAccentStrength(payload.accentStrength ?? 100);
    setTokenPrefix(payload.tokenPrefix || '');
  }, [sanitizeColorInput]);

  const handleBaseColorChange = useCallback((value) => {
    setBaseInput(value);
    const match = value.match(/^#[0-9a-fA-F]{3,8}$/);
    if (!match) {
      setBaseError('Enter a hex value like #FF00FF or #ABC');
      return;
    }
    let next = match[0];
    if (next.length === 9) next = next.slice(0, 7); // strip alpha for generation
    setBaseError('');
    setBaseColor(next);
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
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEYS.saved);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed)) setSavedPalettes(parsed);
        else setStorageCorrupt(true);
      }
      const currentRaw = localStorage.getItem(STORAGE_KEYS.current);
      if (currentRaw) {
        const parsed = JSON.parse(currentRaw);
        applySavedPalette(parsed);
      }
    } catch (err) {
      console.warn('Failed to hydrate palette state', err);
      setStorageCorrupt(true);
      notify('Could not load saved palettes; storage may be blocked or corrupted', 'warn');
    }
  }, [applySavedPalette, notify]);

  useEffect(() => {
    try {
      const payload = {
        baseColor,
        mode,
        isDark,
        printMode,
        customThemeName,
        harmonyIntensity,
        apocalypseIntensity,
        neutralCurve,
        accentStrength,
        tokenPrefix,
      };
      localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to persist palette state', err);
      setStorageAvailable(false);
      notify('Saving is unavailable; storage is blocked', 'warn');
    }
  }, [baseColor, mode, isDark, printMode, customThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve, accentStrength, tokenPrefix, notify]);

  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  const autoThemeName = useMemo(() => `${mode} ${isDark ? 'Dark' : 'Light'}`, [mode, isDark]);
  const displayThemeName = customThemeName || autoThemeName;
  const tokens = useMemo(
    () => generateTokens(baseColor, mode, isDark, apocalypseIntensity, {
      harmonyIntensity,
      neutralCurve,
      accentStrength,
    }),
    [baseColor, mode, isDark, apocalypseIntensity, harmonyIntensity, neutralCurve, accentStrength]
  );
  const setStatusMessage = useCallback((message, tone = 'info') => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setSaveStatus(message);
    notify(message, tone);
    statusTimerRef.current = setTimeout(() => setSaveStatus(''), 2400);
  }, [notify]);

  const serializePalette = useCallback(() => ({
    id: Date.now(),
    name: displayThemeName,
    baseColor,
    mode,
    isDark,
    printMode,
    customThemeName,
    harmonyIntensity,
    apocalypseIntensity,
    neutralCurve,
    accentStrength,
    tokenPrefix,
  }), [displayThemeName, baseColor, mode, isDark, printMode, customThemeName, harmonyIntensity, apocalypseIntensity, neutralCurve, accentStrength, tokenPrefix]);

  const saveCurrentPalette = useCallback(() => {
    if (!storageAvailable) {
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
      setStatusMessage('Save failed — check storage permissions', 'error');
      setStorageCorrupt(true);
    }
  }, [serializePalette, setStatusMessage, storageAvailable]);

  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.saved);
      localStorage.removeItem(STORAGE_KEYS.current);
      setSavedPalettes([]);
      setStorageCorrupt(false);
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
    setIsDark(p.dark);
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
    setIsDark(nextDark);
    setHarmonyIntensity(Math.round(70 + Math.random() * 80));
    setNeutralCurve(Math.round(80 + Math.random() * 50));
    setAccentStrength(Math.round(80 + Math.random() * 50));

    if (nextMode === 'Apocalypse') {
      setApocalypseIntensity(Math.round(50 + Math.random() * 100));
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    setStatusMessage(`Theme set to ${!isDark ? 'Dark' : 'Light'}`, 'info');
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
      tokenPrefix: tokenPrefix || undefined,
    },
    { namingPrefix: tokenPrefix }
  ), [finalTokens, orderedStack, displayThemeName, mode, baseColor, isDark, printMode, tokenPrefix]);

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
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
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

  const exportFigmaTokensJson = (filename) => {
    const payload = buildFigmaTokensPayload(finalTokens, { namingPrefix: tokenPrefix || undefined });
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const exportStyleDictionaryJson = (filename) => {
    const payload = buildStyleDictionaryPayload(finalTokens, { namingPrefix: tokenPrefix || undefined });
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

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

        {(!storageAvailable || storageCorrupt) && (
          <div className="max-w-7xl mx-auto px-6 py-3 mb-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 flex items-center justify-between gap-3" role="alert">
            <div className="text-sm font-semibold">
              {storageCorrupt ? 'Saved palettes look corrupted. Save/load is disabled.' : 'Local storage is blocked; saving is disabled.'}
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
                  onChange={(e) => handleBaseColorChange(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" 
                  aria-label="Choose base color"
                />
                <input 
                  type="text" 
                  value={baseInput}
                  onChange={(e) => handleBaseColorChange(e.target.value)}
                  className={`w-32 bg-transparent text-sm font-mono text-slate-700 dark:text-slate-300 outline-none uppercase ${baseError ? 'border-b border-rose-500' : ''}`}
                  aria-label="Base color hex value"
                  aria-invalid={Boolean(baseError)}
                />
              </div>
              {baseError && <p className="text-xs text-rose-600 font-semibold" role="alert">{baseError}</p>}


              {/* Theme Name */}
              <input
                type="text"
                value={customThemeName}
                onChange={(e) => setCustomThemeName(e.target.value)}
                placeholder={autoThemeName}
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                aria-label="Theme name"
              />

              <input
                type="text"
                value={tokenPrefix}
                onChange={(e) => setTokenPrefix(e.target.value.trim())}
                placeholder="Token prefix (optional)"
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              />

              {/* Presets */}
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

              <button
                type="button"
                onClick={randomize}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Randomize"
              >
                <Shuffle size={18} />
              </button>

              <a
                href="docs/README.md"
                className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Docs
              </a>

              {/* Mode Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700" role="group" aria-label="Harmony mode">
                {['Monochromatic', 'Analogous', 'Complementary', 'Tertiary', 'Apocalypse'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      mode === m 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    } focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
                    aria-pressed={mode === m}
                    aria-label={`Set harmony mode to ${m}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Harmony spread</span>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={harmonyIntensity}
                  onChange={(e) => setHarmonyIntensity(clampValue(e.target.value, 50, 160))}
                  className="w-32 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Adjust harmony spread"
                />
                <span className="text-xs w-10 text-right font-mono text-slate-600 dark:text-slate-300">{harmonyIntensity}%</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Neutral depth</span>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={neutralCurve}
                  onChange={(e) => setNeutralCurve(clampValue(e.target.value, 60, 140))}
                  className="w-32 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Adjust neutral depth"
                />
                <span className="text-xs w-10 text-right font-mono text-slate-600 dark:text-slate-300">{neutralCurve}%</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Accent punch</span>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={accentStrength}
                  onChange={(e) => setAccentStrength(clampValue(e.target.value, 60, 140))}
                  className="w-32 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Adjust accent punch"
                />
                <span className="text-xs w-10 text-right font-mono text-slate-600 dark:text-slate-300">{accentStrength}%</span>
              </div>

              {mode === 'Apocalypse' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-slate-800 border border-rose-200 dark:border-rose-800">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Apocalypse drive</span>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    value={apocalypseIntensity}
                    onChange={(e) => setApocalypseIntensity(clampValue(e.target.value, 20, 150))}
                    className="w-32 accent-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500"
                    aria-label="Adjust apocalypse intensity"
                  />
                  <span className="text-xs w-10 text-right font-mono text-rose-700 dark:text-rose-200">{apocalypseIntensity}%</span>
                </div>
              )}

{/* Dark/Light Toggle */}
               <button 
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                aria-pressed={isDark}
              >
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
                <span className="text-xs font-bold">{isDark ? "Dark Mode" : "Light Mode"}</span>
              </button>

          <button
            type="button"
            onClick={() => setShowContrast((v) => !v)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            title="Toggle contrast diagnostics"
            aria-pressed={showContrast}
            aria-label="Toggle contrast diagnostics panel"
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
                  aria-label="Toggle print mode"
                />
                <span>Print Mode (CMYK-safe + foil tokens)</span>
              </label>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={saveCurrentPalette}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                aria-label="Save current palette to browser"
                disabled={!storageAvailable}
              >
                <Save size={14} />
                Save palette
                </button>
                <div className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-slate-500" aria-hidden />
                  <select
                    onChange={(e) => { loadSavedPalette(e.target.value); e.target.value = ''; }}
                    className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    defaultValue=""
                    aria-label="Load a saved palette"
                  >
                    <option value="" disabled>Load saved…</option>
                    {savedPalettes.map((palette) => (
                      <option key={palette.id} value={palette.id}>
                        {palette.name}
                      </option>
                    ))}
                  </select>
                </div>
                {saveStatus && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300" role="status" aria-live="polite">{saveStatus}</span>
                )}
                {!storageAvailable && (
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300" role="alert">
                    Saving disabled (storage blocked)
                  </span>
                )}
              </div>
            </div>
          </div>
          </ErrorBoundary>
        </div>
      </header>

        {/* Main Content */}
        <main id="main-content" className="max-w-7xl mx-auto px-6 py-12">
          <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Exports" reset={reset} message={message} />}>
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
              onExportWitchcraft={() => exportWitchcraftJson('witchcraft-theme.json')}
              isInternal={isInternal}
            />
          </ErrorBoundary>

          {showContrast && (
            <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Contrast checks" reset={reset} message={message} />}>
              <ContrastPanel contrastChecks={contrastChecks} finalTokens={finalTokens} />
            </ErrorBoundary>
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

        <ErrorBoundary resetMode="soft" fallback={({ reset, message }) => <SectionFallback label="Ordered stack" reset={reset} message={message} />}>
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
        </ErrorBoundary>
        
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
        </main>
      </div>
  );
}
