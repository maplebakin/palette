import React, { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useNotification } from '../context/NotificationContext.jsx';

const isColorString = (val) => typeof val === 'string' && (
  /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(val) ||
  /^rgba?\(/i.test(val) ||
  /^hsla?\(/i.test(val)
);

const isDarkColor = (color) => {
  if (!color || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return false;
  const rgb = parseInt(color.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 120;
};

export default function ColorSwatch({ name, color }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');
  const [canCopy, setCanCopy] = useState(true);
  const { notify } = useNotification();

  useEffect(() => {
    const hasClipboard = typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
    const hasExec = typeof document !== 'undefined' && typeof document.execCommand === 'function';
    setCanCopy(Boolean(hasClipboard || hasExec));
  }, []);

  const handleCopy = async () => {
    const text = String(color ?? '');
    if (!canCopy) {
      notify('Copy is not supported in this browser', 'warn');
      setStatus('Copy not supported');
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
    setCopied(true);
    setStatus('Copied to clipboard');
    notify('Copied to clipboard', 'success', 1500);
    setTimeout(() => {
      setCopied(false);
      setStatus('');
    }, 1500);
  };

  const displayColor = typeof color === 'string' ? color : String(color ?? '');
  const swatchBg = isColorString(color) ? color : '#f8fafc';

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!canCopy}
      className="group panel-surface cursor-pointer flex items-center justify-between p-2 rounded-md transition-all hover:scale-[1.02] active:scale-95 border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--panel-accent)] focus-visible:ring-offset-2"
      aria-label={`Copy ${name} ${displayColor}`}
      aria-live="polite"
    >
      <div className="flex items-center gap-3 w-full">
        <div
          className="h-10 w-10 rounded-full border border-black/10 shadow-inner flex items-center justify-center shrink-0"
          style={{ backgroundColor: swatchBg }}
        >
          {copied && <Check size={16} className={isDarkColor(color) ? 'text-white' : 'text-black'} />}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold panel-muted uppercase tracking-wider truncate">{name}</span>
          <span className="text-sm font-mono panel-text truncate">{displayColor}</span>
        </div>
      </div>
      <Copy size={14} className="opacity-0 group-hover:opacity-30 panel-muted" aria-hidden />
      <span className="sr-only" aria-live="polite">{status}</span>
    </button>
  );
}
