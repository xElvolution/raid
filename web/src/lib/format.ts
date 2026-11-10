export const pct = (p: number | string | null | undefined): string => `${Math.round(Number(p ?? 0) * 100)}%`;

/** USDC base units (6 dp) to compact dollars. */
export function usd(base: string | number | null | undefined): string {
  const v = Number(base ?? 0) / 1e6;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(v < 10 && v % 1 ? 2 : 0)}`;
}

export function timeLeft(ts: string | number | null | undefined, now = Date.now()): string {
  if (!ts) return '';
  const ms = new Date(ts).getTime() - now;
  if (ms <= 0) return 'Closed';
  const m = Math.floor(ms / 60_000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d >= 1) return `${d}d left`;
  if (h >= 1) return `${h}h left`;
  return `${Math.max(1, m)}m left`;
}

export function ago(ts: string | number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export const shortAccount = (a: string): string => (a.length > 20 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);
