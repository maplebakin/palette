import { colord } from 'colord';
import { flattenTokens } from '../theme/paths.js';
import { getContrastRatio, normalizeHex } from '../colorUtils.js';
import { buildThemePackExportData } from './workflowExports.js';
import { exportAssets } from './exportUtils.js';

// WitchClick contract 1.0.0, copied from its Autumn Window 1.0.0 catalogue.
// Separate from the marketplace manifest. Candidate order is intentional.
export const WITCHCLICK_ROLES = [
  {"id": "surface.base", "requirement": "required", "variable": "--wc-kit-surface-base", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["surfaces.background", "surfaces.page-background"]},
  {"id": "surface.panel", "requirement": "required", "variable": "--wc-kit-surface-panel", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["surfaces.panel", "cards.card-panel-surface", "aliases.surface-panel-primary"]},
  {"id": "surface.card", "requirement": "required", "variable": "--wc-kit-surface-card", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["surfaces.card", "cards.card-panel-surface"]},
  {"id": "surface.elevated", "requirement": "required", "variable": "--wc-kit-surface-elevated", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["surfaces.elevated", "cards.card-panel-surface-strong"]},
  {"id": "surface.hover", "requirement": "required", "variable": "--wc-kit-surface-hover", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["surfaces.hover", "aliases.surface-card-hover"]},
  {"id": "surface.muted", "requirement": "required", "variable": "--wc-kit-surface-muted", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["surfaces.muted", "aliases.surface-muted"]},
  {"id": "border.subtle", "requirement": "required", "variable": "--wc-kit-border-subtle", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["borders.border-subtle", "cards.card-panel-border-soft"]},
  {"id": "border.strong", "requirement": "required", "variable": "--wc-kit-border-strong", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["borders.border-strong", "cards.card-panel-border-strong"]},
  {"id": "text.strong", "requirement": "required", "variable": "--wc-kit-text-strong", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["typography.text-strong", "textPalette.text-primary", "typography.heading"]},
  {"id": "text.body", "requirement": "required", "variable": "--wc-kit-text-body", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["typography.text-body", "textPalette.text-secondary"]},
  {"id": "text.muted", "requirement": "required", "variable": "--wc-kit-text-muted", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["typography.text-muted", "textPalette.text-tertiary"]},
  {"id": "link.foreground", "requirement": "required", "variable": "--wc-kit-link-foreground", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["brand.link-color", "textPalette.link-color"]},
  {"id": "action.background", "requirement": "required", "variable": "--wc-kit-action-background", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["actions.primary", "brand.cta"]},
  {"id": "action.foreground", "requirement": "required", "variable": "--wc-kit-action-foreground", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["actions.primary-foreground", "brand.on-cta"]},
  {"id": "action.border", "requirement": "required", "variable": "--wc-kit-action-border", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["actions.primary-border", "brand.cta-border"]},
  {"id": "action.hover.background", "requirement": "required", "variable": "--wc-kit-action-hover-background", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["actions.primary-hover", "brand.cta-hover"]},
  {"id": "action.hover.border", "requirement": "required", "variable": "--wc-kit-action-hover-border", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["actions.primary-hover-border", "brand.cta-hover-border"]},
  {"id": "card.background", "requirement": "required", "variable": "--wc-kit-card-background", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["cards.card-panel-surface"]},
  {"id": "card.hover.background", "requirement": "required", "variable": "--wc-kit-card-hover-background", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["cards.card-panel-hover", "aliases.surface-card-hover"]},
  {"id": "card.foreground", "requirement": "required", "variable": "--wc-kit-card-foreground", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["cards.card-panel-text", "typography.text-body"]},
  {"id": "card.heading", "requirement": "required", "variable": "--wc-kit-card-heading", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["cards.card-panel-heading", "typography.heading"]},
  {"id": "card.muted", "requirement": "required", "variable": "--wc-kit-card-muted", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["cards.card-panel-muted", "typography.text-muted"]},
  {"id": "card.border", "requirement": "required", "variable": "--wc-kit-card-border", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["cards.card-panel-border-soft", "cards.card-panel-border"]},
  {"id": "card.border.strong", "requirement": "required", "variable": "--wc-kit-card-border-strong", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["cards.card-panel-border-strong"]},
  {"id": "tag.background", "requirement": "required", "variable": "--wc-kit-tag-background", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["cards.card-tag-bg"]},
  {"id": "tag.foreground", "requirement": "required", "variable": "--wc-kit-tag-foreground", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["cards.card-tag-text", "cards.on-card-tag-bg"]},
  {"id": "tag.border", "requirement": "required", "variable": "--wc-kit-tag-border", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["cards.card-tag-border"]},
  {"id": "header.background", "requirement": "required", "variable": "--wc-kit-header-background", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["surfaces.header-background"]},
  {"id": "header.border", "requirement": "required", "variable": "--wc-kit-header-border", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["borders.header-border", "borders.border-subtle"]},
  {"id": "header.foreground", "requirement": "required", "variable": "--wc-kit-header-foreground", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["typography.header-text", "typography.text-body"]},
  {"id": "header.heading", "requirement": "required", "variable": "--wc-kit-header-heading", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["typography.header-heading", "typography.heading"]},
  {"id": "header.link", "requirement": "required", "variable": "--wc-kit-header-link", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["brand.header-link", "brand.link-color", "textPalette.link-color"]},
  {"id": "footer.background", "requirement": "required", "variable": "--wc-kit-footer-background", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["surfaces.footer-background"]},
  {"id": "footer.border", "requirement": "required", "variable": "--wc-kit-footer-border", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["borders.footer-border"]},
  {"id": "footer.foreground", "requirement": "required", "variable": "--wc-kit-footer-foreground", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["typography.footer-text"]},
  {"id": "footer.muted", "requirement": "required", "variable": "--wc-kit-footer-muted", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["typography.footer-text-muted"]},
  {"id": "footer.link", "requirement": "required", "variable": "--wc-kit-footer-link", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["brand.footer-link", "brand.link-color", "textPalette.link-color"]},
  {"id": "entity.surface.top", "requirement": "required", "variable": "--wc-kit-entity-surface-top", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["entity.entity-card-surface-top", "entity.entity-card-surface"]},
  {"id": "entity.surface.bottom", "requirement": "required", "variable": "--wc-kit-entity-surface-bottom", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["entity.entity-card-surface-bottom", "entity.entity-card-surface"]},
  {"id": "entity.highlight", "requirement": "optional", "variable": "--wc-kit-entity-highlight", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["entity.entity-card-highlight", "entity.entity-highlight-bg"]},
  {"id": "entity.glow", "requirement": "optional", "variable": "--wc-kit-entity-glow", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["entity.entity-card-glow"]},
  {"id": "entity.heading", "requirement": "required", "variable": "--wc-kit-entity-heading", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["entity.entity-card-heading"]},
  {"id": "entity.foreground", "requirement": "required", "variable": "--wc-kit-entity-foreground", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["entity.entity-card-text", "entity.on-entity-card-surface"]},
  {"id": "entity.muted", "requirement": "required", "variable": "--wc-kit-entity-muted", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["entity.entity-card-muted"]},
  {"id": "entity.border", "requirement": "required", "variable": "--wc-kit-entity-border", "classification": "ADAPTER RECIPE", "owningLayer": "Global entity-card token adapter in tokens.css", "candidates": ["entity.entity-card-border"]},
  {"id": "entity.action", "requirement": "required", "variable": "--wc-kit-entity-action", "classification": "KIT ROLE", "owningLayer": "Autumn Window semantic accent aliases", "candidates": ["entity.entity-card-cta"]},
  {"id": "entity.action.hover", "requirement": "optional", "variable": "--wc-kit-entity-action-hover", "classification": "KIT ROLE", "owningLayer": "Autumn Window semantic accent aliases", "candidates": ["entity.entity-card-cta-hover"]},
  {"id": "entity.icon", "requirement": "optional", "variable": "--wc-kit-entity-icon", "classification": "COMPONENT/DATA-OWNED", "owningLayer": "EntityHubCard component plus type metadata", "candidates": ["entity.entity-card-icon"]},
  {"id": "focus.foreground", "requirement": "required", "variable": "--wc-kit-focus-foreground", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["focus.ring", "brand.focus-ring", "actions.focus-ring", "borders.focus-ring", "aliases.focus-ring"]},
  {"id": "focus.base", "requirement": "required", "variable": "--wc-kit-focus-base", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["focus.base"]},
  {"id": "comfort.surface", "requirement": "required", "variable": "--wc-kit-comfort-surface", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["comfort.surface"]},
  {"id": "comfort.foreground", "requirement": "required", "variable": "--wc-kit-comfort-foreground", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["comfort.foreground"]},
  {"id": "comfort.foreground.strong", "requirement": "required", "variable": "--wc-kit-comfort-foreground-strong", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["comfort.foreground-strong"]},
  {"id": "comfort.input.background", "requirement": "required", "variable": "--wc-kit-comfort-input-background", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["comfort.input-background"]},
  {"id": "comfort.input.hover.background", "requirement": "required", "variable": "--wc-kit-comfort-input-hover-background", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["comfort.input-hover-background"]},
  {"id": "comfort.input.border", "requirement": "required", "variable": "--wc-kit-comfort-input-border", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["comfort.input-border"]},
  {"id": "comfort.input.focus", "requirement": "required", "variable": "--wc-kit-comfort-input-focus", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["comfort.input-focus"]},
  {"id": "comfort.chip.background", "requirement": "optional", "variable": "--wc-kit-comfort-chip-background", "classification": "ADAPTER RECIPE", "owningLayer": "Legacy comfort token recipes in base.css", "candidates": ["comfort.chip-background"]},
  {"id": "comfort.chip.border", "requirement": "optional", "variable": "--wc-kit-comfort-chip-border", "classification": "ADAPTER RECIPE", "owningLayer": "Legacy comfort token recipes in base.css", "candidates": ["comfort.chip-border"]},
  {"id": "comfort.chip.accent", "requirement": "optional", "variable": "--wc-kit-comfort-chip-accent", "classification": "ADAPTER RECIPE", "owningLayer": "Legacy comfort token recipe with Autumn Window accent aliases", "candidates": ["comfort.chip-accent"]},
  {"id": "comfort.tray.background", "requirement": "optional", "variable": "--wc-kit-comfort-tray-background", "classification": "ADAPTER RECIPE", "owningLayer": "Legacy comfort token recipes in base.css", "candidates": ["comfort.tray-background"]},
  {"id": "comfort.tray.border", "requirement": "optional", "variable": "--wc-kit-comfort-tray-border", "classification": "ADAPTER RECIPE", "owningLayer": "Legacy comfort token recipes in base.css", "candidates": ["comfort.tray-border"]},
  {"id": "comfort.hint", "requirement": "optional", "variable": "--wc-kit-comfort-hint", "classification": "ADAPTER RECIPE", "owningLayer": "Legacy comfort token recipes using Autumn Window muted text", "candidates": ["comfort.hint"]},
  {"id": "brand.mulberry", "requirement": "required", "variable": "--wc-kit-brand-mulberry", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["brand.mulberry", "brand.primary"]},
  {"id": "brand.window-blue", "requirement": "required", "variable": "--wc-kit-brand-window-blue", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["brand.window-blue", "brand.accent"]},
  {"id": "spoon.low", "requirement": "required", "variable": "--wc-kit-spoon-low", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["spoon.low", "effort.low", "foundation.spoon.low", "foundation.effort.low"]},
  {"id": "spoon.medium", "requirement": "required", "variable": "--wc-kit-spoon-medium", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["spoon.medium", "effort.medium", "foundation.spoon.medium", "foundation.effort.medium"]},
  {"id": "spoon.high", "requirement": "required", "variable": "--wc-kit-spoon-high", "classification": "KIT ROLE", "owningLayer": "Apocapalette final colour tokens", "candidates": ["spoon.high", "effort.high", "foundation.spoon.high", "foundation.effort.high"]},
  {"id": "status.success.foreground", "requirement": "required", "variable": "--wc-kit-status-success-foreground", "classification": "ADAPTER RECIPE", "owningLayer": "Global form-status component plus Tailwind status adapter", "candidates": ["status.success-foreground", "status.success.foreground", "foundation.status.success-foreground"]},
  {"id": "status.success.background", "requirement": "required", "variable": "--wc-kit-status-success-background", "classification": "ADAPTER RECIPE", "owningLayer": "Tailwind semantic status-color adapter; no form-status surface owner", "candidates": ["status.success-background", "status.success.background", "foundation.status.success-background"]},
  {"id": "status.warning.foreground", "requirement": "required", "variable": "--wc-kit-status-warning-foreground", "classification": "UNRESOLVED", "owningLayer": "No global Autumn Window status token; Tailwind status adapter and page-local hub accents", "candidates": ["status.warning-foreground", "status.warning.foreground", "foundation.status.warning-foreground"]},
  {"id": "status.warning.background", "requirement": "required", "variable": "--wc-kit-status-warning-background", "classification": "ADAPTER RECIPE", "owningLayer": "Tailwind semantic status-color adapter; no form-status surface owner", "candidates": ["status.warning-background", "status.warning.background", "foundation.status.warning-background"]},
  {"id": "status.error.foreground", "requirement": "required", "variable": "--wc-kit-status-error-foreground", "classification": "ADAPTER RECIPE", "owningLayer": "Global form-status component plus Tailwind status adapter", "candidates": ["status.error-foreground", "status.error.foreground", "foundation.status.error-foreground"]},
  {"id": "status.error.background", "requirement": "required", "variable": "--wc-kit-status-error-background", "classification": "ADAPTER RECIPE", "owningLayer": "Tailwind semantic status-color adapter; no form-status surface owner", "candidates": ["status.error-background", "status.error.background", "foundation.status.error-background"]},
  {"id": "status.info.foreground", "requirement": "required", "variable": "--wc-kit-status-info-foreground", "classification": "UNRESOLVED", "owningLayer": "No global Autumn Window status token; Tailwind status adapter and page-local hub accents", "candidates": ["status.info-foreground", "status.info.foreground", "foundation.status.info-foreground"]},
  {"id": "status.info.background", "requirement": "required", "variable": "--wc-kit-status-info-background", "classification": "ADAPTER RECIPE", "owningLayer": "Tailwind semantic status-color adapter; no form-status surface owner", "candidates": ["status.info-background", "status.info.background", "foundation.status.info-background"]}
];

export const WITCHCLICK_CONTRAST_PAIRS = [
  ["text.strong", "surface.base", "text strong on page"],
  ["text.strong", "surface.panel", "text strong on panel"],
  ["text.strong", "surface.elevated", "text strong on elevated surface"],
  ["text.body", "surface.base", "body text on page"],
  ["text.body", "surface.panel", "body text on panel"],
  ["text.body", "surface.elevated", "body text on elevated surface"],
  ["text.muted", "surface.base", "muted text on page"],
  ["text.muted", "surface.panel", "muted text on panel"],
  ["text.muted", "surface.elevated", "muted text on elevated surface"],
  ["link.foreground", "surface.base", "link on page"],
  ["link.foreground", "surface.panel", "link on panel"],
  ["link.foreground", "surface.elevated", "link on elevated surface"],
  ["action.foreground", "action.background", "action label on action surface"],
  ["action.foreground", "action.hover.background", "action label on hover surface"],
  ["tag.foreground", "tag.background", "tag label on tag surface"],
  ["header.foreground", "header.background", "header body text"],
  ["header.heading", "header.background", "header heading"],
  ["header.link", "header.background", "header link"],
  ["footer.foreground", "footer.background", "footer body text"],
  ["footer.muted", "footer.background", "footer muted text"],
  ["footer.link", "footer.background", "footer link"],
  ["entity.heading", "entity.surface.top", "entity heading"],
  ["entity.foreground", "entity.surface.top", "entity body text"],
  ["entity.muted", "entity.surface.top", "entity label"],
  ["comfort.foreground", "comfort.surface", "comfort control text"],
  ["comfort.foreground.strong", "comfort.surface", "comfort control strong text"],
  ["focus.foreground", "focus.base", "focus ring against its base"],
  ["brand.mulberry", "surface.base", "mulberry accent on page"],
  ["brand.window-blue", "surface.base", "window blue on page"],
  ["spoon.low", "card.background", "low spoon ink on card"],
  ["spoon.medium", "card.background", "medium spoon ink on card"],
  ["spoon.high", "card.background", "high spoon ink on card"],
  ["focus.foreground", "surface.panel", "focus ring against panel"],
  ["focus.foreground", "surface.elevated", "focus ring against elevated surface"],
  ["border.subtle", "surface.base", "subtle border against page surface"],
  ["border.subtle", "surface.panel", "subtle border against panel surface"],
  ["border.strong", "surface.panel", "strong border against panel surface"],
  ["border.strong", "surface.elevated", "strong border against elevated surface"],
  ["action.border", "action.background", "action border against action surface"],
  ["action.hover.border", "action.hover.background", "action hover border against hover surface"],
  ["card.border", "card.background", "card border against card surface"],
  ["card.border.strong", "card.background", "strong card border against card surface"],
  ["tag.border", "tag.background", "tag border against tag surface"],
  ["header.border", "header.background", "header border against header surface"],
  ["footer.border", "footer.background", "footer border against footer surface"],
  ["comfort.input.border", "comfort.input.background", "comfort input border against input surface"],
  ["comfort.input.focus", "comfort.input.background", "comfort input focus color against input surface"],
  ["entity.action", "entity.surface.top", "entity CTA on entity surface"],
  ["entity.action.hover", "entity.surface.top", "entity CTA hover on entity surface"],
  ["status.success.foreground", "status.success.background", "status.success.foreground on status.success.background"],
  ["status.warning.foreground", "status.warning.background", "status.warning.foreground on status.warning.background"],
  ["status.error.foreground", "status.error.background", "status.error.foreground on status.error.background"],
  ["status.info.foreground", "status.info.background", "status.info.foreground on status.info.background"],
  ["entity.border", "entity.surface.top", "entity.border on entity.surface.top"],
  ["entity.icon", "entity.surface.top", "entity.icon on entity.surface.top"],
  ["comfort.foreground", "comfort.chip.background", "comfort.foreground on comfort.chip.background"],
  ["comfort.chip.border", "comfort.chip.background", "comfort.chip.border on comfort.chip.background"],
  ["comfort.chip.accent", "comfort.chip.background", "comfort.chip.accent on comfort.chip.background"],
  ["comfort.hint", "comfort.tray.background", "comfort.hint on comfort.tray.background"],
  ["comfort.tray.border", "comfort.tray.background", "comfort.tray.border on comfort.tray.background"]
];

const MODES = { midnight: 'dark', dawn: 'light' };
export const WITCHCLICK_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[a-z0-9]+(?:[.-][a-z0-9]+)*)?$/;

const colourMap = (tokens) => Object.fromEntries(flattenTokens(tokens).flatMap(({ name, value }) => {
  const raw = value && typeof value === 'object' ? value.value : value;
  // Do not flatten opacity/shadow recipes into opaque substitutes.
  if (typeof raw !== 'string' || !/^(#|rgba?\(|hsla?\()/i.test(raw.trim())) return [];
  const colour = colord(raw.trim());
  if (!colour.isValid() || colour.alpha() !== 1) return [];
  return [[name.replaceAll('/', '.'), normalizeHex(colour.toHex(), null)]];
}));

export async function buildWitchClickKit(theme, { version = '1.0.0' } = {}) {
  if (typeof version !== 'string' || version.length > 64 || !WITCHCLICK_VERSION_PATTERN.test(version)) {
    throw new Error('Use a version such as 1.0.0 or 1.0.1-beta.');
  }
  // Unlike marketplace export, current unconfirmed workspace tokens never fill a missing variant.
  for (const mode of Object.values(MODES)) {
    const variant = theme?.variants?.[mode];
    if (!variant || !(variant.finalTokens || variant.tokens || variant.currentTheme?.tokens)) {
      throw new Error('Confirm both Dark and Light in Refine before downloading a WitchClick kit.');
    }
  }
  const data = buildThemePackExportData(theme, { selectedModes: ['dark', 'light'] });
  const slug = data.slug.replace(/[^a-z0-9-]/g, '-').slice(0, 72).replace(/^-+|-+$/g, '') || 'palette';
  const kitId = `apocapalette.${/^[a-z]/.test(slug) ? slug : `palette-${slug}`}`;
  const tokens = Object.fromEntries(Object.entries(MODES).map(([mode, variant]) => [mode, colourMap(data.variants[variant].finalTokens)]));
  const roles = WITCHCLICK_ROLES.map(({ candidates, variable, ...definition }) => {
    const modes = Object.fromEntries(Object.keys(MODES).map(mode => {
      const source = candidates.find(key => tokens[mode][key]);
      return [mode, source ? {
        status: 'present', variable, value: tokens[mode][source],
        source: { file: `confirmed-${MODES[mode]}-final-tokens`, variable: source },
      } : {
        status: 'missing', reason: `No literal source colour for ${definition.id} in confirmed ${MODES[mode]}. Tried: ${candidates.join(', ')}.`,
      }];
    }));
    return { ...definition, status: Object.values(modes).every(value => value.status === 'present') ? definition.requirement : 'missing', modes };
  });
  const css = `/* kit-id: ${kitId}\n * contract-version: 1.0.0\n * version: ${version}\n * namespace: --wc-kit-\n * modes: midnight, dawn\n */\n` + Object.keys(MODES).map(mode => (
    `.wc-kit-${slug}[data-wc-kit-mode="${mode}"] {\n` + roles.filter(role => role.modes[mode].status === 'present').map(role => `  ${role.modes[mode].variable}: ${role.modes[mode].value};`).join('\n') + '\n}\n'
  )).join('\n');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(css));
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const byId = Object.fromEntries(roles.map(role => [role.id, role]));
  const contrasts = [];
  const missingContrastPairs = [];
  for (const mode of Object.keys(MODES)) {
    for (const [foregroundRole, backgroundRole, purpose] of WITCHCLICK_CONTRAST_PAIRS) {
      const fg = byId[foregroundRole].modes[mode];
      const bg = byId[backgroundRole].modes[mode];
      if (fg.status === 'present' && bg.status === 'present') {
        contrasts.push({ mode, foregroundRole, backgroundRole, foregroundVariable: fg.variable, backgroundVariable: bg.variable, purpose, ratio: Number(getContrastRatio(fg.value, bg.value).toFixed(2)) });
      } else {
        missingContrastPairs.push({ mode, foregroundRole, backgroundRole, reason: `Missing source colours: ${[fg.status !== 'present' && foregroundRole, bg.status !== 'present' && backgroundRole].filter(Boolean).join(', ')}.` });
      }
    }
  }
  const manifest = {
    schemaVersion: '1.0.0', contractVersion: '1.0.0', kitId, version,
    cssFile: 'kit.css', namespace: '--wc-kit-', supportedModes: Object.keys(MODES),
    integrity: { algorithm: 'SHA-256', sha256 },
    provenance: { note: `${data.themeName}: exported from confirmed Apocapalette final colour tokens. Missing colours are not synthesized. Brand roles mulberry/window-blue carry the source primary/accent slots; they do not assert Autumn Window hue parity.`, sources: ['confirmed-dark-final-tokens', 'confirmed-light-final-tokens'], modeMapping: MODES },
    excludedWitchClickConcerns: ['typography', 'spacing', 'geometry', 'shadow recipes', 'motion', 'calm/plain behavior', 'component layout'],
    roles, contrasts, missingContrastPairs,
  };
  return { css, manifest, filename: `${slug}-${version}-witchclick-kit.zip` };
}

export async function buildWitchClickKitArchive(theme, options = {}) {
  const kit = await buildWitchClickKit(theme, options);
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(kit.manifest, null, 2) + '\n');
  zip.file('kit.css', kit.css);
  return { ...kit, blob: await zip.generateAsync({ type: options.type || 'blob', mimeType: 'application/zip' }) };
}

export async function downloadWitchClickKitArchive(theme, options) {
  const { blob, filename } = await buildWitchClickKitArchive(theme, options);
  exportAssets({ data: blob, filename, mime: 'application/zip' });
}
