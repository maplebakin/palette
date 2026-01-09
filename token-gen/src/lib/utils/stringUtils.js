export const sanitizeHexInput = (value, fallback = null) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!match) return fallback;
  let hex = match[1].toLowerCase();
  if (hex.length === 8) hex = hex.slice(0, 6);
  return `#${hex}`;
};
export const sanitizeThemeName = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return clean || fallback;
};
export const sanitizePrefix = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-z0-9_.-]/gi, '').slice(0, 32);
};
export const escapeXml = (str) => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};