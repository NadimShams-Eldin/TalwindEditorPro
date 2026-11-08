import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addClassIndexed,
  addClassWithEdit,
  indexDocument,
  setClassesIndexed,
  setClassesWithEdit,
  shiftIndex,
} from '@tep/parser';

test('shiftIndex keeps later offsets valid after an insertion', () => {
  const html = `<div data-tep-id="e1">x</div><p data-tep-id="e2">y</p>`;
  const index = indexDocument(html);
  const result = addClassWithEdit(html, 'e1', 'p-4');
  const shifted = shiftIndex(index, result.edit, {
    editorId: 'e1',
    classValue: 'p-4',
  });
  const p = shifted.byId.get('e2');
  assert.ok(p);
  assert.equal(result.html.slice(p.start, p.end).startsWith('<p'), true);
  assert.equal(shifted.byId.get('e1')?.classValue, 'p-4');
});

test('shiftIndex is identity for no-op edits', () => {
  const html = `<div class="p-4" data-tep-id="e1">x</div>`;
  const index = indexDocument(html);
  const result = addClassWithEdit(html, 'e1', 'p-4');
  assert.equal(result.html, html);
  assert.deepEqual(shiftIndex(index, result.edit).elements, index.elements);
});

test('shiftIndex keeps every later element start tag sliceable', () => {
  const html = `<div data-tep-id="e1">x</div><p data-tep-id="e2">y</p><span data-tep-id="e3">z</span>`;
  const index = indexDocument(html);
  const result = setClassesWithEdit(html, 'e1', ['p-4', 'm-2']);
  const shifted = shiftIndex(index, result.edit, {
    editorId: 'e1',
    classValue: 'p-4 m-2',
  });
  for (const id of ['e2', 'e3']) {
    const entry = shifted.byId.get(id);
    assert.ok(entry);
    assert.equal(result.html.slice(entry.start, entry.end).startsWith(`<`), true);
    assert.ok(result.html.slice(entry.start, entry.end).includes(`data-tep-id="${id}"`));
  }
});

test('shiftIndex handles deletions that shift later offsets backwards', () => {
  const html = `<div class="a" data-tep-id="e1">x</div><p data-tep-id="e2">y</p>`;
  const index = indexDocument(html);
  const result = setClassesWithEdit(html, 'e1', []);
  const shifted = shiftIndex(index, result.edit, { editorId: 'e1', classValue: null });
  const p = shifted.byId.get('e2');
  assert.ok(p);
  assert.ok(result.html.slice(p.start, p.end).includes('data-tep-id="e2"'));
});

test('indexed add matches the full-parse command output', () => {
  const html = `<div data-tep-id="e1">x</div><p class="a" data-tep-id="e2">y</p><i data-tep-id="e3" class>z</i>`;
  const index = indexDocument(html);
  for (const id of ['e1', 'e2', 'e3']) {
    const fast = addClassIndexed(html, index, id, 'p-4');
    const slow = addClassWithEdit(html, id, 'p-4');
    assert.equal(fast.html, slow.html, id);
    assert.deepEqual(fast.edit, slow.edit, id);
  }
});

test('indexed setClasses matches the full-parse command output', () => {
  const html = `<div class="a b" data-tep-id="e1">x</div><p data-tep-id="e2">y</p>`;
  const index = indexDocument(html);
  for (const id of ['e1', 'e2']) {
    for (const next of [['p-4', 'm-2'], []]) {
      const fast = setClassesIndexed(html, index, id, next);
      const slow = setClassesWithEdit(html, id, next);
      assert.equal(fast.html, slow.html, `${id}/${next.join(',')}`);
      assert.deepEqual(fast.edit, slow.edit, `${id}/${next.join(',')}`);
    }
  }
});

test('indexed chain stays byte-valid without reparsing', () => {
  const html = `<div data-tep-id="e1">x</div><p data-tep-id="e2">y</p><span data-tep-id="e3">z</span>`;
  let index = indexDocument(html);
  let text = html;
  for (const [id, token] of [
    ['e1', 'p-4'],
    ['e2', 'm-2'],
    ['e3', 'flex'],
    ['e1', 'font-bold'],
  ] as const) {
    const result = addClassIndexed(text, index, id, token);
    text = result.html;
    index = result.index;
  }
  const check = indexDocument(text);
  for (const id of ['e1', 'e2', 'e3']) {
    const a = index.byId.get(id);
    const b = check.byId.get(id);
    assert.ok(a && b, id);
    assert.equal(a.start, b.start, `${id} start`);
    assert.equal(a.end, b.end, `${id} end`);
    assert.equal(a.classValue, b.classValue, `${id} class`);
  }
});
