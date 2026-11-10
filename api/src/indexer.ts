/**
 * Idempotent NEAR event indexer. Consumes EVENT_JSON logs from the `called` contract.
 * Idempotency: trades are unique on (receipt_id, log_index); market rows upsert on (venue, external_id).
 * Only feed FINAL blocks into this function (no reorg handling needed on NEAR finality).
 */
import type { Db } from './db/index.js';
import type { Bus, Kv } from './infra/bus.js';

export interface LogEntry {
  receiptId: string;
  logIndex: number;
  blockHeight: number;
  blockTimeMs: number;
  log: string;
}

interface CalledEvent {
  standard: string;
  event: string;
  data: Record<string, unknown>[];
}

const s = (v: unknown): string => String(v);

export function parseEvent(log: string): CalledEvent | null {
  if (!log.startsWith('EVENT_JSON:')) return null;
  try {
    const e = JSON.parse(log.slice('EVENT_JSON:'.length)) as CalledEvent;
    return e.standard === 'called' && Array.isArray(e.data) ? e : null;
  } catch {
    return null;
  }
}

export async function indexLogs(db: Db, bus: Bus, kv: Kv, entries: LogEntry[], checkpoint = 'called'): Promise<number> {
  let applied = 0;
  let maxHeight = 0;
  for (const en of entries) {
    maxHeight = Math.max(maxHeight, en.blockHeight);
    const ev = parseEvent(en.log);
    if (!ev) continue;
    for (const d of ev.data) {
      const ts = new Date(en.blockTimeMs).toISOString();
      if (ev.event === 'market_created') {
        await db.query(
          `INSERT INTO markets (venue, external_id, question, close_ts, created_at) VALUES ('called',$1,$2,to_timestamp($3::bigint/1000.0),$4)
           ON CONFLICT (venue, external_id) DO NOTHING`,
          [s(d.market_id), s(d.question), s(d.close_ms), ts],
        );
        applied++;
      } else if (ev.event === 'trade') {
        const rows = await db.query<{ id: string; market_id: string; user_id: string | null }>(
          `WITH m AS (SELECT id FROM markets WHERE venue='called' AND external_id=$1),
                u AS (SELECT id FROM users WHERE near_account=$2)
           INSERT INTO trades (market_id, user_id, account, side, outcome, amount, shares, receipt_id, log_index, created_at)
           SELECT m.id, (SELECT id FROM u), $2, $3, $4, $5, $6, $7, $8, $9 FROM m
           ON CONFLICT (receipt_id, log_index) DO NOTHING RETURNING id, market_id, user_id`,
          [s(d.market_id), s(d.account), s(d.side), Number(d.outcome), s(d.amount), s(d.shares), en.receiptId, en.logIndex, ts],
        );
        const t = rows[0];
        if (!t) continue; // duplicate delivery
        applied++;
        const price = Number(d.price_yes_ppm) / 1e6;
        await db.query(`UPDATE markets SET price_yes=$2, volume = volume + $3 WHERE id=$1`, [t.market_id, price, s(d.amount)]);
        if (t.user_id) {
          const sign = d.side === 'buy' ? 1 : -1;
          await db.query(
            `INSERT INTO positions (user_id, market_id, outcome, shares, cost) VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (user_id, market_id, outcome) DO UPDATE SET shares = positions.shares + EXCLUDED.shares, cost = positions.cost + EXCLUDED.cost`,
            [t.user_id, t.market_id, Number(d.outcome), String(sign * Number(d.shares)), String(sign * Number(d.amount))],
          );
          for (const w of ['24h', '7d', '30d']) await kv.zincrby(`lb:${w}:volume`, Number(d.amount), String(t.user_id));
        }
        await bus.publish(`market:${t.market_id}`, JSON.stringify({ type: 'trade', data: { marketId: String(t.market_id), account: s(d.account), side: s(d.side), outcome: Number(d.outcome), amount: s(d.amount), shares: s(d.shares), priceYes: price }, ts: en.blockTimeMs }));
        await bus.publish(`market:${t.market_id}`, JSON.stringify({ type: 'odds', data: { marketId: String(t.market_id), priceYes: price }, ts: en.blockTimeMs }));
      } else if (ev.event === 'resolution_proposed' || ev.event === 'finalized') {
        const status = ev.event === 'finalized' ? 'final' : 'proposed';
        const outcome = typeof d.outcome === 'string' ? d.outcome.toUpperCase() : null;
        const rows = await db.query<{ id: string }>(`UPDATE markets SET status=$2, outcome=$3 WHERE venue='called' AND external_id=$1 RETURNING id`, [s(d.market_id), status, outcome]);
        const id = rows[0]?.id;
        if (!id) continue;
        if (ev.event === 'resolution_proposed') {
          await db.query(
            `INSERT INTO resolutions (market_id, outcome, signer, signed_text, receipt_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (market_id) DO NOTHING`,
            [id, outcome, s(d.signer), s(d.signed_text), en.receiptId],
          );
        }
        applied++;
        await bus.publish(`market:${id}`, JSON.stringify({ type: 'resolution', data: { marketId: String(id), status, outcome }, ts: en.blockTimeMs }));
      }
    }
  }
  if (maxHeight > 0) {
    await db.query(
      `INSERT INTO indexer_checkpoint (name, block_height) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET block_height = GREATEST(indexer_checkpoint.block_height, EXCLUDED.block_height)`,
      [checkpoint, maxHeight],
    );
  }
  return applied;
}
