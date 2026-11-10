import { expect, test, type Page } from '@playwright/test';

const srcdoc = async (page: Page) =>
  page.evaluate(
    () => document.querySelector<HTMLIFrameElement>('[data-testid="canvas-frame"]')?.srcdoc ?? '',
  );

async function openProject(page: Page) {
  await page.goto('/');
  await page.getByTestId('open-project').click();
  await expect(page.getByTestId('file-tree')).toContainText('page-0.html');
  await expect.poll(() => srcdoc(page)).not.toBe('');
}

test('open, pick, edit, save and undo a class', async ({ page }) => {
  await openProject(page);

  await page.frameLocator('[data-testid="canvas-frame"]').locator('article').first().click();
  await expect(page.getByTestId('selected-element')).not.toBeEmpty();

  await page.getByTestId('class-input').fill('p-8');
  await page.getByTestId('apply-class').click();
  await expect(page.getByTestId('status')).toContainText('تم');
  await expect(page.getByTestId('dirty')).toContainText('غير محفوظة');
  await expect.poll(() => srcdoc(page)).toContain('p-8');

  await page.getByTestId('save').click();
  await expect(page.getByTestId('status')).toContainText('حُفظ');
  await expect(page.getByTestId('dirty')).toBeEmpty();

  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('status')).toContainText('تراجع');
  await expect.poll(() => srcdoc(page)).not.toContain('p-8');
});

test('applying a class changes only the class attribute bytes', async ({ page }) => {
  await openProject(page);

  await page.frameLocator('[data-testid="canvas-frame"]').locator('article').first().click();
  await expect(page.getByTestId('selected-element')).not.toBeEmpty();
  const before = await srcdoc(page);

  await page.getByTestId('class-input').fill('m-4');
  await page.getByTestId('apply-class').click();
  await expect(page.getByTestId('status')).toContainText('تم');
  await expect.poll(() => srcdoc(page)).toContain('m-4');
  const after = await srcdoc(page);

  expect(after).not.toBe(before);
  const stripClass = (html: string) => html.replace(/class="[^"]*"/g, 'class=""');
  const stripIds = (html: string) => html.replace(/ data-tep-id="[^"]*"/g, '');
  const stripScript = (html: string) => html.replace(/<script>[\s\S]*?<\/script>/g, '');
  expect(stripScript(stripIds(stripClass(after)))).toBe(stripScript(stripIds(stripClass(before))));
});
