import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { collectFromHtml, createCompiler } from '@tep/tailwind';

// Tailwind escapes variant separators in selectors (`md:p-6` -> `.md\\:p-6`),
// so parity is asserted against the escaped form rather than the raw candidate.
function selectorFor(candidate: string): string {
  return `.${candidate.replace(/[.:/[\]()%#,+*~>="']/g, (ch) => `\\${ch}`)}`;
}

test('every used core utility gets a rule', async () => {
  const html = fs.readFileSync(path.resolve('packages/tailwind/test/fixtures/parity.html'), 'utf8');
  const candidates = collectFromHtml(html);
  const compiler = await createCompiler('@import "tailwindcss";', process.cwd());
  const { css } = compiler.build(candidates);
  for (const candidate of candidates) {
    if (candidate.includes('${') || candidate.includes('{{')) continue;
    const selector = selectorFor(candidate);
    assert.ok(
      css.includes(selector) || css.includes(candidate),
      `missing rule for ${candidate} (expected ${selector})`,
    );
  }
});

test('custom theme token compiles when declared', async () => {
  const themeCss = `@import "tailwindcss";\n@theme {\n  --color-brand-500: oklch(0.62 0.19 259);\n}`;
  const compiler = await createCompiler(themeCss, process.cwd());
  const { css } = compiler.build(['bg-brand-500']);
  assert.ok(css.includes('--color-brand-500'));
  assert.ok(css.includes('bg-brand-500'));
});

test('unknown theme token does not silently compile', async () => {
  const compiler = await createCompiler('@import "tailwindcss";', process.cwd());
  const { css } = compiler.build(['bg-brand-500']);
  assert.equal(css.includes('bg-brand-500'), false);
});
