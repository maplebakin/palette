import { normalizeHex } from './colorUtils.js';

const readToken = (tokens, path) => path.split('.').reduce((next, key) => next?.[key], tokens);

export const pickPreviewToken = (tokens, paths, fallback) => {
  for (const path of paths) {
    const value = readToken(tokens, path);
    if (typeof value === 'string' && value.trim()) {
      return normalizeHex(value, fallback);
    }
  }
  return normalizeHex(fallback, '#000000');
};

export const buildPreviewRoleTokens = (tokens = {}, themeMode = 'light') => {
  const isPop = themeMode === 'pop';
  const isLight = themeMode === 'light';
  const isDark = themeMode === 'dark';
  const background = pickPreviewToken(tokens, ['surfaces.background', 'cards.card-page-bg'], '#ffffff');
  const surface = pickPreviewToken(tokens, ['cards.card-panel-surface', 'surfaces.surface', 'surfaces.surface-plain'], background);
  const cleanSurface = isLight
    ? pickPreviewToken(tokens, ['entity.entity-card-surface', 'cards.card-panel-surface-strong', 'surfaces.header-background', 'cards.card-panel-surface'], surface)
    : surface;
  const text = pickPreviewToken(tokens, ['typography.text-body', 'typography.text-strong', 'textPalette.text-primary'], '#111827');
  const mutedText = pickPreviewToken(tokens, ['typography.text-muted', 'typography.footer-text-muted'], text);
  const border = pickPreviewToken(tokens, ['cards.card-panel-border', 'borders.border-subtle'], surface);
  const accent = pickPreviewToken(tokens, ['brand.accent', 'brand.secondary', 'brand.primary'], '#6366f1');
  const cta = isPop
    ? pickPreviewToken(tokens, ['brand.cta', 'actions.primary', 'pop.pop-cta', 'brand.primary'], accent)
    : pickPreviewToken(tokens, ['actions.primary', 'brand.cta', 'brand.primary'], accent);
  const ctaForeground = isPop
    ? pickPreviewToken(tokens, ['pop.pop-cta-foreground', 'actions.primary-foreground'], '#ffffff')
    : pickPreviewToken(tokens, ['actions.primary-foreground'], '#ffffff');
  const secondaryAction = pickPreviewToken(tokens, ['actions.secondary', 'brand.secondary', 'borders.border-accent-strong'], accent);
  const secondaryActionBorder = pickPreviewToken(tokens, ['actions.secondary-border', 'actions.secondary', 'borders.border-accent-strong'], secondaryAction);
  const secondaryActionForeground = isLight
    ? secondaryActionBorder
    : pickPreviewToken(tokens, ['actions.secondary-foreground', 'typography.text-strong'], text);
  const entityHighlightBg = isDark
    ? pickPreviewToken(tokens, ['entity.entity-card-glow', 'entity.entity-card-surface', 'cards.card-panel-surface'], surface)
    : pickPreviewToken(tokens, ['entity.entity-highlight-bg', 'entity.entity-card-highlight', 'entity.entity-card-surface'], surface);
  const entityHighlightAccent = isDark
    ? pickPreviewToken(tokens, ['entity.entity-highlight-accent', 'actions.secondary', 'entity.entity-card-heading'], accent)
    : pickPreviewToken(tokens, ['entity.entity-highlight-accent', 'entity.entity-card-heading'], accent);
  const entityHighlightText = pickPreviewToken(tokens, ['entity.entity-highlight-text', 'entity.entity-card-heading', 'typography.text-body'], text);
  const entityHighlightBorder = isDark
    ? pickPreviewToken(tokens, ['entity.entity-card-border', 'entity.entity-highlight-border'], border)
    : pickPreviewToken(tokens, ['entity.entity-highlight-border', 'entity.entity-card-border'], border);
  const shellBg = isLight
    ? pickPreviewToken(tokens, ['surfaces.background', 'surfaces.page-background'], background)
    : background;
  const panelBg = isLight ? cleanSurface : surface;
  const cardBg = isLight ? cleanSurface : surface;
  const utilityAccent = isLight
    ? pickPreviewToken(tokens, ['brand.primary'], accent)
    : accent;

  return {
    background,
    surface,
    shellBg,
    panelBg,
    cardBg,
    text,
    mutedText,
    border,
    accent,
    utilityAccent,
    cta,
    ctaForeground,
    secondaryAction,
    secondaryActionForeground,
    secondaryActionBorder,
    entityHighlightBg,
    entityHighlightAccent,
    entityHighlightText,
    entityHighlightBorder,
  };
};

export const buildPreviewQuickEssentials = (previewRoles = {}) => ([
  { key: 'Preview shell', color: previewRoles.shellBg },
  { key: 'Preview card', color: previewRoles.cardBg },
  { key: 'Primary action', color: previewRoles.cta },
  { key: 'Primary text', color: previewRoles.ctaForeground },
  { key: 'Secondary', color: previewRoles.secondaryActionBorder },
  { key: 'Entity fill', color: previewRoles.entityHighlightBg },
  { key: 'Entity accent', color: previewRoles.entityHighlightAccent },
  { key: 'Entity text', color: previewRoles.entityHighlightText },
  { key: 'Entity border', color: previewRoles.entityHighlightBorder },
  { key: 'Body text', color: previewRoles.text },
]).filter(({ color }) => Boolean(color));

export const buildPreviewPaletteRow = (previewRoles = {}) => ({
  title: 'Preview UI Roles',
  colors: [
    { name: 'shell-bg', color: previewRoles.shellBg },
    { name: 'card-bg', color: previewRoles.cardBg },
    { name: 'primary-action', color: previewRoles.cta },
    { name: 'secondary-border', color: previewRoles.secondaryActionBorder },
    { name: 'secondary-text', color: previewRoles.secondaryActionForeground },
    { name: 'entity-bg', color: previewRoles.entityHighlightBg },
    { name: 'entity-accent', color: previewRoles.entityHighlightAccent },
    { name: 'entity-text', color: previewRoles.entityHighlightText },
    { name: 'entity-border', color: previewRoles.entityHighlightBorder },
  ].filter(({ color }) => Boolean(color)),
});
