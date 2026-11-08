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

/**
 * Reads the `class` attribute span from a start tag slice without reparsing the
 * document. Used by the indexed fast path, where attribute offsets are known to
 * live inside `[start, end)`.
 */
export function readClassSpanInStartTag(
  html: string,
  start: number,
  end: number,
): ClassSpan | null {
  let i = start + 1;
  while (i < end && !/[\s/>]/.test(html[i] ?? '')) i += 1;
  while (i < end) {
    while (i < end && /\s/.test(html[i] ?? '')) i += 1;
    if (i >= end) break;
    const ch = html[i] ?? '';
    if (ch === '>' || ch === '/') break;
    const nameStart = i;
    while (i < end && !/[\s=/>]/.test(html[i] ?? '')) i += 1;
    const name = html.slice(nameStart, i).toLowerCase();
    while (i < end && /\s/.test(html[i] ?? '')) i += 1;
    let valueStart = i;
    let valueEnd = i;
    let quote: '"' | "'" | '' = '';
    if (html[i] === '=') {
      i += 1;
      while (i < end && /\s/.test(html[i] ?? '')) i += 1;
      const first = html[i] ?? '';
      if (first === '"' || first === "'") {
        quote = first;
        i += 1;
        valueStart = i;
        while (i < end && html[i] !== quote) i += 1;
        valueEnd = i;
        if (i < end) i += 1;
      } else {
        valueStart = i;
        while (i < end && !/[\s>]/.test(html[i] ?? '')) i += 1;
        valueEnd = i;
      }
    }
    if (name === 'class') {
      return {
        attrStart: nameStart,
        attrEnd: i,
        valueStart,
        valueEnd,
        quote,
        value: html.slice(valueStart, valueEnd),
      };
    }
  }
  return null;
}
