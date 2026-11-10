/**
 * Minimal glob matcher for project-relative POSIX paths.
 * Supports `**` (zero or more directories), `*` (within a segment) and `?`.
 */
export function matchesGlob(path: string, glob: string): boolean {
  const tokens = glob.split('/');
  const parts = path.split('/');
  return matchSegments(parts, 0, tokens, 0);
}

function matchSegments(parts: string[], p: number, tokens: string[], t: number): boolean {
  if (t === tokens.length) return p === parts.length;
  const token = tokens[t] ?? '';
  if (token === '**') {
    if (matchSegments(parts, p, tokens, t + 1)) return true;
    for (let i = p; i < parts.length; i += 1) {
      if (matchSegments(parts, i + 1, tokens, t + 1)) return true;
    }
    return false;
  }
  if (p === parts.length) return false;
  const part = parts[p] ?? '';
  return matchSegment(part, token) && matchSegments(parts, p + 1, tokens, t + 1);
}

function matchSegment(value: string, token: string): boolean {
  let v = 0;
  for (let i = 0; i < token.length; i += 1) {
    const ch = token[i] ?? '';
    if (ch === '*') {
      while (token[i + 1] === '*') i += 1;
      if (i === token.length - 1) return true;
      const rest = token.slice(i + 1);
      for (let start = v; start <= value.length; start += 1) {
        if (matchSegment(value.slice(start), rest)) return true;
      }
      return false;
    }
    if (ch === '?') {
      if (v >= value.length) return false;
      v += 1;
      continue;
    }
    if (value[v] !== ch) return false;
    v += 1;
  }
  return v === value.length;
}
