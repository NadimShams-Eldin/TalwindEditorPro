import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: {
    trace: 'on-first-retry',
    baseURL: 'http://127.0.0.1:5174',
  },
  webServer: {
    command: 'npx vite --config apps/desktop/vite.e2e.config.ts',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
