import {
  parseDocument,
  indexElements,
  findById,
  readClasses,
  addClass,
  removeClass,
  injectPreviewIds,
  diffRange,
} from './surgery.js';
import { findConflicts, describeConflict } from './classes.js';

const BRIDGE = String.raw`
<script>
(function () {
  var knownCache = null;
  function collect() {
    var set = new Set();
    for (var i = 0; i < document.styleSheets.length; i++) {
      var rules;
      try { rules = document.styleSheets[i].cssRules; } catch (error) { continue; }
      if (rules) walk(rules, set);
    }
    return set;
  }
  function walk(rules, set) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.selectorText) {
        var found = rule.selectorText.match(/\.((?:[^\s,>+~()\[\]{}#.:\\]|\\.)+)/g);
        if (found) {
          for (var j = 0; j < found.length; j++) {
            set.add(found[j].slice(1).replace(/\\(.)/g, '$1'));
          }
        }
      }
      if (rule.cssRules) walk(rule.cssRules, set);
    }
  }
  function isKnown(name) {
    if (!knownCache) knownCache = collect();
    return knownCache.has(name);
  }
  function byPath(path) {
    return document.querySelector('[data-tep-path="' + path + '"]');
  }
  function paint(el) {
    var previous = document.querySelectorAll('[data-tep-selected]');
    for (var i = 0; i < previous.length; i++) {
      previous[i].removeAttribute('data-tep-selected');
      previous[i].style.outline = '';
      previous[i].style.outlineOffset = '';
    }
    if (!el) return;
    el.setAttribute('data-tep-selected', 'true');
    el.style.outline = '2px solid #6366f1';
    el.style.outlineOffset = '2px';
  }
  var PROPS = ['display','position','width','height','padding','margin','gap','font-size','font-weight','line-height','letter-spacing','color','background-color','border-radius','border-width','opacity','transform'];
  function fingerprint(el) {
    var style = getComputedStyle(el);
    var out = {};
    for (var i = 0; i < PROPS.length; i++) out[PROPS[i]] = style.getPropertyValue(PROPS[i]);
    return out;
  }
  function diffStyle(before, after) {
    var changed = [];
    for (var key in after) {
      if (before[key] !== after[key]) changed.push(key);
    }
    return changed;
  }
  function ruleCount() {
    var total = 0;
    for (var i = 0; i < document.styleSheets.length; i++) {
      var rules;
      try { rules = document.styleSheets[i].cssRules; } catch (error) { continue; }
      if (rules) total += rules.length;
    }
    return total;
  }
  function soloStyle(classes) {
    var probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.position = 'absolute';
    probe.style.left = '-9999px';
    probe.style.top = '-9999px';
    probe.className = classes.join(' ');
    probe.textContent = 'x';
    document.body.appendChild(probe);
    var style = getComputedStyle(probe);
    var snapshot = {};
    for (var i = 0; i < PROPS.length; i++) snapshot[PROPS[i]] = style.getPropertyValue(PROPS[i]);
    probe.remove();
    return snapshot;
  }
  function collectSolos(el, classes) {
    var solos = [];
    for (var i = 0; i < classes.length; i++) {
      solos.push({ name: classes[i], style: soloStyle([classes[i]]) });
    }
    return { actual: fingerprint(el), solos: solos, classes: classes };
  }
  function waitForCompile(baseline, done) {
    var attempts = 0;
    function tick() {
      attempts += 1;
      if (ruleCount() !== baseline || attempts >= 30) { done(); return; }
      setTimeout(tick, 16);
    }
    setTimeout(tick, 16);
  }
  function report(path, effect) {
    var el = byPath(path);
    if (!el) { parent.postMessage({ type: 'tep-inspect-result', path: path, found: false }, '*'); return; }
    knownCache = null;
    var classes = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    var unknown = classes.filter(function (name) { return !isKnown(name); });
    var style = getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    parent.postMessage({
      type: 'tep-inspect-result',
      path: path,
      found: true,
      tag: el.tagName.toLowerCase(),
      unknown: unknown,
      classes: classes,
      effect: effect || null,
      style: {
        padding: style.padding,
        margin: style.margin,
        fontSize: style.fontSize,
        color: style.color,
        backgroundColor: style.backgroundColor,
        display: style.display,
      },
      rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
    }, '*');
  }
  document.addEventListener('click', function (event) {
    var target = event.target;
    var el = target && target.closest ? target.closest('[data-tep-path]') : null;
    event.preventDefault();
    event.stopPropagation();
    if (!el) return;
    paint(el);
    parent.postMessage({ type: 'tep-select', path: el.getAttribute('data-tep-path') }, '*');
  }, true);
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || typeof data.type !== 'string') return;
    if (data.type === 'tep-paint') {
      paint(byPath(data.path));
      return;
    }
    if (data.type === 'tep-set-classes') {
      var el = byPath(data.path);
      if (!el) return;
      var before = fingerprint(el);
      var baseline = ruleCount();
      if (data.classes) el.setAttribute('class', data.classes);
      else el.removeAttribute('class');
      knownCache = null;
      waitForCompile(baseline, function () {
        var changed = diffStyle(before, fingerprint(el));
        var current = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
        var cascade = collectSolos(el, current);
        report(data.path, {
          changed: changed,
          noEffect: changed.length === 0,
          cascade: cascade,
          lastChange: data.lastChange || null,
        });
      });
      return;
    }
    if (data.type === 'tep-inspect') {
      report(data.path);
    }
  });
  parent.postMessage({ type: 'tep-ready' }, '*');
})();
</script>
`;

const SUGGESTIONS = [
  'p-2', 'p-4', 'p-6', 'p-8', 'px-4', 'px-6', 'py-2', 'py-8', 'pt-2', 'pb-2',
  'm-0', 'mx-auto', 'mt-4', 'mb-4', 'gap-2', 'gap-4', 'gap-6',
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-4xl',
  'font-medium', 'font-semibold', 'font-bold', 'leading-7', 'tracking-tight',
  'text-white', 'text-slate-300', 'text-slate-400', 'text-brand-400',
  'bg-white', 'bg-slate-900', 'bg-slate-950', 'bg-brand-500', 'bg-brand-600', 'bg-white/5',
  'border', 'border-white/10', 'rounded', 'rounded-lg', 'rounded-xl', 'rounded-2xl',
  'shadow', 'shadow-lg', 'ring-1', 'ring-white/10',
  'flex', 'grid', 'block', 'inline-flex', 'hidden', 'items-center', 'justify-between',
  'w-full', 'h-10', 'max-w-2xl', 'max-w-6xl', 'min-h-dvh',
  'grid-cols-2', 'grid-cols-3', 'md:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-3',
  'hover:bg-brand-600', 'hover:text-white', 'focus:outline-none',
];

const el = {
  source: document.getElementById('source'),
  preview: document.getElementById('preview'),
  undo: document.getElementById('undo'),
  reset: document.getElementById('reset'),
  copy: document.getElementById('copy'),
  download: document.getElementById('download'),
  statBytes: document.getElementById('stat-bytes'),
  statEdits: document.getElementById('stat-edits'),
  statIntegrity: document.getElementById('stat-integrity'),
  selectionEmpty: document.getElementById('selection-empty'),
  selectionBody: document.getElementById('selection-body'),
  selectionTag: document.getElementById('selection-tag'),
  classList: document.getElementById('class-list'),
  addForm: document.getElementById('add-form'),
  addInput: document.getElementById('add-input'),
  suggestions: document.getElementById('class-suggestions'),
  editStatus: document.getElementById('edit-status'),
  conflictList: document.getElementById('conflict-list'),
  diff: document.getElementById('diff'),
  diffStat: document.getElementById('diff-stat'),
  history: document.getElementById('history'),
  historyCount: document.getElementById('history-count'),
  sourceNote: document.getElementById('source-note'),
};

const state = {
  html: '',
  items: [],
  selectedPath: null,
  history: [],
  lastDiff: null,
  inspect: null,
  ready: false,
  lastChange: null,
};

const encoder = new TextEncoder();

function bytes(text) {
  return encoder.encode(text).length;
}

function refreshItems() {
  try {
    state.items = indexElements(parseDocument(state.html));
    return true;
  } catch (error) {
    state.items = [];
    return false;
  }
}

function absoluteAsset(html, relative) {
  const href = new URL(relative, window.location.href).href;
  return html.replaceAll(`"./${relative}"`, `"${href}"`).replaceAll(`'./${relative}'`, `'${href}'`);
}

function previewSource(html) {
  const items = indexElements(parseDocument(html));
  const injected = injectPreviewIds(html, items);
  const withAssets = absoluteAsset(injected, 'vendor/tailwind.js');
  const closing = withAssets.lastIndexOf('</body>');
  if (closing === -1) return withAssets + BRIDGE;
  return withAssets.slice(0, closing) + BRIDGE + withAssets.slice(closing);
}

function reloadPreview() {
  state.ready = false;
  el.preview.srcdoc = previewSource(state.html);
}

function paint() {
  if (!state.ready || !state.selectedPath) return;
  el.preview.contentWindow?.postMessage({ type: 'tep-paint', path: state.selectedPath }, '*');
}

function inspect() {
  if (!state.ready || !state.selectedPath) return;
  el.preview.contentWindow?.postMessage({ type: 'tep-inspect', path: state.selectedPath }, '*');
}

function pushClasses(classes) {
  if (!state.ready || !state.selectedPath) {
    reloadPreview();
    return;
  }
  el.preview.contentWindow?.postMessage(
    { type: 'tep-set-classes', path: state.selectedPath, classes: classes.join(' '), lastChange: state.lastChange },
    '*',
  );
}

function renderStats() {
  el.statBytes.textContent = `${bytes(state.html).toLocaleString('en-US')} بايت`;
  el.statEdits.textContent = `${state.history.length} تعديل`;
  el.undo.disabled = state.history.length === 0;
  el.statIntegrity.textContent = state.items.length > 0 ? 'سليم' : 'خطأ تحليل';
  el.statIntegrity.className = state.items.length > 0
    ? 'rounded-full bg-emerald-500/15 px-2 py-1 font-mono text-emerald-300'
    : 'rounded-full bg-rose-500/15 px-2 py-1 font-mono text-rose-300';
}

function renderSelection() {
  const item = state.selectedPath ? findById(state.items, state.selectedPath) : null;
  if (!item) {
    el.selectionEmpty.classList.remove('hidden');
    el.selectionBody.classList.add('hidden');
    el.selectionTag.textContent = '—';
    return;
  }
  el.selectionEmpty.classList.add('hidden');
  el.selectionBody.classList.remove('hidden');
  el.selectionTag.textContent = item.tag;
  el.classList.replaceChildren();

  const classes = readClasses(item.node);
  if (classes.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'text-[11px] text-slate-500';
    empty.textContent = 'لا أصناف على هذا العنصر';
    el.classList.appendChild(empty);
  }
  const unknown = new Set(state.inspect?.unknown ?? []);
  for (const name of classes) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = unknown.has(name)
      ? 'group inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 font-mono text-[10px] text-amber-300'
      : 'group inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300';
    chip.title = unknown.has(name) ? `${name} لا يولّد CSS` : `${name} — إزالة`;
    chip.append(document.createTextNode(name));
    const cross = document.createElement('span');
    cross.className = 'text-slate-500';
    cross.textContent = '×';
    chip.appendChild(cross);
    chip.addEventListener('click', () => removeClassName(name));
    el.classList.appendChild(chip);
  }
  renderInspect();
}

function conflictsFor(inspect) {
  const cascade = inspect?.effect?.cascade;
  if (!cascade) return [];
  const solos = Object.fromEntries(cascade.solos.map((entry) => [entry.name, entry.style]));
  const all = findConflicts(cascade.classes, solos, cascade.actual);
  const focus = inspect.effect.lastChange;
  return focus ? all.filter((conflict) => conflict.candidates.includes(focus)) : all;
}

function renderInspect() {
  if (!state.inspect) {
    el.editStatus.textContent = '';
    el.conflictList.replaceChildren();
    return;
  }
  const unknown = state.inspect.unknown ?? [];
  const effect = state.inspect.effect;
  const conflicts = conflictsFor(state.inspect);

  el.conflictList.replaceChildren();
  for (const conflict of conflicts) {
    const line = describeConflict(conflict);
    const item = document.createElement('li');
    item.className = 'rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-amber-200';
    item.textContent = line;
    el.conflictList.appendChild(item);
  }

  if (unknown.length > 0) {
    el.editStatus.textContent = `تحذير: ${unknown.join(', ')} لا يولّد CSS (unknown)`;
    el.editStatus.className = 'mt-2 min-h-4 font-mono text-[10px] text-amber-300';
    return;
  }
  if (effect?.noEffect) {
    const overridden = conflicts.filter((conflict) => conflict.winner);
    el.editStatus.textContent = overridden.length
      ? 'لا أثر: الصنف مُغطّى بتعارض أعلى في الورقة المولّدة'
      : 'لا أثر بصري: لم تتغيّر أي خاصية محسوبة (no effect)';
    el.editStatus.className = 'mt-2 min-h-4 font-mono text-[10px] text-rose-300';
    return;
  }
  const style = state.inspect.style ?? {};
  const rect = state.inspect.rect ?? { width: 0, height: 0 };
  const changed = effect?.changed?.length ? ` · ${effect.changed.join(', ')}` : '';
  el.editStatus.textContent = `${rect.width}×${rect.height}px · ${style.fontSize}${changed}`;
  el.editStatus.className = effect?.changed?.length
    ? 'mt-2 min-h-4 font-mono text-[10px] text-emerald-300'
    : 'mt-2 min-h-4 font-mono text-[10px] text-slate-500';
}

function renderDiff() {
  const diff = state.lastDiff;
  if (!diff) {
    el.diff.textContent = '—';
    el.diffStat.textContent = '—';
    return;
  }
  if (diff.identical) {
    el.diff.textContent = 'لا تغيير بايتي';
    el.diffStat.textContent = '0';
    return;
  }
  const clip = (text) => (text.length > 400 ? `${text.slice(0, 400)}…` : text);
  el.diff.replaceChildren();
  const minus = document.createElement('div');
  minus.className = 'text-rose-300';
  minus.textContent = `- ${clip(diff.removed) || '(فارغ)'}`;
  const plus = document.createElement('div');
  plus.className = 'text-emerald-300';
  plus.textContent = `+ ${clip(diff.inserted) || '(فارغ)'}`;
  el.diff.append(minus, plus);
  el.diffStat.textContent = `±${diff.removed.length + diff.inserted.length}B`;
}

function renderHistory() {
  el.history.replaceChildren();
  el.historyCount.textContent = String(state.history.length);
  for (const entry of [...state.history].reverse()) {
    const li = document.createElement('li');
    li.className = 'flex items-start justify-between gap-2 rounded border border-white/5 bg-slate-950/60 px-2 py-1';
    const label = document.createElement('span');
    label.className = 'truncate text-slate-300';
    label.textContent = entry.label;
    const delta = document.createElement('span');
    delta.className = entry.delta > 0 ? 'text-emerald-400' : entry.delta < 0 ? 'text-rose-400' : 'text-slate-500';
    delta.textContent = entry.delta > 0 ? `+${entry.delta}` : String(entry.delta);
    li.append(label, delta);
    el.history.appendChild(li);
  }
}

function renderAll() {
  renderStats();
  renderSelection();
  renderDiff();
  renderHistory();
}

function commit(label, nextHtml, nextClasses) {
  if (nextHtml === state.html) {
    el.editStatus.textContent = 'لا تغيير — العملية غير مؤثرة';
    el.editStatus.className = 'mt-2 min-h-4 font-mono text-[10px] text-amber-300';
    return false;
  }
  const before = state.html;
  state.html = nextHtml;
  state.history.push({ label, html: before, delta: bytes(nextHtml) - bytes(before) });
  state.lastDiff = diffRange(before, nextHtml);
  el.source.value = nextHtml;
  const parsed = refreshItems();
  if (parsed && nextClasses) pushClasses(nextClasses);
  else reloadPreview();
  renderAll();
  return true;
}

function selectedItem() {
  return state.selectedPath ? findById(state.items, state.selectedPath) : null;
}

function addClassName(raw) {
  const item = selectedItem();
  if (!item) return;
  const token = raw.trim();
  if (!token) return;
  if (readClasses(item.node).includes(token)) {
    el.editStatus.textContent = `الصنف ${token} موجود مسبقًا`;
    el.editStatus.className = 'mt-2 min-h-4 font-mono text-[10px] text-slate-500';
    return;
  }
  const before = state.html;
  const next = addClass(before, item.node, token);
  state.lastChange = token;
  const applied = commit(`add ${token}`, next, readClasses(item.node).concat(token));
  if (applied) state.lastDiff = diffRange(before, next);
}

function removeClassName(name) {
  const item = selectedItem();
  if (!item) return;
  const before = state.html;
  const next = removeClass(before, item.node, name);
  const remaining = readClasses(item.node).filter((token) => token !== name);
  state.lastChange = null;
  commit(`remove ${name}`, next, remaining);
}

el.preview.addEventListener('load', () => {
  state.ready = true;
  paint();
  inspect();
});

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data.type !== 'string') return;
  if (data.type === 'tep-ready') {
    state.ready = true;
    paint();
    inspect();
    return;
  }
  if (data.type === 'tep-select') {
    state.selectedPath = data.path;
    state.inspect = null;
    renderSelection();
    inspect();
    return;
  }
  if (data.type === 'tep-inspect-result') {
    if (data.path !== state.selectedPath) return;
    state.inspect = data;
    renderSelection();
  }
});

el.addForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addClassName(el.addInput.value);
  el.addInput.value = '';
  el.addInput.focus();
});

el.undo.addEventListener('click', () => {
  const last = state.history.pop();
  if (!last) return;
  state.lastDiff = diffRange(state.html, last.html);
  state.html = last.html;
  el.source.value = state.html;
  refreshItems();
  reloadPreview();
  renderAll();
});

el.reset.addEventListener('click', async () => {
  state.history = [];
  state.lastDiff = null;
  state.selectedPath = null;
  state.inspect = null;
  state.html = await loadSample();
  el.source.value = state.html;
  refreshItems();
  reloadPreview();
  renderAll();
});

el.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.html);
    el.sourceNote.textContent = 'تم النسخ';
  } catch (error) {
    el.sourceNote.textContent = 'تعذّر النسخ — حدد النص يدويًا';
  }
});

el.download.addEventListener('click', () => {
  const blob = new Blob([state.html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'index.html';
  link.click();
  URL.revokeObjectURL(url);
});

let sourceTimer = 0;
el.source.addEventListener('input', () => {
  window.clearTimeout(sourceTimer);
  sourceTimer = window.setTimeout(() => {
    const next = el.source.value;
    if (next === state.html) return;
    const before = state.html;
    state.html = next;
    state.history.push({ label: 'edit source', html: before, delta: bytes(next) - bytes(before) });
    state.lastDiff = diffRange(before, next);
    state.selectedPath = null;
    state.inspect = null;
    refreshItems();
    reloadPreview();
    renderAll();
  }, 400);
});

async function loadSample() {
  const response = await fetch('./src/sample.html', { cache: 'no-store' });
  if (!response.ok) throw new Error(`sample fetch failed: ${response.status}`);
  return response.text();
}

async function init() {
  for (const name of SUGGESTIONS) {
    const option = document.createElement('option');
    option.value = name;
    el.suggestions.appendChild(option);
  }
  try {
    state.html = await loadSample();
  } catch (error) {
    state.html = '<!doctype html><html><body><p>sample.html غير متاح</p></body></html>';
    el.sourceNote.textContent = 'تعذّر تحميل العينة';
  }
  el.source.value = state.html;
  refreshItems();
  reloadPreview();
  renderAll();
}

init();
