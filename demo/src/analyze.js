export const PROPS = [
  'display',
  'position',
  'width',
  'height',
  'padding',
  'margin',
  'gap',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'color',
  'background-color',
  'border-radius',
  'border-width',
  'opacity',
  'transform',
];

export function diffStyle(before, after) {
  const changed = [];
  for (const prop of PROPS) {
    if ((before[prop] ?? '') !== (after[prop] ?? '')) changed.push(prop);
  }
  return changed;
}
