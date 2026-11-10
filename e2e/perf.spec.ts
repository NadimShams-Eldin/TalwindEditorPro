import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test('opens a 100 page project under 3s', async ({ page }) => {
  const started = Date.now();
  await page.goto('/');
  await page.getByTestId('open-project').click();
  await expect(page.getByTestId('file-tree')).toContainText('page-0.html');
  const elapsed = Date.now() - started;
  fs.mkdirSync('bench', { recursive: true });
  fs.writeFileSync(
    'bench/browser.json',
    `${JSON.stringify({ openProjectMs: elapsed }, null, 2)}\n`,
  );
  expect(elapsed).toBeLessThan(3000);
});
