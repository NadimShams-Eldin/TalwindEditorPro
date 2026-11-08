import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBridgeMessage } from '@tep/preview';

test('accepts known messages', () => {
  assert.deepEqual(parseBridgeMessage({ type: 'ready' }), { type: 'ready' });
  assert.deepEqual(parseBridgeMessage({ type: 'select', id: 'e1' }), {
    type: 'select',
    id: 'e1',
  });
  assert.deepEqual(parseBridgeMessage({ type: 'picked', id: 'e2' }), {
    type: 'picked',
    id: 'e2',
  });
  assert.deepEqual(parseBridgeMessage({ type: 'cssApplied', bytes: 10 }), {
    type: 'cssApplied',
    bytes: 10,
  });
});

test('rejects malformed messages', () => {
  assert.equal(parseBridgeMessage(null), null);
  assert.equal(parseBridgeMessage('ready'), null);
  assert.equal(parseBridgeMessage({ type: 'select' }), null);
  assert.equal(parseBridgeMessage({ type: 'cssApplied', bytes: '10' }), null);
  assert.equal(parseBridgeMessage({ type: 'unknown' }), null);
});
