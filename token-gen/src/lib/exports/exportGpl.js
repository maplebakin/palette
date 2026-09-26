import { parse } from 'culori';

// GIMP palette (.gpl) writer. Plain-text format:
//
//   GIMP Palette
//   Name: <palette name>
//   Columns: 4
//   #
//   R G B <color name>
//   ...
//
// R/G/B are integers in 0..255.

const toRgb255 = (hex) => {
  const parsed = parse(String(hex || '').trim());
  if (!parsed || parsed.mode !== 'rgb') return null;
  const channel = (value) => Math.round(Math.min(1, Math.max(0, value ?? 0)) * 255);
  return [channel(parsed.r), channel(parsed.g), channel(parsed.b)];
};

const sanitizeLabel = (value) => String(value ?? '')
  .replace(/[\r\n\t]/g, ' ')
  .trim() || 'Color';

export function generateGpl(name, colors) {
  const lines = [
    'GIMP Palette',
    `Name: ${String(name || 'Palette')}`,
    'Columns: 4',
    '#',
  ];
  for (const color of colors || []) {
    const rgb = toRgb255(color?.hex);
    if (!rgb) continue;
    lines.push(`${rgb[0]} ${rgb[1]} ${rgb[2]} ${sanitizeLabel(color?.name)}`);
  }
  return `${lines.join('\n')}\n`;
}
