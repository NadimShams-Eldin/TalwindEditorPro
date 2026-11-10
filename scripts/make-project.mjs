import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'e2e/fixtures/project');
fs.mkdirSync(path.join(root, 'pages'), { recursive: true });

const pages = [];
for (let i = 0; i < 100; i += 1) {
  const body = Array.from(
    { length: 40 },
    (_, j) =>
      `<article class="card p-4 md:p-6"><h2 class="text-lg font-semibold">Card ${j}</h2><p class="mt-2 text-sm text-gray-600">Body ${j}</p></article>`,
  ).join('\n');
  const relative = `pages/page-${i}.html`;
  fs.writeFileSync(
    path.join(root, relative),
    `<!doctype html>\n<html><head><meta charset="utf-8"><title>Page ${i}</title></head><body><main class="p-6">${body}</main></body></html>`,
  );
  pages.push(relative);
}

fs.writeFileSync(path.join(root, 'manifest.json'), `${JSON.stringify({ pages }, null, 2)}\n`);
console.error(`wrote 100 pages to ${root}`);
