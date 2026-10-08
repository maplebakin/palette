/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import process from 'node:process';

const parsePort = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const normalizeBasePath = (value) => {
  if (!value) return '/';
  return value.endsWith('/') ? value : `${value}/`;
};

const serverPort = parsePort(process.env.VITE_DEV_PORT) ?? 5173;
const serverHost = process.env.VITE_DEV_HOST || 'localhost';
const hmrHost = process.env.VITE_HMR_HOST;
const hmrPort = parsePort(process.env.VITE_HMR_PORT);
const hmrClientPort = parsePort(process.env.VITE_HMR_CLIENT_PORT);
const hmrProtocol = process.env.VITE_HMR_PROTOCOL;

const hmrConfig = hmrHost || hmrPort || hmrClientPort || hmrProtocol
  ? {
      host: hmrHost,
      port: hmrPort,
      clientPort: hmrClientPort,
      protocol: hmrProtocol,
    }
  : undefined;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const privateForge = env.VITE_PRIVATE_FORGE === 'true';
  const appShellPath = privateForge
    ? path.resolve(process.cwd(), 'src/components/AppShell.jsx')
    : path.resolve(process.cwd(), 'src/components/PublicAppShell.jsx');
  const projectProviderPath = privateForge
    ? path.resolve(process.cwd(), 'src/context/ProjectProvider.jsx')
    : path.resolve(process.cwd(), 'src/context/PublicProjectProvider.jsx');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@app-shell': appShellPath,
        '@project-provider': projectProviderPath,
      },
    },
    base: normalizeBasePath(process.env.VITE_BASE),
    server: {
      host: serverHost,
      port: serverPort,
      strictPort: true,
      hmr: hmrConfig,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.js',
    },
  };
});
