/**
 * Triggers browser download of a file
 * @param {Blob|string} data - File data (Blob or data URL)
 * @param {string} filename - Filename with extension
 * @param {string} mime - MIME type
 */
export const triggerDownload = (data, filename, mime) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports data as downloadable asset
 * @param {Object} options
 * @param {Blob|string} options.data
 * @param {string} options.filename
 * @param {string} options.mime
 */
export const exportAssets = ({ data, filename, mime }) => {
  triggerDownload(data, filename, mime);
};

/**
 * Builds export filename with sanitization
 * @param {string} base - Base name (e.g., theme name)
 * @param {string} suffix - Suffix (e.g., '-tokens')
 * @param {string} ext - Extension (e.g., 'json')
 * @returns {string} Sanitized filename
 */
export const buildExportFilename = (base, suffix, ext) => {
  const sanitized = base.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  return `${sanitized}${suffix}.${ext}`;
};

/**
 * Slugifies filename for safe export
 * @param {string} name - Human-readable name
 * @param {string} fallback - Fallback if name is empty
 * @returns {string} Slugified name
 */
export const slugifyFilename = (name, fallback) => {
  if (!name || !name.trim()) return fallback;
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Normalizes hex color
 * @param {string} hex - Hex color
 * @param {string} fallback - Fallback color
 * @return {string} Normalized hex color
 */
export const normalizeHex = (hex, fallback) => {
  if (!hex) return fallback;
  const clean = hex.replace(/^#/, '');
  if (clean.length === 3) {
    return `#${clean.split('').map(c => c + c).join('')}`;
  }
  if (clean.length === 6) {
    return `#${clean}`;
  }
  return fallback;
};