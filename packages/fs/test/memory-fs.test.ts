import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryFs } from '@tep/fs';

test('memory fs reads, writes and notifies watchers', async () => {
  const port = createMemoryFs({ 'index.html': 'a' });
  const events: string[] = [];
  await port.watch('', (event) => events.push(event.path));
  await port.write('index.html', 'b');
  assert.equal(await port.read('index.html'), 'b');
  assert.deepEqual(events, ['index.html']);
  await assert.rejects(() => port.read('../x'));
});

test('memory fs rejects absolute paths', async () => {
  const port = createMemoryFs();
  await assert.rejects(() => port.write('/etc/passwd', 'x'));
});

test('memory fs lists by prefix and stats content', async () => {
  const port = createMemoryFs({ 'a.html': 'aa', 'b.css': 'b' });
  assert.deepEqual(await port.list('.', '*.html'), ['a.html']);
  assert.deepEqual(await port.stat('a.html'), { mtimeMs: 0, size: 2 });
  await assert.rejects(() => port.stat('missing.html'));
});
