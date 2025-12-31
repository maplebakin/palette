import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec as execCallback } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse, converter } from 'culori';
import util from 'util';

const exec = util.promisify(execCallback);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempDir = path.join(__dirname, 'temp');
const inputFile = path.join(tempDir, 'test-palette.json');
const outputFile = path.join(tempDir, 'test-palette.soc');
const projectInputFile = path.join(tempDir, 'test-project.apocaproject.json');
const projectOutDir = path.join(tempDir, 'project-out');
const lchConverter = converter('lch');

const samplePalette = {
  settings: {
    primary: '#ff0000',
    secondary: '#00ff00',
    tertiary: '#0000ff',
    redish: '#ff0001', // Near duplicate of primary
    black: '#000000',
    white: '#ffffff',
    gray1: '#111111',
    gray2: '#222222',
    gray3: '#333333',
    gray4: '#444444',
    gray5: '#555555',
    gray6: '#666666',
    gray7: '#777777',
    gray8: '#888888',
    gray9: '#999999', // Extra neutrals
  },
};

describe('export-soc script', () => {
  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    fs.writeFileSync(inputFile, JSON.stringify(samplePalette));
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should generate a valid .soc file', async () => {
    const { stderr } = await exec(
      `node src/lib/export-soc.js --input ${inputFile} --out ${outputFile} --name "Test Palette"`
    );

    expect(stderr).toBe('');

    const socContent = fs.readFileSync(outputFile, 'utf-8');

    // Check XML structure
    expect(socContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(socContent).toContain('<ooo:color-table');
    expect(socContent).toContain('</ooo:color-table>');

    const hexValues = (socContent.match(/draw:color="#([0-9a-fA-F]{6})"/g) || []).map(h => h.slice(13, -1));
    
    // Check for deduplication (primary and redish should be treated as one)
    const redCount = hexValues.filter(h => h.toLowerCase() === 'ff0000' || h.toLowerCase() === 'ff0001').length;
    expect(redCount).toBe(1);

    // After deduplication, we have 14 colors. 11 are neutrals, 3 are not.
    // Neutrals are throttled to 8. So 8 + 3 = 11 colors total.
    expect(hexValues.length).toBe(11);

    // Check for neutral throttling
    const neutrals = hexValues.filter(hex => {
        const c = parse(`#${hex}`);
        if(!c) return false;
        const lch = lchConverter(c);
        return lch.c < 12;
    });
    expect(neutrals.length).toBe(8);

    // Check for name sanitization and uniqueness
    const names = (socContent.match(/draw:name="([^"]+)"/g) || []).map(n => n.slice(11, -1));
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
    expect(names.join(',')).toContain('Primary');
  });

  it('sanitizes section file names when exporting projects', async () => {
    const sampleProject = {
      schemaVersion: 1,
      projectName: 'Sample Project',
      settings: {
        neutralCap: 8,
        maxColors: 40,
        nearDupThreshold: 2.0,
        anchorsAlwaysKeep: true,
      },
      sections: [
        {
          id: 'section-1',
          label: '../evil',
          kind: 'season',
          baseHex: '#ffffff',
          mode: 'mono',
          locked: false,
          tokens: {
            primary: '#ff0000',
          },
        },
      ],
    };

    if (!fs.existsSync(projectOutDir)) {
      fs.mkdirSync(projectOutDir, { recursive: true });
    }
    fs.writeFileSync(projectInputFile, JSON.stringify(sampleProject, null, 2));

    const { stderr } = await exec(
      `node src/lib/export-soc.js --input ${projectInputFile} --out ${projectOutDir}`
    );

    expect(stderr).toBe('');

    const indexFile = path.join(projectOutDir, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
    const root = path.resolve(projectOutDir);

    index.forEach((entry) => {
      const resolved = path.resolve(entry.file);
      expect(resolved.startsWith(root)).toBe(true);
      expect(fs.existsSync(entry.file)).toBe(true);
    });
  });
});
