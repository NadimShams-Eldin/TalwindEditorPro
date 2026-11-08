export type CausalMeta = {
  id: string;
  source: string;
  elementId: string | null;
  at: string;
};

export type LedgerEntry = {
  label: string;
  before: string;
  after: string;
  meta?: CausalMeta;
};

export type DocumentBufferOptions = {
  historyLimit?: number;
};

export class DocumentBuffer {
  #text: string;
  readonly id: string;
  readonly historyLimit: number;
  #entries: LedgerEntry[] = [];
  #cursor = 0;

  constructor(text: string, id = 'document', options: DocumentBufferOptions = {}) {
    this.#text = text;
    this.id = id;
    this.historyLimit = options.historyLimit ?? 500;
  }

  get text(): string {
    return this.#text;
  }

  get entries(): readonly LedgerEntry[] {
    return this.#entries;
  }

  get cursor(): number {
    return this.#cursor;
  }

  get dirty(): boolean {
    return this.#cursor !== 0;
  }

  apply(label: string, mutate: (text: string) => string): boolean {
    const before = this.#text;
    const after = mutate(before);
    if (after === before) return false;
    this.#entries = this.#entries.slice(0, this.#cursor);
    this.#entries.push({ label, before, after });
    if (this.#entries.length > this.historyLimit) this.#entries.shift();
    this.#cursor = this.#entries.length;
    this.#text = after;
    return true;
  }

  undo(): boolean {
    if (this.#cursor === 0) return false;
    this.#cursor -= 1;
    const entry = this.#entries[this.#cursor];
    if (!entry) return false;
    this.#text = entry.before;
    return true;
  }

  redo(): boolean {
    if (this.#cursor >= this.#entries.length) return false;
    const entry = this.#entries[this.#cursor];
    if (!entry) return false;
    this.#text = entry.after;
    this.#cursor += 1;
    return true;
  }
}
