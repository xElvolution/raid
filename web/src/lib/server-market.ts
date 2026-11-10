import { CHAINS, COINS, type Coin, type Quote } from './coins';
import { cached, getJson } from './server-cache';

interface DsPair { chainId: string; dexId: string; url: string; pairAddress: string; baseToken: { address: string; symbol: string }; priceUsd?: string; priceChange?: { h1?: number; h24?: number }; volume?: { h24?: number }; liquidity?: { usd?: number }; marketCap?: number; fdv?: number; info?: { imageUrl?: string } }

/** Best (deepest) pool per coin from DexScreener, plus DOGE from CoinGecko. Cached 20 s. */
export function quotes(): Promise<Quote[]> {
  return cached('quotes', 20_000, async () => {
    const byChain = new Map<string, Coin[]>();
    for (const c of COINS) { const d = CHAINS[c.chain].dex; if (d) byChain.set(d, [...(byChain.get(d) ?? []), c]); }
    const out: Quote[] = [];
    await Promise.all([...byChain].map(async ([dex, coins]) => {
      const pairs = await getJson<DsPair[]>(`https://api.dexscreener.com/tokens/v1/${dex}/${coins.map((c) => c.address).join(',')}`).catch(() => [] as DsPair[]);
      for (const c of coins) {
        const best = pairs.filter((p) => p.baseToken.address.toLowerCase() === c.address.toLowerCase()).sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
        if (!best?.priceUsd) continue;
        out.push({ symbol: c.symbol, chain: c.chain, priceUsd: Number(best.priceUsd), change24h: best.priceChange?.h24 ?? null, change1h: best.priceChange?.h1 ?? null, volume24h: best.volume?.h24 ?? null, liquidityUsd: best.liquidity?.usd ?? null, marketCap: best.marketCap ?? best.fdv ?? null, image: best.info?.imageUrl ?? null, pool: best.pairAddress, dexId: best.dexId, url: best.url, source: 'dexscreener' });
      }
    }));
    const doge = COINS.find((c) => c.coingecko);
    if (doge) {
      const g = await getJson<{ id: string; current_price: number; price_change_percentage_24h: number; price_change_percentage_1h_in_currency?: number; total_volume: number; market_cap: number; image: string }[]>(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${doge.coingecko}&price_change_percentage=1h`).catch(() => []);
      const d = g[0];
      if (d) out.push({ symbol: doge.symbol, chain: doge.chain, priceUsd: d.current_price, change24h: d.price_change_percentage_24h, change1h: d.price_change_percentage_1h_in_currency ?? null, volume24h: d.total_volume, liquidityUsd: null, marketCap: d.market_cap, image: d.image, pool: null, dexId: null, url: `https://www.coingecko.com/en/coins/${doge.coingecko}`, source: 'coingecko' });
    }
    if (!out.length) throw new Error('no market data');
    return COINS.map((c) => out.find((q) => q.symbol === c.symbol)).filter((q): q is Quote => !!q);
  });
}
