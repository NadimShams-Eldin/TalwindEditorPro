import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTheme } from '@tep/tailwind';

test('parses @theme custom properties', () => {
  const tokens = parseTheme(`@theme {
    --color-brand-500: oklch(0.62 0.19 259);
    --radius-card: 1rem;
  }`);
  assert.deepEqual(tokens, [
    { namespace: 'color', name: 'brand-500', value: 'oklch(0.62 0.19 259)' },
    { namespace: 'radius', name: 'card', value: '1rem' },
  ]);
});

test('returns an empty list when there is no @theme block', () => {
  assert.deepEqual(parseTheme('@import "tailwindcss";'), []);
});

test('skips variables without a namespace prefix', () => {
  const tokens = parseTheme('@theme { --plain: 1rem; --spacing-4: 1rem; }');
  assert.deepEqual(tokens, [{ namespace: 'spacing', name: '4', value: '1rem' }]);
});
