import fs from 'node:fs/promises';
import path from 'node:path';

export type BuildMode = 'builtin' | 'external' | 'unknown';

type Manifest = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export async function detectMode(projectRoot: string): Promise<BuildMode> {
  try {
    const raw = await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8');
    const manifest = JSON.parse(raw) as Manifest;
    const hasTailwind =
      Boolean(manifest.dependencies?.tailwindcss) || Boolean(manifest.devDependencies?.tailwindcss);
    if (!hasTailwind) return 'unknown';
    const scripts = Object.values(manifest.scripts ?? {});
    return scripts.some((script) => /tailwindcss|postcss/.test(script)) ? 'external' : 'builtin';
  } catch {
    return 'unknown';
  }
}
