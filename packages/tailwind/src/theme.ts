export type ThemeToken = { namespace: string; name: string; value: string };

export function parseTheme(css: string): ThemeToken[] {
  const tokens: ThemeToken[] = [];
  const block = /@theme\s*\{([^}]*)\}/.exec(css);
  if (!block) return tokens;
  const body = block[1] ?? '';
  for (const match of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    const raw = match[1] ?? '';
    const value = (match[2] ?? '').trim();
    const dash = raw.indexOf('-');
    if (dash === -1) continue;
    tokens.push({ namespace: raw.slice(0, dash), name: raw.slice(dash + 1), value });
  }
  return tokens;
}
