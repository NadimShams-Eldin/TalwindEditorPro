import assert from 'node:assert/strict';
import test from 'node:test';
import { indexDocument } from '@tep/parser';

test('index exposes stable structural paths', () => {
  const html = `<html><body><div class="a"><p>x</p><p>y</p></div><img src="x"></body></html>`;
  const index = indexDocument(html);
  assert.ok(index.elements.length >= 5);
  assert.equal(index.byPath.get('0/1/0')?.tag, 'div');
  assert.equal(index.byPath.get('0/1/0/1')?.tag, 'p');
  assert.equal(index.byPath.get('0/1/0')?.classValue, 'a');
  assert.equal(index.byPath.get('0/1/1')?.tag, 'img');
});

test('index survives insertion after the target', () => {
  const before = indexDocument(`<html><body><div id="a">x</div><section></section></body></html>`);
  const after = indexDocument(
    `<html><body><div id="a">x</div><section><div>new</div></section></body></html>`,
  );
  assert.equal(before.byPath.get('0/1/0')?.tag, after.byPath.get('0/1/0')?.tag);
  assert.equal(before.byPath.get('0/1/1')?.tag, 'section');
  assert.equal(after.byPath.get('0/1/1')?.tag, 'section');
  assert.equal(before.byPath.get('0/1/1/0'), undefined);
  assert.equal(after.byPath.get('0/1/1/0')?.tag, 'div');
});

test('index records editor ids and start-tag offsets', () => {
  const html = `<div data-tep-id="e1" class="p-4">x</div>`;
  const index = indexDocument(html);
  const entry = index.byId.get('e1');
  assert.ok(entry);
  assert.equal(entry.classValue, 'p-4');
  assert.equal(html.slice(entry.start, entry.end), '<div data-tep-id="e1" class="p-4">');
});

test('structural paths ignore comments, text and doctype', () => {
  const html = `<!doctype html><!-- c --><html><body>text<div>a</div>text<span>b</span></body></html>`;
  const index = indexDocument(html);
  assert.equal(index.byPath.get('0/1/0')?.tag, 'div');
  assert.equal(index.byPath.get('0/1/1')?.tag, 'span');
});
