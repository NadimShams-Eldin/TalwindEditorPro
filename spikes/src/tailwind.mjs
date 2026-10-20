import { compile } from '@tailwindcss/node';

export const DEFAULT_CSS = '@import "tailwindcss";';

export async function createCompiler(css = DEFAULT_CSS, base = process.cwd()) {
  return compile(css, { base, onDependency() {} });
}

export async function compileCandidates(candidates, options = {}) {
  const { css = DEFAULT_CSS, base = process.cwd() } = options;
  const started = performance.now();
  const compiler = await createCompiler(css, base);
  const output = compiler.build(candidates);
  return { css: output, compiler, ms: performance.now() - started };
}

export function countRules(css) {
  return (css.match(/\{/g) ?? []).length;
}

export function naiveScanClasses(text) {
  const found = new Set();
  const pattern = /class\s*=\s*["']([^"']*)["']/g;
  for (const match of text.matchAll(pattern)) {
    for (const token of match[1].split(/\s+/)) {
      if (token) found.add(token);
    }
  }
  return found;
}

export function hasRule(css, className) {
  return css.split('\\').join('').includes(`.${className}`);
}
