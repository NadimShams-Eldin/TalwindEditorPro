import assert from 'node:assert/strict';
import test from 'node:test';
import { addClass, classTokens, injectEditorIds, removeClass, stripEditorIds } from '@tep/parser';
import { randomHtml } from '../../../scripts/fuzz.mjs';

// Byte-exactness is required for id injection/stripping. Class edits carry the
// documented normalization of unquoted/valueless `class` attributes, so their
// round-trip invariant is semantic: the token list must be restored.
test('fuzz: inject and strip are byte-exact across generated documents', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const source = randomHtml(seed);
    const injected = injectEditorIds(source);
    assert.equal(stripEditorIds(injected.html), source, `seed ${seed} strip`);
  }
});

test('fuzz: add then remove restores the class token list', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const source = randomHtml(seed);
    const injected = injectEditorIds(source);
    const target = injected.ids.find((entry) => entry.tag !== 'html' && entry.tag !== 'body');
    if (!target) continue;
    const before = classTokens(injected.html, target.id);
    assert.ok(!before.includes('p-4'), `seed ${seed} precondition`);
    const added = addClass(injected.html, target.id, 'p-4');
    assert.deepEqual(classTokens(added, target.id), [...before, 'p-4'], `seed ${seed} add`);
    assert.equal(addClass(added, target.id, 'p-4'), added, `seed ${seed} add idempotent`);
    const removed = removeClass(added, target.id, 'p-4');
    assert.deepEqual(classTokens(removed, target.id), before, `seed ${seed} remove`);
  }
});
