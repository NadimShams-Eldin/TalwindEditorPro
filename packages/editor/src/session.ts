import type { FileSystemPort } from '@tep/fs';
import {
  CausalBuffer,
  addClass as addClassCommand,
  removeClass as removeClassCommand,
  stripEditorIds,
} from '@tep/parser';

export type Session = {
  readonly path: string;
  readonly text: string;
  readonly dirty: boolean;
  addClass(elementId: string, token: string): boolean;
  removeClass(elementId: string, token: string): boolean;
  undo(): boolean;
  redo(): boolean;
  save(): Promise<void>;
  exportHtml(): string;
};

export async function createSession(port: FileSystemPort, path: string): Promise<Session> {
  const original = await port.read(path);
  const buffer = new CausalBuffer(original, path);
  return {
    path,
    get text() {
      return buffer.text;
    },
    get dirty() {
      return buffer.dirty;
    },
    addClass(elementId, token) {
      return buffer.applyCausal({
        source: 'control',
        label: `Add ${token}`,
        elementId,
        mutate: (text) => addClassCommand(text, elementId, token),
      });
    },
    removeClass(elementId, token) {
      return buffer.applyCausal({
        source: 'control',
        label: `Remove ${token}`,
        elementId,
        mutate: (text) => removeClassCommand(text, elementId, token),
      });
    },
    undo() {
      return buffer.undo();
    },
    redo() {
      return buffer.redo();
    },
    async save() {
      await port.write(path, buffer.text);
    },
    exportHtml() {
      return stripEditorIds(buffer.text);
    },
  };
}
