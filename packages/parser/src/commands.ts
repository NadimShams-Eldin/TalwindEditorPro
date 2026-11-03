import type { DocumentBuffer } from './buffer.ts';
import { readClassSpan, escapeForQuote, insertPointForAttribute } from './class-attr.ts';
import { findElementById } from './locate.ts';

function splitTokens(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

function replace(text: string, start: number, end: number, next: string): string {
  return text.slice(0, start) + next + text.slice(end);
}

function removeAttribute(html: string, start: number, end: number): string {
  const from = /\s/.test(html[start - 1] ?? '') ? start - 1 : start;
  return replace(html, from, end, '');
}

export function classTokens(html: string, editorId: string): string[] {
  const element = findElementById(html, editorId);
  if (!element) throw new Error(`element not found: ${editorId}`);
  const span = readClassSpan(html, element);
  return span ? splitTokens(span.value) : [];
}

export function addClass(html: string, editorId: string, token: string): string {
  if (token.length === 0) return html;
  const element = findElementById(html, editorId);
  if (!element) throw new Error(`element not found: ${editorId}`);
  const span = readClassSpan(html, element);
  if (!span) {
    const at = insertPointForAttribute(html, element);
    return replace(html, at, at, ` class="${escapeForQuote(token, '"')}"`);
  }
  const current = splitTokens(span.value);
  if (current.includes(token)) return html;
  if (span.quote === '') {
    const next = [...current, token].join(' ');
    return replace(html, span.attrStart, span.attrEnd, `class="${escapeForQuote(next, '"')}"`);
  }
  const separator = span.value.length > 0 && !/\s$/.test(span.value) ? ' ' : '';
  return replace(html, span.valueEnd, span.valueEnd, `${separator}${token}`);
}

export function removeClass(html: string, editorId: string, token: string): string {
  const element = findElementById(html, editorId);
  if (!element) throw new Error(`element not found: ${editorId}`);
  const span = readClassSpan(html, element);
  if (!span) return html;
  if (span.quote === '') {
    const current = splitTokens(span.value);
    if (!current.includes(token)) return html;
    const next = current.filter((t) => t !== token);
    if (next.length === 0) return removeAttribute(html, span.attrStart, span.attrEnd);
    return replace(html, span.attrStart, span.attrEnd, `class="${escapeForQuote(next.join(' '), '"')}"`);
  }
  const value = span.value;
  const pattern = new RegExp(`(^|\\s+)${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+|$)`);
  const match = pattern.exec(value);
  if (!match) return html;
  const tokenStart = match.index + (match[1] ?? '').length;
  const tokenEnd = tokenStart + token.length;
  let from: number;
  let to: number;
  if (match[2] && match[2].length > 0) {
    from = span.valueStart + tokenStart;
    to = span.valueStart + tokenEnd + match[2].length;
  } else {
    from = span.valueStart + match.index;
    to = span.valueStart + tokenEnd;
  }
  const removed = value.slice(0, from - span.valueStart) + value.slice(to - span.valueStart);
  if (removed.trim() === '') return removeAttribute(html, span.attrStart, span.attrEnd);
  return replace(html, from, to, '');
}

export function setClasses(html: string, editorId: string, next: readonly string[]): string {
  const element = findElementById(html, editorId);
  if (!element) throw new Error(`element not found: ${editorId}`);
  const value = next.filter(Boolean).join(' ');
  const span = readClassSpan(html, element);
  if (!span) {
    if (!value) return html;
    const at = insertPointForAttribute(html, element);
    return replace(html, at, at, ` class="${escapeForQuote(value, '"')}"`);
  }
  if (!value) return removeAttribute(html, span.attrStart, span.attrEnd);
  const quote = span.quote || '"';
  return replace(
    html,
    span.attrStart,
    span.attrEnd,
    `class=${quote}${escapeForQuote(value, quote)}${quote}`,
  );
}

export function applyEdit(buffer: DocumentBuffer, editorId: string, next: readonly string[]): boolean {
  return buffer.apply('class.change', (text) => setClasses(text, editorId, next));
}
