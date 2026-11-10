/** Opaque keyset cursor over (created_at, id). */
export interface Cursor {
  t: string;
  id: string;
}
export const encodeCursor = (c: Cursor): string => Buffer.from(JSON.stringify(c)).toString('base64url');
export function decodeCursor(s?: string): Cursor | null {
  if (!s) return null;
  try {
    const c = JSON.parse(Buffer.from(s, 'base64url').toString()) as Cursor;
    if (typeof c.t !== 'string' || !/^\d+$/.test(c.id) || Number.isNaN(Date.parse(c.t))) return null;
    return c;
  } catch {
    return null;
  }
}
