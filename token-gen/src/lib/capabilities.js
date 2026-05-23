export const isPrivateForge = import.meta.env.DEV || import.meta.env.VITE_PRIVATE_FORGE === 'true';
export const canExport = isPrivateForge;
