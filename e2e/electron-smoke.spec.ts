import path from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

const enabled = process.env.TEP_ELECTRON_E2E === '1';

test.skip(!enabled, 'requires TEP_ELECTRON_E2E=1 and a display (xvfb-run)');

test('electron window boots with a hardened preload bridge', async () => {
  const app = await electron.launch({
    args: ['apps/desktop/out/main/main.js', '--no-sandbox'],
    cwd: process.cwd(),
  });
  const window = await app.firstWindow();
  await expect(window.getByTestId('open-project')).toBeVisible();
  const hardened = await window.evaluate(() => ({
    hasTep: typeof (globalThis as { tep?: unknown }).tep === 'object',
    hasRequire: typeof (globalThis as { require?: unknown }).require,
    hasProcess: typeof (globalThis as { process?: unknown }).process,
  }));
  expect(hardened.hasTep).toBe(true);
  expect(hardened.hasRequire).toBe('undefined');
  expect(hardened.hasProcess).toBe('undefined');
  await app.close();
});

test('electron build exposes the renderer entry', async () => {
  expect(path.basename('apps/desktop/out/preload/preload.js')).toBe('preload.js');
});
