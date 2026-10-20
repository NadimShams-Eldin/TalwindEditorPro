import { parse, serialize } from 'parse5';

const SKIP_TAGS = new Set(['html', 'head', 'body', 'script', 'style', 'template']);

function walk(node, visit) {
  if (!node) return;
  visit(node);
  const children = node.childNodes ?? [];
  for (const child of children) walk(child, visit);
  if (node.content) walk(node.content, visit);
}

function elementTag(node) {
  if (!node) return null;
  if (node.tagName) return node.tagName;
  if (node.nodeName && node.nodeName !== '#document' && node.nodeName !== '#document-fragment') {
    return node.nodeName;
  }
  return null;
}

function attrValue(node, name) {
  if (!node.attrs) return undefined;
  const found = node.attrs.find((attr) => attr.name.toLowerCase() === name.toLowerCase());
  return found?.value;
}

export function findElementById(html, id) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  let match = null;
  walk(doc, (node) => {
    if (match || !elementTag(node)) return;
    if (attrValue(node, 'data-tep-id') === id) match = node;
  });
  return match;
}

export function findElementByAttribute(html, name, value) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  let match = null;
  walk(doc, (node) => {
    if (match || !elementTag(node)) return;
    if (attrValue(node, name) === value) match = node;
  });
  return match;
}

function findAttrLocation(node, name) {
  const attrs = node?.sourceCodeLocation?.attrs;
  if (!attrs) return null;
  const key = Object.keys(attrs).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? attrs[key] : null;
}

function startTagInsertOffset(html, node) {
  const end = node?.sourceCodeLocation?.startTag?.endOffset;
  if (!end) return null;
  let j = end - 2;
  while (j > 0 && /\s/.test(html[j])) j -= 1;
  if (html[j] === '/') return j;
  return end - 1;
}

function attrInsertion(html, at, name, value) {
  const sep = at > 0 && !/\s/.test(html[at - 1]) ? ' ' : '';
  return `${sep}${name}="${escapeAttr(value, '"')}"`;
}

function quoteFor(raw, fallback = '"') {
  const match = raw.match(/^[^\s=]+\s*=\s*(["'])/);
  return match ? match[1] : fallback;
}

function escapeAttr(value, quote) {
  if (quote === '"') return value.replaceAll('"', '&quot;');
  if (quote === "'") return value.replaceAll("'", '&#39;');
  return value;
}

function replaceRange(html, start, end, text) {
  return html.slice(0, start) + text + html.slice(end);
}


function classValueRange(html, node) {
  const loc = findAttrLocation(node, 'class');
  if (!loc) return null;
  const raw = html.slice(loc.startOffset, loc.endOffset);
  const eq = raw.indexOf('=');
  if (eq === -1) return null;
  const after = raw.slice(eq + 1).trimStart();
  const quote = after[0] === '"' || after[0] === "'" ? after[0] : '';
  const valueStart = loc.startOffset + eq + 1 + (quote ? 1 : 0);
  const valueEnd = loc.endOffset - (quote ? 1 : 0);
  return { start: valueStart, end: valueEnd, quote };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setClassesOnNode(html, node, classNames) {
  const loc = node.sourceCodeLocation;
  if (!loc) throw new Error('element has no source location');

  const classes = classNames.filter(Boolean).join(' ');
  const classLoc = findAttrLocation(node, 'class');

  if (classLoc) {
    if (!classes) {
      let start = classLoc.startOffset;
      if (start > 0 && /\s/.test(html[start - 1])) start -= 1;
      return replaceRange(html, start, classLoc.endOffset, '');
    }
    const raw = html.slice(classLoc.startOffset, classLoc.endOffset);
    const name = raw.match(/^([^\s=]+)/)?.[1] ?? 'class';
    const quote = quoteFor(raw);
    const next = `${name}=${quote}${escapeAttr(classes, quote)}${quote}`;
    return replaceRange(html, classLoc.startOffset, classLoc.endOffset, next);
  }

  if (!classes) return html;
  const insertAt = startTagInsertOffset(html, node);
  if (insertAt === null) throw new Error('element has no start tag');
  return replaceRange(html, insertAt, insertAt, attrInsertion(html, insertAt, 'class', classes));
}

export function setClasses(html, elementId, classNames) {
  const node = findElementById(html, elementId);
  if (!node) throw new Error(`element not found: ${elementId}`);
  return setClassesOnNode(html, node, classNames);
}

export function addClass(html, elementId, className) {
  const node = findElementById(html, elementId);
  if (!node) throw new Error(`element not found: ${elementId}`);
  const current = attrValue(node, 'class');
  if (current?.split(/\s+/).includes(className)) return html;
  const range = classValueRange(html, node);
  if (!range) return setClassesOnNode(html, node, [className]);
  const value = html.slice(range.start, range.end);
  const separator = value.length > 0 && !/\s$/.test(value) ? ' ' : '';
  return replaceRange(html, range.end, range.end, `${separator}${className}`);
}

export function removeClass(html, elementId, className) {
  const node = findElementById(html, elementId);
  if (!node) throw new Error(`element not found: ${elementId}`);
  const range = classValueRange(html, node);
  if (!range) return html;
  const value = html.slice(range.start, range.end);
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(className)}(?=\\s|$)`, 'g');
  const match = pattern.exec(value);
  if (!match) return html;

  let start = range.start + match.index;
  let end = start + match[0].length;
  if (!match[1] && /\s/.test(html[end] ?? '')) end += 1;
  const nextValue = html.slice(range.start, start) + html.slice(end, range.end);
  if (nextValue.trim() === '') {
    let attrStart = findAttrLocation(node, 'class').startOffset;
    if (attrStart > 0 && /\s/.test(html[attrStart - 1])) attrStart -= 1;
    return replaceRange(html, attrStart, findAttrLocation(node, 'class').endOffset, '');
  }
  return replaceRange(html, start, end, '');
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

function applyRemovals(html, removals) {
  const sorted = [...removals].sort((a, b) => a.start - b.start);
  let out = '';
  let last = 0;
  for (const edit of sorted) {
    if (edit.start > last) out += html.slice(last, edit.start);
    last = Math.max(last, edit.end);
  }
  return out + html.slice(last);
}

export function injectEditorIds(html) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const inserts = [];
  const ids = [];
  let counter = 0;

  walk(doc, (node) => {
    const tag = elementTag(node);
    if (!tag || SKIP_TAGS.has(tag.toLowerCase())) return;
    if (!node.sourceCodeLocation?.startTag) return;

    let id = attrValue(node, 'data-tep-id');
    if (!id) {
      counter += 1;
      id = `e${counter}`;
      const at = startTagInsertOffset(html, node);
      if (at === null) return;
      inserts.push({ at, text: ` data-tep-id="${id}"` });
    }
    ids.push({ id, tag: tag.toLowerCase() });
  });

  return { html: applyInserts(html, inserts), ids };
}

export function stripEditorIds(html) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const removals = [];

  walk(doc, (node) => {
    if (!elementTag(node)) return;
    const loc = findAttrLocation(node, 'data-tep-id');
    if (!loc) return;
    let start = loc.startOffset;
    if (start > 0 && /\s/.test(html[start - 1])) start -= 1;
    removals.push({ start, end: loc.endOffset });
  });

  return applyRemovals(html, removals);
}

export function roundTrip(html) {
  return serialize(parse(html));
}

export function diffSummary(a, b) {
  if (a === b) return { identical: true, lengthDelta: 0, prefix: a.length, suffix: 0 };
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return { identical: false, lengthDelta: b.length - a.length, prefix, suffix };
}
