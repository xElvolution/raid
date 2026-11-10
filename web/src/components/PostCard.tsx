'use client';
import type { FeedItem, Market } from '@called/sdk';
import { motion } from 'motion/react';
import Link from 'next/link';
import { ago } from '@/lib/format';
import { useMyCalls } from '@/lib/predict';
import { MarketCard } from './MarketCard';
import { PostActions } from './PostActions';
import { Avatar } from './ui';
import { RichText } from './RichText';

export function PostCard({ item, index = 0 }: { item: FeedItem; index?: number }) {
  const calls = useMyCalls();
  const market: Market | null = item.market_id ? {
    id: item.market_id, venue: item.venue ?? 'called', external_id: '', question: item.question ?? '', price_yes: item.price_yes ?? 0.5, volume: '0',
    status: item.status ?? 'open', outcome: null, close_ts: item.close_ts, created_at: item.created_at,
    image_url: item.market_image ?? null, category: item.market_category ?? null, ...(item.market_volume ? { volume: item.market_volume } : {}),
  } : null;
  const mine = market ? calls.data?.get(String(market.id)) : undefined;
  return (
    <motion.article initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: Math.min(index, 4) * 0.03 }}
      className="px-4 py-3 border-b border-line hover:bg-ink/[.02] transition-colors">
      <div className="flex gap-3">
        <Link href={`/u/${item.handle}`} className="shrink-0"><Avatar handle={item.handle} url={item.avatar_url} size={40} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[15px] leading-5">
            <Link href={`/u/${item.handle}`} className="font-semibold hover:underline truncate">{item.display_name}</Link>
            <span className="text-mute truncate">@{item.handle}</span>
            <Link href={`/posts/${item.id}`} className="text-mute shrink-0 hover:underline">· {ago(item.created_at)}</Link>
          </div>
          <p className="mt-0.5 text-[15px] leading-[1.4] whitespace-pre-wrap break-words"><RichText text={item.body} /></p>
          {mine !== undefined && (
            <span className="mt-1.5 block text-[13px] text-mute">Holding <span className={mine ? 'text-mint' : 'text-coral'}>{mine ? 'Yes' : 'No'}</span></span>
          )}
          {market && <MarketCard m={market} embedded by={{ handle: item.handle, display_name: item.display_name, avatar_url: item.avatar_url }} />}
          <PostActions id={String(item.id)} handle={item.handle} />
        </div>
      </div>
    </motion.article>
  );
}
