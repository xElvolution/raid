'use client';
/**
 * Interactive trading-style chart (lightweight-charts v5): crosshair with floating value/time label on hover or
 * touch-drag, pinch / wheel zoom and drag pan, line ⇄ candles, live ticks via series.update, pulsing last-price dot,
 * haptic snap as the crosshair crosses data points, and theme-aware colours that follow html[data-theme].
 */
import {
  AreaSeries, BaselineSeries, CandlestickSeries, ColorType, CrosshairMode, LastPriceAnimationMode, LineStyle, createChart,
  type IChartApi, type ISeriesApi, type SeriesType, type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { haptic } from '@/lib/fx';

export type Ohlc = { t: number; o: number; h: number; l: number; c: number };
type Mode = 'line' | 'candles';

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function palette() {
  return { ink: css('--c-ink') || '#fff', mute: css('--c-mute') || '#8d8d96', line: css('--c-line') || '#1d1d22', panel: css('--c-panel') || '#0d0d10', mint: css('--c-mint') || '#1fd17a', coral: css('--c-coral') || '#ff4b5c', grape: '#7c5cff' };
}
const alpha = (hex: string, a: number) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

/** Strictly increasing seconds (the library rejects duplicates). */
function clean(points: Ohlc[]): Ohlc[] {
  const out: Ohlc[] = []; let last = -1;
  for (const p of points) { const s = Math.floor(p.t / 1000); if (s <= last) { const prev = out[out.length - 1]; if (prev) { prev.c = p.c; prev.h = Math.max(prev.h, p.h); prev.l = Math.min(prev.l, p.l); } continue; } out.push({ ...p, t: s }); last = s; }
  return out;
}

export function ProChart({ points, mode = 'line', baseline, format, live, height = 220, color }: {
  points: Ohlc[]; mode?: Mode;
  /** P&L "territory": green above, red below this value. */ baseline?: number;
  format: (v: number) => string;
  /** Latest live value; appended as a smooth tick. */ live?: number;
  height?: number; color?: 'grape' | 'mint';
}) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<SeriesType> | null>(null);
  const lastT = useRef(0);
  const [tip, setTip] = useState<{ x: number; y: number; v: string; t: string } | null>(null);

  useEffect(() => {
    const el = box.current; if (!el) return;
    const P = palette();
    const c = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: P.mute, fontFamily: 'var(--font-mono), ui-monospace, monospace', fontSize: 10, attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { color: alpha(P.mute.startsWith('#') ? P.mute : '#8d8d96', 0.12) } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 4, fixLeftEdge: true, lockVisibleTimeRangeOnResize: true },
      crosshair: { mode: CrosshairMode.MagnetOHLC, vertLine: { color: P.grape, width: 1, style: LineStyle.Solid, labelBackgroundColor: P.grape }, horzLine: { color: P.grape, style: LineStyle.Dashed, labelBackgroundColor: P.grape } },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      localization: { priceFormatter: format },
    });
    chart.current = c;
    const accent = color === 'mint' ? P.mint : P.grape;
    const s: ISeriesApi<SeriesType> = mode === 'candles'
      ? c.addSeries(CandlestickSeries, { upColor: P.mint, downColor: P.coral, borderVisible: false, wickUpColor: P.mint, wickDownColor: P.coral, priceFormat: { type: 'custom', formatter: format } })
      : baseline !== undefined
        ? c.addSeries(BaselineSeries, { baseValue: { type: 'price', price: baseline }, topLineColor: P.mint, topFillColor1: alpha(P.mint, 0.32), topFillColor2: alpha(P.mint, 0.02), bottomLineColor: P.coral, bottomFillColor1: alpha(P.coral, 0.02), bottomFillColor2: alpha(P.coral, 0.32), lineWidth: 2, lastPriceAnimation: LastPriceAnimationMode.Continuous, priceFormat: { type: 'custom', formatter: format } })
        : c.addSeries(AreaSeries, { lineColor: accent, topColor: alpha(accent, 0.28), bottomColor: alpha(accent, 0), lineWidth: 2, lastPriceAnimation: LastPriceAnimationMode.Continuous, priceFormat: { type: 'custom', formatter: format } });
    series.current = s;
    const data = clean(points);
    s.setData(mode === 'candles' ? data.map((p, i) => { const o = i ? data[i - 1]!.c : p.o; return { time: p.t as UTCTimestamp, open: o, high: Math.max(p.h, o), low: Math.min(p.l, o), close: p.c }; }) : data.map((p) => ({ time: p.t as UTCTimestamp, value: p.c })));
    lastT.current = data[data.length - 1]?.t ?? 0;
    c.timeScale().fitContent();

    let snap: unknown = null;
    c.subscribeCrosshairMove((e) => {
      if (!e.point || e.time === undefined) return setTip(null);
      const d = e.seriesData.get(s) as { value?: number; close?: number } | undefined;
      const v = d?.value ?? d?.close; if (v === undefined) return setTip(null);
      if (snap !== e.time) { snap = e.time; haptic('tick'); }
      const t = new Date(Number(e.time) * 1000).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      setTip({ x: e.point.x, y: e.point.y, v: format(v), t });
    });
    const onTheme = () => {
      const Q = palette();
      c.applyOptions({ layout: { textColor: Q.mute }, grid: { horzLines: { color: alpha('#8d8d96', 0.12) } } });
      if (mode === 'candles') s.applyOptions({ upColor: Q.mint, downColor: Q.coral, wickUpColor: Q.mint, wickDownColor: Q.coral });
      else if (baseline !== undefined) s.applyOptions({ topLineColor: Q.mint, bottomLineColor: Q.coral, topFillColor1: alpha(Q.mint, 0.32), bottomFillColor2: alpha(Q.coral, 0.32) });
    };
    window.addEventListener('called-theme', onTheme);
    return () => { window.removeEventListener('called-theme', onTheme); c.remove(); chart.current = null; series.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, mode, baseline, color]);

  // Live tick: update the last bar (same second) or append a new one; the library animates the pulse.
  useEffect(() => {
    const s = series.current; if (live === undefined || !s) return;
    const now = Math.max(Math.floor(Date.now() / 1000), lastT.current);
    lastT.current = now;
    try {
      if (mode === 'candles') s.update({ time: now as UTCTimestamp, open: live, high: live, low: live, close: live });
      else s.update({ time: now as UTCTimestamp, value: live });
    } catch { /* out-of-order tick, ignore */ }
  }, [live, mode]);

  return (
    <div className="relative select-none touch-pan-y" style={{ height }}>
      <div ref={box} className="absolute inset-0" />
      {tip && (
        <div className="pointer-events-none absolute z-10 bg-ink px-2 py-1 text-bg" style={{ left: Math.min(Math.max(tip.x - 50, 0), (box.current?.clientWidth ?? 300) - 110), top: Math.max(tip.y - 52, 0) }}>
          <div className="cd text-[20px] leading-none">{tip.v}</div><div className="mn text-[10px] opacity-70">{tip.t}</div>
        </div>
      )}
      {points.length < 2 && <div className="absolute inset-0 grid place-items-center text-[13px] text-mute">No data in this window yet.</div>}
    </div>
  );
}
