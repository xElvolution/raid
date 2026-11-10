import type { FeedItem, Market } from '@called/sdk';

/** Interleave posts with standalone market cards: post, post, market, … */
export function mixFeed(posts: FeedItem[], markets: Market[]): ({ k: 'post'; v: FeedItem } | { k: 'market'; v: Market })[] {
  const seen = new Set(posts.map((p) => p.market_id).filter(Boolean));
  const ms = markets.filter((m) => !seen.has(String(m.id)));
  const out: ({ k: 'post'; v: FeedItem } | { k: 'market'; v: Market })[] = [];
  let mi = 0;
  posts.forEach((p, i) => {
    out.push({ k: 'post', v: p });
    if (i % 2 === 1 && mi < ms.length) out.push({ k: 'market', v: ms[mi++] as Market });
  });
  while (mi < ms.length && out.length < 6) out.push({ k: 'market', v: ms[mi++] as Market });
  return out;
}

