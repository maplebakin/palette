import React, { useMemo } from 'react';
import { normalizeHex, pickReadableText } from '../lib/colorUtils';

const FONT_STACK = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const buildSwatchList = (tokens, baseColor) => {
  const brand = tokens.brand ?? {};
  const neutrals = tokens.foundation?.neutrals ?? {};
  return [
    brand.primary,
    brand.secondary,
    brand.accent,
    baseColor,
    neutrals['neutral-2'],
    neutrals['neutral-4'],
    neutrals['neutral-6'],
    neutrals['neutral-8'],
  ].filter(Boolean).slice(0, 8).map((color) => normalizeHex(color, color));
};

const buildTokenSnippet = (tokens) => ([
  ['brand.primary', tokens.brand?.primary],
  ['brand.secondary', tokens.brand?.secondary],
  ['brand.accent', tokens.brand?.accent],
  ['surfaces.background', tokens.surfaces?.background],
  ['cards.card-panel-surface', tokens.cards?.['card-panel-surface']],
  ['typography.text-body', tokens.typography?.['text-body']],
  ['typography.text-muted', tokens.typography?.['text-muted']],
  ['borders.border-subtle', tokens.borders?.['border-subtle']],
].filter(([, value]) => Boolean(value)));

export default function ListingAssetsCanvas({
  tokens,
  baseColor,
  mode,
  themeMode,
  displayThemeName,
  coverRef,
  swatchRef,
  snippetRef,
}) {
  const themeLabel = themeMode === 'pop' ? 'Pop' : (themeMode === 'dark' ? 'Dark' : 'Light');
  const swatches = useMemo(() => buildSwatchList(tokens, baseColor), [tokens, baseColor]);
  const snippetRows = useMemo(() => buildTokenSnippet(tokens), [tokens]);
  const baseHex = normalizeHex(baseColor, '#000000').toUpperCase();
  const headingColor = tokens.typography?.heading || tokens.typography?.['text-strong'] || '#111827';
  const bodyColor = tokens.typography?.['text-body'] || tokens.typography?.['text-muted'] || '#334155';
  const cardBg = tokens.cards?.['card-panel-surface'] || '#ffffff';
  const cardBorder = tokens.cards?.['card-panel-border'] || '#e2e8f0';
  const pageBg = tokens.surfaces?.background || '#f8fafc';
  const accent = tokens.brand?.primary || '#6366f1';
  const accentText = pickReadableText(accent);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '-99999px',
        top: 0,
        pointerEvents: 'none',
        opacity: 0,
        zIndex: -1,
      }}
    >
      <div
        ref={coverRef}
        style={{
          width: 1200,
          height: 1200,
          backgroundColor: pageBg,
          color: headingColor,
          fontFamily: FONT_STACK,
          boxSizing: 'border-box',
          padding: 80,
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 32,
            backgroundColor: cardBg,
            border: `1px solid ${cardBorder}`,
            padding: 56,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                lineHeight: 1.1,
                maxWidth: 900,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayThemeName}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                `Base ${baseHex}`,
                mode,
                themeLabel,
              ].map((label) => (
                <span
                  key={label}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: `1px solid ${cardBorder}`,
                    color: bodyColor,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    opacity: 0.68,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 32, fontSize: 16, color: bodyColor }}>
              Canonical tokens + CSS variables + Figma tokens
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {swatches.map((swatch, index) => (
              <div
                key={`swatch-${index}`}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 18,
                  backgroundColor: swatch,
                  border: `2px solid ${cardBorder}`,
                  boxShadow: `0 12px 28px -20px ${swatch}`,
                }}
              />
            ))}
          </div>
          <div
            style={{
              marginTop: 24,
              padding: '16px 20px',
              borderRadius: 20,
              backgroundColor: accent,
              color: accentText,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '0.02em',
              width: 'fit-content',
            }}
          >
            Listing Pack v1
          </div>
        </div>
      </div>

      <div
        ref={swatchRef}
        style={{
          width: 1600,
          height: 400,
          backgroundColor: pageBg,
          color: headingColor,
          fontFamily: FONT_STACK,
          boxSizing: 'border-box',
          padding: '48px 60px',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
          Swatch strip • {displayThemeName}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 18 }}>
          {swatches.map((swatch, index) => (
            <div
              key={`swatch-strip-${index}`}
              style={{
                height: 220,
                borderRadius: 20,
                backgroundColor: swatch,
                border: `2px solid ${cardBorder}`,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: 16,
                fontSize: 14,
                fontWeight: 700,
                color: pickReadableText(swatch),
                boxSizing: 'border-box',
              }}
            >
              {swatch.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      <div
        ref={snippetRef}
        style={{
          width: 1200,
          height: 600,
          backgroundColor: pageBg,
          color: headingColor,
          fontFamily: FONT_STACK,
          boxSizing: 'border-box',
          padding: 56,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
          Token snapshot
        </div>
        <div
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 24,
            padding: 24,
            fontFamily: MONO_STACK,
            fontSize: 15,
            color: bodyColor,
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        >
          {snippetRows.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ opacity: 0.8 }}>{label}</span>
              <span style={{ fontWeight: 700 }}>{String(value).toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
