'use client';
import { CalledClient, LiveClient, type Market } from '@called/sdk';
import { useEffect, useMemo, useState } from 'react';

/** Shown only if the live API is unreachable (e.g. static hosting without the backend). */
export const FALLBACK: Market[] = [
  { id: 'f1', venue: 'polymarket', external_id: '', question: 'Will GTA VI release before the end of 2026?', price_yes: 0.88, volume: '0', volume_24h: '519000000000', status: 'open', outcome: null, close_ts: null, created_at: '' },
  { id: 'f2', venue: 'polymarket', external_id: '', question: 'Will Bayern win their Champions League match?', price_yes: 0.47, volume: '0', volume_24h: '691000000000', status: 'open', outcome: null, close_ts: null, created_at: '' },
  { id: 'f3', venue: 'called', external_id: '', question: 'Will Lagos record rainfall on 1 Nov?', price_yes: 0.62, volume: '0', volume_24h: '0', status: 'open', outcome: null, close_ts: null, created_at: '' },
];

export function useLiveMarkets(limit = 12): { markets: Market[]; live: boolean; odds: Record<string, number> } {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [live, setLive] = useState(false);
  const [odds, setOdds] = useState<Record<string, number>>({});
  const api = useMemo(() => (typeof window === 'undefined' ? null : new CalledClient({ baseUrl: window.location.origin, timeoutMs: 8000 })), []);
  useEffect(() => {
    if (!api) return;
    let stop = false;
    const load = async () => {
      try {
        const r = await api.markets({ venue: 'polymarket', sort: 'volume' });
        const ms = r.items.filter((m) => Number(m.price_yes) > 0.03 && Number(m.price_yes) < 0.97).slice(0, limit);
        if (!stop && ms.length) { setMarkets(ms); setLive(true); }
      } catch { if (!stop) setMarkets((m) => (m.length ? m : FALLBACK)); }
    };
    void load();
    const t = setInterval(load, 30_000);
    return () => { stop = true; clearInterval(t); };
  }, [api, limit]);
  useEffect(() => {
    if (!live || typeof window === 'undefined') return;
    const u = new URL('/v1/live', window.location.origin);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    const lc = new LiveClient({ url: u.toString() });
    const offs = markets.map((m) => lc.subscribe(`market:${m.id}`, (e) => { if (e.type === 'odds') setOdds((o) => ({ ...o, [m.id]: e.data.priceYes })); }));
    return () => { offs.forEach((f) => f()); lc.close(); };
  }, [live, markets]);
  return { markets, live, odds };
}

export const compactUsd = (base: string | number | undefined) => {
  const v = Number(base ?? 0) / 1e6;
  return v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`;
};
