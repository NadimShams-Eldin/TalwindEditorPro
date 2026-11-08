/**
 * Minimal glob matcher for project-relative POSIX paths.
 * Supports `**` (zero or more directories), `*` (within a segment) and `?`.
 */
export function matchesGlob(path: string, glob: string): boolean {
  const pattern = glob
    .split('')
    .map((ch) => {
      if (ch === '*') return '\u0000';
      if (ch === '?') return '\u0001';
      return ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    })
    .join('')
    .replace(/\u0000\u0000\//g, '\u0002')
    .replace(/\u0000\u0000/g, '\u0003')
    .replace(/\u0000/g, '\u0004')
    .replace(/\u0001/g, '.')
    .replace(/\u0002/g, '(?:.*/)?')
    .replace(/\u0003/g, '.*')
    .replace(/\u0004/g, '[^/]*');
  return new RegExp(`^${pattern}$`).test(path);
}
