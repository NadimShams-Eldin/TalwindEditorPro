import assert from 'node:assert/strict';
import test from 'node:test';
import { createSession } from '@tep/editor';
import { createMemoryFs } from '@tep/fs';

const SOURCE = `<div class="p-4" data-tep-id="e1">x</div>`;

test('session edits in memory until save', async () => {
  const port = createMemoryFs({ 'index.html': SOURCE });
  const session = await createSession(port, 'index.html');
  session.addClass('e1', 'flex');
  assert.ok(session.text.includes('flex'));
  assert.equal(await port.read('index.html'), SOURCE);
  await session.save();
  assert.equal(await port.read('index.html'), `<div class="p-4 flex" data-tep-id="e1">x</div>`);
});

test('session undo restores exact bytes and redo reapplies', async () => {
  const port = createMemoryFs({ 'index.html': SOURCE });
  const session = await createSession(port, 'index.html');
  session.addClass('e1', 'flex');
  session.undo();
  assert.equal(session.text, SOURCE);
  session.redo();
  assert.ok(session.text.includes('flex'));
});

test('save strips editor ids only when exporting', async () => {
  const port = createMemoryFs({ 'index.html': SOURCE });
  const session = await createSession(port, 'index.html');
  session.addClass('e1', 'flex');
  await session.save();
  assert.equal(await port.read('index.html'), `<div class="p-4 flex" data-tep-id="e1">x</div>`);
  const exported = session.exportHtml();
  assert.equal(exported.includes('data-tep-id'), false);
});

test('removeClass and no-op edits report accurately', async () => {
  const port = createMemoryFs({ 'index.html': SOURCE });
  const session = await createSession(port, 'index.html');
  assert.equal(session.addClass('e1', 'p-4'), false);
  assert.equal(session.addClass('e1', 'flex'), true);
  assert.equal(session.removeClass('e1', 'flex'), true);
  assert.equal(session.text, SOURCE);
});

test('dirty reflects the undo cursor', async () => {
  const port = createMemoryFs({ 'index.html': SOURCE });
  const session = await createSession(port, 'index.html');
  assert.equal(session.dirty, false);
  session.addClass('e1', 'flex');
  assert.equal(session.dirty, true);
  session.undo();
  assert.equal(session.dirty, false);
});

test('save only writes the touched bytes', async () => {
  const port = createMemoryFs({ 'index.html': SOURCE });
  const session = await createSession(port, 'index.html');
  session.addClass('e1', 'm-2');
  await session.save();
  const saved = await port.read('index.html');
  assert.equal(saved.replace(' class="p-4 m-2"', ' class="p-4"'), SOURCE);
});
