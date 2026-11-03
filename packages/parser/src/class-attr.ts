import type { Element } from './locate.ts';

export type ClassSpan = {
  attrStart: number;
  attrEnd: number;
  valueStart: number;
  valueEnd: number;
  quote: '"' | "'" | '';
  value: string;
};

export function readClassSpan(html: string, element: Element): ClassSpan | null {
  const loc = element.sourceCodeLocation?.attrs?.['class'];
  if (!loc) return null;
  const raw = html.slice(loc.startOffset, loc.endOffset);
  const eq = raw.indexOf('=');
  if (eq === -1) {
    return {
      attrStart: loc.startOffset,
      attrEnd: loc.endOffset,
      valueStart: loc.endOffset,
      valueEnd: loc.endOffset,
      quote: '',
      value: '',
    };
  }
  const after = raw.slice(eq + 1);
  const lead = after.match(/^\s*/)?.[0].length ?? 0;
  const rest = after.slice(lead);
  const first = rest[0];
  const quote: '"' | "'" | '' = first === '"' || first === "'" ? first : '';
  const valueStart = loc.startOffset + eq + 1 + lead + (quote ? 1 : 0);
  const valueEnd = quote ? loc.endOffset - 1 : loc.endOffset;
  return {
    attrStart: loc.startOffset,
    attrEnd: loc.endOffset,
    valueStart,
    valueEnd,
    quote,
    value: html.slice(valueStart, valueEnd),
  };
}

export function escapeForQuote(value: string, quote: '"' | "'" | ''): string {
  if (quote === '"') return value.replaceAll('"', '&quot;');
  if (quote === "'") return value.replaceAll("'", '&#39;');
  return value;
}

export function insertPointForAttribute(html: string, element: Element): number {
  const end = element.sourceCodeLocation?.startTag?.endOffset;
  if (!end) throw new Error('element has no start tag location');
  let i = end - 2;
  while (i > 0 && /\s/.test(html[i] ?? '')) i -= 1;
  return html[i] === '/' ? i : end - 1;
}
