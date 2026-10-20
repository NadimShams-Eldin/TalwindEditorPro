import { parseHTML } from 'linkedom';

export function createPreview(html) {
  const { document } = parseHTML(html);
  if (!document.head) {
    const head = document.createElement('head');
    document.documentElement.prepend(head);
  }
  const style = document.createElement('style');
  style.setAttribute('id', 'tep-style');
  document.head.append(style);
  return { document, style };
}

export function applyCss(preview, css) {
  const started = performance.now();
  preview.style.textContent = css;
  return performance.now() - started;
}

export function selectElement(preview, id) {
  for (const node of preview.document.querySelectorAll('[data-tep-selected]')) {
    node.removeAttribute('data-tep-selected');
  }
  const element = preview.document.querySelector(`[data-tep-id="${id}"]`);
  if (element) element.setAttribute('data-tep-selected', 'true');
  return element;
}

export function selectedId(preview) {
  const element = preview.document.querySelector('[data-tep-selected]');
  return element?.getAttribute('data-tep-id') ?? null;
}

export function countNodes(preview) {
  return preview.document.querySelectorAll('*').length;
}

export function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}
