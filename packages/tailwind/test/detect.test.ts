import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { detectMode } from '@tep/tailwind';

test('reports unknown when there is no manifest', async () => {
  assert.equal(await detectMode('/tmp/definitely-missing-project'), 'unknown');
});

test('detects builtin vs external build from scripts', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-detect-'));
  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ dependencies: { tailwindcss: '4.3.3' }, scripts: { dev: 'vite' } }),
  );
  assert.equal(await detectMode(root), 'builtin');

  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      dependencies: { tailwindcss: '4.3.3' },
      scripts: { css: 'tailwindcss -i in.css -o out.css' },
    }),
  );
  assert.equal(await detectMode(root), 'external');
});

test('reports unknown without tailwindcss dependency', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-detect-'));
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
  assert.equal(await detectMode(root), 'unknown');
});
