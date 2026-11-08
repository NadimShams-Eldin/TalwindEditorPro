const TAGS = ['div', 'span', 'p', 'section', 'article', 'a', 'img', 'br', 'svg', 'pre'];
const ATTRS = ['class="a b"', "class='c  d'", 'class=e', 'class', '', 'id="x"', 'data-x="1"'];

export function randomHtml(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const depth = 2 + Math.floor(next() * 4);
  function node(level) {
    if (level > depth) return 'text';
    const tag = TAGS[Math.floor(next() * TAGS.length)];
    const attr = ATTRS[Math.floor(next() * ATTRS.length)];
    const open = `<${tag}${attr ? ` ${attr}` : ''}>`;
    if (tag === 'img' || tag === 'br') return open;
    const count = Math.floor(next() * 3);
    const children = Array.from({ length: count }, () => node(level + 1)).join('');
    return `${open}${children}</${tag}>`;
  }
  return `<!doctype html><html><body>${node(0)}</body></html>`;
}
