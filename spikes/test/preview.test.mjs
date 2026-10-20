import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { injectEditorIds } from '../src/html-surgery.mjs';
import {
  applyCss,
  countNodes,
  createPreview,
  percentile,
  selectElement,
  selectedId,
} from '../src/preview.mjs';

const fixture = fs.readFileSync(new URL('../fixtures/basic.html', import.meta.url), 'utf8');
const withIds = injectEditorIds(fixture).html;

test('reuses a single style element for CSS updates', () => {
  const preview = createPreview(withIds);
  const style = preview.style;
  for (let i = 0; i < 100; i += 1) {
    applyCss(preview, `.x-${i} { color: rgb(${i % 255}, 0, 0); }`);
  }
  assert.equal(preview.document.querySelectorAll('#tep-style').length, 1);
  assert.equal(preview.style, style);
  assert.ok(preview.style.textContent.includes('.x-99'));
});

test('keeps element identity and selection across updates', () => {
  const preview = createPreview(withIds);
  const element = preview.document.querySelector('[data-tep-id="e7"]');
  assert.ok(element);
  const before = countNodes(preview);
  selectElement(preview, 'e7');
  assert.equal(selectedId(preview), 'e7');

  for (let i = 0; i < 50; i += 1) {
    applyCss(preview, `.p-${i} { padding: ${i}px; }`);
  }

  assert.equal(countNodes(preview), before);
  assert.equal(preview.document.querySelector('[data-tep-id="e7"]'), element);
  assert.equal(selectedId(preview), 'e7');
  assert.equal(element.getAttribute('data-tep-selected'), 'true');
});

test('moving selection clears the previous marker', () => {
  const preview = createPreview(withIds);
  selectElement(preview, 'e1');
  selectElement(preview, 'e2');
  assert.equal(preview.document.querySelectorAll('[data-tep-selected]').length, 1);
  assert.equal(selectedId(preview), 'e2');
});

test('CSS update timing stays bounded in the DOM shim', () => {
  const preview = createPreview(withIds);
  const base = Array.from({ length: 1200 }, (_, i) => `.rule-${i}{color:rgb(${i % 255},0,0)}`).join('');
  const samples = [];
  for (let i = 0; i < 300; i += 1) {
    samples.push(applyCss(preview, `${base}.live-${i}{padding:${i % 20}px}`));
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  assert.ok(avg < 5, `average CSS swap ${avg.toFixed(3)}ms`);
  assert.ok(percentile(samples, 95) < 10);
});
