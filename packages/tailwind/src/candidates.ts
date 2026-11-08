import { indexDocument } from '@tep/parser';

export function collectFromHtml(html: string): Set<string> {
  const candidates = new Set<string>();
  for (const element of indexDocument(html).elements) {
    if (!element.classValue) continue;
    for (const token of element.classValue.split(/\s+/)) {
      if (token) candidates.add(token);
    }
  }
  return candidates;
}

export function mergeCandidates(...sets: Iterable<string>[]): Set<string> {
  const merged = new Set<string>();
  for (const set of sets) for (const value of set) merged.add(value);
  return merged;
}
