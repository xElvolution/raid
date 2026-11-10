'use client';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/Shell';
import { RaidCard } from '@/components/RaidCard';
import { raidApi, tokens, CHEST_ID } from '@/lib/raid';

export default function RaidsPage() {
  const raids = useQuery({ queryKey: ['raids'], queryFn: () => raidApi.list(0, 50), refetchInterval: 10_000 });
  const toks = useQuery({ queryKey: ['raid-tokens'], queryFn: tokens, staleTime: 60_000 });
  const list = [...(raids.data ?? [])].reverse();
  return (
    <Shell title="Raids" flush>
      <p className="px-4 py-3 text-[13px] text-mute border-b border-line">Live from the war chest <code className="text-ink">{CHEST_ID}</code>. A raid is a game: the crew picks a memecoin on any chain, the chest buys it through NEAR Intents and only sells at the caller&apos;s line. Not investment advice.</p>
      {raids.isLoading && [0, 1, 2].map((i) => <div key={i} className="mx-4 my-3 h-36 shimmer" />)}
      {raids.error && <p className="px-4 py-8 text-center text-[14px] text-mute">Could not reach the chest contract.</p>}
      {list.map((r) => <RaidCard key={r.id} r={r} tokens={toks.data ?? {}} />)}
      {!raids.isLoading && !raids.error && list.length === 0 && <p className="px-4 py-10 text-center text-[14px] text-mute">No raids yet. Call the first one.</p>}
    </Shell>
  );
}
