import { describe, expect, it } from 'vitest';
import { generateAse } from './exportAse.js';

const COLORS = [
  { name: 'brand / primary', hex: '#ff0000' },
  { name: 'surfaces / background', hex: '#ffffff' },
  { name: 'typography / text-strong', hex: '#123456' },
];

// Minimal test-side ASE reader: enough to verify our writer round-trips.
const readAse = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const versionMajor = view.getUint16(4, false);
  const versionMinor = view.getUint16(6, false);
  const blockCount = view.getUint32(8, false);

  const blocks = [];
  let offset = 12;
  for (let i = 0; i < blockCount; i += 1) {
    const type = view.getUint16(offset, false);
    const length = view.getUint32(offset + 2, false);
    let cursor = offset + 6;
    const nameLength = view.getUint16(cursor, false);
    cursor += 2;
    let name = '';
    for (let n = 0; n < nameLength - 1; n += 1) {
      name += String.fromCharCode(view.getUint16(cursor, false));
      cursor += 2;
    }
    cursor += 2; // null terminator
    const model = String.fromCharCode(bytes[cursor], bytes[cursor + 1], bytes[cursor + 2], bytes[cursor + 3]);
    cursor += 4;
    const rgb = [
      view.getFloat32(cursor, false),
      view.getFloat32(cursor + 4, false),
      view.getFloat32(cursor + 8, false),
    ];
    cursor += 12;
    const colorType = view.getUint16(cursor, false);
    blocks.push({ type, length, name, model, rgb, colorType });
    offset += 6 + length;
  }

  return { magic, versionMajor, versionMinor, blockCount, blocks, totalBytes: bytes.length, consumed: offset };
};

describe('generateAse', () => {
  it('writes the ASEF header with the right version and block count', () => {
    const bytes = generateAse(COLORS);
    const parsed = readAse(bytes);

    expect(parsed.magic).toBe('ASEF');
    expect(parsed.versionMajor).toBe(1);
    expect(parsed.versionMinor).toBe(0);
    expect(parsed.blockCount).toBe(3);
    expect(parsed.consumed).toBe(parsed.totalBytes);
  });

  it('round-trips color names, RGB values, and the normal color type', () => {
    const parsed = readAse(generateAse(COLORS));

    expect(parsed.blocks.map((block) => block.name)).toEqual([
      'brand / primary',
      'surfaces / background',
      'typography / text-strong',
    ]);
    expect(parsed.blocks.every((block) => block.type === 0xc001)).toBe(true);
    expect(parsed.blocks.every((block) => block.model === 'RGB ')).toBe(true);
    expect(parsed.blocks.every((block) => block.colorType === 2)).toBe(true);

    const [red, white, custom] = parsed.blocks.map((block) => block.rgb);
    expect(red.map((v) => Number(v.toFixed(4)))).toEqual([1, 0, 0]);
    expect(white.map((v) => Number(v.toFixed(4)))).toEqual([1, 1, 1]);
    expect(custom[0]).toBeCloseTo(0x12 / 255, 4);
    expect(custom[1]).toBeCloseTo(0x34 / 255, 4);
    expect(custom[2]).toBeCloseTo(0x56 / 255, 4);
  });

  it('skips invalid colors and writes an empty palette for no input', () => {
    const withJunk = readAse(generateAse([
      { name: 'good', hex: '#00ff00' },
      { name: 'bad', hex: 'not-a-color' },
      { name: 'missing' },
    ]));
    expect(withJunk.blockCount).toBe(1);
    expect(withJunk.blocks[0].name).toBe('good');

    const empty = readAse(generateAse([]));
    expect(empty.blockCount).toBe(0);
    expect(empty.blocks).toEqual([]);
  });
});
