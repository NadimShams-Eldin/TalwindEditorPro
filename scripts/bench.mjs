import fs from 'node:fs';
import { injectEditorIds, stripEditorIds, setClasses } from '../packages/parser/src/index.ts';

function makeHtml(cards = 1000) {
  const items = Array.from(
    { length: cards },
    (_, i) => `    <article class="card p-4 md:p-6" data-index="${i}">
      <h2 class="text-lg font-semibold">Card ${i}</h2>
      <p class="mt-2 text-sm text-gray-600">Body ${i}</p>
      <a class="mt-4 inline-flex rounded bg-blue-600 px-4 py-2 text-white" href="/card/${i}">Open</a>
    </article>`,
  ).join('\n');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Bench</title></head>\n<body><main class="mx-auto max-w-6xl p-6">\n${items}\n</main></body></html>`;
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function stats(samples) {
  const total = samples.reduce((a, b) => a + b, 0);
  return {
    count: samples.length,
    totalMs: Number(total.toFixed(2)),
    avgMs: Number((total / samples.length).toFixed(3)),
    p50Ms: Number(percentile(samples, 50).toFixed(3)),
    p95Ms: Number(percentile(samples, 95).toFixed(3)),
    maxMs: Number(Math.max(...samples).toFixed(3)),
  };
}

const html = makeHtml(1000);
const injectStart = performance.now();
const injected = injectEditorIds(html);
const injectMs = performance.now() - injectStart;

const stripStart = performance.now();
const restored = stripEditorIds(injected.html);
const stripMs = performance.now() - stripStart;

const ids = injected.ids.slice(0, 200).map((entry) => entry.id);
const samples = [];
let current = injected.html;
for (const id of ids) {
  const start = performance.now();
  current = setClasses(current, id, ['p-4', 'flex', 'md:p-6']);
  samples.push(performance.now() - start);
}

const results = {
  runtime: {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    date: new Date().toISOString(),
  },
  html: {
    sourceBytes: Buffer.byteLength(html),
    elements: injected.ids.length,
    injectMs: Number(injectMs.toFixed(2)),
    stripMs: Number(stripMs.toFixed(2)),
    restoredExactly: restored === html,
    setClasses: stats(samples),
  },
};

fs.mkdirSync('bench', { recursive: true });
fs.writeFileSync('bench/results.json', `${JSON.stringify(results, null, 2)}\n`);
console.error(JSON.stringify(results, null, 2));
