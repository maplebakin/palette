import { readFile } from 'node:fs/promises';

const base = process.env.VITE_BASE;
if (!base || base === '/') {
  throw new Error('Set a non-root VITE_BASE when verifying a GitHub Pages project-site build.');
}

const normalizedBase = base.endsWith('/') ? base : `${base}/`;
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
const rootAbsoluteUrls = assetUrls.filter((url) => url.startsWith('/'));

if (!assetUrls.some((url) => url.startsWith(`${normalizedBase}assets/`))) {
  throw new Error(`No JavaScript or stylesheet asset uses the expected ${normalizedBase}assets/ base path.`);
}

const invalidUrls = rootAbsoluteUrls.filter((url) => !url.startsWith(normalizedBase));
if (invalidUrls.length) {
  throw new Error(`Found asset URL(s) outside ${normalizedBase}: ${invalidUrls.join(', ')}`);
}

console.log(`Verified ${assetUrls.length} asset URL(s) use the GitHub Pages base ${normalizedBase}.`);
