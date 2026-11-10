'use client';
import { useQuery } from '@tanstack/react-query';
import type { Candle, ChestTx, Launch, Quote, Trade } from './coins';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${base}${path}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export const useQuotes = () => useQuery({ queryKey: ['quotes'], queryFn: () => get<{ items: Quote[] }>('/api/market/coins').then((d) => d.items), refetchInterval: 20_000, staleTime: 15_000 });
export const useQuote = (symbol?: string) => { const q = useQuotes(); return { ...q, data: q.data?.find((x) => x.symbol === symbol) }; };
export const useCandles = (symbol: string | undefined, tf: string) => useQuery({ queryKey: ['ohlcv', symbol, tf], enabled: !!symbol, queryFn: () => get<{ candles: Candle[]; source: string }>(`/api/market/ohlcv?symbol=${symbol}&tf=${tf}`), refetchInterval: 60_000, staleTime: 45_000 });
export const useTrades = (symbols: string[]) => useQuery({ queryKey: ['trades', symbols.join(',')], queryFn: () => get<{ items: Trade[] }>(`/api/market/trades?symbols=${symbols.join(',')}`).then((d) => d.items), refetchInterval: 15_000, staleTime: 10_000 });
export const useLaunches = () => useQuery({ queryKey: ['launches'], queryFn: () => get<{ items: Launch[] }>('/api/market/launches').then((d) => d.items), refetchInterval: 60_000, staleTime: 45_000 });
export const useChestTxs = () => useQuery({ queryKey: ['chest-txs'], queryFn: () => get<{ items: ChestTx[] }>('/api/market/chest').then((d) => d.items), refetchInterval: 30_000, staleTime: 20_000 });

/** $0.0₅528 style for tiny memecoin prices; normal otherwise. */
export function fmtPrice(p: number | null | undefined): string {
  if (p == null || !isFinite(p)) return '—';
  if (p >= 1000) return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  const s = p.toFixed(20).split('.')[1] ?? '';
  const zeros = s.match(/^0*/)?.[0].length ?? 0;
  const sig = s.slice(zeros, zeros + 4).replace(/0+$/, '') || '0';
  if (zeros < 4) return `$0.${'0'.repeat(zeros)}${sig}`;
  const sub = String(zeros).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]).join('');
  return `$0.0${sub}${sig}`;
}
export const fmtPct = (p: number | null | undefined, dp = 2) => (p == null ? '—' : `${p > 0 ? '+' : ''}${p.toFixed(dp)}%`);
export function fmtUsd(n: number | null | undefined, compact = true): string {
  if (n == null || !isFinite(n)) return '—';
  if (!compact) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  const a = Math.abs(n);
  return a >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : a >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : a >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(a < 10 ? 2 : 0)}`;
}
export function fmtAmount(n: number): string {
  const a = Math.abs(n);
  return a >= 1e12 ? `${(n / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : a >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(a < 1 ? 4 : 2);
}
export function ago(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
}
export function countdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return d ? `${d}d ${p(h)}h ${p(m)}m` : `${p(h)}:${p(m)}:${p(x)}`;
}
/** 0x1057…ae31, raid-chest-mw…3vnk.testnet → readable without blowing up layouts. */
export function shortAddr(a: string): string {
  if (!a) return '';
  if (/^0x[0-9a-f]{40}$/i.test(a)) return `${a.slice(0, 6)}…${a.slice(-4)}`;
  const [name, ...rest] = a.split('.');
  const tld = rest.length ? `.${rest[rest.length - 1]}` : '';
  const n = name ?? a;
  if (rest.length > 1 || n.length > 14) return `${n.length > 12 ? `${n.slice(0, 7)}…${n.slice(-4)}` : n}${tld}`;
  if (a.length > 22) return `${a.slice(0, 8)}…${a.slice(-6)}`;
  return a;
}

/** Account name without the network suffix, shortened for headings and tight tables: raid-ch…3vnk */
export function shortName(a: string): string {
  if (/^0x[0-9a-f]{40}$/i.test(a)) return shortAddr(a);
  const base = a.replace(/\.(testnet|near|tg)$/, '');
  return base.length > 14 ? `${base.slice(0, 7)}…${base.slice(-4)}` : base;
}
