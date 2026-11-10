'use client';
/* eslint-disable @next/next/no-img-element -- remote venue art */
import type { Market } from '@called/sdk';
import { AnimatePresence, motion } from 'motion/react';
import { TLink as Link } from '@/lib/transition';
import { Battle } from './battle/Battle';
import { useRouter } from 'next/navigation';
import { timeLeft, usd } from '@/lib/format';
import { useLiveOdds } from '@/lib/live-hooks';
import { useMyCalls, usePredict } from '@/lib/predict';
import { useSession } from '@/lib/session';
import { IconCheck } from './icons';
import { Avatar } from './ui';
import { Bug, LiveBug } from './bc';

/** Two-sided odds bar used on detail pages. */
export function OutcomeBar({ label, p, tone, flash }: { label: string; p: number; tone: 'mint' | 'coral'; flash: 'up' | 'down' | null }) {
  const c = tone === 'mint' ? 'var(--color-mint)' : 'var(--color-coral)';
  return (
    <div className="flex items-center gap-3 h-8">
      <span className="w-20 truncate text-[14px] text-ink/90">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-snow overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: c }} animate={{ width: `${Math.max(1, p * 100)}%` }} transition={{ type: 'spring', stiffness: 90, damping: 18 }} />
      </div>
      <motion.span key={Math.round(p * 1000)} initial={flash ? { opacity: 0.4 } : false} animate={{ opacity: 1 }} className="w-11 text-right text-[14px] font-semibold tabular-nums" style={{ color: c }}>{Math.round(p * 100)}%</motion.span>
    </div>
  );
}

function Delta({ spark, p }: { spark?: number[] | null; p: number }) {
  if (!spark || spark.length < 2) return null;
  const d = Math.round((p - (spark[0] ?? p)) * 100);
  if (d === 0) return <span className="text-[12px] text-mute tabular-nums">0</span>;
  return <span className={`text-[12px] tabular-nums ${d > 0 ? 'text-mint' : 'text-coral'}`}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}</span>;
}

/** Market embed. Reads like a poll or link preview: quiet border, flat outcome rows, one meta line. Tap a row to make a free call. */
export function MarketCard({ m, by, index = 0, embedded }: { m: Market; by?: { handle: string; display_name: string; avatar_url: string | null }; index?: number; embedded?: boolean }) {
  const { me } = useSession();
  const router = useRouter();
  const { p, dir } = useLiveOdds(m.id, Number(m.price_yes));
  const calls = useMyCalls();
  const predict = usePredict();
  const mine = calls.data?.get(String(m.id));
  const external = m.venue !== 'called';
  const labels: [string, string] = external && m.outcomes ? [m.outcomes[0], m.outcomes[1]] : ['Yes', 'No'];
  const href = external ? `/external/${m.id}` : `/markets/${m.id}`;
  const spark = m.spark && m.spark.length > 1 ? [...m.spark.slice(0, -1), p] : null;
  const open = m.status === 'open';
  const quick = (outcome: 0 | 1, e: React.MouseEvent) => {
    e.preventDefault();
    if (!me) return router.push('/signin');
    if (mine !== undefined || !open) return router.push(href);
    predict.mutate({ marketId: String(m.id), outcome, origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight } });
  };
  const rows = ([1, 0] as const).map((o) => ({ o, label: labels[o ? 0 : 1], v: o ? p : 1 - p }));
  const card = (
    <div className={`cut bg-panel ${embedded ? 'mt-3' : ''}`}>
      <Link href={href} className="block"><Battle marketId={String(m.id)} p={p} category={m.category} question={m.question} image={m.image_url} mini
        tag={<><LiveBug />{mine !== undefined && <Bug tone={mine ? 'mint' : 'coral'}>You · {labels[mine ? 0 : 1]}</Bug>}</>} /></Link>
      <Link href={href} className="block px-3 pt-3">
        <h3 className="text-[16px] leading-[1.3] font-bold line-clamp-3" style={{ viewTransitionName: `q-${m.id}` }}>{m.question}</h3>
      </Link>
      <div className="grid grid-cols-2 gap-1.5 p-3">
        {rows.map(({ o, label, v }) => {
          const picked = mine === o;
          return (
            <motion.button key={o} whileTap={{ scale: 0.96, y: 1 }} onClick={(e) => quick(o, e)} disabled={predict.isPending} aria-label={`Call ${label}`} aria-pressed={picked}
              className={`relative h-11 overflow-hidden ${o ? 'cuts' : 'cut-tr'} ${picked ? (o ? 'bg-mint' : 'bg-coral') : (o ? 'bg-mint-light' : 'bg-coral-light')}`}>
              <motion.span className={`absolute inset-y-0 left-0 ${o ? 'bg-mint' : 'bg-coral'}`} initial={false}
                animate={{ width: picked ? '100%' : `${Math.max(2, v * 100)}%`, opacity: picked ? 1 : 0.22 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} />
              <span className={`relative flex h-full items-center justify-between px-3 ${picked ? 'text-[#000]' : o ? 'text-mint' : 'text-coral'}`}>
                <span className="cd flex items-center gap-1 text-[20px] truncate">{picked && <IconCheck size={15} />}{label}</span>
                <motion.span key={Math.round(v * 100)} initial={dir ? { y: dir === 'up' ? 6 : -6, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="cd text-[24px] tabular-nums">{Math.round(v * 100)}%</motion.span>
              </span>
            </motion.button>
          );
        })}
      </div>
      <div className="mn flex items-center gap-2 border-t border-line px-3 h-9 text-[11px] text-mute uppercase tracking-[.06em]">
        {Number(m.volume) > 0 && <span>{usd(external ? m.volume_24h ?? m.volume : m.volume)} vol</span>}<span>{m.status === 'final' ? 'Final' : timeLeft(m.close_ts)}</span>
        <Delta spark={spark} p={p} />
        <span className="ml-auto truncate">{external ? 'Polymarket' : mine !== undefined ? 'Called' : 'Tap to call'}</span>
      </div>
    </div>
  );
  if (embedded) return card;
  return (
    <motion.article initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.25, delay: Math.min(index, 4) * 0.02 }}
      className="px-4 py-3 border-b border-line">
      <div className="flex gap-3">
        {by ? <Avatar handle={by.handle} url={by.avatar_url} size={40} /> : <span className="h-10 w-10 bg-snow border border-line grid place-items-center shrink-0 text-mute"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M4 19V5M4 19h16M8 15l3-3 3 2 5-6" /></svg></span>}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] leading-5"><span className="font-semibold">{external ? 'Polymarket' : by?.display_name ?? 'Market'}</span><span className="text-mute"> · {external ? 'live odds' : 'new market'}</span></div>
          {card}
        </div>
      </div>
    </motion.article>
  );
}
