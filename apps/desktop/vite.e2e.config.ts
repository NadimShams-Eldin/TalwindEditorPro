import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'apps/desktop/src/renderer',
  publicDir: '../../../../e2e/fixtures/project',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    allowedHosts: ['.monkeycode-ai.live'],
  },
});
