'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useId, useMemo, useState } from 'react';
import { useSession } from '@/lib/session';
import { Chip } from '../bc';
import { money } from './CallerCard';
import { ProChart } from '../chart/ProChart';

const RANGES = [['1h', '1H'], ['1d', '1D'], ['1w', '1W'], ['1m', '1M'], ['all', 'ALL']] as const;

/** P&L as territory: area above the deposit line is held ground (green), below is lost ground (red). */
export function Territory({ handle, pnl }: { handle: string; pnl: number }) {
  const { api } = useSession();
  const [range, setRange] = useState<(typeof RANGES)[number][0]>('1w');
  const q = useQuery({ queryKey: ['equity', handle, range], queryFn: () => api.equity(handle, range) });
  const id = useId().replace(/:/g, '');
  const W = 358, H = 150;
  const pts = q.data?.points ?? [];
  const base = q.data?.baseline ?? 1000;
  const ohlc = useMemo(() => (q.data?.points ?? []).map((p) => ({ t: p.t, o: p.v, h: p.v, l: p.v, c: p.v })), [q.data]);
  let path = '', area = '', by = H / 2;
  if (pts.length > 1) {
    const vs = pts.map((p) => p.v), lo = Math.min(base, ...vs), hi = Math.max(base, ...vs), pad = (hi - lo) * 0.12 || 10;
    const y = (v: number) => H - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * H;
    const t0 = pts[0]!.t, t1 = pts[pts.length - 1]!.t || t0 + 1;
    const xy = pts.map((p) => [((p.t - t0) / (t1 - t0 || 1)) * W, y(p.v)] as const);
    path = xy.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('');
    by = y(base);
    area = `${path}L${W},${by}L0,${by}Z`;
  }
  const first = pts[0]?.v ?? base, last = pts[pts.length - 1]?.v ?? base, delta = last - first;
  return (
    <section className="px-4 pt-6">
      <div className="flex items-end justify-between">
        <div><h2 className="cd text-[22px]">Territory</h2><div className="mn text-[11px] text-mute">P&L VS DEPOSIT LINE</div></div>
        <div className="text-right"><div className={`cd text-[40px] leading-none ${pnl >= 0 ? 'text-mint' : 'text-coral'}`}>{money(pnl, true)}</div><div className={`mn text-[11px] ${delta >= 0 ? 'text-mint' : 'text-coral'}`}>{money(delta, true)} THIS {RANGES.find((r) => r[0] === range)![1]}</div></div>
      </div>
      <div className="mt-2 bg-panel">
        {q.isLoading ? <div className="shimmer h-[200px]" /> : <ProChart height={200} points={ohlc} baseline={base} format={(v) => `$${v.toFixed(0)}`} />}
      </div>
      <div className="mt-2 flex gap-1">{RANGES.map(([k, l]) => <Chip key={k} on={range === k} onClick={() => setRange(k)}>{l}</Chip>)}</div>
    </section>
  );
}
