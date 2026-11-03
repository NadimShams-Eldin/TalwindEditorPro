import { parse } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';

export type Node = DefaultTreeAdapterTypes.Node;
export type Element = DefaultTreeAdapterTypes.Element;

function walk(node: Node, visit: (node: Node) => void): void {
  visit(node);
  const withChildren = node as { childNodes?: Node[]; content?: Node };
  for (const child of withChildren.childNodes ?? []) walk(child, visit);
  if (withChildren.content) walk(withChildren.content, visit);
}

export function isElement(node: Node): node is Element {
  const named = node as { tagName?: unknown };
  return typeof named.tagName === 'string';
}

export function findElementById(html: string, editorId: string): Element | null {
  const document = parse(html, { sourceCodeLocationInfo: true });
  let found: Element | null = null;
  walk(document as unknown as Node, (node) => {
    if (found || !isElement(node)) return;
    const attr = node.attrs.find((a) => a.name === 'data-tep-id');
    if (attr?.value === editorId) found = node;
  });
  return found;
}

export function attributeValue(element: Element, name: string): string | null {
  const attr = element.attrs.find((a) => a.name === name);
  return attr ? attr.value : null;
}
