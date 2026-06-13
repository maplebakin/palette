const env = import.meta.env || {};

export const isPrivateForge = Boolean(env.DEV) || env.VITE_PRIVATE_FORGE === 'true';
export const canExport = isPrivateForge;
