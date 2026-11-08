import type { CompileResult, Compiler } from './compiler.ts';

export type Scheduler = {
  update(candidates: Iterable<string>, onResult: (result: CompileResult) => void): void;
  flush(): void;
  cancel(): void;
};

export function createScheduler(
  compiler: Compiler,
  options: { debounceMs?: number } = {},
): Scheduler {
  const debounceMs = options.debounceMs ?? 30;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Iterable<string> = [];
  let callback: ((result: CompileResult) => void) | null = null;

  const run = (): void => {
    timer = null;
    if (!callback) return;
    const result = compiler.build(pending);
    callback(result);
  };

  return {
    update(candidates, onResult) {
      pending = candidates;
      callback = onResult;
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, debounceMs);
    },
    flush() {
      if (timer) clearTimeout(timer);
      run();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
