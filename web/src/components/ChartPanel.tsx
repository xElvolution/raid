'use client';
import { useState } from 'react';
import type React from 'react';
import { CandlestickChart, LineChart } from 'lucide-react';
import { CoinChart, type ChartLine } from './chart/CoinChart';
import { ErrorState, Segmented, Skeleton } from './ui';
import { useCandles } from '@/lib/market';

export function ChartPanel({ symbol, lines, height = 320 }: { symbol: string; lines?: ChartLine[]; height?: number }) {
  const [tf, setTf] = useState('1h');
  const [mode, setMode] = useState<'candles' | 'area'>('candles');
  const c = useCandles(symbol, tf);
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-2 md:px-3 md:py-2.5">
        <Segmented id={`tf-${symbol}`} value={tf} onChange={setTf} options={[{ value: '15m', label: '15m' }, { value: '1h', label: '1h' }, { value: '4h', label: '4h' }, { value: '1d', label: '1d' }]} />
        <div className="flex items-center gap-1">
          <button onClick={() => setMode('candles')} aria-label="Candles" aria-pressed={mode === 'candles'} className={`press grid h-8 w-8 place-items-center rounded-[8px] ${mode === 'candles' ? 'bg-raised text-ink' : 'text-mute'}`}><CandlestickChart size={16} /></button>
          <button onClick={() => setMode('area')} aria-label="Line" aria-pressed={mode === 'area'} className={`press grid h-8 w-8 place-items-center rounded-[8px] ${mode === 'area' ? 'bg-raised text-ink' : 'text-mute'}`}><LineChart size={16} /></button>
        </div>
      </div>
      {c.isLoading ? <div className="p-3"><Skeleton className="w-full" /><div className="shimmer h-[var(--chm)] md:h-[var(--ch)]" style={{ '--ch': `${height - 24}px`, '--chm': `${Math.round(height * 0.72) - 24}px` } as React.CSSProperties} /></div>
        : c.error ? <div className="p-3" style={{ minHeight: Math.round(height * 0.72) }}><ErrorState title="Chart data is rate-limited" body="GeckoTerminal allows a few calls a minute. Trying again shortly." retry={() => c.refetch()} /></div>
          : <CoinChart candles={c.data?.candles ?? []} mode={mode} lines={lines} height={height} />}
      <div className="flex items-center justify-between border-t border-line px-3 py-2 mono text-[10.5px] text-faint"><span>src · {c.data?.source ?? '…'} · deepest pool</span><span>USD</span></div>
    </section>
  );
}
