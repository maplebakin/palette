import { describe, expect, it } from 'vitest';
import { generateGpl } from './exportGpl.js';

describe('generateGpl', () => {
  it('writes the GIMP palette header and one RGB line per color', () => {
    const output = generateGpl('Test Palette', [
      { name: 'brand / primary', hex: '#ff0000' },
      { name: 'surfaces / background', hex: '#ffffff' },
      { name: 'custom', hex: '#123456' },
    ]);
    const lines = output.split('\n');

    expect(lines[0]).toBe('GIMP Palette');
    expect(lines[1]).toBe('Name: Test Palette');
    expect(lines[2]).toBe('Columns: 4');
    expect(lines[3]).toBe('#');
    expect(lines[4]).toBe('255 0 0 brand / primary');
    expect(lines[5]).toBe('255 255 255 surfaces / background');
    expect(lines[6]).toBe('18 52 86 custom');
    expect(output.endsWith('\n')).toBe(true);
  });

  it('skips invalid colors', () => {
    const output = generateGpl('Mixed', [
      { name: 'bad', hex: 'not-a-color' },
      { name: 'good', hex: '#00ff00' },
    ]);
    expect(output).toContain('0 255 0 good');
    expect(output).not.toContain('bad');
  });
});
