import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { EditorId } from '@tep/parser';
import {
  addClass,
  findElementById,
  injectEditorIds,
  readClassSpan,
  removeClass,
  stripEditorIds,
} from '@tep/parser';

const dir = path.resolve(import.meta.dirname, 'fixtures');
const files = fs.readdirSync(dir).filter((name) => name.endsWith('.html'));

test('corpus has at least 50 fixtures', () => {
  assert.ok(files.length >= 50, `found ${files.length}`);
});

test('corpus covers the required shapes', () => {
  const names = new Set(files);
  const required = [
    'crlf.html',
    'double-space.html',
    'single-quotes.html',
    'unquoted.html',
    'bare-attribute.html',
    'empty-value.html',
    'inline-script.html',
    'svg.html',
    'void-elements.html',
    'malformed.html',
    'entities.html',
    'rtl.html',
  ];
  for (const name of required) assert.ok(names.has(name), `missing ${name}`);

  const stress = files.filter((name) => name.startsWith('stress-'));
  assert.ok(stress.length >= 32, `stress fixtures: ${stress.length}`);

  const large = stress.filter((name) => {
    const size = fs.statSync(path.join(dir, name)).size;
    return size > 50 * 1024;
  });
  assert.ok(large.length >= 8, `large fixtures: ${large.length}`);
});

/**
 * A target is byte-stable when its class attribute is either absent, or present
 * as a quoted non-empty value. Unquoted (`class=a`), bare (`class`), and empty
 * (`class=""`) forms are normalized on first write by design; they get their own
 * regression test below instead of a strict round-trip assertion.
 */
function pickTarget(html: string, ids: EditorId[]) {
  for (const entry of ids) {
    if (entry.tag === 'html' || entry.tag === 'body') continue;
    const element = findElementById(html, entry.id);
    if (!element) continue;
    const span = readClassSpan(html, element);
    if (!span) return { entry, stable: true };
    if (span.quote !== '' && span.value.trim() !== '') return { entry, stable: true };
    return { entry, stable: false };
  }
  return null;
}

for (const file of files) {
  test(`id round-trip restores bytes: ${file}`, () => {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    const injected = injectEditorIds(source);
    assert.ok(injected.ids.length > 0);
    assert.equal(stripEditorIds(injected.html), source);
  });

  test(`golden class edit: ${file}`, () => {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    const injected = injectEditorIds(source);
    const target = pickTarget(injected.html, injected.ids);
    if (!target) return;

    const added = addClass(injected.html, target.entry.id, 'py-24');
    assert.ok(added.includes('py-24'), 'token was not inserted');

    if (target.stable) {
      assert.equal(removeClass(added, target.entry.id, 'py-24'), injected.html);
      return;
    }

    const cleaned = removeClass(added, target.entry.id, 'py-24');
    const again = removeClass(
      addClass(cleaned, target.entry.id, 'py-24'),
      target.entry.id,
      'py-24',
    );
    assert.equal(again, cleaned, 'normalization must be idempotent');
    assert.ok(!cleaned.includes('py-24'));
  });
}

test('normalizes unquoted, bare and empty class attributes on first write', () => {
  const cases = [
    {
      source: `<div class=a data-tep-id="e1">x</div>`,
      added: `<div class="a py-24" data-tep-id="e1">x</div>`,
      removed: `<div class="a" data-tep-id="e1">x</div>`,
    },
    {
      source: `<div class data-tep-id="e1">x</div>`,
      added: `<div class="py-24" data-tep-id="e1">x</div>`,
      removed: `<div data-tep-id="e1">x</div>`,
    },
    {
      source: `<div class="" data-tep-id="e1">x</div>`,
      added: `<div class="py-24" data-tep-id="e1">x</div>`,
      removed: `<div data-tep-id="e1">x</div>`,
    },
  ];
  for (const { source, added, removed } of cases) {
    assert.equal(addClass(source, 'e1', 'py-24'), added);
    assert.equal(removeClass(added, 'e1', 'py-24'), removed, source);
  }
});
