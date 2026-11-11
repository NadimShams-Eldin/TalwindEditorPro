import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

const enabled = process.env.TEP_ELECTRON_E2E === '1';

test.skip(!enabled, 'requires TEP_ELECTRON_E2E=1 and a display (xvfb-run)');

test('electron full journey edits bytes through real ipc and disk', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-electron-'));
  const source = `<!doctype html>\n<html><body><main class="p-6" data-tep-id="e1"><h1 data-tep-id="e2">hi</h1></main></body></html>`;
  await fs.writeFile(path.join(root, 'index.html'), source);

  const app = await electron.launch({
    args: ['apps/desktop/out/main/main.js', '--no-sandbox'],
    cwd: process.cwd(),
    env: { ...process.env, TEP_E2E_PROJECT_ROOT: root },
  });
  const window = await app.firstWindow();
  await expect(window.getByTestId('open-project')).toBeVisible();

  await expect
    .poll(() =>
      window.evaluate(() => Boolean((globalThis as { __tepTestOpen?: unknown }).__tepTestOpen)),
    )
    .toBe(true);
  await window.evaluate(async () => {
    const hook = (globalThis as { __tepTestOpen?: (path: string) => Promise<void> }).__tepTestOpen;
    if (!hook) throw new Error('test open hook missing');
    await hook('index.html');
  });

  await expect(window.getByTestId('file-tree')).toContainText('index.html');
  await window.getByTestId('class-input').fill('flex');
  await window.getByTestId('apply-class').click();
  await expect(window.getByTestId('status')).toContainText('تم');

  await window.getByTestId('save').click();
  await expect(window.getByTestId('status')).toContainText('حُفظ');

  const saved = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  expect(saved).toContain('class="p-6 flex"');
  expect(saved.replace('class="p-6 flex"', 'class="p-6"')).toBe(source);

  await app.close();
  await fs.rm(root, { recursive: true, force: true });
});
