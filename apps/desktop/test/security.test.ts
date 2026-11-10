import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('main window uses secure webPreferences', () => {
  const source = fs.readFileSync(path.resolve('apps/desktop/src/main/main.ts'), 'utf8');
  assert.ok(source.includes('contextIsolation: true'));
  assert.ok(source.includes('sandbox: true'));
  assert.ok(source.includes('nodeIntegration: false'));
  assert.equal(source.includes('nodeIntegration: true'), false);
});

test('preload exposes a narrow typed surface', () => {
  const source = fs.readFileSync(path.resolve('apps/desktop/src/preload/preload.ts'), 'utf8');
  assert.equal(source.includes('ipcRenderer.send'), false);
  assert.equal(source.includes('require('), false);
  assert.ok(source.includes('contextBridge.exposeInMainWorld'));
});

test('renderer never imports node builtins', () => {
  const files = fs.readdirSync(path.resolve('apps/desktop/src/renderer'));
  for (const file of files) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const source = fs.readFileSync(path.resolve('apps/desktop/src/renderer', file), 'utf8');
    assert.equal(/from 'node:/.test(source), false, file);
    assert.equal(/require\(/.test(source), false, file);
  }
});
