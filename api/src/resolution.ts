/**
 * Resolution loop for on-chain Called markets.
 * 1) Closed markets: ask the resolver's verifiable AI judge (NEAR AI Cloud). A signed verdict is proposed on-chain;
 *    without a judge (no NEARAI_API_KEY) or with no majority, the market waits for the court (admin) to resolve.
 * 2) Proposed markets past the dispute window are finalized.
 * 3) Final markets: every holder's ledger is redeemed on-chain, then the DB mirror is updated.
 */
import type { Db } from './db/index.js';
import type { Bus } from './infra/bus.js';
import type { Chain, ChainLog } from './chain.js';

export interface ResolutionDeps { db: Db; bus: Bus; chain: Chain; resolverUrl?: string; resolverToken?: string; log?: { info: (o: object, m: string) => void; warn: (o: object, m: string) => void } }

function events(logs: ChainLog[]) {
  return logs.flatMap((l) => { try { return l.log.startsWith('EVENT_JSON:') ? [JSON.parse(l.log.slice(11)) as { event: string; data: Array<Record<string, unknown>> }] : []; } catch { return []; } });
}

async function markFinal(d: ResolutionDeps, marketId: string, outcome: string, logs: ChainLog[], via: string) {
  const o = outcome.toUpperCase();
  await d.db.query("UPDATE markets SET status='final', outcome=$2, updated_at=now() WHERE id=$1", [marketId, o]);
  const sig = events(logs).find((e) => e.event === 'resolution_proposed')?.data[0];
  await d.db.query(`INSERT INTO resolutions (market_id, outcome, signer, signed_text, receipt_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (market_id) DO UPDATE SET outcome=EXCLUDED.outcome`,
    [marketId, o, String(sig?.signer ?? via), String(sig?.signed_text ?? `${via} resolution`), logs[0]?.receiptId ?? null]).catch(() => undefined);
  await d.bus.publish(`market:${marketId}`, JSON.stringify({ type: 'resolution', data: { marketId, status: 'final', outcome: o }, ts: Date.now() }));
  await redeemHolders(d, marketId);
}

export async function redeemHolders(d: ResolutionDeps, marketId: string) {
  const [m] = await d.db.query<{ chain_market_id: string }>('SELECT chain_market_id FROM markets WHERE id=$1', [marketId]);
  if (!m) return;
  const holders = await d.db.query<{ user_id: string }>('SELECT DISTINCT user_id::text FROM play_positions WHERE market_id=$1 AND NOT chain_redeemed', [marketId]);
  for (const h of holders) {
    try {
      await d.chain.redeem(h.user_id, m.chain_market_id);
      await d.db.query('UPDATE play_positions SET chain_redeemed=true, redeemed=true, updated_at=now() WHERE user_id=$1 AND market_id=$2', [h.user_id, marketId]);
    } catch (e) { d.log?.warn({ err: (e as Error).message, user: h.user_id, marketId }, 'redeem failed'); }
  }
}

export async function courtResolve(d: ResolutionDeps, marketId: string, outcome: 'YES' | 'NO' | 'INVALID') {
  const [m] = await d.db.query<{ chain_market_id: string | null }>('SELECT chain_market_id FROM markets WHERE id=$1', [marketId]);
  if (!m?.chain_market_id || !/^\d+$/.test(m.chain_market_id)) throw new Error('not_on_chain');
  const r = await d.chain.courtResolve(m.chain_market_id, (outcome[0] + outcome.slice(1).toLowerCase()) as 'Yes' | 'No' | 'Invalid');
  await markFinal(d, marketId, outcome, r.logs, 'court');
  return r.txHash;
}

export async function resolveDue(d: ResolutionDeps): Promise<{ proposed: number; finalized: number; awaitingCourt: number }> {
  const out = { proposed: 0, finalized: 0, awaitingCourt: 0 };
  await d.db.query("UPDATE markets SET status='closed' WHERE venue='called' AND status='open' AND close_ts < now() AND chain_market_id ~ '^[0-9]+$'");
  const closed = await d.db.query<{ id: string; chain_market_id: string; question: string; rules: string; close_ts: string }>(
    "SELECT id::text, chain_market_id, question, rules, close_ts FROM markets WHERE venue='called' AND status='closed' AND chain_market_id ~ '^[0-9]+$' LIMIT 20");
  for (const m of closed) {
    if (!d.resolverUrl) { out.awaitingCourt++; continue; }
    try {
      const r = await fetch(`${d.resolverUrl}/judge`, { method: 'POST', headers: { 'content-type': 'application/json', ...(d.resolverToken ? { authorization: `Bearer ${d.resolverToken}` } : {}) },
        body: JSON.stringify({ market: { id: Number(m.chain_market_id), question: m.question, rules: m.rules ?? '', closeMs: new Date(m.close_ts).getTime() }, evidence: [] }) });
      if (r.status === 503) { out.awaitingCourt++; continue; } // no verifiable judge configured
      const j = (await r.json()) as { outcome: string; contractArgs: object | null };
      if (!j.contractArgs || j.outcome === 'INVALID') { out.awaitingCourt++; continue; }
      const tx = await d.chain.proposeResolution(j.contractArgs);
      await d.db.query("UPDATE markets SET status='proposed', outcome=$2 WHERE id=$1", [m.id, j.outcome]);
      const ev = events(tx.logs).find((e) => e.event === 'resolution_proposed')?.data[0];
      await d.db.query('INSERT INTO resolutions (market_id, outcome, signer, signed_text, receipt_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (market_id) DO NOTHING',
        [m.id, j.outcome, String(ev?.signer ?? ''), String(ev?.signed_text ?? ''), tx.logs[0]?.receiptId ?? null]).catch(() => undefined);
      out.proposed++;
    } catch (e) { d.log?.warn({ err: (e as Error).message, marketId: m.id }, 'judge failed'); out.awaitingCourt++; }
  }
  const proposed = await d.db.query<{ id: string; chain_market_id: string }>("SELECT id::text, chain_market_id FROM markets WHERE venue='called' AND status='proposed' AND chain_market_id ~ '^[0-9]+$'");
  for (const m of proposed) {
    try {
      const r = await d.chain.finalize(m.chain_market_id);
      const fin = events(r.logs).find((e) => e.event === 'finalized')?.data[0];
      await markFinal(d, m.id, String(fin?.outcome ?? 'INVALID'), r.logs, 'judge');
      out.finalized++;
    } catch { /* dispute window still open or disputed */ }
  }
  return out;
}
