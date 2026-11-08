import assert from 'node:assert/strict';
import test from 'node:test';
import { applyClassInput, validate, writeFileInput } from '@tep/contracts';

test('rejects path traversal', () => {
  assert.throws(() => validate(writeFileInput, { path: '../etc/passwd', content: 'x' }));
  assert.throws(() => validate(writeFileInput, { path: '/etc/passwd', content: 'x' }));
  assert.throws(() => validate(writeFileInput, { path: 'a\0b', content: 'x' }));
});

test('accepts relative project paths', () => {
  const result = validate(writeFileInput, { path: 'index.html', content: 'x' });
  assert.equal(result.path, 'index.html');
});

test('applyClassInput defaults empty arrays', () => {
  const result = validate(applyClassInput, { path: 'index.html', elementId: 'e1' });
  assert.deepEqual(result.add, []);
  assert.deepEqual(result.remove, []);
});

test('error messages are surfaceable to the UI', () => {
  assert.throws(
    () => validate(writeFileInput, { path: '../x', content: 'y' }),
    (error: unknown) => error instanceof Error && error.message.includes('مسار غير آمن'),
  );
});

test('rejects a missing or empty element id', () => {
  assert.throws(() => validate(applyClassInput, { path: 'a.html', elementId: '' }));
});
