export type BridgeMessage =
  | { type: 'ready' }
  | { type: 'select'; id: string }
  | { type: 'picked'; id: string }
  | { type: 'cssApplied'; bytes: number };

export function parseBridgeMessage(raw: unknown): BridgeMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as { type?: unknown; id?: unknown; bytes?: unknown };
  if (candidate.type === 'ready') return { type: 'ready' };
  if (candidate.type === 'select' && typeof candidate.id === 'string') {
    return { type: 'select', id: candidate.id };
  }
  if (candidate.type === 'picked' && typeof candidate.id === 'string') {
    return { type: 'picked', id: candidate.id };
  }
  if (candidate.type === 'cssApplied' && typeof candidate.bytes === 'number') {
    return { type: 'cssApplied', bytes: candidate.bytes };
  }
  return null;
}
