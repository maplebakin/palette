/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

const parsePort = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
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
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
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
});
