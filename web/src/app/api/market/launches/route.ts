import { type Launch } from '@/lib/coins';
import { cached, fail, getJson, json } from '@/lib/server-cache';

interface Meme { meme_id: number; owner: string; name: string; symbol: string; decimals: number; description: string | null; image: string | null; soft_cap: string; hard_cap: string; total_deposit: string; end_timestamp_ms: number; created_timestamp_ms: number; staker_count: number; is_finalized: boolean; deposit_token_id: string }

/** Live fair launches on NEAR from meme.cooking (raised in NEAR vs soft cap). Not RAID launches. Cached 60 s. */
export async function GET() {
  try {
    const items = await cached('launches', 60_000, async (): Promise<Launch[]> => {
      const all = await getJson<Meme[]>('https://api.meme.cooking/meme', 10_000);
      const toN = (s: string) => Number(BigInt(s) / BigInt("100000000000000000000")) / 1e4; // wNEAR has 24 decimals
      return all.filter((m) => m.deposit_token_id === 'wrap.near').sort((a, b) => b.created_timestamp_ms - a.created_timestamp_ms).slice(0, 24).map((m) => ({
        id: m.meme_id, name: m.name, symbol: m.symbol, owner: m.owner, description: m.description,
        image: m.image ? `https://gateway.pinata.cloud/ipfs/${m.image}` : null,
        raised: toN(m.total_deposit), softCap: toN(m.soft_cap), hardCap: toN(m.hard_cap), endsAt: m.end_timestamp_ms, createdAt: m.created_timestamp_ms,
        stakers: m.staker_count, finalized: m.is_finalized, url: `https://meme.cooking/meme/${m.meme_id}`,
      }));
    });
    return json({ items, source: 'meme.cooking public API (NEAR mainnet)' }, 30);
  } catch (e) { return fail(e); }
}
