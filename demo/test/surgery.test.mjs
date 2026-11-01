import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDocument,
  indexElements,
  editableElements,
  findById,
  readClasses,
  addClass,
  removeClass,
  injectPreviewIds,
  diffRange,
} from '../src/surgery.js';

const HTML = [
  '<!doctype html>',
  '<html><head><title>t</title></head>',
  '<body>',
  '<div class="p-4 grid">',
  '<p class="text-sm">hello</p>',
  '<span class="bold">x</span>',
  '<a href="#" class="p-4">link</a>',
  '<b>plain</b>',
  '</div>',
  '</body></html>',
].join('');

function setup(html = HTML) {
  const items = indexElements(parseDocument(html));
  return { html, items, editable: editableElements(items) };
}

function nodeByTag(items, tag) {
  return items.find((item) => item.tag === tag);
}

test('index paths are structural and stable', () => {
  const { items } = setup();
  const div = items.find((item) => item.tag === 'div');
  const p = items.find((item) => item.tag === 'p');
  const a = items.find((item) => item.tag === 'a');
  assert.equal(div.id, '0/1/0');
  assert.equal(p.id, '0/1/0/0');
  assert.equal(a.id, '0/1/0/2');
  assert.equal(findById(items, '0/1/0/2').tag, 'a');
  assert.equal(findById(items, '9/9'), null);
});

test('readClasses splits on whitespace and ignores empty tokens', () => {
  const { items } = setup();
  const div = nodeByTag(items, 'div');
  assert.deepEqual(readClasses(div.node), ['p-4', 'grid']);
  const b = nodeByTag(items, 'b');
  assert.deepEqual(readClasses(b.node), []);
});

test('addClass appends without re-serializing the document', () => {
  const { html, items } = setup();
  const p = nodeByTag(items, 'p');
  const next = addClass(html, p.node, 'font-bold');
  assert.equal(next, HTML.replace('class="text-sm"', 'class="text-sm font-bold"'));
});

test('addClass creates the attribute when missing and preserves the rest', () => {
  const { html, items } = setup();
  const b = nodeByTag(items, 'b');
  const next = addClass(html, b.node, 'text-lg');
  assert.equal(next, HTML.replace('<b>', '<b class="text-lg">'));
});

test('addClass is idempotent', () => {
  const { html, items } = setup();
  const div = nodeByTag(items, 'div');
  assert.equal(addClass(html, div.node, 'p-4'), html);
});

test('removeClass keeps neighbouring classes byte-identical', () => {
  const { html, items } = setup();
  const div = nodeByTag(items, 'div');
  const next = removeClass(html, div.node, 'p-4');
  assert.equal(next, HTML.replace('class="p-4 grid"', 'class="grid"'));
});

test('removeClass drops the whole attribute when it becomes empty', () => {
  const { html, items } = setup();
  const span = nodeByTag(items, 'span');
  const next = removeClass(html, span.node, 'bold');
  assert.equal(next, HTML.replace('<span class="bold">', '<span>'));
});

test('removeClass handles unquoted class attributes without corruption', () => {
  const source = '<div class=bold>x</div>';
  const items = indexElements(parseDocument(source));
  const div = nodeByTag(items, 'div');
  const next = removeClass(source, div.node, 'bold');
  assert.equal(next, '<div>x</div>');
});

test('removeClass handles a missing class as a no-op', () => {
  const { html, items } = setup();
  const div = nodeByTag(items, 'div');
  assert.equal(removeClass(html, div.node, 'nope'), html);
});

test('injectPreviewIds only touches editable elements', () => {
  const { html, editable, items } = setup();
  const injected = injectPreviewIds(html, items);
  assert.equal(editable.length, 5);
  assert.match(injected, /<div class="p-4 grid" data-tep-path="0\/1\/0">/);
  assert.doesNotMatch(injected, /<head data-tep-path/);
  assert.doesNotMatch(injected, /<title data-tep-path/);
});

test('diffRange isolates the changed slice', () => {
  const before = 'class="p-4"';
  const after = 'class="p-4 font-bold"';
  const diff = diffRange(before, after);
  assert.equal(diff.identical, false);
  assert.equal(diff.removed, '');
  assert.equal(diff.inserted, ' font-bold');
  assert.equal(diff.prefix, 10);
});

test('diffRange reports identical inputs', () => {
  const diff = diffRange('abc', 'abc');
  assert.equal(diff.identical, true);
});

test('addClass rejects tokens with whitespace', () => {
  const { html, items } = setup();
  const div = nodeByTag(items, 'div');
  assert.equal(addClass(html, div.node, 'a b'), html);
});

test('editing round-trips through parse and preserves every untouched byte', () => {
  const { html, items } = setup();
  const p = nodeByTag(items, 'p');
  const once = addClass(html, p.node, 'font-bold');
  const itemsAgain = indexElements(parseDocument(once));
  const pAgain = nodeByTag(itemsAgain, 'p');
  const twice = removeClass(once, pAgain.node, 'font-bold');
  assert.equal(twice, html);
});

test('attribute order and duplicate whitespace survive edits', () => {
  const source = '<div   id="x"   class="a  b"  data-y="1">t</div>';
  const items = indexElements(parseDocument(source));
  const div = nodeByTag(items, 'div');
  const next = addClass(source, div.node, 'c');
  assert.equal(next, '<div   id="x"   class="a  b c"  data-y="1">t</div>');
  const reparsed = nodeByTag(indexElements(parseDocument(next)), 'div');
  const back = removeClass(next, reparsed.node, 'c');
  assert.equal(back, source);
});

test('propertyOf maps core utilities to CSS families', async () => {
  const { propertyOf } = await import('../src/classes.js');
  assert.deepEqual(propertyOf('p-4'), { property: 'padding', side: '' });
  assert.deepEqual(propertyOf('px-6'), { property: 'padding', side: 'x' });
  assert.deepEqual(propertyOf('mt-2'), { property: 'margin', side: 'top' });
  assert.deepEqual(propertyOf('text-sm'), { property: 'font-size', side: '' });
  assert.deepEqual(propertyOf('text-white'), { property: 'color', side: '' });
  assert.deepEqual(propertyOf('hover:bg-brand-500'), { property: 'background-color', side: '' });
  assert.equal(propertyOf('not-a-utility'), null);
});

test('findConflicts only reports pairs that actually collide', async () => {
  const { findConflicts } = await import('../src/classes.js');
  const solos = {
    'p-4': { padding: '16px' },
    'p-8': { padding: '32px' },
    'px-2': { padding: '8px' },
  };
  const whole = findConflicts(['p-4', 'p-8'], solos, { padding: '32px' });
  assert.equal(whole.length, 1);
  assert.equal(whole[0].winner, 'p-8');
  assert.equal(whole[0].loser, 'p-4');

  const axis = findConflicts(['p-4', 'px-2'], solos, { padding: '8px 16px' });
  assert.equal(axis.length, 1);
  assert.equal(axis[0].property, 'padding');

  const none = findConflicts(['p-4', 'text-sm'], solos, { padding: '16px' });
  assert.equal(none.length, 0);
});

test('findConflicts ignores variant-scoped utilities', async () => {
  const { findConflicts } = await import('../src/classes.js');
  const solos = { 'md:p-8': { padding: '32px' }, 'p-4': { padding: '16px' } };
  assert.equal(findConflicts(['md:p-8', 'p-4'], solos, { padding: '16px' }).length, 0);
});

test('describeConflict names winner and loser', async () => {
  const { describeConflict } = await import('../src/classes.js');
  const line = describeConflict({
    property: 'padding',
    side: '',
    winner: 'p-10',
    loser: 'p-2',
    candidates: ['p-2', 'p-10'],
    actual: '40px',
  });
  assert.match(line, /p-10/);
  assert.match(line, /p-2/);
});
