import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { applyClassInput, readFileInput, validate } from '@tep/contracts';
import { createSession, type Session } from '@tep/editor';
import { createNodeFs } from '@tep/fs';

let session: Session | null = null;
let projectRoot: string | null = null;

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      preload: path.join(import.meta.dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
  }
}

function registerIpc(): void {
  ipcMain.handle('tep:pick-project', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    const root = result.filePaths[0];
    if (result.canceled || !root) return null;
    projectRoot = root;
    return { root };
  });

  ipcMain.handle('tep:open', async (_event, raw: unknown) => {
    const input = validate(readFileInput, raw);
    if (!projectRoot) throw new Error('لا يوجد مشروع مفتوح');
    session = await createSession(createNodeFs(projectRoot), input.path);
    return { path: session.path, text: session.text };
  });

  ipcMain.handle('tep:applyClass', (_event, raw: unknown) => {
    const input = validate(applyClassInput, raw);
    if (!session) throw new Error('لا يوجد ملف مفتوح');
    for (const token of input.add) session.addClass(input.elementId, token);
    for (const token of input.remove) session.removeClass(input.elementId, token);
    return { text: session.text, dirty: session.dirty };
  });

  ipcMain.handle('tep:save', async () => {
    if (!session) throw new Error('لا يوجد ملف مفتوح');
    await session.save();
    return { ok: true, text: session.text };
  });

  ipcMain.handle('tep:undo', () => {
    if (!session) throw new Error('لا يوجد ملف مفتوح');
    session.undo();
    return { text: session.text, dirty: session.dirty };
  });

  ipcMain.handle('tep:redo', () => {
    if (!session) throw new Error('لا يوجد ملف مفتوح');
    session.redo();
    return { text: session.text, dirty: session.dirty };
  });

  ipcMain.handle('tep:export', () => {
    if (!session) throw new Error('لا يوجد ملف مفتوح');
    return { html: session.exportHtml() };
  });
}

void app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
