import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  addClass,
  findElementByAttribute,
  injectEditorIds,
  removeClass,
  stripEditorIds,
} from '../src/html-surgery.mjs';
import { extractClasses } from '../src/classes.mjs';
import { compileCandidates, hasRule } from '../src/tailwind.mjs';
import {
  applyCss,
  createPreview,
  selectElement,
  selectedId,
} from '../src/preview.mjs';

const fixture = fs.readFileSync(new URL('../fixtures/basic.html', import.meta.url), 'utf8');

test('edit, compile, preview and reverse the same document', async () => {
  const injected = injectEditorIds(fixture);
  const hero = findElementByAttribute(injected.html, 'id', 'hero');
  const heroId = hero.attrs.find((attr) => attr.name === 'data-tep-id').value;

  const edited = addClass(injected.html, heroId, 'py-24');
  assert.ok(edited.includes('class="hero  mx-auto py-24"'));

  const classes = [...extractClasses(edited)];
  assert.ok(classes.includes('py-24'));
  assert.ok(classes.includes('text-4xl'));

  const { css } = await compileCandidates(classes);
  assert.ok(hasRule(css, 'py-24'));
  assert.ok(hasRule(css, 'text-4xl'));

  const preview = createPreview(edited);
  applyCss(preview, css);
  selectElement(preview, heroId);
  assert.equal(selectedId(preview), heroId);
  assert.ok(preview.style.textContent.includes('padding-block'));

  const reverted = removeClass(edited, heroId, 'py-24');
  assert.equal(stripEditorIds(reverted), fixture);
});
