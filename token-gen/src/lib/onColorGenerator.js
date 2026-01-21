import { getContrastRatio, hexToOklch } from './colorUtils.js';

/**
 * Generates appropriate "on-color" tokens for background colors
 * Following the section.on-property naming convention identified in the audit
 * @param {Object} tokens - The generated tokens object
 * @returns {Object} - New tokens object with added "on-color" tokens
 */
export const generateOnColors = (tokens) => {
  const enhancedTokens = { ...tokens };
  
  // Define mapping of background tokens to their corresponding "on" tokens
  const onColorMappings = [
    // Brand section
    { bgToken: 'brand.primary', onToken: 'brand.on-primary' },
    { bgToken: 'brand.primary-hover', onToken: 'brand.on-primary-hover' },
    { bgToken: 'brand.primary-active', onToken: 'brand.on-primary-active' },
    { bgToken: 'brand.secondary', onToken: 'brand.on-secondary' },
    { bgToken: 'brand.secondary-hover', onToken: 'brand.on-secondary-hover' },
    { bgToken: 'brand.secondary-active', onToken: 'brand.on-secondary-active' },
    { bgToken: 'brand.accent', onToken: 'brand.on-accent' },
    { bgToken: 'brand.accent-hover', onToken: 'brand.on-accent-hover' },
    { bgToken: 'brand.accent-active', onToken: 'brand.on-accent-active' },
    { bgToken: 'brand.accent-strong', onToken: 'brand.on-accent-strong' },
    { bgToken: 'brand.accent-strong-hover', onToken: 'brand.on-accent-strong-hover' },
    { bgToken: 'brand.accent-strong-active', onToken: 'brand.on-accent-strong-active' },
    { bgToken: 'brand.cta', onToken: 'brand.on-cta' },
    { bgToken: 'brand.cta-hover', onToken: 'brand.on-cta-hover' },
    { bgToken: 'brand.cta-active', onToken: 'brand.on-cta-active' },
    
    // Surface section
    { bgToken: 'surfaces.background', onToken: 'surfaces.on-background' },
    { bgToken: 'surfaces.page-background', onToken: 'surfaces.on-page-background' },
    { bgToken: 'surfaces.header-background', onToken: 'surfaces.on-header-background' },
    { bgToken: 'surfaces.surface-plain', onToken: 'surfaces.on-surface-plain' },
    { bgToken: 'surfaces.surface-plain-border', onToken: 'surfaces.on-surface-plain-border' },
    
    // Card section
    { bgToken: 'cards.card-panel-surface', onToken: 'cards.on-card-panel-surface' },
    { bgToken: 'cards.card-panel-surface-strong', onToken: 'cards.on-card-panel-surface-strong' },
    { bgToken: 'cards.card-tag-bg', onToken: 'cards.on-card-tag-bg' },
    
    // Glass section
    { bgToken: 'glass.glass-surface', onToken: 'glass.on-glass-surface' },
    { bgToken: 'glass.glass-surface-strong', onToken: 'glass.on-glass-surface-strong' },
    { bgToken: 'glass.glass-card', onToken: 'glass.on-glass-card' },
    
    // Entity section
    { bgToken: 'entity.entity-card-surface', onToken: 'entity.on-entity-card-surface' },
    
    // Named section
    { bgToken: 'named.color-midnight', onToken: 'named.on-color-midnight' },
    { bgToken: 'named.color-night', onToken: 'named.on-color-night' },
    { bgToken: 'named.color-dusk', onToken: 'named.on-color-dusk' },
    { bgToken: 'named.color-ink', onToken: 'named.on-color-ink' },
    { bgToken: 'named.color-amethyst', onToken: 'named.on-color-amethyst' },
    { bgToken: 'named.color-iris', onToken: 'named.on-color-iris' },
    { bgToken: 'named.color-gold', onToken: 'named.on-color-gold' },
    { bgToken: 'named.color-rune', onToken: 'named.on-color-rune' },
    { bgToken: 'named.color-fog', onToken: 'named.on-color-fog' },
    
    // Status section
    { bgToken: 'status.success', onToken: 'status.on-success' },
    { bgToken: 'status.warning', onToken: 'status.on-warning' },
    { bgToken: 'status.error', onToken: 'status.on-error' },
    { bgToken: 'status.info', onToken: 'status.on-info' },
    { bgToken: 'status.success-strong', onToken: 'status.on-success-strong' },
    { bgToken: 'status.warning-strong', onToken: 'status.on-warning-strong' },
    { bgToken: 'status.error-strong', onToken: 'status.on-error-strong' },
    
    // Admin section
    { bgToken: 'admin.admin-surface-base', onToken: 'admin.on-admin-surface-base' },
    { bgToken: 'admin.admin-accent', onToken: 'admin.on-admin-accent' },
    
    // Alias section
    { bgToken: 'aliases.surface-panel-primary', onToken: 'aliases.on-surface-panel-primary' },
    { bgToken: 'aliases.surface-panel-secondary', onToken: 'aliases.on-surface-panel-secondary' },
    { bgToken: 'aliases.surface-card-hover', onToken: 'aliases.on-surface-card-hover' },
    { bgToken: 'aliases.surface-muted', onToken: 'aliases.on-surface-muted' },
    { bgToken: 'aliases.chip-background', onToken: 'aliases.on-chip-background' },
  ];

  // Process each mapping to generate appropriate on-colors
  onColorMappings.forEach(({ bgToken, onToken }) => {
    const bgColor = getNestedToken(tokens, bgToken);
    if (bgColor) {
      const onColor = calculateOnColor(bgColor);
      setNestedToken(enhancedTokens, onToken, onColor);
    }
  });

  // Special handling for neutral colors
  if (tokens.foundation?.neutrals) {
    Object.keys(tokens.foundation.neutrals).forEach(key => {
      if (key.startsWith('neutral-')) {
        const bgColor = tokens.foundation.neutrals[key];
        const onToken = `foundation.on-${key}`;
        const onColor = calculateOnColor(bgColor);
        setNestedToken(enhancedTokens, onToken, onColor);
      }
    });
  }

  return enhancedTokens;
};

/**
 * Calculates an appropriate on-color (text/icon color) for a given background
 * @param {string} backgroundColor - Hex color of the background
 * @returns {string} - Hex color for text/icons on that background
 */
const calculateOnColor = (backgroundColor) => {
  if (!backgroundColor) return '#ffffff'; // Default fallback
  
  // Convert to OKLCH to get lightness value
  const oklchColor = hexToOklch(backgroundColor);
  const lightness = oklchColor.l;
  
  // Use lightness to determine if text should be light or dark
  // Using 0.5 as the threshold (can be adjusted based on design system needs)
  // Higher L values mean lighter backgrounds, so use dark text
  // Lower L values mean darker backgrounds, so use light text
  const contrastRatioThreshold = 4.5; // WCAG AA compliance
  
  // Calculate both potential on-colors
  const whiteColor = '#ffffff';
  const blackColor = '#000000';
  
  const whiteContrast = getContrastRatio(whiteColor, backgroundColor);
  const blackContrast = getContrastRatio(blackColor, backgroundColor);
  
  // Choose the color that provides better contrast
  if (whiteContrast >= contrastRatioThreshold && blackContrast >= contrastRatioThreshold) {
    // Both meet minimum contrast, choose based on background lightness
    return lightness > 0.5 ? blackColor : whiteColor;
  } else if (whiteContrast >= contrastRatioThreshold) {
    return whiteColor;
  } else if (blackContrast >= contrastRatioThreshold) {
    return blackColor;
  } else {
    // Neither meets the threshold, return the one with better contrast
    return whiteContrast > blackContrast ? whiteColor : blackColor;
  }
};

/**
 * Helper function to get a nested token value using dot notation
 * @param {Object} obj - The tokens object
 * @param {string} path - Dot-notation path (e.g., 'brand.primary')
 * @returns {any} - The token value or undefined
 */
const getNestedToken = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Helper function to set a nested token value using dot notation
 * @param {Object} obj - The tokens object to modify
 * @param {string} path - Dot-notation path (e.g., 'brand.on-primary')
 * @param {any} value - The value to set
 */
const setNestedToken = (obj, path, value) => {
  const parts = path.split('.');
  const lastPart = parts.pop();
  
  let current = obj;
  for (const part of parts) {
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[lastPart] = value;
};

export { calculateOnColor };