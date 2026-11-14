'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Empty, ErrorState, Segmented, Skeleton } from '@/components/ui';
import { Avatar } from '@/components/app/Avatar';
import { GetVerified, VerifiedBadge } from '@/components/app/Verified';
import { useRaids } from '@/lib/hooks';
import { seasonBoard, seasonLabel, seasonOf } from '@/lib/callers';
import { displayName, profileHref } from '@/lib/people';
import { useAccount } from '@/lib/wallet';

export default function LeaderboardPage() {
  const raids = useRaids();
  const acct = useAccount();
  const all = raids.data ?? [];
  const seasons = useMemo(() => [...new Set([seasonOf(Date.now()), ...all.map((r) => seasonOf(r.opens_until_ms))])].sort().reverse(), [all]);
  const [season, setSeason] = useState<string | null>(null);
  const cur = season ?? seasons[0]!;
  const [by, setBy] = useState<'callers' | 'crews'>('callers');
  const rows = seasonBoard(all, cur, by);
  return (
    <Shell title="Ranks">
      <header className="pt-2">
        <p className="flex items-center gap-2 text-[13px] font-medium text-mute"><Trophy size={15} className="text-lime" />Season · {seasonLabel(cur)}</p>
        <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.03em]">Who made the most</h2>
        <p className="mt-1 text-[13.5px] text-mute">Ranked by realised profit on settled raids, read from the chest contract.</p>
      </header>
      <div className="mt-3"><GetVerified account={acct} /></div>
      <div className="mt-4 flex items-center gap-2">
        <Segmented id="lb-by" value={by} onChange={(v) => setBy(v as 'callers' | 'crews')} options={[{ value: 'callers', label: 'Callers' }, { value: 'crews', label: 'Crews' }]} />
        {seasons.length > 1 && <div className="ml-auto flex gap-1.5 overflow-x-auto no-scrollbar">{seasons.map((s) => <button key={s} onClick={() => setSeason(s)} className={`h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold ${s === cur ? 'bg-ink text-bg' : 'bg-raised text-mute'}`}>{seasonLabel(s).split(' ')[0]}</button>)}</div>}
      </div>
      {raids.isLoading && <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
      {raids.error && <div className="mt-4"><ErrorState title="Can’t reach the war chest" retry={() => raids.refetch()} /></div>}
      {!!rows.length && (
        <div className="glass mt-3 overflow-hidden rounded-[20px]">
          {rows.map((r, i) => (
            <Link key={r.name} href={profileHref(r.key)} className="flex items-center gap-3 border-b border-line px-3.5 py-3 last:border-0">
              <span className={`w-6 text-center text-[14px] font-bold ${i < 3 ? 'text-lime' : 'text-faint'}`}>{i + 1}</span>
              <Avatar id={r.key} size={38} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1"><span className="truncate text-[14.5px] font-semibold">{by === 'crews' ? r.name : displayName(r.key)}</span>{by === 'callers' && <VerifiedBadge account={r.key} />}</span>
                <span className="block text-[12px] text-mute">{r.hits} hit of {r.settled} settled · {r.rallied.toFixed(0)} tUSDC pooled</span>
              </span>
              <span className={`mono text-right text-[14.5px] font-semibold ${r.profit > 0 ? 'text-up' : r.profit < 0 ? 'text-down' : 'text-mute'}`}>{r.profit > 0 ? '+' : ''}{r.profit.toFixed(2)}<span className="block text-[10.5px] font-normal text-faint">tUSDC</span></span>
            </Link>
          ))}
        </div>
      )}
      {!raids.isLoading && !raids.error && !rows.length && <Empty title={by === 'crews' ? 'No crew raids this season' : 'No raids this season yet'} body="Settled raids show up here with their real profit." />}
    </Shell>
  );
}
