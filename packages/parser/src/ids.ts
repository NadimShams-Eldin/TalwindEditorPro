import { parse } from 'parse5';
import { isElement, type Element, type Node } from './locate.ts';

const SKIP_TAGS = new Set(['html', 'head', 'body', 'script', 'style', 'template']);

function walk(node: Node, visit: (node: Node) => void): void {
  visit(node);
  const withChildren = node as { childNodes?: Node[]; content?: Node };
  for (const child of withChildren.childNodes ?? []) walk(child, visit);
  if (withChildren.content) walk(withChildren.content, visit);
}

function startTagInsertOffset(html: string, element: Element): number | null {
  const end = element.sourceCodeLocation?.startTag?.endOffset;
  if (!end) return null;
  let i = end - 2;
  while (i > 0 && /\s/.test(html[i] ?? '')) i -= 1;
  return html[i] === '/' ? i : end - 1;
}

function applyInserts(html: string, inserts: { at: number; text: string }[]): string {
  const sorted = [...inserts].sort((a, b) => a.at - b.at);
  let out = '';
  let last = 0;
  for (const edit of sorted) {
    out += html.slice(last, edit.at) + edit.text;
    last = edit.at;
  }
  return out + html.slice(last);
}

function applyRemovals(html: string, removals: { start: number; end: number }[]): string {
  const sorted = [...removals].sort((a, b) => a.start - b.start);
  let out = '';
  let last = 0;
  for (const edit of sorted) {
    if (edit.start > last) out += html.slice(last, edit.start);
    last = Math.max(last, edit.end);
  }
  return out + html.slice(last);
}

export type EditorId = { id: string; tag: string };

export function injectEditorIds(html: string, prefix = 'e'): { html: string; ids: EditorId[] } {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const inserts: { at: number; text: string }[] = [];
  const ids: EditorId[] = [];
  let counter = 0;
  walk(document as unknown as Node, (node) => {
    if (!isElement(node)) return;
    const tag = node.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return;
    if (!node.sourceCodeLocation?.startTag) return;
    const existing = node.attrs.find((a) => a.name === 'data-tep-id')?.value;
    let id = existing;
    if (!id) {
      counter += 1;
      id = `${prefix}${counter}`;
      const at = startTagInsertOffset(html, node);
      if (at === null) return;
      inserts.push({ at, text: ` data-tep-id="${id}"` });
    }
    ids.push({ id, tag });
  });
  return { html: applyInserts(html, inserts), ids };
}

export function stripEditorIds(html: string): string {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const removals: { start: number; end: number }[] = [];
  walk(document as unknown as Node, (node) => {
    if (!isElement(node)) return;
    const loc = node.sourceCodeLocation?.attrs?.['data-tep-id'];
    if (!loc) return;
    const start = /\s/.test(html[loc.startOffset - 1] ?? '') ? loc.startOffset - 1 : loc.startOffset;
    removals.push({ start, end: loc.endOffset });
  });
  return applyRemovals(html, removals);
}
