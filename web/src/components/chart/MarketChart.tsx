'use client';
import type { ChartRange } from '@called/sdk';
import { useQuery } from '@tanstack/react-query';
import { CandlestickChart, LineChart } from 'lucide-react';
import { useState } from 'react';
import { useSession } from '@/lib/session';
import { Chip } from '../bc';
import { ProChart } from './ProChart';

export const RANGES: [ChartRange, string][] = [['1h', '1H'], ['1d', '1D'], ['1w', '1W'], ['1m', '1M'], ['all', 'ALL']];
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** Market Yes-price chart: ranges, line ⇄ candles, live ticks from the odds stream. */
export function MarketChart({ id, live }: { id: string; live: number }) {
  const { api } = useSession();
  const [range, setRange] = useState<ChartRange>('1w');
  const [mode, setMode] = useState<'line' | 'candles'>('line');
  const q = useQuery({ queryKey: ['phist', id, range], queryFn: () => api.priceHistory(id, range), staleTime: 15_000 });
  return (
    <div>
      {q.isLoading ? <div className="shimmer h-[220px]" /> : <ProChart points={q.data?.points ?? []} mode={mode} format={pct} live={live} />}
      <div className="mt-2 flex items-center gap-1">
        {RANGES.map(([k, l]) => <Chip key={k} on={range === k} onClick={() => setRange(k)}>{l}</Chip>)}
        <button aria-label={mode === 'line' ? 'Show candles' : 'Show line'} onClick={() => setMode(mode === 'line' ? 'candles' : 'line')} className="press ml-auto grid h-[30px] w-[38px] place-items-center bg-snow">
          {mode === 'line' ? <CandlestickChart size={17} /> : <LineChart size={17} />}
        </button>
      </div>
    </div>
  );
}
