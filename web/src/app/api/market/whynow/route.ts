import { cached, fail, getJson, json } from '@/lib/server-cache';

interface Cat { id: string; name: string; market_cap: number | null; volume_24h: number | null; market_cap_change_24h: number | null; updated_at: string | null }
const PICK = ['meme-token', 'solana-meme-coins', 'pump-fun', 'base-meme-coins'];

/** "Why now": live memecoin category data from CoinGecko's public categories API, each with its source page. */
export async function GET() {
  try {
    const cats = await cached('cg-categories', 10 * 60_000, () => getJson<Cat[]>('https://api.coingecko.com/api/v3/coins/categories', 12_000));
    const items = PICK.map((id) => cats.find((c) => c.id === id)).filter((c): c is Cat => !!c && c.market_cap != null).map((c) => ({
      id: c.id, name: c.name, marketCap: c.market_cap, volume24h: c.volume_24h, change24h: c.market_cap_change_24h, updatedAt: c.updated_at,
      url: `https://www.coingecko.com/en/categories/${c.id}`,
    }));
    return json({ items, source: 'CoinGecko /coins/categories', sourceUrl: 'https://www.coingecko.com/en/categories', at: Date.now() }, 300);
  } catch (e) { return fail(e); }
}
