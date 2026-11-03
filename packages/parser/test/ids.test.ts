import assert from 'node:assert/strict';
import test from 'node:test';
import { injectEditorIds, stripEditorIds } from '@tep/parser';

const samples = [
  `<!doctype html>\n<html><body><div class="a">x</div><img src="a.png"><br></body></html>`,
  `<div>\r\n  <span class=p-4>x</span>\r\n</div>`,
  `<div><script>const t = "<div class='p-4'>";</script><svg viewBox="0 0 1 1"><path d="M0 0"/></svg></div>`,
  `<div><span class="p-4">x</div>`,
];

for (const source of samples) {
  test(`inject then strip restores bytes: ${JSON.stringify(source.slice(0, 24))}`, () => {
    const injected = injectEditorIds(source);
    assert.ok(injected.ids.length > 0);
    assert.equal(stripEditorIds(injected.html), source);
  });
}

test('injection is idempotent and ids are stable', () => {
  const source = `<div><span>a</span><span>b</span></div>`;
  const first = injectEditorIds(source);
  const second = injectEditorIds(first.html);
  assert.deepEqual(second.ids, first.ids);
  assert.equal(second.html, first.html);
});

test('keeps an existing data-tep-id and removes it on strip', () => {
  const source = `<div data-tep-id="keep"><script>var x=1;</script></div>`;
  const result = injectEditorIds(source);
  assert.ok(result.ids.some((entry) => entry.id === 'keep'));
  assert.ok(result.html.includes('data-tep-id="keep"'));
  assert.equal(stripEditorIds(result.html), `<div><script>var x=1;</script></div>`);
});
