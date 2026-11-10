import type { NextRequest } from 'next/server';
import { CHAINS, coinBySymbol, type Candle } from '@/lib/coins';
import { quotes } from '@/lib/server-market';
import { cached, fail, getJson, json } from '@/lib/server-cache';

const TF: Record<string, { gecko: [string, number]; limit: number; cgDays: number }> = {
  '15m': { gecko: ['minute', 15], limit: 96, cgDays: 1 },
  '1h': { gecko: ['hour', 1], limit: 168, cgDays: 7 },
  '4h': { gecko: ['hour', 4], limit: 180, cgDays: 30 },
  '1d': { gecko: ['day', 1], limit: 180, cgDays: 180 },
};

/** Candles for a coin's deepest pool (GeckoTerminal), or CoinGecko OHLC for DOGE. */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? '';
  const tf = TF[req.nextUrl.searchParams.get('tf') ?? '1h'] ? (req.nextUrl.searchParams.get('tf') ?? '1h') : '1h';
  const coin = coinBySymbol(symbol);
  if (!coin) return Response.json({ error: 'unknown coin' }, { status: 404 });
  try {
    const candles = await cached(`ohlcv:${coin.symbol}:${tf}`, 60_000, async (): Promise<Candle[]> => {
      const spec = TF[tf]!;
      if (coin.coingecko) {
        const rows = await getJson<[number, number, number, number, number][]>(`https://api.coingecko.com/api/v3/coins/${coin.coingecko}/ohlc?vs_currency=usd&days=${spec.cgDays}`);
        return rows.map(([t, o, h, l, c]) => ({ t, o, h, l, c, v: 0 }));
      }
      const q = (await quotes()).find((x) => x.symbol === coin.symbol);
      const net = CHAINS[coin.chain].gecko;
      if (!q?.pool || !net) throw new Error('no pool');
      const [unit, agg] = spec.gecko;
      const r = await getJson<{ data: { attributes: { ohlcv_list: [number, number, number, number, number, number][] } } }>(`https://api.geckoterminal.com/api/v2/networks/${net}/pools/${q.pool}/ohlcv/${unit}?aggregate=${agg}&limit=${spec.limit}&currency=usd&token=base`);
      return r.data.attributes.ohlcv_list.map(([t, o, h, l, c, v]) => ({ t: t * 1000, o, h, l, c, v })).reverse();
    });
    return json({ symbol: coin.symbol, tf, candles, source: coin.coingecko ? 'CoinGecko' : 'GeckoTerminal' }, 30);
  } catch (e) { return fail(e); }
}
