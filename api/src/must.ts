/** Narrow a value the code has already proven present (a RETURNING row, a checked env var) without `!`.
 *  If the invariant is ever broken it fails loudly with a name instead of a TypeError three lines later. */
export function must<T>(v: T | null | undefined, what: string): T {
  if (v === null || v === undefined) throw new Error(`invariant: missing ${what}`);
  return v;
}
