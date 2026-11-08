import path from 'node:path';
import { matchesGlob } from './glob.ts';
import type { FileEvent, FileSystemPort } from './port.ts';

export function createMemoryFs(initial: Record<string, string> = {}): FileSystemPort {
  const files = new Map<string, string>(Object.entries(initial));
  const watchers = new Set<(event: FileEvent) => void>();
  const normalize = (value: string): string => {
    if (value.startsWith('/') || value.includes('..')) throw new Error(`unsafe path: ${value}`);
    return value.split(path.sep).join('/');
  };
  return {
    async read(relative) {
      const value = files.get(normalize(relative));
      if (value === undefined) throw new Error(`missing file: ${relative}`);
      return value;
    },
    async write(relative, content) {
      const key = normalize(relative);
      files.set(key, content);
      for (const watcher of watchers) watcher({ type: 'change', path: key });
    },
    async list(_root, glob) {
      return [...files.keys()].filter((key) => matchesGlob(key, glob));
    },
    async watch(_root, onChange) {
      watchers.add(onChange);
      return () => watchers.delete(onChange);
    },
    async stat(relative) {
      const value = files.get(normalize(relative));
      if (value === undefined) throw new Error(`missing file: ${relative}`);
      return { mtimeMs: 0, size: value.length };
    },
  };
}
