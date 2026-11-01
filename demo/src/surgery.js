import { parse } from 'parse5';

const NON_EDITABLE = new Set([
  'html',
  'head',
  'body',
  'script',
  'style',
  'template',
  'meta',
  'link',
  'title',
  'base',
  'noscript',
]);

export function parseDocument(html) {
  return parse(html, { sourceCodeLocationInfo: true });
}

function isElement(node) {
  return typeof node?.tagName === 'string';
}

export function indexElements(doc) {
  const items = [];
  const visit = (parent, path) => {
    const children = (parent.childNodes ?? []).filter(isElement);
    children.forEach((node, index) => {
      const nextPath = [...path, index];
      items.push({ node, id: nextPath.join('/'), tag: node.tagName, path: nextPath });
      visit(node, nextPath);
    });
  };
  visit(doc, []);
  return items;
}

export function editableElements(items) {
  return items.filter((item) => !NON_EDITABLE.has(item.tag) && item.node.sourceCodeLocation?.startTag);
}

export function findById(items, id) {
  return items.find((item) => item.id === id) ?? null;
}

function splice(html, start, end, text) {
  return html.slice(0, start) + text + html.slice(end);
}

function attrLocation(node, name) {
  const attrs = node?.sourceCodeLocation?.attrs;
  if (!attrs) return null;
  const key = Object.keys(attrs).find((candidate) => candidate.toLowerCase() === name);
  return key ? attrs[key] : null;
}

export function classAttr(node) {
  const attrs = node?.attrs ?? [];
  return attrs.find((attr) => attr.name.toLowerCase() === 'class') ?? null;
}

export function readClasses(node) {
  const attr = classAttr(node);
  if (!attr) return [];
  return attr.value.split(/\s+/).filter(Boolean);
}

export function classValueRange(html, node) {
  const loc = attrLocation(node, 'class');
  if (!loc) return null;
  const raw = html.slice(loc.startOffset, loc.endOffset);
  const eq = raw.indexOf('=');
  if (eq === -1) {
    return { start: loc.startOffset, end: loc.endOffset, quote: '', hasValue: false, attrStart: loc.startOffset, attrEnd: loc.endOffset };
  }
  const afterEq = raw.slice(eq + 1);
  const trimmed = afterEq.trimStart();
  const padStart = afterEq.length - trimmed.length;
  const quote = trimmed[0] === '"' || trimmed[0] === "'" ? trimmed[0] : '';
  const start = loc.startOffset + eq + 1 + padStart + (quote ? 1 : 0);
  const end = loc.endOffset - (quote ? 1 : 0);
  return { start, end, quote, hasValue: true, attrStart: loc.startOffset, attrEnd: loc.endOffset };
}

function quoteFor(raw, fallback = '"') {
  const match = /^[^\s=]+\s*=\s*(["'])/.exec(raw);
  return match ? match[1] : fallback;
}

function escapeValue(value, quote) {
  if (quote === '"') return value.replaceAll('"', '&quot;');
  if (quote === "'") return value.replaceAll("'", '&#39;');
  return value;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function startTagInsertOffset(html, node) {
  const end = node?.sourceCodeLocation?.startTag?.endOffset;
  if (!end) return null;
  let index = end - 2;
  while (index > 0 && /\s/.test(html[index])) index -= 1;
  if (html[index] === '/') return index;
  return end - 1;
}

function attrInsertion(html, at, name, value) {
  const separator = at > 0 && !/\s/.test(html[at - 1]) ? ' ' : '';
  return `${separator}${name}="${escapeValue(value, '"')}"`;
}

export function setClasses(html, node, classNames) {
  const next = classNames.filter(Boolean).join(' ');
  const loc = attrLocation(node, 'class');
  if (loc) {
    if (!next) {
      let start = loc.startOffset;
      if (start > 0 && /\s/.test(html[start - 1])) start -= 1;
      return splice(html, start, loc.endOffset, '');
    }
    const raw = html.slice(loc.startOffset, loc.endOffset);
    const name = /^([^\s=]+)/.exec(raw)?.[1] ?? 'class';
    const quote = quoteFor(raw);
    return splice(html, loc.startOffset, loc.endOffset, `${name}=${quote}${escapeValue(next, quote)}${quote}`);
  }
  if (!next) return html;
  const at = startTagInsertOffset(html, node);
  if (at === null) throw new Error('element has no start tag');
  return splice(html, at, at, attrInsertion(html, at, 'class', next));
}

export function addClass(html, node, className) {
  const token = className.trim();
  if (!token || /\s/.test(token)) return html;
  const current = readClasses(node);
  if (current.includes(token)) return html;
  const range = classValueRange(html, node);
  if (!range || !range.hasValue || range.quote === '') {
    return setClasses(html, node, [...current, token]);
  }
  const value = html.slice(range.start, range.end);
  const separator = value.length > 0 && !/\s$/.test(value) ? ' ' : '';
  return splice(html, range.end, range.end, `${separator}${escapeValue(token, range.quote)}`);
}

export function removeClass(html, node, className) {
  const current = readClasses(node);
  if (!current.includes(className)) return html;
  const range = classValueRange(html, node);
  if (!range || !range.hasValue || range.quote === '') {
    return setClasses(html, node, current.filter((name) => name !== className));
  }
  const value = html.slice(range.start, range.end);
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(className)}(?=\\s|$)`, 'g');
  const match = pattern.exec(value);
  if (!match) {
    return setClasses(html, node, current.filter((name) => name !== className));
  }
  let start = range.start + match.index;
  let end = start + match[0].length;
  if (!match[1] && /\s/.test(html[end] ?? '')) end += 1;
  const remaining = html.slice(range.start, start) + html.slice(end, range.end);
  if (remaining.trim() === '') {
    let attrStart = range.attrStart;
    if (attrStart > 0 && /\s/.test(html[attrStart - 1])) attrStart -= 1;
    return splice(html, attrStart, range.attrEnd, '');
  }
  return splice(html, start, end, '');
}

function applyInserts(html, inserts) {
  const sorted = [...inserts].sort((a, b) => a.at - b.at);
  let out = '';
  let last = 0;
  for (const edit of sorted) {
    out += html.slice(last, edit.at) + edit.text;
    last = edit.at;
  }
  return out + html.slice(last);
}

export function injectPreviewIds(html, items) {
  const inserts = [];
  for (const item of editableElements(items)) {
    const at = startTagInsertOffset(html, item.node);
    if (at === null) continue;
    inserts.push({ at, text: ` data-tep-path="${item.id}"` });
  }
  return applyInserts(html, inserts);
}

export function findHead(items) {
  const html = items.find((item) => item.tag === 'html');
  if (!html) return null;
  const head = items.find((item) => item.tag === 'head' && item.path.length === 2 && item.path[0] === html.path[0]);
  return head ?? null;
}

export function diffRange(before, after) {
  if (before === after) return { identical: true, prefix: before.length, inserted: '', suffix: 0, removed: '' };
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return {
    identical: false,
    prefix,
    inserted: after.slice(prefix, after.length - suffix),
    suffix,
    removed: before.slice(prefix, before.length - suffix),
  };
}
