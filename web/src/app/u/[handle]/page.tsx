'use client';
/** Profile: who someone is, and what they did on the chest. Every number is computed from chest views (list_raids, get_backers, get_claimable). */
import Link from 'next/link';
import { use, useState } from 'react';
import { motion } from 'motion/react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Settings } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Button, Empty } from '@/components/ui';
import { Mark } from '@/components/Brand';
import { Avatar, TestnetChip } from '@/components/app/Avatar';
import { Ring, raidClock } from '@/components/app/Radar';
import { Tabs } from '@/components/app/Tabs';
import { Feed, useSocialAuth } from '@/components/Social';
import { useNow, useRaids } from '@/lib/hooks';
import { explorerAccount } from '@/lib/coins';
import { social } from '@/lib/social';
import { toast } from '@/lib/bus';
import { CHEST_ID, NETWORK, raidApi, target, usdcOf, xLabel, type Raid } from '@/lib/raid';
import { displayName, personByAccount, resolveAccount } from '@/lib/people';
import { connect, useAccount } from '@/lib/wallet';

async function claimable(account: string): Promise<string> {
  const rpc = NETWORK === 'mainnet' ? 'https://rpc.mainnet.fastnear.com' : 'https://rpc.testnet.fastnear.com';
  const r = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'call_function', finality: 'optimistic', account_id: CHEST_ID, method_name: 'get_claimable', args_base64: btoa(JSON.stringify({ account_id: account })) } }) });
  const j = await r.json(); return JSON.parse(new TextDecoder().decode(new Uint8Array(j.result.result)));
}

interface Pos { r: Raid; stake: number; payout: number | null; pnl: number | null }

/** Positions and realised PnL from the chest: share of a closed raid = stake / pot x for_backers. */
function usePortfolio(account: string | null, raids: Raid[]) {
  const qs = useQueries({ queries: raids.map((r) => ({ queryKey: ['backers', r.id], queryFn: () => raidApi.backers(r.id), staleTime: 15_000 })) });
  const ready = qs.length > 0 && qs.every((q) => !q.isLoading);
  const pos: Pos[] = [];
  raids.forEach((r, i) => {
    const row = qs[i]?.data?.find(([a]) => a === account);
    if (!row) return;
    const stake = usdcOf(row[1]);
    const pot = usdcOf(r.pot);
    const payout = r.status === 'Closed' && pot > 0 ? (stake / pot) * usdcOf(r.for_backers ?? '0') : null;
    pos.push({ r, stake, payout, pnl: payout === null ? null : payout - stake });
  });
  return { pos, ready };
}

export default function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = use(params);
  const me = useAccount();
  const account = raw === 'me' ? me : resolveAccount(decodeURIComponent(raw));
  const person = personByAccount(account);
  const raids = useRaids();
  const now = useNow();
  const all = raids.data ?? [];
  const { pos, ready } = usePortfolio(account, all);
  const fees = useQuery({ queryKey: ['claimable', account], enabled: !!account, queryFn: () => claimable(account!) });
  const [tab, setTab] = useState<'posts' | 'called' | 'backed' | 'pnl'>(person ? 'posts' : 'called');

  if (!account) return (
    <Shell title="You">
      <Empty art={<Mark size={48} />} title="Your profile" body="Connect a NEAR wallet to see the raids you called and backed, your positions and your PnL." action={<Button tone="lime" size="lg" onClick={() => void connect()}>Connect NEAR wallet</Button>} />
    </Shell>
  );

  const called = all.filter((r) => r.caller === account).reverse();
  const settledCalls = called.filter((r) => r.status === 'Closed');
  const wins = settledCalls.filter((r) => r.hit).length;
  const callerEarned = settledCalls.reduce((s, r) => s + (r.hit ? usdcOf(r.caller_cut ?? '0') : 0), 0);
  const realised = pos.reduce((s, p) => s + (p.pnl ?? 0), 0) + callerEarned;
  const open = pos.filter((p) => p.payout === null);
  const atWork = open.reduce((s, p) => s + p.stake, 0);
  const closed = pos.filter((p) => p.pnl !== null).sort((a, b) => a.r.id - b.r.id);

  return (
    <Shell title={person?.name ?? displayName(account)} back="/feed" actions={me === account ? <Link href="/settings" aria-label="Settings" className="press grid h-9 w-9 place-items-center rounded-full text-mute hover:bg-raised"><Settings size={18} /></Link> : undefined}>
      <section className="relative -mx-4 md:mx-0">
        <div className="h-28 md:h-36 md:rounded-[28px]" style={{ background: person ? `radial-gradient(140% 120% at 10% 0%, hsl(${person.hue} 80% 72% / .55), transparent 60%), radial-gradient(120% 120% at 100% 100%, hsl(${(person.hue + 40) % 360} 70% 50% / .35), transparent 60%), var(--color-raised)` : 'var(--color-raised)' }} />
        <div className="px-4 md:px-0">
          <div className="-mt-11 flex items-end justify-between">
            <span className="rounded-full bg-bg p-1"><Avatar id={account} size={72} /></span>
            {person && me !== account && <FollowButton handle={person.handle} />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.04em]">{person?.name ?? displayName(account)}</h1>
            {person && <TestnetChip />}
          </div>
          <a href={explorerAccount(account, NETWORK)} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-1 text-[13.5px] text-mute hover:text-ink">
            <span className="truncate">{person ? `@${person.handle} · ` : ''}{account}</span><ArrowUpRight size={14} className="shrink-0" />
          </a>
          {person && <p className="mt-3 text-[14.5px] leading-relaxed">{person.bio}</p>}
          {person && <p className="mt-2 text-[13.5px] text-mute">Rides with <b className="font-semibold text-ink">{person.crew}</b></p>}
          <div className="mt-5 grid grid-cols-4 gap-2">
            <Big k="Realised" v={ready ? `${realised >= 0 ? '+' : ''}${realised.toFixed(1)}` : '…'} tone={realised > 0 ? 'text-up' : realised < 0 ? 'text-down' : ''} />
            <Big k="In play" v={ready ? atWork.toFixed(0) : '…'} />
            <Big k="Called" v={`${wins}/${settledCalls.length}`} sub="won" />
            <Big k="Backed" v={ready ? String(pos.length) : '…'} />
          </div>
          <p className="mt-3 text-[12.5px] text-faint">tUSDC on the NEAR testnet. Read from the chest just now{fees.data !== undefined && Number(fees.data) > 0 ? ` · ${usdcOf(fees.data).toFixed(2)} claimable` : ''}.</p>
        </div>
      </section>

      <div className="sticky top-12 z-30 -mx-4 mt-5 bg-bg/85 px-4 backdrop-blur-xl md:top-16 md:mx-0 md:px-0">
        <Tabs id="profile" value={tab} onChange={setTab} items={[{ key: 'posts', label: 'Posts' }, { key: 'called', label: 'Called', count: called.length }, { key: 'backed', label: 'Backed', count: pos.length }, { key: 'pnl', label: 'PnL' }]} />
      </div>

      {tab === 'posts' && (person
        ? <Feed author={person.handle} emptyTitle="No posts yet" emptyBody="Nothing posted from this account so far." />
        : <Empty title="No posts linked" body="Posts show here once this wallet signs in to the RAID feed." />)}

      {tab === 'called' && (
        <ul className="divide-y divide-line">
          {called.map((r) => <RaidRow key={r.id} r={r} now={now} right={r.status === 'Closed' ? (r.hit ? 'Won' : 'Lost') : raidClock(r, now)} tone={r.status === 'Closed' ? (r.hit ? 'text-up' : 'text-down') : 'text-ink'} sub={r.status === 'Closed' && r.hit ? `+${usdcOf(r.caller_cut ?? '0').toFixed(2)} fee` : `${usdcOf(r.pot).toFixed(0)} pot`} />)}
          {!raids.isLoading && !called.length && <Empty title="No calls yet" body="This account hasn’t called a raid." />}
        </ul>
      )}

      {tab === 'backed' && (
        <>
          {open.length > 0 && <h3 className="pt-5 text-[12.5px] font-semibold uppercase tracking-[.08em] text-mute">Open positions</h3>}
          <ul className="divide-y divide-line">{open.map((p) => <RaidRow key={p.r.id} r={p.r} now={now} right={`${p.stake.toFixed(0)}`} sub={p.r.status === 'Open' ? 'staked, crew open' : 'staked, held'} />)}</ul>
          {closed.length > 0 && <h3 className="pt-5 text-[12.5px] font-semibold uppercase tracking-[.08em] text-mute">Settled</h3>}
          <ul className="divide-y divide-line">{[...closed].reverse().map((p) => <RaidRow key={p.r.id} r={p.r} now={now} right={`${p.pnl! >= 0 ? '+' : ''}${p.pnl!.toFixed(2)}`} tone={p.pnl! >= 0 ? 'text-up' : 'text-down'} sub={`${p.stake.toFixed(0)} in, ${p.payout!.toFixed(2)} out`} />)}</ul>
          {ready && !pos.length && <Empty title="No backs yet" body="This account hasn’t backed a raid." />}
        </>
      )}

      {tab === 'pnl' && <PnlChart closed={closed} callerEarned={settledCalls.filter((r) => r.hit).map((r) => ({ id: r.id, v: usdcOf(r.caller_cut ?? '0') }))} />}
    </Shell>
  );
}

function Big({ k, v, sub, tone = '' }: { k: string; v: string; sub?: string; tone?: string }) {
  return <div className="min-w-0"><p className={`mono truncate text-[16px] font-semibold tracking-[-0.03em] ${tone}`}>{v}</p><p className="truncate text-[12.5px] text-mute">{k}{sub ? ` ${sub}` : ''}</p></div>;
}

function RaidRow({ r, now, right, sub, tone = 'text-ink' }: { r: Raid; now: number; right: string; sub: string; tone?: string }) {
  return (
    <li><Link href={`/raids/${r.id}`} className="flex items-center gap-3.5 py-3">
      <Ring r={r} now={now} size={52} />
      <span className="min-w-0 flex-1"><span className="block truncate text-[14.5px] font-semibold">${target(r).symbol} to {xLabel(r.target_x_bps)} <span className="font-normal text-faint">#{r.id}</span></span><span className="block truncate text-[12.5px] text-mute">{r.title}</span></span>
      <span className="text-right"><span className={`block mono text-[14px] font-semibold ${tone}`}>{right}</span><span className="block text-[12px] text-faint">{sub}</span></span>
    </Link></li>
  );
}

function PnlChart({ closed, callerEarned }: { closed: Pos[]; callerEarned: { id: number; v: number }[] }) {
  const ev = [...closed.map((p) => ({ id: p.r.id, v: p.pnl!, k: 'Backed' })), ...callerEarned.map((c) => ({ ...c, k: 'Caller fee' }))].sort((a, b) => a.id - b.id);
  if (!ev.length) return <Empty title="No settled raids yet" body="PnL appears once a raid this account is in settles on the chest." />;
  const pts = ev.reduce((a, e, i) => [...a, { x: i + 1, y: a[a.length - 1]!.y + e.v }], [{ x: 0, y: 0 }]);
  const run = pts[pts.length - 1]!.y;
  const W = 600, H = 180, min = Math.min(0, ...pts.map((p) => p.y)), max = Math.max(0.01, ...pts.map((p) => p.y));
  const X = (x: number) => (x / (pts.length - 1)) * W, Y = (y: number) => H - 10 - ((y - min) / (max - min)) * (H - 20);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  return (
    <section className="pt-5">
      <p className="text-[12.5px] text-mute">Cumulative realised PnL</p>
      <p className={`mono text-[24px] font-semibold tracking-[-0.04em] ${run >= 0 ? 'text-up' : 'text-down'}`}>{run >= 0 ? '+' : ''}{run.toFixed(2)} <span className="text-[13px] font-normal text-mute">tUSDC</span></p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-[180px] w-full overflow-visible" preserveAspectRatio="none" aria-label="PnL over settled raids">
        <line x1="0" x2={W} y1={Y(0)} y2={Y(0)} stroke="var(--color-line)" strokeDasharray="4 4" />
        <motion.path d={d} fill="none" stroke="var(--color-signal)" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1 }} />
      </svg>
      <ul className="mt-4 divide-y divide-line">
        {[...ev].reverse().map((e, i) => <li key={i} className="flex items-center justify-between py-3 text-[14px]"><Link href={`/raids/${e.id}`} className="hover:underline">Raid #{e.id} <span className="text-mute">· {e.k}</span></Link><span className={`mono font-semibold ${e.v >= 0 ? 'text-up' : 'text-down'}`}>{e.v >= 0 ? '+' : ''}{e.v.toFixed(2)}</span></li>)}
      </ul>
    </section>
  );
}

function FollowButton({ handle }: { handle: string }) {
  const { ensure } = useSocialAuth();
  const [on, setOn] = useState(false);
  return (
    <button onClick={async () => { if (!(await ensure())) return; try { await social.follow(handle, !on); setOn(!on); } catch (e) { toast({ title: 'Follow failed', body: (e as Error).message, tone: 'down' }); } }}
      className={`press h-10 rounded-full px-5 text-[14px] font-semibold ${on ? 'hairline text-ink' : 'bg-ink text-bg'}`}>{on ? 'Following' : 'Follow'}</button>
  );
}
