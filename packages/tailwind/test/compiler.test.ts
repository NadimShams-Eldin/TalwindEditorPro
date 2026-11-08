import assert from 'node:assert/strict';
import test from 'node:test';
import { createCompiler } from '@tep/tailwind';

test('compiles explicit candidates including dynamic ones', async () => {
  const compiler = await createCompiler('@import "tailwindcss";', process.cwd());
  const result = compiler.build(['flex', 'bg-red-500']);
  assert.ok(result.css.includes('.flex'));
  assert.ok(result.css.includes('bg-red-500'));
  assert.ok(result.rules > 0);
  assert.ok(result.durationMs >= 0);
});

test('cold compile stays under 300ms on this machine', async () => {
  const started = performance.now();
  const compiler = await createCompiler('@import "tailwindcss";', process.cwd());
  compiler.build(['p-4']);
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 300, `cold compile took ${elapsed.toFixed(0)}ms`);
});

test('candidate order does not change the output', async () => {
  const compiler = await createCompiler('@import "tailwindcss";', process.cwd());
  const a = compiler.build(['p-4', 'flex']);
  const b = compiler.build(['flex', 'p-4']);
  assert.equal(a.css, b.css);
});

test('duplicate candidates are compiled once', async () => {
  const compiler = await createCompiler('@import "tailwindcss";', process.cwd());
  const once = compiler.build(['p-4']);
  const twice = compiler.build(['p-4', 'p-4', 'p-4']);
  assert.equal(once.css, twice.css);
  assert.equal(once.rules, twice.rules);
});
