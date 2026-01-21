/**
 * Sanitizes theme name for display and export
 * @param {string} input - Raw theme name
 * @param {string} fallback - Fallback name
 * @returns {string} Sanitized name
 */
export const sanitizeThemeName = (input, fallback) => {
  if (!input || typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 50);
};

/**
 * Sanitizes token prefix for CSS variables
 * @param {string} prefix - Raw prefix
 * @returns {string} Sanitized prefix (kebab-case)
 */
export const sanitizePrefix = (prefix) => {
  if (!prefix || typeof prefix !== 'string') return '';
  return prefix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '');
};