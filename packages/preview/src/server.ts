import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

export type PreviewServer = { url: string; close: () => Promise<void> };

export async function createPreviewServer(root: string, port = 0): Promise<PreviewServer> {
  const normalizedRoot = path.resolve(root);
  const server = http.createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      let relative: string;
      try {
        relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      } catch {
        response.writeHead(400).end('bad request');
        return;
      }
      if (relative.includes('\0')) {
        response.writeHead(400).end('bad request');
        return;
      }
      const file = path.resolve(normalizedRoot, `.${relative}`);
      if (file !== normalizedRoot && !file.startsWith(`${normalizedRoot}${path.sep}`)) {
        response.writeHead(403).end('forbidden');
        return;
      }
      try {
        const content = await fs.readFile(file);
        response.writeHead(200, {
          'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
          'cache-control': 'no-store',
        });
        response.end(content);
      } catch {
        response.writeHead(404).end('not found');
      }
    })();
  });

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('preview server failed to bind');

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
