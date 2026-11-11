import { contextBridge, ipcRenderer } from 'electron';

export type TepApi = {
  pickProject(): Promise<{ root: string } | null>;
  open(path: string): Promise<{ path: string; text: string }>;
  openDirect?(path: string): Promise<{ path: string; text: string }>;
  applyClass(input: {
    path: string;
    elementId: string;
    add: string[];
    remove: string[];
  }): Promise<{ text: string; dirty: boolean }>;
  save(): Promise<{ ok: boolean; text: string }>;
  undo(): Promise<{ text: string; dirty: boolean }>;
  redo(): Promise<{ text: string; dirty: boolean }>;
  exportHtml(): Promise<{ html: string }>;
};

const api: TepApi = {
  pickProject: () => ipcRenderer.invoke('tep:pick-project'),
  open: (path) => ipcRenderer.invoke('tep:open', { path }),
  openDirect: (path) => ipcRenderer.invoke('tep:open-direct', { path }),
  applyClass: (input) => ipcRenderer.invoke('tep:applyClass', input),
  save: () => ipcRenderer.invoke('tep:save'),
  undo: () => ipcRenderer.invoke('tep:undo'),
  redo: () => ipcRenderer.invoke('tep:redo'),
  exportHtml: () => ipcRenderer.invoke('tep:export'),
};

contextBridge.exposeInMainWorld('tep', api);
