import { createSession, type Session } from '@tep/editor';
import { injectEditorIds } from '@tep/parser';

const SAMPLE = `<!doctype html>
<html lang="ar" dir="rtl">
  <head><meta charset="utf-8" /><title>عيّنة</title></head>
  <body class="bg-gray-50 p-8">
    <main class="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-lg">
      <h1 class="text-2xl font-bold text-gray-900">بطاقة تجريبية</h1>
      <p class="mt-2 text-sm text-gray-600">انقر على أي عنصر ثم أضف صنفًا.</p>
    </main>
  </body>
</html>
`;

export type RendererApi = {
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

type Manifest = { pages?: string[] };

async function fetchProject(): Promise<{ files: Map<string, string>; pages: string[] }> {
  const files = new Map<string, string>();
  let pages: string[] = [];
  try {
    const manifestResponse = await fetch('manifest.json', { cache: 'no-store' });
    if (manifestResponse.ok) {
      const manifest = (await manifestResponse.json()) as Manifest;
      pages = manifest.pages ?? [];
    }
  } catch {
    pages = [];
  }
  for (const page of pages) {
    const response = await fetch(page, { cache: 'no-store' });
    if (response.ok) files.set(page, await response.text());
  }
  return { files, pages };
}

/**
 * Browser-only stand-in used by the E2E preview build when Electron IPC is
 * unavailable. It keeps the same contract as the preload bridge so the UI code
 * has no branch of its own.
 */
export function createFallbackApi(): RendererApi {
  let session: Session | null = null;
  let files = new Map<string, string>();
  let pages: string[] = [];

  return {
    async pickProject() {
      const project = await fetchProject();
      files = project.files;
      pages = project.pages;
      if (files.size === 0) files.set('index.html', SAMPLE);
      return { root: '/' };
    },
    async open(path) {
      const target = files.has(path) ? path : (pages[0] ?? 'index.html');
      const source = files.get(target) ?? SAMPLE;
      const injected = injectEditorIds(source).html;
      files.set(target, injected);
      session = await createSession(
        {
          read: async (key) => files.get(key) ?? '',
          write: async (key, content) => {
            files.set(key, content);
          },
          list: async () => [...files.keys()],
          watch: async () => () => {},
          stat: async (key) => ({ mtimeMs: 0, size: (files.get(key) ?? '').length }),
        },
        target,
      );
      return { path: target, text: session.text };
    },
    async applyClass(input) {
      if (!session) throw new Error('لا يوجد ملف مفتوح');
      for (const token of input.add) session.addClass(input.elementId, token);
      for (const token of input.remove) session.removeClass(input.elementId, token);
      return { text: session.text, dirty: session.dirty };
    },
    async save() {
      if (!session) throw new Error('لا يوجد ملف مفتوح');
      await session.save();
      return { ok: true, text: session.text };
    },
    async undo() {
      if (!session) throw new Error('لا يوجد ملف مفتوح');
      session.undo();
      return { text: session.text, dirty: session.dirty };
    },
    async redo() {
      if (!session) throw new Error('لا يوجد ملف مفتوح');
      session.redo();
      return { text: session.text, dirty: session.dirty };
    },
    async exportHtml() {
      if (!session) throw new Error('لا يوجد ملف مفتوح');
      return { html: session.exportHtml() };
    },
  };
}
