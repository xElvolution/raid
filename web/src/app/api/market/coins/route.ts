import { quotes } from '@/lib/server-market';
import { fail, json } from '@/lib/server-cache';

export async function GET() {
  try { return json({ items: await quotes(), source: 'DexScreener + CoinGecko public APIs', at: Date.now() }, 15); } catch (e) { return fail(e); }
}
