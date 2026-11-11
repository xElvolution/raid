/**
 * Play money (preview/demo mode). Mock balance and LMSR-priced trading on Called markets so every
 * screen can be exercised end to end while real USDC trading is off. Balances have no value.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Db as Database } from './db/index.js';
import type { Bus } from './infra/bus.js';
import type { Chain, ChainLog } from './chain.js';
import { must } from './must.js';

/** On-chain mode. When set, balances, trades and payouts execute on the NEAR contract; tables below mirror chain state. */
let chain: Chain | null = null;
export function setChain(c: Chain | null) { chain = c; }
export function chainMode() { return !!chain; }

/** Find the contract's trade event in a call's logs. */
function tradeEvent(logs: ChainLog[]): { shares: number; amount: number; priceYes: number } | null {
  for (const l of logs) {
    if (!l.log.startsWith('EVENT_JSON:')) continue;
    const e = JSON.parse(l.log.slice(11)) as { event: string; data: Array<Record<string, string>> };
    const d = e.event === 'trade' ? e.data[0] : undefined;
    if (d) return { shares: Number(d.shares) / 1e6, amount: Number(d.amount) / 1e6, priceYes: Number(d.price_yes_ppm) / 1e6 };
  }
  return null;
}

/** Create the market on-chain once (claimed with a 'pending' marker so concurrent trades don't double-create). */
export async function ensureChainMarket(db: Database, marketId: string): Promise<string | null> {
  if (!chain) return null;
  for (let i = 0; i < 40; i++) {
    const [m] = await db.query<{ chain_market_id: string | null; question: string; rules: string; close_ts: string }>('SELECT chain_market_id, question, rules, close_ts FROM markets WHERE id=$1', [marketId]);
    if (!m) return null;
    if (m.chain_market_id && m.chain_market_id !== 'pending') return m.chain_market_id;
    if (!m.chain_market_id) {
      const claim = await db.query("UPDATE markets SET chain_market_id='pending' WHERE id=$1 AND chain_market_id IS NULL RETURNING id", [marketId]);
      if (claim.length) {
        try {
          const r = await chain.createMarket(m.question, m.rules ?? '', new Date(m.close_ts).getTime());
          await db.query('UPDATE markets SET chain_market_id=$2 WHERE id=$1', [marketId, String(r.value)]);
          return String(r.value);
        } catch (e) {
          await db.query("UPDATE markets SET chain_market_id=NULL WHERE id=$1 AND chain_market_id='pending'", [marketId]);
          throw e;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function syncChainBalance(db: Database, userId: string) {
  if (!chain) return;
  try { await db.query('UPDATE play_accounts SET balance=$2 WHERE user_id=$1', [userId, (await chain.balance(userId)).toFixed(6)]); } catch { /* keep last known */ }
}


/** LMSR liquidity. Higher = prices move less per dollar. */
export const PLAY_B = 250;
const MIN_P = 0.01, MAX_P = 0.99;

const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Shares received for spending `amount` on `outcome`, and the new YES price. */
export function quoteBuy(priceYes: number, outcome: 0 | 1, amount: number, b = PLAY_B): { shares: number; priceYes: number } {
  const d = logit(Math.min(MAX_P, Math.max(MIN_P, priceYes))) * b * (outcome ? 1 : -1); // q_side - q_other
  const shares = b * Math.log(Math.exp(amount / b) * (Math.exp(d / b) + 1) - 1) - d;
  const d2 = d + shares;
  const pSide = sigmoid(d2 / b);
  return { shares, priceYes: clampP(outcome ? pSide : 1 - pSide) };
}

/** Proceeds from selling `shares` of `outcome`, and the new YES price. */
export function quoteSell(priceYes: number, outcome: 0 | 1, shares: number, b = PLAY_B): { amount: number; priceYes: number } {
  const d = logit(Math.min(MAX_P, Math.max(MIN_P, priceYes))) * b * (outcome ? 1 : -1);
  const amount = b * Math.log((Math.exp(d / b) + 1) / (Math.exp((d - shares) / b) + 1));
  const pSide = sigmoid((d - shares) / b);
  return { amount, priceYes: clampP(outcome ? pSide : 1 - pSide) };
}
const clampP = (p: number) => Math.min(MAX_P, Math.max(MIN_P, p));

export interface BookLevel { price: number; shares: number; total: number }
/**
 * Depth implied by the LMSR maker for the YES side, in whole-cent levels. Size at a level is the
 * number of shares that walks the price from that level to the next, so the book is exactly what a
 * market order would fill against. NO is the mirror (price 1 - p).
 */
export function lmsrBook(priceYes: number, levels = 8, b = PLAY_B): { asks: BookLevel[]; bids: BookLevel[]; spread: number } {
  const p = clampP(priceYes);
  const asks: BookLevel[] = [], bids: BookLevel[] = [];
  let ta = 0, tb = 0;
  const askStart = Math.min(99, Math.floor(p * 100) + 1), bidStart = Math.max(1, Math.ceil(p * 100) - 1);
  for (let k = 0; k < levels; k++) {
    const a = askStart + k;
    if (a < 99) {
      const shares = Math.abs(k === 0 ? b * (logit(a / 100) - logit(p)) + b * (logit((a + 1) / 100) - logit(a / 100)) / 2 : b * (logit(a / 100) - logit((a - 1) / 100)));
      ta += shares * (a / 100);
      asks.push({ price: a / 100, shares, total: ta });
    }
    const bd = bidStart - k;
    if (bd > 1) {
      const shares = Math.abs(k === 0 ? b * (logit(p) - logit(bd / 100)) + b * (logit(bd / 100) - logit((bd - 1) / 100)) / 2 : b * (logit((bd + 1) / 100) - logit(bd / 100)));
      tb += shares * (bd / 100);
      bids.push({ price: bd / 100, shares, total: tb });
    }
  }
  return { asks, bids, spread: (asks[0]?.price ?? 1) - (bids[0]?.price ?? 0) };
}

const Trade = z.object({
  marketId: z.string().regex(/^\d+$/),
  outcome: z.union([z.literal(0), z.literal(1)]),
  side: z.enum(['buy', 'sell']),
  amount: z.number().positive().max(10_000).optional(),
  shares: z.number().positive().max(1_000_000).optional(),
});
const Funds = z.object({ amount: z.number().positive().max(10_000) });

interface PosRow { market_id: string; outcome: number; shares: string; cost: string; redeemed: boolean; question: string; venue: string; image_url: string | null; category: string | null; status: string; result: string | null; close_ts: string; price_yes: string }

export async function playAccount(db: Database, userId: string) {
  await ensureAccount(db, userId);
  await redeemSettled(db, userId);
  await syncChainBalance(db, userId);
  const [acct] = await db.query<{ balance: string; deposited: string }>('SELECT balance, deposited FROM play_accounts WHERE user_id=$1', [userId]);
  const rows = await db.query<PosRow>(
    `SELECT p.market_id, p.outcome, p.shares, p.cost, p.redeemed, m.question, m.venue, m.image_url, m.category, m.status, m.outcome AS result, m.close_ts, m.price_yes
       FROM play_positions p JOIN markets m ON m.id=p.market_id WHERE p.user_id=$1 AND (p.shares > 0 OR p.redeemed) ORDER BY p.updated_at DESC`, [userId]);
  const positions = rows.map((r) => {
    const shares = Number(r.shares), cost = Number(r.cost), py = Number(r.price_yes);
    const settled = r.result === 'YES' || r.result === 'NO';
    const won = settled && (r.result === 'YES') === (r.outcome === 1);
    const price = settled ? (won ? 1 : 0) : r.outcome ? py : 1 - py;
    const value = shares * price;
    return { market_id: String(r.market_id), outcome: r.outcome, shares, cost, avg: shares ? cost / shares : 0, price, value, pnl: value - cost, settled, won, redeemed: r.redeemed,
      question: r.question, venue: r.venue, image_url: r.image_url, category: r.category, status: r.status, close_ts: r.close_ts };
  });
  const open = positions.filter((p) => !p.settled);
  const balance = Number(acct?.balance ?? 0), deposited = Number(acct?.deposited ?? 0);
  const positionsValue = open.reduce((a, p) => a + p.value, 0);
  const value = balance + positionsValue;
  await snapshot(db, userId, value);
  const hist = await db.query<{ ts: string; value: string }>("SELECT ts, value FROM play_value_history WHERE user_id=$1 AND ts > now() - interval '30 days' ORDER BY ts", [userId]);
  const [dayAgo] = await db.query<{ value: string }>("SELECT value FROM play_value_history WHERE user_id=$1 AND ts <= now() - interval '24 hours' ORDER BY ts DESC LIMIT 1", [userId]);
  return {
    balance, deposited, positionsValue, value, pnl: value - deposited, pnlToday: dayAgo ? value - Number(dayAgo.value) : 0,
    history: hist.map((h) => ({ ts: h.ts, value: Number(h.value) })),
    open, settled: positions.filter((p) => p.settled),
  };
}

async function snapshot(db: Database, userId: string, value: number) {
  const [last] = await db.query<{ ts: string; value: string }>('SELECT ts, value FROM play_value_history WHERE user_id=$1 ORDER BY ts DESC LIMIT 1', [userId]);
  if (last && Math.abs(Number(last.value) - value) < 0.005 && Date.now() - new Date(last.ts).getTime() < 3_600_000) return;
  await db.query('INSERT INTO play_value_history (user_id, value) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, value.toFixed(6)]);
}

async function ensureAccount(db: Database, userId: string) {
  await db.query(chain ? 'INSERT INTO play_accounts (user_id, balance, deposited) VALUES ($1,0,0) ON CONFLICT DO NOTHING' : 'INSERT INTO play_accounts (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
}

/** Pay out settled markets once: winning shares are worth 1 each. On-chain mode redeems through the contract. */
async function redeemSettled(db: Database, userId: string) {
  if (chain) {
    const rows = await db.query<{ market_id: string; chain_market_id: string }>(
      `SELECT DISTINCT p.market_id, m.chain_market_id FROM play_positions p JOIN markets m ON m.id=p.market_id
        WHERE p.user_id=$1 AND NOT p.chain_redeemed AND m.status='final' AND m.chain_market_id ~ '^[0-9]+$'`, [userId]);
    for (const r of rows) {
      try {
        await chain.redeem(userId, r.chain_market_id);
        await db.query('UPDATE play_positions SET chain_redeemed=true, redeemed=true, updated_at=now() WHERE user_id=$1 AND market_id=$2', [userId, r.market_id]);
      } catch { /* retried on next read */ }
    }
    return;
  }
  const rows = await db.query<{ market_id: string; outcome: number; shares: string; result: string }>(
    `UPDATE play_positions p SET redeemed=true, updated_at=now() FROM markets m
      WHERE p.user_id=$1 AND p.market_id=m.id AND NOT p.redeemed AND m.outcome IN ('YES','NO')
      RETURNING p.market_id, p.outcome, p.shares, m.outcome AS result`, [userId]);
  const payout = rows.reduce((a, r) => a + ((r.result === 'YES') === (r.outcome === 1) ? Number(r.shares) : 0), 0);
  if (payout > 0) await db.query('UPDATE play_accounts SET balance = balance + $2 WHERE user_id=$1', [userId, payout.toFixed(6)]);
}

export interface TradeInput { marketId: string; outcome: 0 | 1; side: 'buy' | 'sell'; amount?: number; shares?: number }
type TradeOk = { side: 'buy' | 'sell'; outcome: number; shares: number; amount: number; priceBefore: number; priceYes: number; account: Awaited<ReturnType<typeof playAccount>>; txHash?: string };
/** One play-money trade against the LMSR maker with optimistic price locking. Shared by the route and copy calls. */
export async function executeTrade(db: Database, bus: Bus, uid: string, t: TradeInput): Promise<{ ok: TradeOk } | { code: number; error: string }> {
  const { marketId, outcome, side } = t;
  await ensureAccount(db, uid);
  if (chain) return executeChainTrade(db, bus, uid, t);
    for (let attempt = 0; attempt < 4; attempt++) {
      const [m] = await db.query<{ price_yes: string; status: string; venue: string; close_ts: string }>('SELECT price_yes, status, venue, close_ts FROM markets WHERE id=$1', [marketId]);
      if (!m) return { code: 404, error: 'not_found' };
      if (m.venue !== 'called') return { code: 409, error: 'external_market' };
      if (m.status !== 'open' || new Date(m.close_ts).getTime() < Date.now()) return { code: 409, error: 'market_closed' };
      const p0 = Number(m.price_yes);
      let shares: number, amount: number, p1: number;
      if (side === 'buy') {
        amount = t.amount ?? 0;
        ({ shares, priceYes: p1 } = quoteBuy(p0, outcome, amount));
        const ok = await db.query('UPDATE play_accounts SET balance=balance-$2 WHERE user_id=$1 AND balance >= $2 RETURNING user_id', [uid, amount.toFixed(6)]);
        if (!ok.length) return { code: 409, error: 'insufficient_balance' };
      } else {
        shares = t.shares ?? 0;
        const [pos] = await db.query<{ shares: string }>('SELECT shares FROM play_positions WHERE user_id=$1 AND market_id=$2 AND outcome=$3', [uid, marketId, outcome]);
        if (!pos || Number(pos.shares) + 1e-9 < shares) return { code: 409, error: 'insufficient_shares' };
        ({ amount, priceYes: p1 } = quoteSell(p0, outcome, shares));
      }
      const moved = await db.query(
        `UPDATE markets SET price_yes=$2, volume=volume+$3, volume_24h=COALESCE(volume_24h,0)+$3, updated_at=now() WHERE id=$1 AND price_yes=$4 RETURNING id`,
        [marketId, p1.toFixed(6), Math.round(amount * 1e6).toString(), m.price_yes],
      );
      if (!moved.length) { // price moved under us: undo and retry at the new price
        if (side === 'buy') await db.query('UPDATE play_accounts SET balance=balance+$2 WHERE user_id=$1', [uid, amount.toFixed(6)]);
        continue;
      }
      if (side === 'buy') {
        await db.query(`INSERT INTO play_positions (user_id, market_id, outcome, shares, cost) VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (user_id, market_id, outcome) DO UPDATE SET shares=play_positions.shares+EXCLUDED.shares, cost=play_positions.cost+EXCLUDED.cost, updated_at=now()`,
          [uid, marketId, outcome, shares.toFixed(6), amount.toFixed(6)]);
      } else {
        await db.query(`UPDATE play_positions SET cost = CASE WHEN shares > 0 THEN cost * (1 - $4::numeric / shares) ELSE 0 END, shares = shares - $4, updated_at=now()
          WHERE user_id=$1 AND market_id=$2 AND outcome=$3`, [uid, marketId, outcome, shares.toFixed(6)]);
        await db.query('UPDATE play_accounts SET balance=balance+$2 WHERE user_id=$1', [uid, amount.toFixed(6)]);
      }
      await db.query('INSERT INTO play_trades (user_id, market_id, outcome, side, shares, amount, price_yes) VALUES ($1,$2,$3,$4,$5,$6,$7)', [uid, marketId, outcome, side, shares.toFixed(6), amount.toFixed(6), p1.toFixed(6)]);
      await db.query('INSERT INTO market_prices (market_id, price_yes) VALUES ($1,$2) ON CONFLICT DO NOTHING', [marketId, p1.toFixed(6)]);
      const [u] = await db.query<{ handle: string }>('SELECT handle FROM users WHERE id=$1', [uid]);
      const ts = Date.now();
      await bus.publish(`market:${marketId}`, JSON.stringify({ type: 'odds', data: { marketId, priceYes: p1 }, ts }));
      await bus.publish(`market:${marketId}`, JSON.stringify({ type: 'trade', data: { marketId, account: u?.handle ?? 'trader', side, outcome, amount: Math.round(amount * 1e6).toString(), shares: Math.round(shares * 1e6).toString() }, ts }));
      return { ok: { side, outcome, shares, amount, priceBefore: p0, priceYes: p1, account: await playAccount(db, uid) } };
    }
  return { code: 409, error: 'busy_retry' };
}

async function executeChainTrade(db: Database, bus: Bus, uid: string, t: TradeInput): Promise<{ ok: TradeOk } | { code: number; error: string }> {
  const c = must(chain, 'chain');
  const { marketId, outcome, side } = t;
  const [m] = await db.query<{ price_yes: string; status: string; venue: string; close_ts: string }>('SELECT price_yes, status, venue, close_ts FROM markets WHERE id=$1', [marketId]);
  if (!m) return { code: 404, error: 'not_found' };
  if (m.venue !== 'called') return { code: 409, error: 'external_market' };
  if (m.status !== 'open' || new Date(m.close_ts).getTime() < Date.now()) return { code: 409, error: 'market_closed' };
  const cid = await ensureChainMarket(db, marketId);
  if (!cid) return { code: 503, error: 'chain_unavailable' };
  const p0 = Number(m.price_yes);
  if (side === 'buy') {
    if ((await c.balance(uid)) + 1e-9 < (t.amount ?? 0)) return { code: 409, error: 'insufficient_balance' };
  } else {
    const [pos] = await db.query<{ shares: string }>('SELECT shares FROM play_positions WHERE user_id=$1 AND market_id=$2 AND outcome=$3', [uid, marketId, outcome]);
    if (!pos || Number(pos.shares) + 1e-9 < (t.shares ?? 0)) return { code: 409, error: 'insufficient_shares' };
  }
  let r;
  try { r = side === 'buy' ? await c.buy(uid, cid, outcome, t.amount ?? 0) : await c.sell(uid, cid, outcome, t.shares ?? 0); }
  catch (e) { return { code: 502, error: /insufficient/.test((e as Error).message) ? 'insufficient_balance' : 'chain_trade_failed' }; }
  const ev = tradeEvent(r.logs);
  if (!ev) return { code: 502, error: 'chain_trade_failed' };
  const { shares, amount, priceYes: p1 } = ev;
  await db.query('UPDATE markets SET price_yes=$2, volume=volume+$3, volume_24h=COALESCE(volume_24h,0)+$3, updated_at=now() WHERE id=$1', [marketId, p1.toFixed(6), Math.round(amount * 1e6).toString()]);
  if (side === 'buy') {
    await db.query(`INSERT INTO play_positions (user_id, market_id, outcome, shares, cost) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (user_id, market_id, outcome) DO UPDATE SET shares=play_positions.shares+EXCLUDED.shares, cost=play_positions.cost+EXCLUDED.cost, updated_at=now()`,
      [uid, marketId, outcome, shares.toFixed(6), amount.toFixed(6)]);
  } else {
    await db.query(`UPDATE play_positions SET cost = CASE WHEN shares > 0 THEN cost * (1 - $4::numeric / shares) ELSE 0 END, shares = shares - $4, updated_at=now()
      WHERE user_id=$1 AND market_id=$2 AND outcome=$3`, [uid, marketId, outcome, shares.toFixed(6)]);
  }
  await db.query('INSERT INTO play_trades (user_id, market_id, outcome, side, shares, amount, price_yes, tx_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [uid, marketId, outcome, side, shares.toFixed(6), amount.toFixed(6), p1.toFixed(6), r.txHash]);
  await db.query('INSERT INTO market_prices (market_id, price_yes) VALUES ($1,$2) ON CONFLICT DO NOTHING', [marketId, p1.toFixed(6)]);
  const [u] = await db.query<{ handle: string }>('SELECT handle FROM users WHERE id=$1', [uid]);
  const ts = Date.now();
  await bus.publish(`market:${marketId}`, JSON.stringify({ type: 'odds', data: { marketId, priceYes: p1 }, ts }));
  await bus.publish(`market:${marketId}`, JSON.stringify({ type: 'trade', data: { marketId, account: u?.handle ?? 'trader', side, outcome, amount: Math.round(amount * 1e6).toString(), shares: Math.round(shares * 1e6).toString(), txHash: r.txHash }, ts }));
  return { ok: { side, outcome, shares, amount, priceBefore: p0, priceYes: p1, account: await playAccount(db, uid), txHash: r.txHash } as TradeOk };
}

/** Mirror a leader's buy for copy-call subscribers, capped per trade. Mirrored trades never cascade. */
export async function mirrorCopyTrades(db: Database, bus: Bus, leaderId: string, t: TradeInput, log?: { warn: (o: object, m: string) => void }): Promise<number> {
  if (t.side !== 'buy' || !t.amount) return 0;
  const subs = await db.query<{ follower_id: string; max_per_trade: string }>('SELECT follower_id, max_per_trade FROM copy_subscriptions WHERE leader_id=$1', [leaderId]);
  let n = 0;
  for (const s of subs) {
    const amount = Math.min(t.amount, Number(s.max_per_trade));
    const r = await executeTrade(db, bus, String(s.follower_id), { ...t, amount });
    if ('ok' in r) n++; else log?.warn({ follower: s.follower_id, error: r.error }, 'copy trade skipped');
  }
  return n;
}

export function registerPlay(app: FastifyInstance, deps: { db: Database; bus: Bus; requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown> }) {
  const { db, bus, requireUser } = deps;

  app.get('/v1/play/account', { preHandler: requireUser }, async (req) => playAccount(db, String(req.userId)));

  app.post('/v1/play/deposit', { preHandler: requireUser }, async (req, reply) => {
    const b = Funds.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    if (chain) {
      // Testnet faucet: mints test USDC on-chain into the user's ledger account, once per 24h.
      if (!chain.cfg.testnetFaucet) return reply.code(501).send({ error: 'use_wallet_deposit' });
      const uid = String(req.userId);
      await ensureAccount(db, uid);
      const claim = await db.query("UPDATE play_accounts SET created_at=created_at WHERE user_id=$1 AND NOT EXISTS (SELECT 1 FROM faucet_claims f WHERE f.user_id=$1 AND f.ts > now() - interval '24 hours') RETURNING user_id", [uid]);
      if (!claim.length) return reply.code(429).send({ error: 'faucet_cooldown' });
      await db.query('INSERT INTO faucet_claims (user_id, amount) VALUES ($1,$2)', [uid, chain.cfg.faucetAmount]);
      try { await chain.fund(chain.ledger(uid), chain.cfg.faucetAmount); }
      catch (e) { await db.query("DELETE FROM faucet_claims WHERE user_id=$1 AND ts > now() - interval '1 minute'", [uid]); req.log.error({ err: e }, 'faucet failed'); return reply.code(502).send({ error: 'faucet_failed' }); }
      await db.query('UPDATE play_accounts SET deposited=deposited+$2 WHERE user_id=$1', [uid, chain.cfg.faucetAmount.toFixed(6)]);
      return playAccount(db, uid);
    }
    await db.query('INSERT INTO play_accounts (user_id, balance, deposited) VALUES ($1,0,0) ON CONFLICT DO NOTHING', [req.userId]);
    await db.query('UPDATE play_accounts SET balance=balance+$2, deposited=deposited+$2 WHERE user_id=$1', [req.userId, b.data.amount.toFixed(6)]);
    return playAccount(db, String(req.userId));
  });

  app.post('/v1/play/withdraw', { preHandler: requireUser }, async (req, reply) => {
    const b = Funds.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    if (chain) {
      const uid = String(req.userId);
      const [u] = await db.query<{ near_account: string | null }>('SELECT near_account FROM users WHERE id=$1', [uid]);
      if (!u?.near_account) return reply.code(409).send({ error: 'no_wallet_linked' });
      if ((await chain.balance(uid)) + 1e-9 < b.data.amount) return reply.code(409).send({ error: 'insufficient_balance' });
      try { await chain.withdraw(uid, b.data.amount, u.near_account); } catch (e) { req.log.error({ err: e }, 'withdraw failed'); return reply.code(502).send({ error: 'withdraw_failed' }); }
      await db.query('UPDATE play_accounts SET deposited=deposited-$2 WHERE user_id=$1', [uid, b.data.amount.toFixed(6)]);
      return playAccount(db, uid);
    }
    const r = await db.query('UPDATE play_accounts SET balance=balance-$2, deposited=deposited-$2 WHERE user_id=$1 AND balance >= $2 RETURNING user_id', [req.userId, b.data.amount.toFixed(6)]);
    if (!r.length) return reply.code(409).send({ error: 'insufficient_balance' });
    return playAccount(db, String(req.userId));
  });

  app.post('/v1/play/trade', { preHandler: requireUser }, async (req, reply) => {
    const b = Trade.safeParse(req.body);
    if (!b.success || (b.data.side === 'buy' ? !b.data.amount : !b.data.shares)) return reply.code(400).send({ error: 'bad_request' });
    const r = await executeTrade(db, bus, String(req.userId), b.data);
    if (!('ok' in r)) return reply.code(r.code).send({ error: r.error });
    void mirrorCopyTrades(db, bus, String(req.userId), b.data, req.log).catch((e) => req.log.error({ err: e }, 'copy trades failed'));
    return r.ok;
  });

  /** Weekly top traders by play P&L percentage (value vs deposits). */
  app.get<{ Params: { id: string } }>('/v1/markets/:id/book', async (req, reply) => {
    if (!/^\d+$/.test(req.params.id)) return reply.code(400).send({ error: 'bad_id' });
    const [m] = await db.query<{ price_yes: string; venue: string }>('SELECT price_yes, venue FROM markets WHERE id=$1', [req.params.id]);
    if (!m) return reply.code(404).send({ error: 'not_found' });
    return { priceYes: Number(m.price_yes), ...lmsrBook(Number(m.price_yes)) };
  });

  // Price history for the interactive chart. Ranges map to fixed windows; long windows are bucketed to <= ~800 points.
  const SINCE: Record<string, [string, number]> = { '1h': ["interval '1 hour'", 0], '1d': ["interval '1 day'", 120], '1w': ["interval '7 days'", 900], '1m': ["interval '30 days'", 3600], all: ["interval '100 years'", 3 * 3600] };
  app.get<{ Params: { id: string }; Querystring: { range?: string } }>('/v1/markets/:id/history', async (req, reply) => {
    const r = SINCE[req.query.range ?? '1w'];
    if (!r || !/^\d{1,18}$/.test(req.params.id)) return reply.code(400).send({ error: 'bad_request' });
    const [win, bucket] = r;
    const rows = bucket
      ? await db.query<{ t: number; o: number; h: number; l: number; c: number }>(
        `SELECT (floor(extract(epoch FROM ts) / ${bucket}) * ${bucket})::bigint * 1000 AS t,
           (array_agg(price_yes::float8 ORDER BY ts))[1] AS o, max(price_yes)::float8 AS h, min(price_yes)::float8 AS l, (array_agg(price_yes::float8 ORDER BY ts DESC))[1] AS c
         FROM market_prices WHERE market_id=$1 AND ts > now() - ${win} GROUP BY 1 ORDER BY 1`, [req.params.id])
      : await db.query<{ t: number; o: number; h: number; l: number; c: number }>(
        `SELECT (extract(epoch FROM ts) * 1000)::bigint AS t, price_yes::float8 AS o, price_yes::float8 AS h, price_yes::float8 AS l, price_yes::float8 AS c
         FROM market_prices WHERE market_id=$1 AND ts > now() - ${win} ORDER BY ts`, [req.params.id]);
    reply.header('cache-control', 'public, max-age=5');
    return { range: req.query.range ?? '1w', points: rows.map((x) => ({ t: Number(x.t), o: x.o, h: x.h, l: x.l, c: x.c })) };
  });

  app.get<{ Params: { id: string } }>('/v1/markets/:id/activity', async (req, reply) => {
    if (!/^\d+$/.test(req.params.id)) return reply.code(400).send({ error: 'bad_id' });
    const trades = await db.query<{ handle: string; display_name: string; avatar_url: string | null; side: string; outcome: number; shares: string; amount: string; price_yes: string; created_at: string }>(
      `SELECT u.handle, u.display_name, u.avatar_url, t.side, t.outcome, t.shares, t.amount, t.price_yes, t.created_at
       FROM play_trades t JOIN users u ON u.id=t.user_id WHERE t.market_id=$1 ORDER BY t.created_at DESC LIMIT 50`, [req.params.id]);
    const holders = await db.query<{ handle: string; display_name: string; avatar_url: string | null; outcome: number; shares: string; cost: string }>(
      `SELECT u.handle, u.display_name, u.avatar_url, p.outcome, p.shares, p.cost
       FROM play_positions p JOIN users u ON u.id=p.user_id WHERE p.market_id=$1 AND p.shares > 0.0001 ORDER BY p.shares DESC LIMIT 20`, [req.params.id]);
    return {
      trades: trades.map((t) => ({ handle: t.handle, display_name: t.display_name, avatar_url: t.avatar_url, side: t.side, outcome: Number(t.outcome), shares: Number(t.shares), amount: Number(t.amount), priceYes: Number(t.price_yes), created_at: t.created_at })),
      holders: holders.map((h) => ({ handle: h.handle, display_name: h.display_name, avatar_url: h.avatar_url, outcome: Number(h.outcome), shares: Number(h.shares), avg: Number(h.cost) / Number(h.shares) })),
    };
  });

  app.get('/v1/play/top', async () => {
    const rows = await db.query<{ handle: string; display_name: string; avatar_url: string | null; deposited: string; balance: string; pos_value: string; market_id: string | null; question: string | null; image_url: string | null; category: string | null }>(
      `SELECT u.handle, u.display_name, u.avatar_url, a.deposited, a.balance, bt.market_id, bm.question, bm.image_url, bm.category,
         COALESCE((SELECT sum(p.shares * CASE WHEN m.outcome='YES' THEN (p.outcome=1)::int WHEN m.outcome='NO' THEN (p.outcome=0)::int
              WHEN p.outcome=1 THEN m.price_yes ELSE 1 - m.price_yes END)
            FROM play_positions p JOIN markets m ON m.id=p.market_id WHERE p.user_id=a.user_id AND NOT p.redeemed), 0) AS pos_value
       FROM play_accounts a JOIN users u ON u.id=a.user_id
       LEFT JOIN LATERAL (SELECT t.market_id FROM play_trades t WHERE t.user_id=a.user_id ORDER BY t.amount DESC, t.created_at DESC LIMIT 1) bt ON true
       LEFT JOIN markets bm ON bm.id=bt.market_id
       WHERE EXISTS (SELECT 1 FROM play_trades t WHERE t.user_id=a.user_id AND t.created_at > now() - interval '7 days')`);
    const items = rows.map((r) => {
      const value = Number(r.balance) + Number(r.pos_value), dep = Number(r.deposited) || 1;
      return { handle: r.handle, display_name: r.display_name, avatar_url: r.avatar_url, pnl: value - dep, pnlPct: (value - dep) / dep,
        market: r.market_id ? { id: String(r.market_id), question: r.question ?? '', image_url: r.image_url, category: r.category } : null };
    }).sort((a, b) => b.pnlPct - a.pnlPct).slice(0, 12);
    return { items };
  });
}
