import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { matchesGlob } from './glob.ts';
import type { FileEvent, FileSystemPort } from './port.ts';

function resolveInside(root: string, relative: string): string {
  const resolved = path.resolve(root, relative);
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error(`path escapes project root: ${relative}`);
  }
  return resolved;
}

const IGNORED = new Set(['node_modules', '.git', '.tep', 'dist', 'out']);

async function walk(current: string, root: string, glob: string, found: string[]): Promise<void> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED.has(entry.name)) continue;
      await walk(path.join(current, entry.name), root, glob, found);
      continue;
    }
    const relative = path.relative(root, path.join(current, entry.name)).split(path.sep).join('/');
    if (matchesGlob(relative, glob)) found.push(relative);
  }
}

export function createNodeFs(root: string): FileSystemPort {
  return {
    async read(relative) {
      return fs.readFile(resolveInside(root, relative), 'utf8');
    },
    async write(relative, content) {
      const target = resolveInside(root, relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, 'utf8');
    },
    async list(listRoot, glob) {
      const found: string[] = [];
      const base = resolveInside(root, listRoot);
      await walk(base, base, glob, found);
      return found;
    },
    async watch(watchRoot, onChange) {
      const target = resolveInside(root, watchRoot);
      const watcher = fssync.watch(target, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const relative = String(filename).split(path.sep).join('/');
        const event: FileEvent = {
          type: eventType === 'rename' ? 'add' : 'change',
          path: relative,
        };
        onChange(event);
      });
      return () => watcher.close();
    },
    async stat(relative) {
      const stats = await fs.stat(resolveInside(root, relative));
      return { mtimeMs: stats.mtimeMs, size: stats.size };
    },
  };
}
