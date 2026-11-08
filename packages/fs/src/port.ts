export type FileEvent = { type: 'change' | 'add' | 'remove'; path: string };

export type FileSystemPort = {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  list(root: string, glob: string): Promise<string[]>;
  watch(root: string, onChange: (event: FileEvent) => void): Promise<() => void>;
  stat(path: string): Promise<{ mtimeMs: number; size: number }>;
};
