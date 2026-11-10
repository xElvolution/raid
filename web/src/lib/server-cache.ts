/** Tiny in-process TTL cache + fetch helper for the market proxy routes (keeps us inside public API rate limits). */
const store = new Map<string, { at: number; v: Promise<unknown> }>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.v as Promise<T>;
  const v = fn();
  store.set(key, { at: Date.now(), v });
  v.catch(() => { if (store.get(key)?.v === v) store.delete(key); });
  return v;
}

export async function getJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'raid-app/1.0' }, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return (await r.json()) as T;
}

export const json = (data: unknown, maxAge = 10) => Response.json(data, { headers: { 'cache-control': `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 3}` } });
export const fail = (e: unknown) => Response.json({ error: e instanceof Error ? e.message : 'upstream error' }, { status: 502 });
