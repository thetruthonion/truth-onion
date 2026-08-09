// SPDX-License-Identifier: AGPL-3.0-only
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3111',
      // 2.98 correction: claim pages are server-rendered DOCUMENTS — the
      // dev server must hand /claim/* to the engine server, never let the
      // SPA fallback swallow it.
      '/claim': 'http://localhost:3111'
    }
  },
  build: {
    outDir: 'dist'
  }
});
