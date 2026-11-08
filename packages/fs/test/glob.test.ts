import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesGlob } from '@tep/fs';

test('* stays inside one segment', () => {
  assert.equal(matchesGlob('a.html', '*.html'), true);
  assert.equal(matchesGlob('pages/a.html', '*.html'), false);
});

test('** spans zero or more segments', () => {
  assert.equal(matchesGlob('a.html', '**/*.html'), true);
  assert.equal(matchesGlob('pages/deep/a.html', '**/*.html'), true);
  assert.equal(matchesGlob('a.css', '**/*.html'), false);
});

test('? matches exactly one character', () => {
  assert.equal(matchesGlob('a1.html', 'a?.html'), true);
  assert.equal(matchesGlob('a12.html', 'a?.html'), false);
});

test('dots are literal', () => {
  assert.equal(matchesGlob('aXhtml', '*.html'), false);
});
