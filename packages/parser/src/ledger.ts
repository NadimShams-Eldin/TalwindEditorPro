import { DocumentBuffer, type CausalMeta, type LedgerEntry } from './buffer.ts';

export type EditSource = 'control' | 'class-tree' | 'code' | 'ai' | 'import';

export type CausalEntry = LedgerEntry & CausalMeta & { reversible: boolean };

let sequence = 0;

export class CausalBuffer extends DocumentBuffer {
  applyCausal(input: {
    source: EditSource;
    label: string;
    elementId?: string;
    mutate: (text: string) => string;
  }): boolean {
    const applied = this.apply(input.label, input.mutate);
    if (!applied) return false;
    const entry = this.entries.at(-1);
    if (!entry) return false;
    sequence += 1;
    const meta: CausalMeta = {
      id: `c${sequence}`,
      source: input.source,
      elementId: input.elementId ?? null,
      at: new Date().toISOString(),
    };
    this.annotate(entry, meta);
    return true;
  }

  protected annotate(entry: LedgerEntry, meta: CausalMeta): void {
    entry.meta = meta;
  }
}

export function explain(buffer: DocumentBuffer, elementId: string): CausalEntry[] {
  return buffer.entries
    .filter((entry): entry is LedgerEntry & { meta: CausalMeta } => Boolean(entry.meta))
    .filter((entry) => entry.meta.elementId === elementId)
    .map((entry) => ({ ...entry, ...entry.meta, reversible: true }));
}
