import { type ChestTx } from '@/lib/coins';
import { CHEST_ID } from '@/lib/raid';
import { cached, fail, getJson, json } from '@/lib/server-cache';

interface NbTx { transaction_hash: string; block_timestamp: string; signer_account_id: string; receiver_account_id: string; actions: { method: string | null; action: string }[]; outcomes: { status?: boolean } }

/** The war chest's own transactions (NearBlocks testnet v3), newest first. Cached 30 s. */
export async function GET() {
  try {
    const items = await cached('chest', 30_000, async (): Promise<ChestTx[]> => {
      const net = CHEST_ID.endsWith('.testnet') ? 'api-testnet' : 'api';
      const r = await getJson<{ data: NbTx[] }>(`https://${net}.nearblocks.io/v3/accounts/${CHEST_ID}/txns?limit=25`);
      return r.data.map((t) => ({ hash: t.transaction_hash, t: Math.floor(Number(t.block_timestamp) / 1e6), method: t.actions.find((a) => a.method)?.method ?? t.actions[0]?.action?.toLowerCase() ?? 'tx', signer: t.signer_account_id, receiver: t.receiver_account_id, ok: t.outcomes?.status !== false }));
    });
    return json({ items, chest: CHEST_ID, source: 'NearBlocks API' }, 15);
  } catch (e) { return fail(e); }
}
