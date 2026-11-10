'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/Shell';
import { RaidCard } from '@/components/RaidCard';
import { raidApi, tokens, tokenLabel, fmtUnits, CHEST_ID } from '@/lib/raid';

export default function RaidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const raid = useQuery({ queryKey: ['raid', id], queryFn: () => raidApi.get(Number(id)), refetchInterval: 10_000 });
  const toks = useQuery({ queryKey: ['raid-tokens'], queryFn: tokens, staleTime: 60_000 });
  const r = raid.data;
  const t = r ? tokenLabel(r.target, toks.data ?? {}) : null;
  return (
    <Shell title={r ? r.title : 'Raid'} back="/raids" flush>
      {raid.isLoading && <div className="mx-4 my-3 h-36 shimmer" />}
      {r && t && (
        <>
          <RaidCard r={r} tokens={toks.data ?? {}} />
          <dl className="px-4 py-4 grid grid-cols-2 gap-y-2 text-[14px]">
            <dt className="text-mute">Entry cost</dt><dd className="text-right tabular-nums">{fmtUnits(r.entry_cost, 6)}</dd>
            <dt className="text-mute">Trophy held</dt><dd className="text-right tabular-nums">{fmtUnits(r.held, t.decimals)} {t.symbol}</dd>
            <dt className="text-mute">Proceeds</dt><dd className="text-right tabular-nums">{fmtUnits(r.proceeds, 6)}</dd>
            <dt className="text-mute">Retreat (forced sell) at</dt><dd className="text-right">{new Date(r.retreat_at_ms).toLocaleString()}</dd>
            {r.buy_quote_hash && (<><dt className="text-mute">Buy quote (1Click-signed)</dt><dd className="text-right font-mono text-[12px] truncate">{r.buy_quote_hash}</dd></>)}
          </dl>
          <p className="px-4 pb-6 text-[12px] text-mute">Chest: {CHEST_ID}. Every buy and sell is checked by the contract against a 1Click-signed quote before any funds move. On mainnet the chest account&apos;s own keys are removed, so only those rules can move its funds.</p>
        </>
      )}
    </Shell>
  );
}
