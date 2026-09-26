import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  buildProcreateSwatchesJson,
  generateProcreateSwatchesFile,
  MAX_PROCREATE_SWATCHES,
} from './exportProcreate.js';

const approx = (value, expected) => expect(value).toBeCloseTo(expected, 4);

describe('buildProcreateSwatchesJson', () => {
  it('uses the Procreate Swatches.json schema with HSV in 0..1', () => {
    const [palette] = buildProcreateSwatchesJson('Test Palette', [
      { name: 'red', hex: '#ff0000' },
      { name: 'white', hex: '#ffffff' },
      { name: 'black', hex: '#000000' },
    ]);

    expect(palette.name).toBe('Test Palette');
    expect(palette.swatches).toHaveLength(3);
    expect(Object.keys(palette.swatches[0]).sort()).toEqual(['brightness', 'hue', 'saturation']);

    const [red, white, black] = palette.swatches;
    approx(red.hue, 0); approx(red.saturation, 1); approx(red.brightness, 1);
    approx(white.hue, 0); approx(white.saturation, 0); approx(white.brightness, 1);
    approx(black.brightness, 0); approx(black.saturation, 0);

    // Green sits at 120 degrees = 1/3 of the hue circle.
    const [green] = buildProcreateSwatchesJson('g', [{ hex: '#00ff00' }])[0].swatches;
    approx(green.hue, 1 / 3);
  });

  it('de-duplicates identical colors and caps at the Procreate limit', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      name: `color-${i}`,
      hex: `#${i.toString(16).padStart(6, '0')}`,
    }));
    const [palette] = buildProcreateSwatchesJson('Many', many);
    expect(palette.swatches.length).toBeLessThanOrEqual(MAX_PROCREATE_SWATCHES);
    expect(MAX_PROCREATE_SWATCHES).toBe(30);

    const [dupes] = buildProcreateSwatchesJson('Dupes', [
      { name: 'a', hex: '#ff0000' },
      { name: 'b', hex: '#ff0000' },
      { name: 'c', hex: '#00ff00' },
    ]);
    expect(dupes.swatches).toHaveLength(2);
  });

  it('skips invalid colors', () => {
    const [palette] = buildProcreateSwatchesJson('Mixed', [
      { name: 'bad', hex: 'nope' },
      { name: 'good', hex: '#123456' },
    ]);
    expect(palette.swatches).toHaveLength(1);
    expect(palette.name).toBe('Mixed');
  });
});

describe('generateProcreateSwatchesFile', () => {
  it('produces a .swatches zip whose Swatches.json parses with the right schema', async () => {
    const bytes = await generateProcreateSwatchesFile('Round Trip', [
      { name: 'brand / primary', hex: '#ff0000' },
      { name: 'brand / accent', hex: '#00ff00' },
    ]);

    expect(bytes).toBeInstanceOf(Uint8Array);
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    expect(names).toEqual(['Swatches.json']);

    const parsed = JSON.parse(await zip.file('Swatches.json').async('string'));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Round Trip');
    expect(parsed[0].swatches).toHaveLength(2);
    approx(parsed[0].swatches[0].hue, 0);
    approx(parsed[0].swatches[1].hue, 1 / 3);
  });
});
