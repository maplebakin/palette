export const sanitizeFilename = (value, fallback = 'theme') => {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return clean || fallback;
};

export const slugifyFilename = (value, fallback = 'theme') => {
  const clean = sanitizeFilename(value, fallback);
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || fallback;
};

export const buildExportFilename = (themeName, suffix = '', ext = '', options = {}) => {
  const { sanitize = true, fallback = 'theme' } = options;
  const base = sanitize ? sanitizeFilename(themeName, fallback) : String(themeName ?? '');
  const resolvedBase = base || fallback;
  const safeSuffix = suffix ? String(suffix) : '';
  const safeExt = ext ? String(ext).replace(/^\./, '') : '';
  const name = `${resolvedBase}${safeSuffix}`;
  if (!safeExt) return name;
  if (name.toLowerCase().endsWith(`.${safeExt.toLowerCase()}`)) return name;
  return `${name}.${safeExt}`;
};
