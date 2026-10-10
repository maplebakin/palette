#!/usr/bin/env node
/**
 * Rebuild UNREVIEWED sale candidates using the current engine.
 *
 * Historical preview cards preserve seeds and dark-mode visual references, but
 * not the complete confirmed Light/Dark/Pop variant token states. These outputs
 * are candidates, NOT a recreation of the July 2026 buyer-approved ZIPs.
 *
 * From token-gen/: node scripts/build-sale-candidates.mjs --check
 * From token-gen/: node scripts/build-sale-candidates.mjs --write
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import JSZip from 'jszip';
import { buildTheme } from '../src/lib/theme/engine.js';
import { buildMarketplaceKitArchive } from '../src/lib/exports/marketplaceKit.js';

const MODES = Object.freeze(['light', 'dark', 'pop']);

// Sources: token-gen/products/<kit>/preview/palette-card.svg (dark-mode cards).
// There is no committed, fully reviewed source state for all three modes.
export const SALE_CANDIDATES = Object.freeze([
  {
    name: 'Beef Ritual',
    seed: '#7b241c',
    harmony: 'Monochromatic',
    historicalDark: {
      primary: '#7b241c',
      secondary: '#d17961',
      accent: '#e8e26e',
      background: '#1f1514',
      surface: '#34201e',
      body: '#cfc9c9',
      muted: '#aba1a0',
    },
  },
  {
    name: 'Cobalt Chapel',
    seed: '#2447ff',
    harmony: 'Analogous',
    historicalDark: {
      primary: '#2447ff',
      secondary: '#2d9fb3',
      accent: '#d4a84f',
      background: '#101123',
      surface: '#18273a',
      body: '#c7c9d1',
      muted: '#9da0af',
    },
  },
]);

const getDarkSwatches = tokens => ({
  primary: tokens.brand.primary,
  secondary: tokens.brand.secondary,
  accent: tokens.brand.accent,
  background: tokens.surfaces.background,
  surface: tokens.cards['card-panel-surface'],
  body: tokens.typography['text-body'],
  muted: tokens.typography['text-muted'],
});
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

export const createCandidateTheme = candidate => {
  const variants = Object.fromEntries(MODES.map(themeMode => {
    const theme = buildTheme({
      name: candidate.name,
      baseColor: candidate.seed,
      mode: candidate.harmony,
      themeMode,
    });
    return [themeMode, theme];
  }));
  return {
    displayThemeName: candidate.name,
    baseColor: candidate.seed,
    mode: candidate.harmony,
    themeMode: 'dark',
    variants,
  };
};

export const verifyCandidateArchive = async (blob, kitSlug) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const zip = await JSZip.loadAsync(bytes);
  const root = kitSlug + '/';
  const manifest = JSON.parse(await zip.file(root + 'manifest.json').async('string'));
  assert(JSON.stringify(manifest.variants) === JSON.stringify(MODES), 'Missing required three variants');
  for (const mode of MODES) {
    const base = root + mode + '/' + kitSlug + '-' + mode;
    const json = JSON.parse(await zip.file(base + '.json').async('string'));
    assert(json.mode === mode, 'Wrong mode in ' + base);
    assert(json.tokenCount > 0, 'No tokens in ' + base);
    assert(json.tokenCount === Object.keys(json.tokens).length, 'JSON token count mismatch in ' + base);
    assert(manifest.tokenCountsByVariant[mode] === json.tokenCount, 'Manifest token count mismatch in ' + base);
    for (const suffix of ['.css', '.gpl', '.ase', '.swatches', '.figma-tokens.json']) {
      assert(zip.file(base + suffix), 'Missing ' + base + suffix);
    }
    assert(zip.file(root + mode + '/tailwind.' + kitSlug + '-' + mode + '.js'), 'Missing Tailwind in ' + mode);
  }
  const packaged = Object.keys(zip.files).filter(path => !zip.files[path].dir)
    .map(path => path.slice(root.length)).sort();
  assert(JSON.stringify(packaged) === JSON.stringify([...manifest.files].sort()), 'ZIP and manifest files differ');
  return {
    checksum: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.byteLength,
    counts: manifest.tokenCountsByVariant,
    modeSpecificTokens: Object.fromEntries(
      MODES.map(mode => [mode, manifest.modeSpecificTokens[mode]?.length ?? 0]),
    ),
  };
};

export const buildCandidate = async candidate => {
  const theme = createCandidateTheme(candidate);
  const { blob, filename, kitSlug, modes } = await buildMarketplaceKitArchive(theme);
  assert(modes.length === 3, 'Candidate does not contain all three modes');
  const verification = await verifyCandidateArchive(blob, kitSlug);
  const dark = getDarkSwatches(theme.variants.dark.finalTokens);
  const previewDifferences = Object.entries(candidate.historicalDark)
    .filter(([key, expected]) => dark[key]?.toLowerCase() !== expected)
    .map(([key, expected]) => ({ key, historical: expected, candidate: dark[key] }));
  return { candidate, blob, filename, verification, previewDifferences };
};

const CLI_PATH = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === CLI_PATH) {
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check');
  if (!write && !check) {
    throw new Error('Specify --check for validation or --write to save explicitly unapproved ZIPs');
  }
  const output = resolve(dirname(CLI_PATH), '../.release-candidates');
  if (write) await mkdir(output, { recursive: true });
  const reports = [];
  for (const candidate of SALE_CANDIDATES) {
    const result = await buildCandidate(candidate);
    const report = {
      status: 'UNREVIEWED_NOT_FOR_SALE',
      name: candidate.name,
      seed: candidate.seed,
      harmony: candidate.harmony,
      variants: [...MODES],
      ...result.verification,
      historicalDarkPreviewDifferences: result.previewDifferences,
      note: 'New engine output. Requires visual approval and full package review before sale. Not identical to July archived product.',
    };
    reports.push(report);
    if (write) {
      await writeFile(resolve(output, result.filename.replace(/\.zip$/, '-UNREVIEWED.zip')),
        new Uint8Array(await result.blob.arrayBuffer()));
    }
    process.stdout.write(candidate.name + ': ' + JSON.stringify({
      counts: report.counts,
      previewDifferences: report.historicalDarkPreviewDifferences.length,
      sha256: report.checksum,
    }) + '\n');
  }
  if (write) {
    await writeFile(resolve(output, 'CANDIDATE-REVIEW.json'), JSON.stringify(reports, null, 2) + '\n');
    await writeFile(resolve(output, 'DO-NOT-SELL.txt'),
      'UNREVIEWED PALETTE CANDIDATES\nNew engine outputs, NOT verified copies of the historic products.\nReview each mode and original dark preview before publishing.\n');
  }
  process.stdout.write('All draft candidates passed export format and contrast validation. Sale approval is NOT implied.\n');
}
