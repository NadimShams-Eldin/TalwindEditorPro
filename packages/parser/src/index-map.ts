import { parse } from 'parse5';
import { isElement, type Element, type Node } from './locate.ts';

export type IndexedElement = {
  path: string;
  editorId: string | null;
  tag: string;
  start: number;
  end: number;
  classValue: string | null;
};

export type DocumentIndex = {
  elements: IndexedElement[];
  byPath: Map<string, IndexedElement>;
  byId: Map<string, IndexedElement>;
};

function walkElements(
  node: Node,
  visit: (element: Element, path: string) => void,
  base: string,
): void {
  const children = (node as { childNodes?: Node[] }).childNodes ?? [];
  let elementIndex = -1;
  for (const child of children) {
    if (!isElement(child)) continue;
    elementIndex += 1;
    const path = base === '' ? String(elementIndex) : `${base}/${elementIndex}`;
    visit(child, path);
    walkElements(child, visit, path);
    const templateContent = (child as { content?: Node }).content;
    if (templateContent) walkElements(templateContent, visit, `${path}#`);
  }
}

export function indexDocument(html: string): DocumentIndex {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const elements: IndexedElement[] = [];
  const byPath = new Map<string, IndexedElement>();
  const byId = new Map<string, IndexedElement>();
  walkElements(
    document as unknown as Node,
    (element, path) => {
      const editorId = element.attrs.find((a) => a.name === 'data-tep-id')?.value ?? null;
      const classValue = element.attrs.find((a) => a.name === 'class')?.value ?? null;
      const entry: IndexedElement = {
        path,
        editorId,
        tag: element.tagName.toLowerCase(),
        start: element.sourceCodeLocation?.startTag?.startOffset ?? -1,
        end: element.sourceCodeLocation?.startTag?.endOffset ?? -1,
        classValue,
      };
      elements.push(entry);
      byPath.set(path, entry);
      if (editorId) byId.set(editorId, entry);
    },
    '',
  );
  return { elements, byPath, byId };
}

export type TextEdit = { start: number; end: number; text: string };

export type IndexPatch = { editorId: string; classValue: string | null };

/**
 * Shifts offsets after a text edit that stays inside a single element and does
 * not insert or remove elements. Both `start` and `end` are shifted, so the
 * edited element's own start-tag end offset stays valid too.
 */
export function shiftIndex(
  index: DocumentIndex,
  edit: TextEdit,
  patch?: IndexPatch,
): DocumentIndex {
  const delta = edit.text.length - (edit.end - edit.start);
  if (delta === 0 && !patch) return index;
  const elements = index.elements.map((entry) => {
    const start = entry.start >= edit.end ? entry.start + delta : entry.start;
    const end = entry.end >= edit.end ? entry.end + delta : entry.end;
    const classValue =
      patch && entry.editorId === patch.editorId ? patch.classValue : entry.classValue;
    if (start === entry.start && end === entry.end && classValue === entry.classValue) return entry;
    return { ...entry, start, end, classValue };
  });
  const byPath = new Map(elements.map((entry) => [entry.path, entry]));
  const byId = new Map(
    elements
      .filter((entry): entry is IndexedElement & { editorId: string } => Boolean(entry.editorId))
      .map((entry) => [entry.editorId, entry]),
  );
  return { elements, byPath, byId };
}
