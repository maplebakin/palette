const env = import.meta.env || {};

export const isPrivateForge = env.VITE_PRIVATE_FORGE === 'true';
// The public build is a demo: it can generate, inspect, and copy values, but
// offers no file downloads at all — not even the Theme Pack ZIP. The private
// forge build keeps the full seller/export surface (theme packs, product
// packages, listing assets, and every format exporter).
export const canDownloadThemePack = isPrivateForge;
export const canExport = isPrivateForge;
