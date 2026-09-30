import {
  buildFigmaTokensPayload,
  buildGenericPayload,
  buildPenpotPayload,
  buildStyleDictionaryPayload,
  buildWitchcraftPayload,
} from '../payloads.js';
import { toPenpotTokens } from '../penpotTokens.js';
import { buildCssVariables } from '../theme/styles.js';
import { buildThemeCss } from '../themeStyles.js';
import { downloadFile, exportJson as exportJsonFile, buildExportFilename, slugifyFilename } from '../export/index.js';
import { generateDesignSpacePalette } from './designSpacePalette.js';

const buildMeta = ({
  themeName,
  mode,
  baseColor,
  isDark,
  printMode,
  tokenPrefix,
}) => ({
  themeName,
  mode,
  baseColor,
  isDark,
  printMode,
  generatedAt: new Date().toISOString(),
  tokenPrefix: tokenPrefix || undefined,
});

export const buildPenpotExportPayload = ({
  finalTokens,
  orderedStack,
  themeName,
  mode,
  baseColor,
  isDark,
  printMode,
  tokenPrefix,
}) => buildPenpotPayload(
  finalTokens,
  orderedStack,
  buildMeta({
    themeName,
    mode,
    baseColor,
    isDark,
    printMode,
    tokenPrefix,
  }),
  { namingPrefix: tokenPrefix }
);

export const exportSavedPalettesJson = (savedPalettes) => {
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    palettes: savedPalettes,
  };
  exportJsonFile('apocapalette-saved-palettes', '', payload);
};

export const exportPenpotJsonBundle = ({
  finalTokens,
  orderedStack,
  themeName,
  suffix = '',
  mode,
  baseColor,
  isDark,
  printMode,
  tokenPrefix,
}) => {
  const penpotPayload = buildPenpotExportPayload({
    finalTokens,
    orderedStack,
    themeName,
    mode,
    baseColor,
    isDark,
    printMode,
    tokenPrefix,
  });
  exportJsonFile(themeName, suffix, penpotPayload);
  const penpotTokens = toPenpotTokens(penpotPayload);
  exportJsonFile(themeName, `${suffix}-PENPOT`, penpotTokens);
  return penpotPayload;
};

export const exportGenericJsonTokens = ({
  finalTokens,
  themeName,
  mode,
  baseColor,
  isDark,
  printMode,
  tokenPrefix,
}) => {
  const payload = buildGenericPayload(finalTokens, buildMeta({
    themeName,
    mode,
    baseColor,
    isDark,
    printMode,
    tokenPrefix,
  }));
  exportJsonFile('generic-tokens', '', payload);
};

export const exportWitchcraftJsonTokens = ({
  finalTokens,
  themeName,
  mode,
  isDark,
}) => {
  const payload = buildWitchcraftPayload(finalTokens, themeName, mode, isDark);
  exportJsonFile('witchcraft-theme', '', payload);
};

export const exportFigmaTokensJson = ({
  finalTokens,
  tokenPrefix,
}) => {
  const payload = buildFigmaTokensPayload(finalTokens, { namingPrefix: tokenPrefix || undefined });
  exportJsonFile('figma-tokens', '', payload);
};

export const exportStyleDictionaryJson = ({
  finalTokens,
  tokenPrefix,
}) => {
  const payload = buildStyleDictionaryPayload(finalTokens, { namingPrefix: tokenPrefix || undefined });
  exportJsonFile('style-dictionary', '', payload);
};

export const exportCssVariablesFile = ({
  themeMaster,
  themeName,
  tokenPrefix,
}) => {
  const css = buildCssVariables(themeMaster, tokenPrefix || '');
  const slug = slugifyFilename(themeName || 'theme', 'theme');
  const filename = buildExportFilename(slug, '-tokens', 'css');
  downloadFile({ data: css, filename, mime: 'text/css' });
};

export const exportUiThemeCssFile = ({
  uiTheme,
  themeClass,
  themeName,
}) => {
  const css = buildThemeCss(uiTheme, `:root.${themeClass}`);
  const slug = slugifyFilename(themeName || 'theme', 'theme');
  const filename = buildExportFilename(slug, '-ui-theme', 'css');
  downloadFile({ data: css, filename, mime: 'text/css' });
};

export const exportDesignSpacePaletteFile = ({
  baseColor,
  themeName,
  mode,
  themeMode,
}) => {
  const palette = generateDesignSpacePalette(baseColor, {
    name: themeName || 'Apocapalette Theme',
    mode,
    themeMode,
  });
  const slug = slugifyFilename(themeName || 'theme', 'theme');
  const filename = buildExportFilename(slug, '-designspace', 'json');
  downloadFile({ data: JSON.stringify(palette, null, 2), filename, mime: 'application/json' });
};

// Tailwind CSS v3 theme-extension snippet builder. Takes flat kit tokens
// ([{ key: 'brand-primary', hex: '#76a653', group: 'brand' }, ...]) and returns
// a ready-to-require config fragment: theme.extend.colors.<prefix>.
export const buildTailwindConfigJs = ({ kitName, mode, flatTokens, prefix }) => {
  const tree = {};
  (flatTokens || []).forEach(({ key, hex, group }) => {
    const name = key.startsWith(`${group}-`) ? key.slice(group.length + 1) : key;
    tree[group] = tree[group] || {};
    tree[group][name] = hex;
  });
  const colorsBody = JSON.stringify({ colors: { [prefix || 'kit']: tree } }, null, 2)
    .replace(/"([^"]+)":/g, '$1:');
  const varName = `${(prefix || 'kit').replace(/[^a-zA-Z0-9]+/g, '')}${mode[0].toUpperCase()}${mode.slice(1)}`;
  return [
    `// ${kitName} — ${mode} variant · Tailwind CSS v3 theme extension`,
    '// Merge into your tailwind.config.js:',
    `//   const ${varName} = require('./tailwind.${(prefix || 'kit')}-${mode}.js');`,
    `//   module.exports = { theme: { extend: { ...${varName}.theme.extend } } };`,
    `// Tailwind v4: import the matching .css variables inside @theme { ... } instead.`,
    '/** @type {import(\'tailwindcss\').Config} */',
    `module.exports = { theme: { extend: ${colorsBody} } };`,
    '',
  ].join('\n');
};
