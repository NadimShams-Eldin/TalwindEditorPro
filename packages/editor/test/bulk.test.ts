import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createSession } from '@tep/editor';
import { createMemoryFs } from '@tep/fs';
import { injectEditorIds, stripEditorIds } from '@tep/parser';

function project(page: number): string {
  const body = Array.from(
    { length: 40 },
    (_, j) =>
      `<article class="card p-4 md:p-6"><h2 class="text-lg font-semibold">Card ${j}</h2><p class="mt-2 text-sm text-gray-600">Body ${j}</p></article>\n`,
  ).join('');
  return `<!doctype html>\n<html><head><meta charset="utf-8"><title>Page ${page}</title></head><body><main class="p-6">${body}</main></body></html>`;
}

test('100 edits only touch class attribute bytes', async () => {
  const source = injectEditorIds(project(0)).html;
  const before = source;
  const port = createMemoryFs({ 'index.html': source });
  const session = await createSession(port, 'index.html');
  const targets = injectEditorIds(project(0)).ids.filter((entry) => entry.tag === 'article');

  let applied = 0;
  for (let i = 0; i < 100; i += 1) {
    const target = targets[i % targets.length];
    if (!target) continue;
    if (session.addClass(target.id, `gap-${(i % 8) + 1}`)) applied += 1;
  }
  assert.ok(applied >= 40, `expected many applied edits, got ${applied}`);
  await session.save();
  const saved = await port.read('index.html');

  const stripClass = (html: string) => html.replace(/ class="[^"]*"/g, ' class=""');
  assert.equal(stripClass(saved), stripClass(before));
});

test('saving an unedited session rewrites identical bytes', async () => {
  const source = injectEditorIds(project(1)).html;
  const port = createMemoryFs({ 'index.html': source });
  const session = await createSession(port, 'index.html');
  await session.save();
  assert.equal(await port.read('index.html'), source);
});

test('export strips editor ids and keeps everything else', async () => {
  const source = project(2);
  const injected = injectEditorIds(source);
  const port = createMemoryFs({ 'index.html': injected.html });
  const session = await createSession(port, 'index.html');
  const target = injected.ids.find((entry) => entry.tag === 'article');
  assert.ok(target);
  session.addClass(target.id, 'p-2');
  const exported = session.exportHtml();
  assert.equal(exported, stripEditorIds(session.text));
  assert.equal(exported.includes('data-tep-id'), false);
  assert.ok(exported.startsWith('<!doctype html>'));
});

test('fixture corpus round-trips through the session byte for byte', async () => {
  const fixtureDir = 'packages/parser/test/fixtures';
  const files = fs
    .readdirSync(fixtureDir)
    .filter((name) => name.endsWith('.html'))
    .slice(0, 10);
  for (const name of files) {
    const source = fs.readFileSync(`${fixtureDir}/${name}`, 'utf8');
    const injected = injectEditorIds(source).html;
    const port = createMemoryFs({ 'index.html': injected });
    const session = await createSession(port, 'index.html');
    await session.save();
    assert.equal(await port.read('index.html'), injected, name);
    assert.equal(session.exportHtml(), source, `${name} export`);
  }
});
