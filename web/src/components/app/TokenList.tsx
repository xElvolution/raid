'use client';
/** Tokens: Watchlist | Tokens with filter chips, one clean row per coin from live DexScreener / CoinGecko quotes. */
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Star } from 'lucide-react';
import { CoinAvatar, Delta, Skeleton } from '../ui';
import { useQuotes, fmtPrice } from '@/lib/market';
import { useRaids } from '@/lib/hooks';
import { target } from '@/lib/raid';
import { CHAINS, COINS, type Quote } from '@/lib/coins';

const WL = 'raid.watchlist';
const subs = new Set<() => void>();
const readWL = (): string => (typeof localStorage === 'undefined' ? '[]' : localStorage.getItem(WL) ?? '[]');
export function useWatchlist() {
  const raw = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, readWL, () => '[]');
  const list: string[] = JSON.parse(raw);
  const toggle = (s: string) => { const n = list.includes(s) ? list.filter((x) => x !== s) : [...list, s]; localStorage.setItem(WL, JSON.stringify(n)); subs.forEach((f) => f()); };
  return { list, toggle };
}
export const fmtUsd = (n: number | null | undefined) => n == null ? '–' : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`;

type Chip = 'all' | 'trending' | 'gainers' | 'raided' | 'big';
const CHIPS: [Chip, string][] = [['all', 'Crypto'], ['trending', 'Trending'], ['gainers', 'Top gainers'], ['raided', 'Most raided'], ['big', 'Biggest']];

export function TokenList() {
  const q = useQuotes();
  const raids = useRaids();
  const wl = useWatchlist();
  const [tab, setTab] = useState<'watch' | 'tokens'>('tokens');
  const [chip, setChip] = useState<Chip>('all');
  useEffect(() => { const t = setTimeout(() => { if (wl.list.length) setTab('watch'); }, 0); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const raidCount = new Map<string, number>();
  for (const r of raids.data ?? []) { const s = target(r).symbol.replace(/^t(?=[A-Z])/, ''); raidCount.set(s, (raidCount.get(s) ?? 0) + 1); }
  let rows: Quote[] = [...(q.data ?? [])];
  if (tab === 'watch') rows = rows.filter((x) => wl.list.includes(x.symbol));
  if (chip === 'trending') rows.sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
  if (chip === 'gainers') rows.sort((a, b) => (b.change24h ?? -999) - (a.change24h ?? -999));
  if (chip === 'raided') rows = rows.filter((x) => raidCount.get(x.symbol)).sort((a, b) => (raidCount.get(b.symbol) ?? 0) - (raidCount.get(a.symbol) ?? 0));
  if (chip === 'big') rows.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
  return (
    <div>
      <div className="flex gap-5 pt-3">
        {([['watch', 'Watchlist'], ['tokens', 'Tokens']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`text-[17px] font-semibold tracking-[-0.02em] ${tab === k ? 'text-ink' : 'text-faint'}`}>{l}</button>)}
      </div>
      <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0">
        {CHIPS.map(([k, l]) => <button key={k} onClick={() => setChip(k)} className={`h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium ${chip === k ? 'bg-ink text-bg' : 'bg-raised text-mute'}`}>{l}</button>)}
      </div>
      <ul className="mt-1 divide-y divide-line">
        {q.isLoading && [0, 1, 2, 3, 4].map((i) => <li key={i} className="py-3"><Skeleton className="h-11" /></li>)}
        {q.error && <li className="py-8 text-center text-[13.5px] text-mute">Prices are unavailable right now. <button onClick={() => q.refetch()} className="font-semibold text-ink">Retry</button></li>}
        {!q.isLoading && !rows.length && <li className="py-10 text-center text-[13.5px] text-mute">{tab === 'watch' ? 'Tap the star on any token to add it to your watchlist.' : 'No tokens match this filter yet.'}</li>}
        {rows.map((x) => {
          const coin = COINS.find((c) => c.symbol === x.symbol);
          const turnover = x.marketCap && x.volume24h ? Math.min(100, (x.volume24h / x.marketCap) * 100) : 0;
          const n = raidCount.get(x.symbol);
          return (
            <li key={x.symbol} className="flex items-center gap-3 py-3">
              <Link href={`/coin/${x.symbol}`} className="flex min-w-0 flex-1 items-center gap-3">
                <CoinAvatar symbol={x.symbol} image={x.image} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><span className="truncate text-[14.5px] font-semibold">{coin?.name ?? x.symbol}</span><span className="shrink-0 rounded-[5px] bg-raised px-1.5 py-px text-[10.5px] font-medium text-mute">{CHAINS[x.chain]?.label ?? x.chain}</span>{n ? <span className="shrink-0 rounded-[5px] bg-signal/12 px-1.5 py-px text-[10.5px] font-semibold text-lime">{n} raid{n > 1 ? 's' : ''}</span> : null}</span>
                  <span className="mt-0.5 block text-[12.5px] text-mute">{fmtUsd(x.volume24h)} vol · {fmtUsd(x.marketCap)} MC</span>
                  <span className="mt-1.5 flex items-center gap-2" title="24h volume as a share of market cap"><span className="h-1.5 w-24 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-up" style={{ width: `${Math.max(3, turnover * 4)}%` }} /></span><span className="mono text-[11px] text-mute">{turnover.toFixed(1)}% traded</span></span>
                </span>
                <span className="shrink-0 text-right"><span className="block mono text-[13.5px] font-semibold">{fmtPrice(x.priceUsd)}</span><Delta pct={x.change24h} className="text-[12px]" /></span>
              </Link>
              <button onClick={() => wl.toggle(x.symbol)} aria-label={wl.list.includes(x.symbol) ? 'Remove from watchlist' : 'Add to watchlist'} className="press -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full"><Star size={18} className={wl.list.includes(x.symbol) ? 'fill-[#ffb020] text-[#ffb020]' : 'text-faint'} /></button>
            </li>
          );
        })}
      </ul>
      <p className="py-3 text-[11.5px] text-faint">Live prices from DexScreener and CoinGecko. The green bar is 24h trading volume as a share of market cap.</p>
    </div>
  );
}
