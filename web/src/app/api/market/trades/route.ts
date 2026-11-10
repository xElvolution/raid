import type { NextRequest } from 'next/server';
import { CHAINS, COINS, type Trade } from '@/lib/coins';
import { quotes } from '@/lib/server-market';
import { cached, fail, getJson, json } from '@/lib/server-cache';

interface GtTrade { id: string; attributes: { block_timestamp: string; tx_hash: string; tx_from_address: string; kind: 'buy' | 'sell'; volume_in_usd: string; from_token_amount: string; to_token_amount: string } }

/** Real on-chain swaps (>= $250) on the deepest pool of each requested coin, newest first. GeckoTerminal, cached 20 s. */
export async function GET(req: NextRequest) {
  const want = (req.nextUrl.searchParams.get('symbols') ?? 'PEPE,TRUMP,BRETT,SHITZU').split(',').map((s) => s.trim().toUpperCase()).slice(0, 5);
  try {
    const qs = await quotes();
    const lists = await Promise.all(want.map((sym) => cached(`trades:${sym}`, 20_000, async (): Promise<Trade[]> => {
      const coin = COINS.find((c) => c.symbol === sym); const q = qs.find((x) => x.symbol === sym);
      const net = coin && CHAINS[coin.chain].gecko;
      if (!coin || !q?.pool || !net) return [];
      const r = await getJson<{ data: GtTrade[] }>(`https://api.geckoterminal.com/api/v2/networks/${net}/pools/${q.pool}/trades?trade_volume_in_usd_greater_than=250`);
      return r.data.slice(0, 25).map((d) => ({
        id: d.id, t: Date.parse(d.attributes.block_timestamp), kind: d.attributes.kind, usd: Number(d.attributes.volume_in_usd),
        amount: Number(d.attributes.kind === 'buy' ? d.attributes.to_token_amount : d.attributes.from_token_amount),
        from: d.attributes.tx_from_address, tx: d.attributes.tx_hash, symbol: sym, chain: coin.chain,
      }));
    }).catch(() => [] as Trade[])));
    const items = lists.flat().sort((a, b) => b.t - a.t).slice(0, 60);
    return json({ items, source: 'GeckoTerminal public API (on-chain DEX swaps)' }, 10);
  } catch (e) { return fail(e); }
}
