const THEME_CLASSES = ['theme-light', 'theme-dark', 'theme-pop'];

const sanitizeCssValue = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export const buildThemeCss = (vars, selector = ':root') => {
  if (!vars || typeof vars !== 'object') {
    return `${selector} {\n}\n`;
  }
  const lines = Object.entries(vars)
    .map(([key, value]) => [key, sanitizeCssValue(value)])
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => `  ${key}: ${value};`);
  return `${selector} {\n${lines.join('\n')}\n}\n`;
};

export const getThemeClassName = (themeMode) => {
  if (themeMode === 'dark') return 'theme-dark';
  if (themeMode === 'pop') return 'theme-pop';
  return 'theme-light';
};

export const THEME_CLASSNAMES = [...THEME_CLASSES];
