import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createPreviewServer } from '@tep/preview';

test('serves html and blocks traversal', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-preview-'));
  await fs.writeFile(path.join(root, 'index.html'), '<h1>ok</h1>');
  const server = await createPreviewServer(root);
  const ok = await fetch(`${server.url}/index.html`);
  assert.equal(await ok.text(), '<h1>ok</h1>');
  const blocked = await fetch(`${server.url}/..%2Fetc%2Fpasswd`);
  assert.notEqual(blocked.status, 200);
  await server.close();
});

test('binds to loopback only', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-preview-'));
  const server = await createPreviewServer(root);
  assert.ok(server.url.startsWith('http://127.0.0.1:'));
  await server.close();
});

test('serves index.html at the root path', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-preview-'));
  await fs.writeFile(path.join(root, 'index.html'), '<p>root</p>');
  const server = await createPreviewServer(root);
  const response = await fetch(server.url);
  assert.equal(await response.text(), '<p>root</p>');
  await server.close();
});

test('sets a no-store content type for css', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-preview-'));
  await fs.writeFile(path.join(root, 'app.css'), '.a{}');
  const server = await createPreviewServer(root);
  const response = await fetch(`${server.url}/app.css`);
  assert.equal(response.headers.get('content-type'), 'text/css; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  await server.close();
});

test('returns 404 for missing files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-preview-'));
  const server = await createPreviewServer(root);
  const response = await fetch(`${server.url}/missing.html`);
  assert.equal(response.status, 404);
  await server.close();
});
