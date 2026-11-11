'use client';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, ExternalLink, Share2, Swords, Vote, X } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Chip, CoinAvatar, ErrorState, Identicon, Skeleton } from '@/components/ui';
import { useNow, useRaids } from '@/lib/hooks';
import { CREWS, WAR, type Crew, type Proposal, daoTx, inWar, members, proposalTitle, raidCall, useDao, votesNeeded, warLeader, warScore, type WarScore } from '@/lib/crews';
import { countdown, shortName } from '@/lib/market';
import { COINS, coinByAsset, explorerAccount } from '@/lib/coins';
import { usdcOf, xLabel } from '@/lib/raid';
import { send, useAccount } from '@/lib/wallet';
import { toast } from '@/lib/bus';

export default function WarPage() {
  const raids = useRaids();
  const now = useNow();
  const [a, b] = CREWS.map((c) => warScore(c, raids.data ?? [], inWar)) as [WarScore, WarScore];
  const total = Math.max(1, a.firepower + b.firepower);
  const lead = warLeader(a, b);
  const over = now > WAR.end;
  return (
    <Shell title="Raid War">
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 md:px-4 md:py-2.5">
          <span className="flex items-center gap-1.5 eyebrow"><Swords size={12} />War #{WAR.id} · crew vs crew · 24 h</span>
          <Chip tone={over ? 'ghost' : 'lime'} live={!over}>{now ? (over ? 'Final' : `${countdown(WAR.end - now)} left`) : 'Live'}</Chip>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-3 md:px-5 md:pt-5">
          <CrewHead s={a} />
          <span className="wide-black text-[1.125rem] md:text-[34px] text-faint">VS</span>
          <CrewHead s={b} right />
        </div>
        <div className="px-3 pt-3 md:px-5 md:pt-4">
          <div className="flex h-[1.75rem] md:h-10 overflow-hidden rounded-[8px] md:rounded-[10px] bg-raised" role="meter" aria-label="Firepower share" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((a.firepower / total) * 100)}>
            <motion.div className="flex items-center pl-2 mono text-[11px] md:text-[13px] font-bold" style={{ background: a.crew.color, color: a.crew.ink }} initial={{ width: '50%' }} animate={{ width: `${(a.firepower / total) * 100}%` }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}>{Math.round((a.firepower / total) * 100)}%</motion.div>
            <motion.div className="flex flex-1 items-center justify-end pr-2 mono text-[11px] md:text-[13px] font-bold" style={{ background: b.crew.color, color: b.crew.ink }}>{Math.round((b.firepower / total) * 100)}%</motion.div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 md:gap-3">
            <ScoreBar s={a} max={Math.max(a.firepower, b.firepower, 1)} />
            <ScoreBar s={b} max={Math.max(a.firepower, b.firepower, 1)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 md:px-5 md:py-3">
          <p className="text-[12px] md:text-[13px] text-mute">{lead ? <><b className="text-ink">{lead.crew.name}</b> {over ? 'won' : 'leads'} on {lead.hits !== (lead === a ? b : a).hits ? 'hits' : 'firepower'}.</> : 'Dead even.'}</p>
          <div className="flex gap-1.5">
            <a href="/api/war/card" target="_blank" rel="noreferrer" className="press inline-flex h-[2.375rem] md:h-9 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-semibold hairline hover:bg-raised"><Share2 size={14} />Share card</a>
            <ShareX a={a} b={b} />
          </div>
        </div>
      </section>
      <p className="mt-2 text-[11.5px] md:text-[12px] text-faint leading-snug">Score = USDC backed on raids each crew DAO called during the war, times the realised multiple once a raid settles. More hits wins first; firepower breaks ties. Read live from <a className="underline" href={explorerAccount(CREWS[0]!.dao)} target="_blank" rel="noreferrer">the crew DAOs</a> and the chest on NEAR testnet.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[a, b].map((s) => <CrewPanel key={s.crew.key} crew={s.crew} score={s} />)}
      </div>
      {raids.error && <div className="mt-3"><ErrorState title="Can’t reach the war chest" retry={() => raids.refetch()} /></div>}
    </Shell>
  );
}

function CrewHead({ s, right }: { s: WarScore; right?: boolean }) {
  return (
    <div className={`min-w-0 ${right ? 'text-right' : ''}`}>
      <span className="inline-grid h-[1.875rem] w-[2.75rem] md:h-10 md:w-14 place-items-center rounded-[8px] wide text-[11px] md:text-[14px]" style={{ background: s.crew.color, color: s.crew.ink }}>{s.crew.tag}</span>
      <p className="wide mt-1.5 truncate text-[0.9375rem] md:text-[22px]">{s.crew.name}</p>
      <p className="mono mt-1 text-[10.5px] md:text-[12px] text-mute">{s.hits} hit · {s.raids.length} raid{s.raids.length === 1 ? '' : 's'}</p>
    </div>
  );
}
function ScoreBar({ s, max }: { s: WarScore; max: number }) {
  return (
    <div className="rounded-[10px] p-2 md:p-3 hairline">
      <p className="eyebrow truncate">{s.crew.tag} firepower</p>
      <p className="mono mt-1 text-[1.125rem] md:text-[22px] font-bold leading-none">{s.firepower.toFixed(0)}<span className="ml-1 text-[10px] text-mute">pts</span></p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised"><motion.div className="h-full rounded-full" style={{ background: s.crew.color }} initial={{ width: 0 }} animate={{ width: `${(s.firepower / max) * 100}%` }} transition={{ duration: 1.1 }} /></div>
      <p className="mono mt-1.5 text-[10px] md:text-[11px] text-faint">{s.backed.toFixed(0)} USDC backed · {s.live} live</p>
    </div>
  );
}
function ShareX({ a, b }: { a: WarScore; b: WarScore }) {
  const text = `Raid War #${WAR.id} on @NEARProtocol: ${a.crew.name} ${a.firepower.toFixed(0)} vs ${b.crew.name} ${b.firepower.toFixed(0)}. Crews are Sputnik DAOs; every raid is a DAO vote. #NEARHackathon`;
  return <a href={`https://x.com/intent/post?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="press inline-flex h-[2.375rem] md:h-9 items-center gap-1.5 rounded-[9px] bg-ink px-3 text-[12.5px] font-semibold text-bg">Post</a>;
}

function CrewPanel({ crew, score }: { crew: Crew; score: WarScore }) {
  const dao = useDao(crew.dao);
  const acct = useAccount();
  const crewMembers = members(dao.data?.policy);
  const isMember = !!acct && crewMembers.includes(acct);
  const need = votesNeeded(dao.data?.policy, crewMembers.length);
  const props = [...(dao.data?.proposals ?? [])].reverse();
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center gap-2.5 border-b border-line px-3 py-2.5 md:px-4 md:py-3">
        <span className="grid h-8 w-8 place-items-center rounded-[8px] wide text-[10px]" style={{ background: crew.color, color: crew.ink }}>{crew.tag}</span>
        <div className="min-w-0 flex-1">
          <p className="wide truncate text-[0.9375rem] md:text-[17px]">{crew.name}</p>
          <a href={explorerAccount(crew.dao)} target="_blank" rel="noreferrer" className="mono flex items-center gap-1 truncate text-[10.5px] text-mute hover:text-ink">Sputnik DAO · {shortName(crew.dao)}<ExternalLink size={10} /></a>
        </div>
        <Chip tone="ghost">{need}/{crewMembers.length || '–'} to pass</Chip>
      </header>
      <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 md:px-4">
        {crewMembers.map((m) => <Link key={m} href={`/u/${m}`} className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 hairline text-[11.5px]"><Identicon seed={m} size={18} className="!rounded-full" />{shortName(m)}</Link>)}
        {dao.isLoading && <Skeleton className="h-6 w-40" />}
      </div>
      {!!score.raids.length && (
        <div className="mt-2.5 border-t border-line">
          <p className="eyebrow px-3 pt-2.5 md:px-4">Raids the DAO called</p>
          {score.raids.map((r) => { const c = coinByAsset(r.target); return (
            <Link key={r.id} href={`/raids/${r.id}`} className="flex items-center gap-2.5 border-b border-line px-3 py-2 last:border-0 hover:bg-raised/50 md:px-4">
              <CoinAvatar symbol={c?.symbol ?? '?'} size={26} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{r.title}</span>
              <span className="mono text-[11.5px] text-mute">#{r.id} · {usdcOf(r.pot).toFixed(0)} USDC</span>
            </Link>
          ); })}
        </div>
      )}
      <div className="mt-2.5 border-t border-line">
        <p className="eyebrow px-3 pt-2.5 md:px-4"><Vote size={11} className="mr-1 inline" />Raid proposals</p>
        {props.map((p) => <ProposalRow key={p.id} p={p} crew={crew} need={need} canVote={isMember && p.status === 'InProgress' && !p.votes[acct!]} />)}
        {!dao.isLoading && !props.length && <p className="px-3 py-3 text-[12.5px] text-mute md:px-4">No proposals yet.</p>}
      </div>
      <ProposeRaid crew={crew} bond={dao.data?.policy.proposal_bond} />
    </section>
  );
}

function ProposalRow({ p, crew, need, canVote }: { p: Proposal; crew: Crew; need: number; canVote: boolean }) {
  const call = raidCall(p);
  const coin = call ? coinByAsset(call.target) : undefined;
  const yes = Object.values(p.votes).filter((v) => v === 'Approve').length;
  const no = Object.values(p.votes).filter((v) => v === 'Reject').length;
  const tone = p.status === 'Approved' ? 'lime' : p.status === 'InProgress' ? 'brand' : 'ghost';
  const vote = async (action: 'VoteApprove' | 'VoteReject') => {
    try { await send(daoTx.vote(crew.dao, p, action)); toast({ title: 'Vote sent', body: `${proposalTitle(p)} · ${crew.name}`, tone: 'lime' }); }
    catch (e) { if ((e as Error).message !== 'connect_wallet') toast({ title: 'Vote failed', body: (e as Error).message, tone: 'down' }); }
  };
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-0 md:px-4">
      {coin ? <CoinAvatar symbol={coin.symbol} size={30} /> : <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-raised mono text-[10px]">#{p.id}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{proposalTitle(p)}</p>
        <p className="mono mt-0.5 truncate text-[10.5px] text-mute">#{p.id} · {call ? `${xLabel(call.target_x_bps)} line` : 'proposal'} · {yes}/{need} yes{no ? ` · ${no} no` : ''}</p>
        <div className="mt-1.5 flex gap-[3px]">{Array.from({ length: Math.max(need, 1) }, (_, i) => <span key={i} className={`h-[5px] flex-1 rounded-full ${i < yes ? 'bg-lime' : 'bg-raised'}`} />)}</div>
      </div>
      {canVote ? (
        <div className="flex gap-1">
          <button onClick={() => void vote('VoteApprove')} aria-label="Vote yes" className="press grid h-[2.375rem] w-[2.375rem] md:h-9 md:w-9 place-items-center rounded-[9px] bg-lime text-[#0a1a00]"><Check size={16} strokeWidth={3} /></button>
          <button onClick={() => void vote('VoteReject')} aria-label="Vote no" className="press grid h-[2.375rem] w-[2.375rem] md:h-9 md:w-9 place-items-center rounded-[9px] hairline"><X size={16} /></button>
        </div>
      ) : <Chip tone={tone}>{p.status === 'InProgress' ? 'Voting' : p.status === 'Approved' ? 'Passed' : p.status}</Chip>}
    </div>
  );
}

function ProposeRaid({ crew, bond }: { crew: Crew; bond?: string }) {
  const [sym, setSym] = useState('PEPE');
  const [x, setX] = useState(20000);
  const coin = COINS.find((c) => c.symbol === sym)!;
  const go = async () => {
    try { await send(daoTx.proposeRaid(crew.dao, bond ?? '100000000000000000000000', { title: `Raid $${sym} to ${xLabel(x)}`, target: coin.assetId, target_x_bps: x })); toast({ title: 'Proposal sent', body: `${crew.name} votes next.`, tone: 'lime' }); }
    catch (e) { if ((e as Error).message !== 'connect_wallet') toast({ title: 'Proposal failed', body: (e as Error).message, tone: 'down' }); }
  };
  return (
    <div className="flex items-center gap-1.5 border-t border-line bg-raised/40 px-3 py-2.5 md:px-4">
      <select aria-label="Coin" value={sym} onChange={(e) => setSym(e.target.value)} className="h-[2.375rem] md:h-9 min-w-0 flex-1 rounded-[9px] bg-panel px-2 text-[12.5px] font-semibold hairline">{COINS.map((c) => <option key={c.symbol}>{c.symbol}</option>)}</select>
      <select aria-label="Line" value={x} onChange={(e) => setX(Number(e.target.value))} className="h-[2.375rem] md:h-9 w-[4.25rem] rounded-[9px] bg-panel px-2 text-[12.5px] font-semibold hairline">{[15000, 20000, 30000].map((v) => <option key={v} value={v}>{xLabel(v)}</option>)}</select>
      <button onClick={() => void go()} title="Anyone can propose; the crew votes. 0.1 NEAR testnet bond." className="press h-[2.375rem] md:h-9 shrink-0 rounded-[9px] bg-brand px-3 text-[12.5px] font-bold text-white">Propose</button>
    </div>
  );
}
