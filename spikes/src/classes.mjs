import { parse } from 'parse5';

function walk(node, visit) {
  if (!node) return;
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
  if (node.content) walk(node.content, visit);
}

export function extractClasses(html) {
  const found = new Set();
  const doc = parse(html);
  walk(doc, (node) => {
    if (!node.attrs) return;
    for (const attr of node.attrs) {
      if (attr.name.toLowerCase() !== 'class') continue;
      for (const token of attr.value.split(/\s+/)) {
        if (token) found.add(token);
      }
    }
  });
  return found;
}

export function extractClassCounts(html) {
  const counts = new Map();
  for (const token of extractClasses(html)) counts.set(token, 0);
  const doc = parse(html);
  walk(doc, (node) => {
    if (!node.attrs) return;
    for (const attr of node.attrs) {
      if (attr.name.toLowerCase() !== 'class') continue;
      for (const token of attr.value.split(/\s+/)) {
        if (token) counts.set(token, (counts.get(token) ?? 0) + 1);
      }
    }
  });
  return counts;
}
