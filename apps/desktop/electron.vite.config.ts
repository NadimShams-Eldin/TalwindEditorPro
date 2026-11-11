import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

const workspacePackages = [
  '@tep/contracts',
  '@tep/editor',
  '@tep/fs',
  '@tep/parser',
  '@tep/preview',
  '@tep/tailwind',
];

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      externalizeDeps: { exclude: workspacePackages },
      rollupOptions: { output: { entryFileNames: 'main.js' } },
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      externalizeDeps: { exclude: workspacePackages },
      rollupOptions: { output: { format: 'cjs', entryFileNames: 'preload.js' } },
    },
  },
  renderer: {
    plugins: [react()],
    build: { outDir: 'out/renderer' },
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
  },
});
