'use client';
import Link from 'next/link';
import { use } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { ChartPanel } from '@/components/ChartPanel';
import { RaidCard } from '@/components/RaidCard';
import { Button, CoinAvatar, Delta, Empty, Flash, Skeleton } from '@/components/ui';
import { CHAINS, coinBySymbol } from '@/lib/coins';
import { useQuote, fmtPrice, fmtUsd } from '@/lib/market';
import { useNow, useRaids } from '@/lib/hooks';
import { useQuery } from '@tanstack/react-query';
import { PostItem } from '@/components/app/Post';
import { posts } from '@/lib/social';
import { target } from '@/lib/raid';
import { openCall } from '@/lib/bus';

export default function CoinPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const coin = coinBySymbol(symbol);
  const q = useQuote(coin?.symbol);
  const raids = useRaids();
  const now = useNow();
  const feed = useQuery({ queryKey: ['coin-posts', symbol], queryFn: () => posts.feed('tokens'), staleTime: 30_000 });
  const tagged = (feed.data?.items ?? []).filter((p) => new RegExp(`\\$t?${symbol}\\b`, 'i').test(p.body)).slice(0, 8);
  if (!coin) return <Shell title="Coin" back="/raids"><Empty title="Not raidable (yet)" body="RAID lists coins that NEAR Intents can swap today." action={<Link href="/raids" className="font-semibold text-brand">Back to raids</Link>} /></Shell>;
  const mine = (raids.data ?? []).filter((r) => r.target === coin.assetId || target(r).symbol === `t${coin.symbol}`).reverse();
  return (
    <Shell title={`$${coin.symbol}`} back="/raids">
      <section className="flex items-center gap-3 md:gap-4">
        <CoinAvatar symbol={coin.symbol} image={q.data?.image} size={52} />
        <div className="min-w-0 flex-1"><h2 className="wide-black text-[1.5rem] leading-none md:text-[36px]">${coin.symbol}</h2><p className="mt-1 md:mt-1.5 text-[12px] md:text-[13px] text-mute">{coin.name} · {CHAINS[coin.chain].label}</p></div>
        <div className="text-right">{q.isLoading ? <Skeleton className="h-7 w-28" /> : <Flash value={q.data?.priceUsd}><p className="mono text-[1.25rem] md:text-[22px] font-bold">{fmtPrice(q.data?.priceUsd)}</p></Flash>}<Delta pct={q.data?.change24h} className="text-[12px]" /></div>
      </section>
      <div className="mt-3 md:mt-4 grid grid-cols-3 gap-1.5 md:gap-2">
        {[['Market cap', fmtUsd(q.data?.marketCap)], ['24h volume', fmtUsd(q.data?.volume24h)], ['Liquidity', fmtUsd(q.data?.liquidityUsd)]].map(([k, v]) => (
          <div key={k} className="panel min-w-0 p-2.5 md:p-3"><p className="eyebrow truncate">{k}</p><p className="mono mt-1.5 md:mt-2 text-[1rem] font-bold truncate">{v}</p></div>
        ))}
      </div>
      <div className="mt-3 md:mt-4"><ChartPanel symbol={coin.symbol} /></div>
      <div className="mt-3 md:mt-4 flex flex-wrap items-center gap-2">
        <Button tone="lime" size="lg" className="flex-1 min-w-[12.5rem]" onClick={() => openCall(coin.symbol)}>Call a raid on ${coin.symbol}</Button>
        {q.data?.url && <a href={q.data.url} target="_blank" rel="noreferrer" className="press inline-flex h-[2.875rem] md:h-[52px] items-center gap-1.5 rounded-[14px] md:rounded-[16px] px-4 md:px-5 text-[14px] font-semibold hairline">{q.data.source === 'coingecko' ? 'CoinGecko' : 'DexScreener'}<ArrowUpRight size={15} /></a>}
      </div>
      <h3 className="wide mt-5 md:mt-8 text-[0.9375rem]">Raids on ${coin.symbol}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{mine.map((r, i) => <RaidCard key={r.id} r={r} i={i} />)}</div>
      {!raids.isLoading && !mine.length && <p className="mt-2 text-[13.5px] text-mute">No raids on ${coin.symbol} yet.</p>}
      <h3 className="wide mt-6 text-[0.9375rem]">Posts about ${coin.symbol}</h3>
      <div className="mt-2">{tagged.map((p, i) => <PostItem key={p.id} p={p} i={i} now={now} />)}</div>
      {!feed.isLoading && !tagged.length && <p className="mt-2 text-[13.5px] text-mute">Nobody has posted about ${coin.symbol} yet.</p>}
      <div className="h-20 md:hidden" />
      <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 md:hidden">
        <div className="glass-strong flex gap-2 rounded-full p-1.5">
          <a href={q.data?.url ?? '#'} target="_blank" rel="noreferrer" className="press flex h-11 flex-1 items-center justify-center rounded-full bg-ink text-[14.5px] font-semibold text-bg">Buy</a>
          <button onClick={() => openCall(coin.symbol)} className="press flex h-11 flex-1 items-center justify-center rounded-full btn-signal text-[14.5px] font-semibold">Start raid</button>
        </div>
      </div>
    </Shell>
  );
}
