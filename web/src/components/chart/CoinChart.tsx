'use client';
/**
 * Memecoin chart (lightweight-charts v5): candles or area, volume, crosshair readout, and optional horizontal
 * lines for the raid's entry and sell line. Colours follow the theme tokens.
 */
import { AreaSeries, CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, LineStyle, createChart, type IChartApi, type UTCTimestamp } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import type { Candle } from '@/lib/coins';
import { fmtPrice } from '@/lib/market';

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const rgba = (hex: string, a: number) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

export interface ChartLine { price: number; label: string; tone: 'lime' | 'brand' | 'mute' }

export function CoinChart({ candles, mode = 'candles', lines = [], height = 300 }: { candles: Candle[]; mode?: 'candles' | 'area'; lines?: ChartLine[]; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ o: number; h: number; l: number; c: number; t: number } | null>(null);
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => { const f = () => setThemeTick((n) => n + 1); window.addEventListener('raid-theme', f); return () => window.removeEventListener('raid-theme', f); }, []);

  useEffect(() => {
    const el = box.current; if (!el || candles.length < 2) return;
    const P = { ink: css('--c-ink'), mute: css('--c-mute'), line: css('--c-line'), up: css('--c-up'), down: css('--c-down'), brand: css('--c-brand') };
    const c: IChartApi = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: P.mute, fontFamily: 'var(--font-jb), ui-monospace, monospace', fontSize: 10, attributionLogo: false },
      grid: { vertLines: { color: rgba(P.line, 0.5) }, horzLines: { color: rgba(P.line, 0.5) } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.22 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 3 },
      crosshair: { mode: CrosshairMode.Magnet, vertLine: { color: rgba(P.ink, 0.35), labelBackgroundColor: P.brand }, horzLine: { color: rgba(P.ink, 0.35), labelBackgroundColor: P.brand } },
      localization: { priceFormatter: (v: number) => fmtPrice(v).replace('$', '') },
      handleScroll: { vertTouchDrag: false },
    });
    const data = [...candles].sort((a, b) => a.t - b.t).filter((x, i, arr) => i === 0 || Math.floor(x.t / 1000) > Math.floor(arr[i - 1]!.t / 1000));
    const pf = { type: 'custom' as const, formatter: (v: number) => fmtPrice(v).replace('$', ''), minMove: 1e-12 };
    // Keep the raid's entry and sell line on screen even when they sit outside the visible candles.
    const autoscaleInfoProvider = (orig: () => { priceRange: { minValue: number; maxValue: number } } | null) => {
      const r = orig(); if (!r || !lines.length) return r;
      const ps = lines.map((l) => l.price);
      return { ...r, priceRange: { minValue: Math.min(r.priceRange.minValue, ...ps), maxValue: Math.max(r.priceRange.maxValue, ...ps) } };
    };
    const s = mode === 'candles'
      ? c.addSeries(CandlestickSeries, { upColor: P.up, downColor: P.down, borderVisible: false, wickUpColor: P.up, wickDownColor: P.down, priceFormat: pf, autoscaleInfoProvider })
      : c.addSeries(AreaSeries, { lineColor: P.brand, topColor: rgba(P.brand, 0.35), bottomColor: rgba(P.brand, 0), lineWidth: 2, priceFormat: pf, autoscaleInfoProvider });
    if (mode === 'candles') s.setData(data.map((p) => ({ time: Math.floor(p.t / 1000) as UTCTimestamp, open: p.o, high: p.h, low: p.l, close: p.c })));
    else s.setData(data.map((p) => ({ time: Math.floor(p.t / 1000) as UTCTimestamp, value: p.c })));
    if (data.some((d) => d.v > 0)) {
      const v = c.addSeries(HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
      c.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
      v.setData(data.map((p) => ({ time: Math.floor(p.t / 1000) as UTCTimestamp, value: p.v, color: rgba(p.c >= p.o ? P.up : P.down, 0.35) })));
    }
    for (const l of lines) s.createPriceLine({ price: l.price, color: l.tone === 'lime' ? '#c6ff3d' : l.tone === 'brand' ? P.brand : P.mute, lineWidth: l.tone === 'lime' ? 2 : 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: l.label, axisLabelColor: l.tone === 'lime' ? '#c6ff3d' : '', axisLabelTextColor: l.tone === 'lime' ? '#0a1a00' : '' });
    c.timeScale().fitContent();
    c.subscribeCrosshairMove((e) => {
      if (!e.time) return setTip(null);
      const d = e.seriesData.get(s) as { open?: number; high?: number; low?: number; close?: number; value?: number } | undefined;
      if (!d) return setTip(null);
      setTip({ o: d.open ?? d.value!, h: d.high ?? d.value!, l: d.low ?? d.value!, c: d.close ?? d.value!, t: Number(e.time) * 1000 });
    });
    return () => c.remove();
  }, [candles, mode, lines, themeTick]);

  const last = candles.length ? [...candles].sort((a, b) => a.t - b.t).at(-1)! : null;
  const show = tip ?? (last ? { ...last } : null);
  return (
    <div className="relative" style={{ height }}>
      {show && (
        <div className="pointer-events-none absolute left-3 top-2 z-10 flex flex-wrap gap-x-3 gap-y-0.5 mono text-[10.5px] text-mute">
          <span>O <b className="text-ink font-medium">{fmtPrice(show.o)}</b></span><span>H <b className="text-ink font-medium">{fmtPrice(show.h)}</b></span>
          <span>L <b className="text-ink font-medium">{fmtPrice(show.l)}</b></span><span>C <b className={show.c >= show.o ? 'text-up font-medium' : 'text-down font-medium'}>{fmtPrice(show.c)}</b></span>
        </div>
      )}
      <div ref={box} className="absolute inset-0" />
    </div>
  );
}
