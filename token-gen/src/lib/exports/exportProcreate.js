import { converter, parse } from 'culori';

// Procreate `.swatches` writer.
//
// A .swatches file is a ZIP archive containing a single `Swatches.json`.
// Schema (verified against the open-source writers
// natecavanaugh/procreate-swatch-generator and heyzoish/procreate-swatches,
// both of which import cleanly into Procreate):
//   [{ "name": "<palette name>",
//      "swatches": [{ "hue": 0..1, "saturation": 0..1, "brightness": 0..1 }, ...] }]
//
// Hue/saturation/brightness are HSV with hue normalized to 0..1 (not degrees).
// Procreate caps a palette at 30 swatches, so colors are de-duplicated by
// output value and truncated to that limit.

export const MAX_PROCREATE_SWATCHES = 30;

const toHsv = converter('hsv');

const clamp01 = (value) => Math.min(1, Math.max(0, value ?? 0));

const normalizeSwatchColor = (color) => {
  const parsed = parse(String(color?.hex || '').trim());
  if (!parsed) return null;
  const hsv = toHsv(parsed);
  if (!hsv) return null;
  const hueDegrees = ((hsv.h ?? 0) % 360 + 360) % 360; // achromatic colors have no hue
  return {
    hue: hueDegrees / 360,
    saturation: clamp01(hsv.s),
    brightness: clamp01(hsv.v),
  };
};

export function buildProcreateSwatchesJson(name, colors) {
  const seen = new Set();
  const swatches = [];
  for (const color of colors || []) {
    const swatch = normalizeSwatchColor(color);
    if (!swatch) continue;
    const key = `${swatch.hue.toFixed(6)}|${swatch.saturation.toFixed(6)}|${swatch.brightness.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    swatches.push(swatch);
    if (swatches.length >= MAX_PROCREATE_SWATCHES) break;
  }
  return [{ name: String(name || 'Palette'), swatches }];
}

export async function generateProcreateSwatchesFile(name, colors) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  zip.file('Swatches.json', JSON.stringify(buildProcreateSwatchesJson(name, colors), null, 2));
  return zip.generateAsync({ type: 'uint8array' });
}
