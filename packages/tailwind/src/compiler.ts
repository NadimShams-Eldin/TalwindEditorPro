import { compile } from '@tailwindcss/node';

export type CompileResult = {
  css: string;
  rules: number;
  durationMs: number;
};

export type Compiler = {
  build(candidates: Iterable<string>): CompileResult;
  dispose(): void;
};

export async function createCompiler(entryCss: string, base: string): Promise<Compiler> {
  const internal = await compile(entryCss, { base, onDependency() {} });
  return {
    build(candidates) {
      const started = performance.now();
      const list = [...new Set(candidates)].sort();
      const css = internal.build(list);
      return {
        css,
        rules: (css.match(/\{/g) ?? []).length,
        durationMs: performance.now() - started,
      };
    },
    dispose() {
      internal.build([]);
    },
  };
}
