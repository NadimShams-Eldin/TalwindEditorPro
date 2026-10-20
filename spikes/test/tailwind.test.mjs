import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileCandidates,
  countRules,
  createCompiler,
  hasRule,
  naiveScanClasses,
} from '../src/tailwind.mjs';

test('compiles core utilities, variants and arbitrary values', async () => {
  const { css } = await compileCandidates([
    'flex',
    'p-4',
    'hover:bg-red-500',
    'md:grid-cols-3',
    'bg-[#123456]',
  ]);

  assert.ok(hasRule(css, 'flex'));
  assert.ok(hasRule(css, 'p-4'));
  assert.ok(hasRule(css, 'hover:bg-red-500'));
  assert.ok(hasRule(css, 'md:grid-cols-3'));
  assert.ok(hasRule(css, 'bg-[#123456]'));
  assert.ok(css.includes('@media (hover: hover)'));
  assert.ok(css.includes('#123456'));
  assert.ok(countRules(css) > 5);
});

test('supports v4 important syntax and unknown candidates are ignored', async () => {
  const { css } = await compileCandidates(['flex!', 'not-a-real-utility']);
  assert.ok(hasRule(css, 'flex!') || hasRule(css, 'flex'));
  assert.ok(css.includes('!important'));
  assert.equal(hasRule(css, 'not-a-real-utility'), false);
});

test('reads custom theme tokens from @theme', async () => {
  const themeCss = `@import "tailwindcss";
@theme {
  --color-brand-500: oklch(0.62 0.19 259);
  --radius-card: 1rem;
}`;
  const { css } = await compileCandidates(['bg-brand-500', 'rounded-card'], { css: themeCss });
  assert.ok(css.includes('--color-brand-500'));
  assert.ok(css.includes('--radius-card'));
  assert.ok(hasRule(css, 'bg-brand-500'));
  assert.ok(hasRule(css, 'rounded-card'));
});

test('explicit candidates are generated without appearing in source text', async () => {
  const source = '<div class="p-4">static</div>';
  const scanned = naiveScanClasses(source);
  const dynamic = 'bg-red-500';
  assert.equal(scanned.has(dynamic), false);

  const compiler = await createCompiler();
  const fromScan = compiler.build([...scanned]);
  const fromSet = compiler.build([...scanned, dynamic]);

  assert.equal(hasRule(fromScan, dynamic), false);
  assert.ok(hasRule(fromSet, dynamic));
});

test('naive scanning misses concatenated class names', () => {
  const template = '<div class="p-4 ${color}">x</div>';
  const found = naiveScanClasses(template);
  assert.ok(found.has('p-4'));
  assert.ok(found.has('${color}'));
  assert.equal(found.has('bg-red-500'), false);
});

test('cold compile stays within the spike budget', async () => {
  const started = performance.now();
  const { css, ms } = await compileCandidates(['flex', 'p-4']);
  const total = performance.now() - started;
  assert.ok(css.length > 0);
  assert.ok(total < 2000, `cold compile took ${total.toFixed(1)}ms`);
  assert.ok(ms < 2000);
});

test('incremental builds remain fast and stable', async () => {
  const compiler = await createCompiler();
  const durations = [];
  let output = '';
  for (let i = 0; i < 40; i += 1) {
    const candidates = Array.from({ length: 20 }, (_, j) => (i % 2 === 0 ? `p-${j + 1}` : `m-${j + 1}`));
    const started = performance.now();
    output = compiler.build(candidates);
    durations.push(performance.now() - started);
  }
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const max = Math.max(...durations);
  assert.ok(output.length > 0);
  assert.ok(avg < 250, `average incremental build ${avg.toFixed(2)}ms`);
  assert.ok(max < 500, `max incremental build ${max.toFixed(2)}ms`);
});
