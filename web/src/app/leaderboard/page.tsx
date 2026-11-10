'use client';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Shell } from '@/components/Shell';
import { Empty, ErrorState, Identicon, Skeleton } from '@/components/ui';
import { useRaids } from '@/lib/hooks';
import { callerStats } from '@/lib/callers';
import { shortAddr, shortName } from '@/lib/market';
import { openCall } from '@/lib/bus';

export default function LeaderboardPage() {
  const raids = useRaids();
  const rows = callerStats(raids.data ?? []);
  const podium = rows.slice(0, 3);
  return (
    <Shell title="Ranks">
      <section className="cobalt-field relative overflow-hidden rounded-[18px] p-5 md:p-7">
        <div className="dots absolute inset-0 opacity-50" />
        <div className="relative">
          <p className="eyebrow">Caller leaderboard · all time</p>
          <h2 className="wide-black mt-3 text-[36px] md:text-[54px] leading-[.86]">Hits pay.<br />Dumps don’t.</h2>
          <p className="mt-3 max-w-[44ch] text-[13.5px] text-white/75">Ranked by raids that hit the line, then by crew rallied. A caller only earns when their crew does.</p>
        </div>
      </section>

      {raids.isLoading && <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
      {raids.error && <div className="mt-4"><ErrorState title="Can’t reach the war chest" retry={() => raids.refetch()} /></div>}

      {!!podium.length && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {podium.map((p, i) => (
            <motion.div key={p.account} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Link href={`/u/${p.account}`} className={`lift block rounded-[16px] p-4 ${i === 0 ? 'bg-lime text-[#0a1a00]' : 'panel'}`}>
                <div className="flex items-center justify-between"><span className="wide-black text-[34px] leading-none">#{i + 1}</span><Identicon seed={p.account} size={40} /></div>
                <p className="mt-4 font-semibold truncate">{shortAddr(p.account)}</p>
                <p className={`mono mt-1 text-[12px] ${i === 0 ? 'text-[#0a1a00]/70' : 'text-mute'}`}>{p.hits} hit · {p.called} called · {p.rallied.toFixed(2)} USDC rallied</p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!!rows.length && (
        <div className="panel mt-4 overflow-hidden">
          <div className="grid grid-cols-[20px_minmax(0,1fr)_44px_34px_64px] gap-2 border-b border-line px-4 py-2.5 eyebrow"><span>#</span><span>Caller</span><span className="text-right">Called</span><span className="text-right">Hit</span><span className="text-right">Rallied</span></div>
          {rows.map((r, i) => (
            <Link key={r.account} href={`/u/${r.account}`} className="grid grid-cols-[20px_minmax(0,1fr)_44px_34px_64px] items-center gap-2 border-b border-line px-4 py-3 last:border-0 hover:bg-raised/50">
              <span className="mono text-[12px] text-mute">{i + 1}</span>
              <span className="flex min-w-0 items-center gap-2.5"><Identicon seed={r.account} size={28} className="!rounded-[7px]" /><span className="truncate text-[13.5px] font-semibold">{shortName(r.account)}</span></span>
              <span className="mono text-right text-[13px]">{r.called}</span>
              <span className="mono text-right text-[13px]">{r.hits}</span>
              <span className="mono text-right text-[13px]">{r.rallied.toFixed(2)}</span>
            </Link>
          ))}
        </div>
      )}
      {!raids.isLoading && !raids.error && rows.length < 4 && (
        <Empty title={rows.length ? 'The board is wide open' : 'No callers yet'} body={`${rows.length ? 'Only ' + rows.length + ' caller has' : 'Nobody has'} called a raid on this chest so far. Call one and take a podium spot.`} action={<button onClick={() => openCall()} className="press h-11 rounded-[11px] bg-lime px-5 font-bold text-[#0a1a00]">Call a raid</button>} />
      )}
    </Shell>
  );
}
