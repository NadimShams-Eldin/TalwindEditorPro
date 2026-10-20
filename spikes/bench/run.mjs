import fs from 'node:fs';
import {
  addClass,
  injectEditorIds,
  setClasses,
  stripEditorIds,
} from '../src/html-surgery.mjs';
import {
  compileCandidates,
  countRules,
  createCompiler,
} from '../src/tailwind.mjs';
import {
  applyCss,
  countNodes,
  createPreview,
  percentile,
  selectElement,
} from '../src/preview.mjs';

function makeLargeHtml(cards = 1000) {
  const items = Array.from({ length: cards }, (_, i) => `    <article class="card p-4 md:p-6" data-index="${i}">
      <h2 class="text-lg font-semibold">Card ${i}</h2>
      <p class="mt-2 text-sm text-gray-600">Body copy for card ${i} with a short description.</p>
      <a class="mt-4 inline-flex rounded bg-blue-600 px-4 py-2 text-white" href="/card/${i}">Open</a>
    </article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Large fixture</title>
</head>
<body>
  <main class="mx-auto max-w-6xl p-6">
${items}
  </main>
</body>
</html>`;
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

function now() {
  return performance.now();
}

async function benchHtml() {
  const html = makeLargeHtml(1000);
  const injectStarted = now();
  const injected = injectEditorIds(html);
  const injectMs = now() - injectStarted;

  const stripStarted = now();
  const restored = stripEditorIds(injected.html);
  const stripMs = now() - stripStarted;

  const ids = injected.ids.slice(0, 200).map((entry) => entry.id);
  const editSamples = [];
  let current = injected.html;
  for (let i = 0; i < ids.length; i += 1) {
    const started = now();
    current = setClasses(current, ids[i], ['p-4', 'flex', 'md:p-6', `gap-${(i % 8) + 1}`]);
    editSamples.push(now() - started);
  }

  const addSamples = [];
  for (let i = 0; i < 100; i += 1) {
    const started = now();
    current = addClass(current, ids[i], `hover:bg-blue-${(i % 9) + 1}00`);
    addSamples.push(now() - started);
  }

  return {
    sourceBytes: Buffer.byteLength(html),
    elements: injected.ids.length,
    injectMs: Number(injectMs.toFixed(2)),
    stripMs: Number(stripMs.toFixed(2)),
    restoredExactly: restored === html,
    setClasses: stats(editSamples),
    addClass: stats(addSamples),
  };
}

async function benchTailwind() {
  const coldSamples = [];
  for (let i = 0; i < 3; i += 1) {
    const started = now();
    await compileCandidates(['flex', 'p-4', 'hover:bg-red-500', 'md:grid-cols-3']);
    coldSamples.push(now() - started);
  }

  const compiler = await createCompiler();
  const warmSamples = [];
  let output = '';
  for (let i = 0; i < 60; i += 1) {
    const candidates = Array.from({ length: 200 }, (_, j) => `p-${(j % 24) + 1}`);
    candidates.push(`md:grid-cols-${(i % 6) + 1}`, `hover:bg-blue-${((i % 9) + 1) * 100}`);
    const started = now();
    output = compiler.build(candidates);
    warmSamples.push(now() - started);
  }

  const themeCss = `@import "tailwindcss";
@theme {
  --color-brand-500: oklch(0.62 0.19 259);
  --font-display: "Inter", sans-serif;
}`;
  const theme = await compileCandidates(['bg-brand-500', 'font-display'], { css: themeCss });

  return {
    cold: stats(coldSamples),
    warm: stats(warmSamples),
    outputBytes: Buffer.byteLength(output),
    outputRules: countRules(output),
    themeBytes: Buffer.byteLength(theme.css),
    themeHasBrand: theme.css.includes('--color-brand-500'),
  };
}

async function benchPreview() {
  const html = makeLargeHtml(1000);
  const injected = injectEditorIds(html);
  const preview = createPreview(injected.html);
  const nodes = countNodes(preview);
  const baseCss = Array.from({ length: 1500 }, (_, i) => `.r-${i}{color:rgb(${i % 255},0,0)}`).join('');

  const swapSamples = [];
  for (let i = 0; i < 500; i += 1) {
    swapSamples.push(applyCss(preview, `${baseCss}.live-${i}{padding:${i % 24}px}`));
  }

  const ids = injected.ids.map((entry) => entry.id);
  const selectSamples = [];
  for (let i = 0; i < 500; i += 1) {
    const started = now();
    selectElement(preview, ids[i % ids.length]);
    selectSamples.push(now() - started);
  }

  return {
    nodes,
    cssBytes: Buffer.byteLength(baseCss),
    swap: stats(swapSamples),
    select: stats(selectSamples),
    styleNodes: preview.document.querySelectorAll('#tep-style').length,
  };
}

const results = {
  runtime: {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    date: new Date().toISOString(),
  },
  html: await benchHtml(),
  tailwind: await benchTailwind(),
  preview: await benchPreview(),
};

fs.writeFileSync(new URL('./results.json', import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
