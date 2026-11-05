import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('packages/parser/test/fixtures');
fs.mkdirSync(dir, { recursive: true });

const edgeCases = {
  'doctype-case.html': `<!DOCTYPE html>\n<html><body><p class="a">x</p></body></html>\n`,
  'crlf.html': `<div class="a">\r\n  <span class="b">y</span>\r\n</div>\r\n`,
  'double-space.html': `<div class="hero  mx-auto">x</div>`,
  'single-quotes.html': `<div class='a b'>x</div>`,
  'unquoted.html': `<div class=a><span class=b>y</span></div>`,
  'bare-attribute.html': `<div class><span class>y</span></div>`,
  'empty-value.html': `<div class="">x</div>`,
  'comments.html': `<!-- top --><div class="a"><!-- inner -->x</div><!-- end -->`,
  'inline-script.html': `<div class="a"><script>const t = "<div class='b'>";</script></div>`,
  'inline-style.html': `<style>.a{color:red}</style><div class="a">x</div>`,
  'pre-block.html': `<pre class="a">  keep   this\n    spacing</pre>`,
  'svg.html': `<svg viewBox="0 0 10 10"><path class="a" d="M0 0 L10 10"/></svg>`,
  'void-elements.html': `<div><img src="a.png"><br><hr /><input type="text"></div>`,
  'malformed.html': `<div><span class="a">x</div>`,
  'attributes.html': `<div id="x" class="a" data-x="1" aria-label="z">x</div>`,
  'nested-same-class.html': `<div class="a"><div class="a"><div class="a">x</div></div></div>`,
  'entities.html': `<div class="a" title="a &amp; b">x &lt; y</div>`,
  'rtl.html': `<div dir="rtl" class="text-right">مرحبا</div>`,
};

for (const [name, content] of Object.entries(edgeCases)) {
  fs.writeFileSync(path.join(dir, name), content);
}

const VARIANTS = [
  { tag: 'section', cls: 'mx-auto max-w-6xl px-6 py-16', extra: 'aria-label="Section"' },
  {
    tag: 'article',
    cls: 'rounded-2xl border border-white/10 bg-white/5 p-6',
    extra: 'data-kind="card"',
  },
  { tag: 'aside', cls: 'hidden lg:block w-64 shrink-0', extra: 'role="complementary"' },
  { tag: 'nav', cls: 'flex items-center gap-6 text-sm', extra: 'aria-label="Primary"' },
  { tag: 'footer', cls: 'border-t border-white/10 py-10 text-sm', extra: '' },
  { tag: 'form', cls: 'grid gap-4 md:grid-cols-2', extra: 'novalidate' },
  { tag: 'table', cls: 'w-full text-start text-sm tabular-nums', extra: 'summary="Report"' },
  { tag: 'ul', cls: 'space-y-2 ps-6 list-disc', extra: '' },
  { tag: 'figure', cls: 'overflow-hidden rounded-xl bg-slate-900', extra: '' },
  {
    tag: 'button',
    cls: 'inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 font-semibold',
    extra: 'type="button"',
  },
];

function block(index) {
  const variant = VARIANTS[index % VARIANTS.length];
  const extra = variant.extra ? ` ${variant.extra}` : '';
  return `  <${variant.tag} class="${variant.cls}"${extra} data-block="${index}">
    <h2 class="text-lg font-semibold text-white">Block ${index}</h2>
    <p class="mt-2 text-sm leading-7 text-slate-400">Content ${index} with &amp; entity and <strong>markup</strong>.</p>
    <a href="/block/${index}" class="mt-4 inline-flex text-brand-400 hover:text-brand-300">Open</a>
  </${variant.tag}>`;
}

function page(index, blocks, options = {}) {
  const { crlf = false, script = false, svg = false } = options;
  const head = [
    '<!doctype html>',
    '<html lang="ar" dir="rtl">',
    '  <head>',
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `    <title>Stress ${index}</title>`,
    '    <style type="text/tailwindcss">@theme { --color-brand-500: oklch(0.62 0.19 264); }</style>',
    '  </head>',
    '  <body class="bg-slate-950 text-slate-100">',
  ].join('\n');
  const body = Array.from({ length: blocks }, (_, i) => block(i)).join('\n');
  const scriptBlock = script
    ? '  <script>\n    const tpl = ` <div class="p-4">x</div> `;\n    window.tpl = tpl;\n  </script>'
    : '';
  const svgBlock = svg
    ? '  <svg viewBox="0 0 24 24" class="h-6 w-6 fill-current text-brand-400"><path d="M4 4h16v16H4z"/></svg>'
    : '';
  const tail = ['  </body>', '</html>', ''].join('\n');
  const html = [head, svgBlock, body, scriptBlock, tail].filter(Boolean).join('\n');
  return crlf ? html.replaceAll('\n', '\r\n') : html;
}

const stress = [];
for (let i = 0; i < 32; i += 1) {
  const options = {
    crlf: i % 4 === 0,
    script: i % 4 === 1,
    svg: i % 4 === 2,
  };
  const blocks = i < 8 ? 400 : i < 16 ? 80 : 12;
  stress.push({
    name: `stress-${String(i).padStart(2, '0')}.html`,
    html: page(i, blocks, options),
  });
}

for (const file of stress) {
  fs.writeFileSync(path.join(dir, file.name), file.html);
}

console.error(
  `wrote ${Object.keys(edgeCases).length} edge cases and ${stress.length} stress fixtures`,
);
