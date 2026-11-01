const SPACING = /^-?(p|m)([xytrblse])?-/;
const COLOR_NAMES =
  /^(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white|transparent|current|inherit|brand)/;

export function propertyOf(className) {
  const base = className.includes(':') ? className.slice(className.lastIndexOf(':') + 1) : className;
  const token = base.replace(/^!/, '');
  if (!token) return null;

  const spacing = SPACING.exec(token);
  if (spacing) {
    const family = spacing[1] === 'p' ? 'padding' : 'margin';
    const axis = spacing[2] ?? '';
    const side = { t: 'top', r: 'right', b: 'bottom', l: 'left', s: 'inline-start', e: 'inline-end', x: 'x', y: 'y' }[axis] ?? '';
    return { property: family, side };
  }

  if (/^gap(-[xy])?-/.test(token)) return { property: 'gap', side: token.startsWith('gap-x') ? 'x' : token.startsWith('gap-y') ? 'y' : '' };
  if (/^text-/.test(token)) {
    const rest = token.slice(5);
    if (/^(xs|sm|base|lg|xl|[2-9]xl)$/.test(rest)) return { property: 'font-size', side: '' };
    if (/^(left|right|center|justify|start|end)$/.test(rest)) return { property: 'text-align', side: '' };
    if (COLOR_NAMES.test(rest)) return { property: 'color', side: '' };
    return null;
  }
  if (/^bg-/.test(token)) return { property: 'background-color', side: '' };
  if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(token)) return { property: 'font-weight', side: '' };
  if (/^leading-/.test(token)) return { property: 'line-height', side: '' };
  if (/^tracking-/.test(token)) return { property: 'letter-spacing', side: '' };
  if (/^rounded(-(t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?(-|$)/.test(token)) return { property: 'border-radius', side: '' };
  if (/^border(-[trblse])?(-|$)/.test(token)) return { property: 'border-width', side: '' };
  if (/^opacity-/.test(token)) return { property: 'opacity', side: '' };
  if (/^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents|table)$/.test(token)) return { property: 'display', side: '' };
  if (/^(static|fixed|absolute|relative|sticky)$/.test(token)) return { property: 'position', side: '' };
  if (/^w-/.test(token)) return { property: 'width', side: '' };
  if (/^h-/.test(token)) return { property: 'height', side: '' };
  if (/^max-w-/.test(token)) return { property: 'width', side: 'max' };
  if (/^items-/.test(token)) return { property: 'align-items', side: '' };
  if (/^justify-/.test(token)) return { property: 'justify-content', side: '' };
  return null;
}

export function groupByProperty(classes) {
  const groups = new Map();
  for (const name of classes) {
    const info = propertyOf(name);
    if (!info) continue;
    const key = info.side ? `${info.property}:${info.side}` : info.property;
    const list = groups.get(key) ?? [];
    list.push({ name, ...info });
    groups.set(key, list);
  }
  return groups;
}

function overlaps(a, b) {
  if (a.property !== b.property) return false;
  if (a.side === b.side) return true;
  const whole = (side) => side === '';
  const axis = (side) => side === 'x' || side === 'y';
  if (whole(a.side) || whole(b.side)) return true;
  if (axis(a.side) && axis(b.side)) return false;
  if (axis(a.side)) return a.side === 'x' ? b.side !== 'top' && b.side !== 'bottom' : b.side !== 'left' && b.side !== 'right';
  if (axis(b.side)) return b.side === 'x' ? a.side !== 'top' && a.side !== 'bottom' : a.side !== 'left' && a.side !== 'right';
  return false;
}

export function findConflicts(classes, solos, actual) {
  const entries = [];
  for (const name of classes) {
    if (name.includes(':')) continue;
    const info = propertyOf(name);
    if (info) entries.push({ name, ...info, style: solos[name] ?? null });
  }

  const seen = new Set();
  const conflicts = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i];
      const b = entries[j];
      if (!overlaps(a, b)) continue;
      const key = `${a.property}|${a.side}|${b.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const valueA = a.style?.[a.property] ?? null;
      const valueB = b.style?.[b.property] ?? null;
      if (valueA === null || valueB === null) continue;
      if (valueA === valueB) continue;
      const actualValue = actual?.[a.property] ?? null;
      let winner = null;
      if (actualValue === valueB) winner = b.name;
      else if (actualValue === valueA) winner = a.name;
      conflicts.push({
        property: a.property,
        side: a.side === b.side ? a.side : '',
        winner,
        loser: winner === b.name ? a.name : winner === a.name ? b.name : null,
        candidates: [a.name, b.name],
        values: { [a.name]: valueA, [b.name]: valueB },
        actual: actualValue,
      });
    }
  }
  return conflicts;
}

export function describeConflict(conflict) {
  const where = conflict.side ? `${conflict.property} (${conflict.side})` : conflict.property;
  if (!conflict.winner) {
    return `${where}: تعارض بين ${conflict.candidates.join(' و ')} — القيمة الفعلية ${conflict.actual}`;
  }
  return `${where}: ${conflict.winner} يغلب ${conflict.loser} — قيمة القاعدة الأعلى في ترتيب الورقة المولّدة`;
}
