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
import { useRaids } from '@/lib/hooks';
import { openCall } from '@/lib/bus';

export default function CoinPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const coin = coinBySymbol(symbol);
  const q = useQuote(coin?.symbol);
  const raids = useRaids();
  if (!coin) return <Shell title="Coin" back="/raids"><Empty title="Not raidable (yet)" body="RAID lists coins that NEAR Intents can swap today." action={<Link href="/raids" className="font-semibold text-brand">Back to raids</Link>} /></Shell>;
  const mine = (raids.data ?? []).filter((r) => r.target === coin.assetId).reverse();
  return (
    <Shell title={`$${coin.symbol}`} back="/raids">
      <section className="flex items-center gap-4">
        <CoinAvatar symbol={coin.symbol} image={q.data?.image} size={56} />
        <div className="min-w-0 flex-1"><h2 className="wide-black text-[36px] leading-none">${coin.symbol}</h2><p className="mt-1.5 text-[13px] text-mute">{coin.name} · {CHAINS[coin.chain].label}</p></div>
        <div className="text-right">{q.isLoading ? <Skeleton className="h-7 w-28" /> : <Flash value={q.data?.priceUsd}><p className="mono text-[22px] font-bold">{fmtPrice(q.data?.priceUsd)}</p></Flash>}<Delta pct={q.data?.change24h} className="text-[12px]" /></div>
      </section>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[['Market cap', fmtUsd(q.data?.marketCap)], ['24h volume', fmtUsd(q.data?.volume24h)], ['Liquidity', fmtUsd(q.data?.liquidityUsd)]].map(([k, v]) => (
          <div key={k} className="panel min-w-0 p-3"><p className="eyebrow truncate">{k}</p><p className="mono mt-2 text-[16px] font-bold truncate">{v}</p></div>
        ))}
      </div>
      <div className="mt-4"><ChartPanel symbol={coin.symbol} /></div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button tone="lime" size="lg" className="flex-1 min-w-[200px]" onClick={() => openCall(coin.symbol)}>Call a raid on ${coin.symbol}</Button>
        {q.data?.url && <a href={q.data.url} target="_blank" rel="noreferrer" className="press inline-flex h-[52px] items-center gap-1.5 rounded-[13px] px-5 text-[14px] font-semibold hairline">{q.data.source === 'coingecko' ? 'CoinGecko' : 'DexScreener'}<ArrowUpRight size={15} /></a>}
      </div>
      <h3 className="wide mt-8 text-[15px]">Raids on ${coin.symbol}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{mine.map((r, i) => <RaidCard key={r.id} r={r} i={i} />)}</div>
      {!raids.isLoading && !mine.length && <p className="mt-2 text-[13.5px] text-mute">No raids on ${coin.symbol} yet.</p>}
    </Shell>
  );
}
