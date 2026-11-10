'use client';
import type { LeaderRow } from '@called/sdk';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, Flame, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Chip, Countdown, CutButton } from '@/components/bc';
import { haptic } from '@/lib/fx';
import { Shell } from '@/components/Shell';
import { Avatar, Empty, Skeleton } from '@/components/ui';
import { DIVISIONS } from '@/lib/gamification';
import { useSession } from '@/lib/session';
import { TLink as Link } from '@/lib/transition';

type Win = 'day' | 'week' | 'month' | 'all';
type Sort = 'pnl' | 'hit' | 'volume' | 'streak';
type Scope = 'global' | 'friends' | 'league' | 'private';
const WINS: [Win, string][] = [['day', 'Today'], ['week', 'This week'], ['month', 'This month'], ['all', 'All-time']];
const SORTS: [Sort, string][] = [['pnl', 'P&L'], ['hit', 'Hit rate'], ['volume', 'Volume'], ['streak', 'Streak']];
const SCOPES: [Scope, string][] = [['global', 'Global'], ['friends', 'Friends'], ['league', 'League']];

const money = (v: number, sign = true) => `${sign ? (v > 0 ? '+' : v < 0 ? '−' : '') : ''}$${Math.abs(v) >= 10000 ? `${(Math.abs(v) / 1000).toFixed(1)}k` : Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const tier = (name: string) => DIVISIONS.find((d) => d.name === name) ?? DIVISIONS[0]!;
const metric = (r: LeaderRow, s: Sort) => s === 'pnl' ? money(r.pnl) : s === 'volume' ? money(r.volume, false) : s === 'streak' ? `${r.streak}D` : r.hitRate === null ? '—' : `${Math.round(r.hitRate * 100)}%`;

export default function Leaderboard() {
  const { api, me } = useSession();
  const [win, setWin] = useState<Win>('week');
  const [sort, setSort] = useState<Sort>('pnl');
  const [scope, setScope] = useState<Scope>('global');
  const [code, setCode] = useState<string | undefined>();
  const [sheet, setSheet] = useState(false);
  const leagues = useQuery({ queryKey: ['leagues', !!me], queryFn: () => api.leagues(), enabled: !!me });
  const q = useQuery({ queryKey: ['lb2', win, sort, scope, code, !!me], queryFn: () => api.leaderboard2({ window: win, sort, scope, code: scope === 'private' ? code : undefined }), refetchInterval: 30_000 });
  const d = q.data, rows = d?.items ?? [], top = rows.slice(0, 3), rest = rows.slice(3);
  return (
    <Shell title="Table">
      {/* Reset clock and prize */}
      <div className="mx-4 mt-1 flex items-center gap-3 bg-grape px-3 py-2.5 text-white cuts">
        <Trophy size={22} />
        <div className="min-w-0 flex-1"><div className="cd text-[19px] leading-none">{d?.prize.label ?? 'Weekly top 3'}</div><div className="mt-0.5 truncate text-[12px] text-white/80">{d?.prize.detail ?? 'Gold card frame + 500 XP'}</div></div>
        <div className="text-right"><div className="mn text-[9px] text-white/70">RESETS IN</div>{d && <Countdown to={d.resetsAt} />}</div>
      </div>

      <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto px-4">{WINS.map(([k, l]) => <Chip key={k} on={win === k} onClick={() => setWin(k)}>{l}</Chip>)}</div>
      <div className="no-scrollbar mt-1.5 flex items-center gap-1 overflow-x-auto px-4">
        {SCOPES.map(([k, l]) => <Chip key={k} on={scope === k} onClick={() => setScope(k)} className={scope === k ? '!bg-grape !text-white' : ''}>{l}{k === 'league' && d?.league ? ` · ${d.league}` : ''}</Chip>)}
        {(leagues.data?.items ?? []).map((l) => <Chip key={l.code} on={scope === 'private' && code === l.code} onClick={() => { setScope('private'); setCode(l.code); }} className={scope === 'private' && code === l.code ? '!bg-grape !text-white' : ''}>{l.name}</Chip>)}
        {me && <Chip onClick={() => setSheet(true)} className="!bg-transparent border border-dashed border-line">+ League</Chip>}
      </div>
      {scope === 'private' && code && <p className="mn px-4 pt-1.5 text-[11px] text-mute">INVITE CODE <b className="text-ink">{code}</b> · SHARE IT WITH FRIENDS</p>}
      <AnimatePresence>{sheet && <LeagueSheet onClose={() => setSheet(false)} onDone={(c) => { setSheet(false); setScope('private'); setCode(c); void leagues.refetch(); }} />}</AnimatePresence>

      {q.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-52" />{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : !rows.length ? <Empty title={scope === 'friends' ? 'Follow callers to see them here' : 'No one on the table yet'} body="Make a call to get on the board." />
        : (<>
          <Podium rows={top} sort={sort} />
          <div className="sticky top-[58px] z-10 mt-1 grid grid-cols-4 border-y border-line bg-bg">
            {SORTS.map(([k, l]) => (
              <button key={k} onClick={() => setSort(k)} className={`relative h-10 cd text-[16px] ${sort === k ? 'text-ink' : 'text-mute'}`}>{l}{sort === k && <motion.i layoutId="lbsort" className="absolute inset-x-3 bottom-0 h-[3px] bg-grape" />}</button>
            ))}
          </div>
          <ol className="pb-20">
            <AnimatePresence initial={false}>
              {rest.map((r, i) => (
                <div key={r.id}>
                  {d?.zones && r.rank === d.zones.promote + 1 && <Zone tone="mint" label="▲ Promotion zone above" />}
                  {d?.zones?.relegate && r.rank === d.zones.relegate && <Zone tone="coral" label="▼ Relegation zone below" />}
                  <Row r={r} sort={sort} i={i} />
                </div>
              ))}
            </AnimatePresence>
          </ol>
          {d?.me && <MeBar r={d.me} sort={sort} total={d.total} />}
        </>)}
    </Shell>
  );
}

function Podium({ rows, sort }: { rows: LeaderRow[]; sort: Sort }) {
  const order = [rows[1], rows[0], rows[2]];
  const H = [92, 124, 74];
  return (
    <div className="mt-4 grid grid-cols-3 items-end gap-1.5 px-4">
      {order.map((r, k) => r ? (
        <Link key={r.id} href={`/u/${r.handle}`} className="flex flex-col items-center">
          <motion.div initial={{ y: 30, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.25 + [0.1, 0, 0.2][k]! }} className="relative flex flex-col items-center">
            {r.rank === 1 && <motion.span initial={{ y: -14, rotate: -20, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ delay: 0.7, type: 'spring', stiffness: 400, damping: 12 }} className="text-[#ffc83d]"><Crown size={26} fill="#ffc83d" /></motion.span>}
            <div className="rounded-full p-[3px]" style={{ background: r.rank === 1 ? '#ffc83d' : r.rank === 2 ? '#c9d1de' : '#d98b4a' }}><Avatar handle={r.handle} url={r.avatar_url} size={r.rank === 1 ? 76 : 60} /></div>
            <div className="mt-1 max-w-full truncate text-[13px] font-bold">{r.display_name.split(' ')[0]}</div>
            <div className={`cd text-[22px] leading-none ${sort === 'pnl' ? (r.pnl >= 0 ? 'text-mint' : 'text-coral') : ''}`}>{metric(r, sort)}</div>
          </motion.div>
          <motion.div initial={{ height: 0 }} animate={{ height: H[k] }} transition={{ type: 'spring', stiffness: 160, damping: 20, delay: [0.1, 0, 0.2][k] }}
            className={`cuts mt-1.5 grid w-full place-items-start justify-center overflow-hidden pt-1 ${r.rank === 1 ? 'bg-grape text-white' : 'bg-panel'}`}>
            <span className="cd text-[46px] leading-none">{r.rank}</span>
          </motion.div>
        </Link>
      ) : <div key={k} />)}
    </div>
  );
}

function Row({ r, sort, i }: { r: LeaderRow; sort: Sort; i: number }) {
  const t = tier(r.league);
  return (
    <motion.li layout initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.035, type: 'spring', stiffness: 380, damping: 32 }}>
      <Link href={`/u/${r.handle}`} className={`flex items-center gap-2.5 border-b border-line px-4 py-2.5 ${r.me ? 'bg-grape-light' : ''}`}>
        <div className="w-7 text-center"><div className="cd text-[22px] leading-none">{r.rank}</div><Change v={r.change} /></div>
        <Avatar handle={r.handle} url={r.avatar_url} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><span className="truncate text-[15px] font-bold">{r.display_name}</span><span className="bug shrink-0 !px-1 !text-[9px]" style={{ background: t.color, color: '#000' }}>{t.name}</span></div>
          <div className="mn mt-0.5 flex gap-2 text-[10px] text-mute">
            <span>{r.hitRate === null ? '—' : `${Math.round(r.hitRate * 100)}%`} HIT</span>
            <span className="flex items-center gap-0.5"><Flame size={10} className="text-[#ffb547]" />{r.streak}D</span>
            <span>{money(r.volume, false)} VOL</span>
          </div>
        </div>
        <div className={`cd text-[22px] ${sort === 'pnl' ? (r.pnl >= 0 ? 'text-mint' : 'text-coral') : ''}`}>{metric(r, sort)}</div>
      </Link>
    </motion.li>
  );
}

function Change({ v }: { v: number }) {
  if (!v) return <div className="mn text-[9px] text-mute">–</div>;
  return <div className={`mn text-[9px] font-bold ${v > 0 ? 'text-mint' : 'text-coral'}`}>{v > 0 ? '▲' : '▼'}{Math.abs(v)}</div>;
}

function Zone({ tone, label }: { tone: 'mint' | 'coral'; label: string }) {
  return <div className={`mn flex items-center gap-2 px-4 py-1 text-[10px] font-bold ${tone === 'mint' ? 'text-mint' : 'text-coral'}`}><i className={`h-[2px] flex-1 ${tone === 'mint' ? 'bg-mint' : 'bg-coral'}`} />{label.toUpperCase()}<i className={`h-[2px] flex-1 ${tone === 'mint' ? 'bg-mint' : 'bg-coral'}`} /></div>;
}

function MeBar({ r, sort, total }: { r: LeaderRow; sort: Sort; total: number }) {
  return (
    <motion.div initial={{ y: 80 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.5 }}
      className="fixed inset-x-0 bottom-[64px] z-20 mx-auto max-w-[600px] px-2 md:bottom-3">
      <Link href={`/u/${r.handle}`} className="cuts flex items-center gap-2.5 bg-ink px-3 py-2 text-bg">
        <div className="w-9 text-center"><div className="cd text-[24px] leading-none">#{r.rank}</div><Change v={r.change} /></div>
        <Avatar handle={r.handle} url={r.avatar_url} size={34} />
        <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-bold">You · {r.league}</div><div className="mn text-[10px] opacity-70">TOP {Math.max(1, Math.round((r.rank / Math.max(total, 1)) * 100))}% OF {total}</div></div>
        <div className={`cd text-[24px] ${sort === 'pnl' ? (r.pnl >= 0 ? 'text-mint' : 'text-coral') : ''}`}>{metric(r, sort)}</div>
      </Link>
    </motion.div>
  );
}

function LeagueSheet({ onClose, onDone }: { onClose: () => void; onDone: (code: string) => void }) {
  const { api } = useSession();
  const [name, setName] = useState('');
  const [join, setJoin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const run = async (fn: () => Promise<{ code: string }>) => { setErr(null); try { const r = await fn(); haptic('success'); onDone(r.code); } catch (e) { setErr(e instanceof Error && /404/.test(e.message) ? 'No league with that code.' : e instanceof Error && /409/.test(e.message) ? 'That league is full.' : 'Something went wrong. Try again.'); haptic('error'); } };
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-end bg-bg/70 backdrop-blur-sm md:items-center md:justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div className="w-full max-w-[480px] bg-panel p-4 pb-8 cuts" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
        <h2 className="cd text-[28px]">Leagues with friends</h2>
        <p className="text-[14px] text-mute">Start a private table and share the code, or join one.</p>
        <label className="mn mt-4 block text-[11px] text-mute">NEW LEAGUE</label>
        <div className="mt-1 flex gap-1.5"><input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Lagos Callers" className="h-12 flex-1 bg-bg px-3 text-[15px] outline-none focus:ring-2 focus:ring-grape" />
          <CutButton size="md" disabled={name.trim().length < 2} onClick={() => void run(() => api.createLeague(name.trim()))}>Create</CutButton></div>
        <label className="mn mt-4 block text-[11px] text-mute">JOIN WITH CODE</label>
        <div className="mt-1 flex gap-1.5"><input value={join} maxLength={6} onChange={(e) => setJoin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABC123" className="mn h-12 flex-1 bg-bg px-3 text-[18px] tracking-[.3em] outline-none focus:ring-2 focus:ring-grape" />
          <CutButton size="md" tone="ink" disabled={join.length !== 6} onClick={() => void run(() => api.joinLeague(join))}>Join</CutButton></div>
        {err && <p className="mt-3 text-[14px] text-coral">{err}</p>}
      </motion.div>
    </motion.div>
  );
}
