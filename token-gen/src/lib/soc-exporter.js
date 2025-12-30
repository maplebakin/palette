import {
  formatHex,
  converter,
  differenceEuclidean,
  wcagLuminance,
  parse,
} from 'culori';

const labConverter = converter('lab');
const lchConverter = converter('lch');

export function processColors(rawColors, { deltaE, maxNeutrals, maxColors }) {
    const namedColors = Object.entries(rawColors)
    .map(([name, color]) => ({ name, value: parse(color) }))
    .filter(c => c.value && c.value.mode === 'rgb');

  let colors = namedColors.map(c => ({
    ...c,
    hex: formatHex(c.value),
    lch: lchConverter(c.value),
    lab: labConverter(c.value),
  }));

  const uniqueColors = [];
  const nearDuplicateThreshold = deltaE;

  for (const color of colors) {
    const isDuplicate = uniqueColors.some(
      c =>
        c.hex === color.hex ||
        differenceEuclidean('lab')(c.lab, color.lab) < nearDuplicateThreshold
    );
    if (!isDuplicate) {
      uniqueColors.push(color);
    }
  }
  colors = uniqueColors;

  const neutrals = colors.filter(c => c.lch.c < 12);
  const nonNeutrals = colors.filter(c => c.lch.c >= 12);

  neutrals.sort((a, b) => wcagLuminance(a.value) - wcagLuminance(b.value));
  const throttledNeutrals =
    neutrals.length > maxNeutrals
      ? [
          neutrals[0],
          ...neutrals
            .slice(1, -1)
            .sort((a, b) => b.lch.c - a.lch.c)
            .slice(0, maxNeutrals - 2),
          neutrals[neutrals.length - 1],
        ].sort((a, b) => wcagLuminance(a.value) - wcagLuminance(b.value))
      : neutrals;

  let finalColors = [...throttledNeutrals, ...nonNeutrals];
  if (finalColors.length > maxColors) {
    finalColors = finalColors.slice(0, maxColors);
  }

  finalColors.sort((a, b) => {
    if (a.lch.h === b.lch.h) {
      return a.lch.l - b.lch.l;
    }
    return (a.lch.h || 0) - (b.lch.h || 0);
  });
  
  return finalColors;
}

export function generateSoc(name, colors, options = {}) {
    const { sanitizeNames = true } = options;
    const sanitizedNames = new Set();
    const outputColors = colors.map((color) => {
        let newName = String(color.name || '');
        if (sanitizeNames) {
            newName = newName
              .replace(/([A-Z])/g, ' $1')
              .replace(/_/g, ' ')
              .split(' ')
              .filter(Boolean)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
        }
        if (sanitizedNames.has(newName)) {
            let suffix = 2;
            while (sanitizedNames.has(`${newName} (${suffix})`)) {
                suffix += 1;
            }
            newName = `${newName} (${suffix})`;
        }
        sanitizedNames.add(newName);
        return { ...color, name: newName };
    });

    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<ooo:color-table xmlns:ooo="http://openoffice.org/2004/office" xmlns:draw="http://openoffice.org/2004/drawing">`;
    const xmlFooter = `</ooo:color-table>`;
    const xmlContent = outputColors
      .map(
        c => `  <draw:color draw:name="${c.name}" draw:color="${c.hex}"/>`
      )
      .join('\n');
    return `${xmlHeader}\n${xmlContent}\n${xmlFooter}`;
}
