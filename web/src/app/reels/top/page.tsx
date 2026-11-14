'use client';
import { Shell } from '@/components/Shell';
import { Empty, ErrorState, Identicon, Skeleton } from '@/components/ui';
import { useReelBoard } from '@/lib/reels';

export default function ReelBoardPage() {
  const q = useReelBoard();
  const rows = q.data?.items ?? [];
  return (
    <Shell title="Top reels" back="/reels">
      <p className="text-[12.5px] text-mute">Creators ranked by raids that hit with stake that came through their reels, then by USDC backed via their reels.</p>
      <p className="mt-1 mono text-[10.5px] text-faint">Reel creator share: 20% of the caller fee (0.5% of profit) on a hit · tracked by RAID, paid off-chain</p>
      {q.isLoading && <div className="mt-3 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
      {q.error && <div className="mt-3"><ErrorState title="Can’t reach the reels API" retry={() => q.refetch()} /></div>}
      {!!rows.length && (
        <div className="panel mt-3 overflow-hidden">
          <div className="grid grid-cols-[18px_minmax(0,1fr)_34px_40px_56px] gap-2 border-b border-line px-3 py-2 eyebrow"><span>#</span><span>Creator</span><span className="text-right">Hits</span><span className="text-right">Backs</span><span className="text-right">USDC</span></div>
          {rows.map((r, i) => (
            <div key={r.handle} className="grid grid-cols-[18px_minmax(0,1fr)_34px_40px_56px] items-center gap-2 border-b border-line px-3 py-2.5 last:border-0">
              <span className="mono text-[12px] text-mute">{i + 1}</span>
              <span className="flex min-w-0 items-center gap-2"><Identicon seed={r.handle} size={26} className="!rounded-[7px]" /><span className="min-w-0"><span className="block truncate text-[13px] font-semibold">@{r.handle}</span><span className="block mono text-[10px] text-mute">{r.reels} reel{r.reels === 1 ? '' : 's'} · earned {(r.earned_raw / 1e6).toFixed(2)}</span></span></span>
              <span className="mono text-right text-[13px]">{r.hits}</span>
              <span className="mono text-right text-[13px]">{r.backs}</span>
              <span className="mono text-right text-[13px]">{(r.backed_raw / 1e6).toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}
      {!q.isLoading && !q.error && !rows.length && <Empty title="No reel creators yet" body="Post a reel that links a raid. When backers come through it and the raid hits, you climb." />}
    </Shell>
  );
}
