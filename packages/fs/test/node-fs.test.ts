import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createNodeFs } from '@tep/fs';

test('reads and writes inside the project root only', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-fs-'));
  const port = createNodeFs(root);
  await port.write('index.html', '<div>x</div>');
  assert.equal(await port.read('index.html'), '<div>x</div>');
  await assert.rejects(() => port.read('../outside.html'));
});

test('lists html files matching a glob', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-fs-'));
  const port = createNodeFs(root);
  await port.write('a.html', 'a');
  await port.write('b.css', 'b');
  const files = await port.list('.', '**/*.html');
  assert.deepEqual(files.sort(), ['a.html']);
});

test('creates nested directories on write', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-fs-'));
  const port = createNodeFs(root);
  await port.write('pages/about/index.html', 'x');
  assert.equal(await port.read('pages/about/index.html'), 'x');
  assert.ok((await port.stat('pages/about/index.html')).size > 0);
});

test('ignores node_modules while listing', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-fs-'));
  const port = createNodeFs(root);
  await port.write('node_modules/pkg/x.html', 'x');
  await port.write('index.html', 'y');
  assert.deepEqual(await port.list('.', '**/*.html'), ['index.html']);
});
