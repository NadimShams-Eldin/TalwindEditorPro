import assert from 'node:assert/strict';
import test from 'node:test';
import { CausalBuffer, addClass, explain } from '@tep/parser';

test('ledger records source and can explain an element', () => {
  const buffer = new CausalBuffer(`<div data-tep-id="e1">x</div>`);
  const applied = buffer.applyCausal({
    source: 'control',
    label: 'Add padding',
    elementId: 'e1',
    mutate: (text) => addClass(text, 'e1', 'p-4'),
  });
  assert.equal(applied, true);
  const history = explain(buffer, 'e1');
  assert.equal(history.length, 1);
  assert.equal(history[0]?.source, 'control');
  assert.equal(history[0]?.label, 'Add padding');
  assert.equal(history[0]?.elementId, 'e1');
  assert.equal(history[0]?.reversible, true);
});

test('undo preserves the causal log and redo restores it', () => {
  const source = `<div data-tep-id="e1">x</div>`;
  const buffer = new CausalBuffer(source);
  buffer.applyCausal({
    source: 'ai',
    label: 'Add flex',
    elementId: 'e1',
    mutate: (t) => addClass(t, 'e1', 'flex'),
  });
  assert.equal(buffer.undo(), true);
  assert.equal(buffer.text, source);
  assert.equal(explain(buffer, 'e1').length, 1);
  assert.equal(buffer.redo(), true);
  assert.ok(buffer.text.includes('flex'));
});

test('explain ignores no-op edits and other elements', () => {
  const buffer = new CausalBuffer(`<div data-tep-id="e1">x</div><p data-tep-id="e2">y</p>`);
  assert.equal(
    buffer.applyCausal({
      source: 'code',
      label: 'No change',
      elementId: 'e1',
      mutate: (t) => t,
    }),
    false,
  );
  buffer.applyCausal({
    source: 'import',
    label: 'Add p-2',
    elementId: 'e2',
    mutate: (t) => addClass(t, 'e2', 'p-2'),
  });
  assert.equal(explain(buffer, 'e1').length, 0);
  assert.equal(explain(buffer, 'e2').length, 1);
  assert.equal(explain(buffer, 'e2')[0]?.source, 'import');
});
