import { sanitizeHexInput, sanitizeThemeName, sanitizePrefix } from '../utils/stringUtils';
import { toGeneratorMode } from '../projectUtils';

/**
 * Builds a palette specification object from a project section.
 * @param {object} section - The project section object.
 * @returns {object|null} The palette specification or null if invalid.
 */
export const buildSpecFromSection = (section) => {
  if (!section || typeof section !== 'object') return null;
  const baseColor = sanitizeHexInput(section.baseHex || '#6366f1', '#6366f1');
  return {
    baseColor,
    mode: toGeneratorMode(section.mode || 'mono'),
    themeMode: section.paletteSpec?.themeMode || (section.paletteSpec?.isDark ? 'dark' : 'light'),
    isDark: section.paletteSpec?.isDark ?? (section.paletteSpec?.themeMode === 'dark'),
    printMode: Boolean(section.paletteSpec?.printMode),
    customThemeName: sanitizeThemeName(section.paletteSpec?.customThemeName || section.label || '', ''),
    harmonyIntensity: section.paletteSpec?.harmonyIntensity ?? 100,
    apocalypseIntensity: section.paletteSpec?.apocalypseIntensity ?? 100,
    neutralCurve: section.paletteSpec?.neutralCurve ?? 100,
    accentStrength: section.paletteSpec?.accentStrength ?? 100,
    popIntensity: section.paletteSpec?.popIntensity ?? 100,
    tokenPrefix: sanitizePrefix(section.paletteSpec?.tokenPrefix || ''),
    importedOverrides: section.paletteSpec?.importedOverrides ?? null,
  };
};
