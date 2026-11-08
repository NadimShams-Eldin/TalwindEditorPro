import assert from 'node:assert/strict';
import test from 'node:test';
import { collectFromHtml, mergeCandidates } from '@tep/tailwind';

test('collects classes from class attributes only once', () => {
  const found = collectFromHtml(
    `<div class="p-4  flex p-4"><span class="md:hover:bg-red-500">x</span></div>`,
  );
  assert.deepEqual([...found].sort(), ['flex', 'md:hover:bg-red-500', 'p-4']);
});

test('mergeCandidates deduplicates across sources', () => {
  const merged = mergeCandidates(['a', 'b'], ['b', 'c']);
  assert.deepEqual([...merged].sort(), ['a', 'b', 'c']);
});

test('ignores non-class attributes and empty values', () => {
  const found = collectFromHtml(
    `<div id="p-4" data-class="flex"><p class="">x</p><i class="m-2"></i></div>`,
  );
  assert.deepEqual([...found], ['m-2']);
});
