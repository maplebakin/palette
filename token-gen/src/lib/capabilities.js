const env = import.meta.env || {};

export const isPrivateForge = Boolean(env.DEV) || env.VITE_PRIVATE_FORGE === 'true';
// The vetted Theme Pack is the public delivery format. Keep seller tooling and
// broad export utilities behind the private forge boundary below.
export const canDownloadThemePack = true;
export const canExport = isPrivateForge;
