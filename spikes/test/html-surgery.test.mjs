import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  addClass,
  diffSummary,
  findElementByAttribute,
  injectEditorIds,
  removeClass,
  roundTrip,
  setClasses,
  stripEditorIds,
} from '../src/html-surgery.mjs';

const fixture = fs.readFileSync(new URL('../fixtures/basic.html', import.meta.url), 'utf8');

function injected(html = fixture) {
  return injectEditorIds(html);
}

function editorId(html, attribute, value) {
  const node = findElementByAttribute(html, attribute, value);
  assert.ok(node, `missing element with ${attribute}=${value}`);
  return node.attrs.find((attr) => attr.name === 'data-tep-id')?.value;
}

test('surgical no-op keeps every byte', () => {
  const result = injected();
  assert.equal(stripEditorIds(result.html), fixture);
});

test('parse5 serialize is not byte preserving', () => {
  const serialized = roundTrip(fixture);
  assert.notEqual(serialized, fixture);
  const diff = diffSummary(fixture, serialized);
  assert.equal(diff.identical, false);
  assert.ok(serialized.startsWith('<!DOCTYPE html>'));
});

test('injects stable ids for all selectable elements', () => {
  const first = injected();
  const second = injectEditorIds(first.html);
  assert.equal(first.ids.length, 23);
  assert.deepEqual(second.ids, first.ids);
  assert.equal(second.html, first.html);
});

test('adds a class without touching other bytes', () => {
  const source = '<div class="p-4 text-sm" id="a">x</div>';
  const withIds = injectEditorIds(source).html;
  const out = addClass(withIds, 'e1', 'flex');
  assert.equal(out, '<div class="p-4 text-sm flex" id="a" data-tep-id="e1">x</div>');
  assert.equal(out, withIds.replace('class="p-4 text-sm"', 'class="p-4 text-sm flex"'));
});

test('changes only the targeted class attribute', () => {
  const source = '<div class="p-4">one</div><div class="p-4">two</div>';
  const withIds = injectEditorIds(source).html;
  const out = setClasses(withIds, 'e1', ['p-8']);
  assert.ok(out.includes('<div class="p-8" data-tep-id="e1">one</div>'));
  assert.ok(out.includes('<div class="p-4" data-tep-id="e2">two</div>'));
});

test('adds class to an element without class attribute', () => {
  const source = '<div id="a">x</div>';
  const withIds = injectEditorIds(source).html;
  const out = addClass(withIds, 'e1', 'flex');
  assert.equal(out, '<div id="a" data-tep-id="e1" class="flex">x</div>');
});

test('removes the class attribute when the list becomes empty', () => {
  const source = '<div class="p-4" id="a">x</div>';
  const withIds = injectEditorIds(source).html;
  const out = removeClass(withIds, 'e1', 'p-4');
  assert.equal(out, '<div id="a" data-tep-id="e1">x</div>');
});

test('preserves single quotes and escapes double quotes', () => {
  const source = "<div class='p-4'>x</div>";
  const withIds = injectEditorIds(source).html;
  assert.equal(setClasses(withIds, 'e1', ['p-6', 'flex']), "<div class='p-6 flex' data-tep-id=\"e1\">x</div>");

  const quoted = injectEditorIds('<div class="p-4">x</div>').html;
  assert.equal(setClasses(quoted, 'e1', ['content-["a"]']), '<div class="content-[&quot;a&quot;]" data-tep-id="e1">x</div>');
});

test('quotes an unquoted class attribute and keeps the rest', () => {
  const source = '<span class=p-4 id="x">hi</span>';
  const withIds = injectEditorIds(source).html;
  const out = setClasses(withIds, 'e1', ['p-6']);
  assert.ok(out.startsWith('<span class="p-6" id="x" data-tep-id="e1">'));
});

test('does not touch scripts, comments, pre or svg internals', () => {
  const result = injected();
  const out = addClass(result.html, editorId(result.html, 'id', 'hero'), 'py-24');
  assert.ok(out.includes('<script>\n    const template = "<div class=\'p-4\'>inside string</div>";'));
  assert.ok(out.includes('<!-- keep this comment -->'));
  assert.ok(out.includes('  keep   this\n    spacing'));
  assert.ok(out.includes('<svg viewBox="0 0 10 10"'));
  assert.ok(out.includes('d="M0 0 L10 10"'));
});

test('keeps CRLF line endings intact', () => {
  const source = '<div class="p-4">\r\n  <span>x</span>\r\n</div>';
  const withIds = injectEditorIds(source).html;
  const out = addClass(withIds, 'e1', 'flex');
  assert.equal((out.match(/\r\n/g) ?? []).length, 2);
  assert.equal(stripEditorIds(withIds), source);
  assert.ok(out.includes('class="p-4 flex"'));
});

test('handles void and self-closing elements', () => {
  const source = '<div><img src="a.png"><br><hr /><input type="text"></div>';
  const result = injectEditorIds(source);
  assert.equal(stripEditorIds(result.html), source);
  assert.equal(result.ids.length, 5);
});

test('survives malformed HTML without throwing', () => {
  const source = '<div><span class="p-4">x</div>';
  const result = injectEditorIds(source);
  assert.equal(stripEditorIds(result.html), source);
  const out = addClass(result.html, 'e2', 'flex');
  assert.ok(out.includes('class="p-4 flex"'));
});

test('reports a diff summary for changed documents', () => {
  const diff = diffSummary('<div class="p-4"></div>', '<div class="p-6"></div>');
  assert.equal(diff.identical, false);
  assert.equal(diff.lengthDelta, 0);
  assert.ok(diff.prefix > 0);
});
