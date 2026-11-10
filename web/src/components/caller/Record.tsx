'use client';
import type { CallerProfile } from '@called/sdk';
import { motion } from 'motion/react';
import { Flame } from 'lucide-react';
import { TLink as Link } from '@/lib/transition';
import { THEME_GLYPH } from './glyphs';

const THEME_MARK: Record<string, string> = { crypto: '₿', football: '⚽', f1: 'F1', boxing: '🥊', gta: 'GTA', music: '♪', movies: '🎬', tech: '⚙', weather: '☂', space: '🚀', arena: '★' };
const short = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}$${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(1)}k` : Math.abs(v).toFixed(0)}`;

/** CALL RECORD: summary (W–L, hit-rate ring, streaks, last-20 form) above a snapping strip of cut-corner call tiles. */
export function CallRecord({ record }: { record: CallerProfile['record'] }) {
  const w = record.filter((x) => x.won).length, l = record.length - w;
  let cur = 0; for (const r of record) { if (r.won) cur++; else break; }
  let best = 0, run = 0; for (const r of [...record].reverse()) { run = r.won ? run + 1 : 0; best = Math.max(best, run); }
  const hit = record.length ? w / record.length : 0;
  const form = [...record.slice(0, 20)].reverse();
  const maxAbs = Math.max(1, ...form.map((f) => Math.abs(f.pnl ?? (f.won ? 10 : 10))));
  return (
    <section className="pt-6">
      <div className="flex items-end justify-between px-4"><h2 className="cd text-[22px]">Call record</h2><span className="mn text-[11px] text-mute">LAST {record.length}</span></div>
      {record.length === 0 ? <p className="mt-2 px-4 text-[14px] text-mute">No settled calls yet. Results land here as markets resolve.</p> : (<>
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-4 mt-2 grid grid-cols-[auto_1fr] items-center gap-3 bg-panel p-3 cut-tr">
          <Ring v={hit} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <span className="cd text-[30px] leading-none"><span className="text-mint">{w}W</span><span className="text-mute">–</span><span className="text-coral">{l}L</span></span>
              <span className="mn flex items-center gap-1 text-[11px]"><Flame size={13} className="text-[#ffb547]" />{cur} NOW</span>
              <span className="mn text-[11px] text-mute">BEST {best}</span>
            </div>
            <div className="mt-2 flex h-7 items-center gap-[2px]" aria-label="Last 20 form">
              {form.map((f, i) => {
                const v = f.pnl ?? (f.won ? 6 : -6), h = Math.max(5, (Math.abs(v) / maxAbs) * 13);
                return <motion.i key={i} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.02 }}
                  className={`block w-full max-w-[8px] flex-1 ${f.won ? 'bg-mint self-end mb-[14px]' : 'bg-coral self-start mt-[14px]'}`} style={{ height: h, originY: f.won ? 1 : 0 }} />;
              })}
            </div>
          </div>
        </motion.div>
        <div className="no-scrollbar mt-2 flex snap-x snap-mandatory gap-1.5 overflow-x-auto scroll-px-4 px-4 pb-1">
          {record.map((c, i) => (
            <motion.div key={c.marketId + i} className="snap-start shrink-0" initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 6) * 0.04, type: 'spring', stiffness: 380, damping: 30 }}>
              <Link href={`/markets/${c.marketId}`} title={c.question} className={`press cuts relative flex h-[128px] w-[108px] flex-col justify-between overflow-hidden p-2 ${c.won ? 'bg-mint-light' : 'bg-panel'}`}>
                <div className="flex items-start justify-between">
                  <span className="cd grid h-7 min-w-7 place-items-center bg-ink px-1 text-[14px] text-bg">{THEME_MARK[c.theme ?? 'arena'] ?? '★'}</span>
                  <span className={`cd mr-2.5 px-1 text-[13px] text-[#000] ${c.outcome ? "bg-mint" : "bg-coral"}`}>{c.outcome ? 'YES' : 'NO'}</span>
                </div>
                <div><p className="line-clamp-2 text-[11px] leading-[1.2] text-ink/80">{c.question}</p><span className="mn text-[9px] text-mute">{new Date(c.settledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</span></div>
                <div className="flex items-end justify-between">
                  {c.won ? <span className="cd -rotate-6 border-2 border-mint px-1 text-[13px] leading-none text-mint">CALLED</span> : <span className="cd text-[13px] leading-none text-coral/80">MISS</span>}
                  <span className={`cd text-[18px] leading-none ${(c.pnl ?? 0) >= 0 ? 'text-mint' : 'text-coral'}`}>{c.pnl === null || c.pnl === undefined ? 'FREE' : short(c.pnl)}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </>)}
    </section>
  );
}

function Ring({ v }: { v: number }) {
  const r = 24, C = 2 * Math.PI * r;
  return (
    <div className="relative h-[60px] w-[60px]">
      <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--color-coral)" strokeOpacity=".35" strokeWidth="6" />
        <motion.circle cx="30" cy="30" r={r} fill="none" stroke="var(--color-mint)" strokeWidth="6" strokeDasharray={C} initial={{ strokeDashoffset: C }} whileInView={{ strokeDashoffset: C * (1 - v) }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.2, 0.9, 0.2, 1] }} />
      </svg>
      <span className="cd absolute inset-0 grid place-items-center text-[18px]">{Math.round(v * 100)}%</span>
    </div>
  );
}

/** BATTLE RECORD: themes fought, sides taken, wins per theme. */
export function BattleRecord({ battle }: { battle: CallerProfile['battle'] }) {
  const total = battle.reduce((s, b) => s + b.fought, 0);
  return (
    <section className="px-4 pt-6">
      <div className="flex items-end justify-between"><h2 className="cd text-[22px]">Battle record</h2><span className="mn text-[11px] text-mute">{total} BATTLES · {battle.length} ARENAS</span></div>
      {battle.length === 0 ? <p className="mt-2 text-[14px] text-mute">Pick a side on any market to join its battle.</p> : (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {battle.map((b) => {
            const G = THEME_GLYPH[b.theme] ?? THEME_GLYPH.arena;
            return (
              <div key={b.theme} className="cut-tr bg-panel p-2.5">
                <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center bg-grape text-white"><G size={18} strokeWidth={2} /></span><span className="cd text-[19px] uppercase">{b.theme === 'crypto' ? 'Bull v Bear' : b.theme}</span><span className="cd ml-auto text-[22px]">{b.fought}</span></div>
                <div className="mt-2 flex h-1.5"><i className="bg-mint" style={{ flex: b.yes || 0.001 }} /><i className="bg-coral" style={{ flex: b.no || 0.001 }} /></div>
                <div className="mn mt-1.5 flex justify-between text-[10px] text-mute"><span className="text-mint">YES {b.yes}</span><span>{b.settled ? `WON ${b.won}/${b.settled}` : 'LIVE'}</span><span className="text-coral">NO {b.no}</span></div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
