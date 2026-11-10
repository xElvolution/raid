/**
 * Job processors. Pure functions over injected deps so they run identically under
 * BullMQ in production and directly in tests.
 */
import { z } from 'zod';
import type { Db } from './db/index.js';
import type { Bus } from './infra/bus.js';
import { getOpening, marketFromDraft, placeOpening } from './opening.js';

export interface WorkerDeps {
  db: Db;
  bus: Bus;
  fetch: typeof fetch;
  resolverUrl?: string;
  resolverToken?: string;
  expoAccessToken?: string;
}

const Draft = z.object({
  question: z.string(), outcomes: z.tuple([z.literal('NO'), z.literal('YES')]), closeMs: z.number(),
  rules: z.string(), sources: z.array(z.string()), clarity: z.number(),
});
export const DraftResponse = z.object({ mode: z.enum(['nearai', 'stub']), draft: Draft.nullable() });

async function pushNotification(deps: WorkerDeps, userId: string, kind: string, payload: Record<string, unknown>) {
  const [n] = await deps.db.query<{ id: string }>('INSERT INTO notifications (user_id, kind, payload) VALUES ($1,$2,$3) RETURNING id', [userId, kind, JSON.stringify(payload)]);
  await deps.bus.publish(`notifications:${userId}`, JSON.stringify({ type: 'notification', data: { id: String(n?.id), kind, payload }, ts: Date.now() }));
  await notify(deps, { userId, kind, payload });
}

/** Turn a post into a market draft via the resolver service (NEAR AI Cloud, or its stub mode). */
export async function draftMarket(deps: WorkerDeps, data: { postId: string }): Promise<'ready' | 'rejected' | 'failed' | 'skipped'> {
  const [post] = await deps.db.query<{ id: string; author_id: string; body: string }>('SELECT id, author_id, body FROM posts WHERE id=$1', [data.postId]);
  if (!post) return 'skipped';
  const done = await deps.db.query('SELECT 1 FROM market_drafts WHERE post_id=$1', [post.id]);
  if (done.length) return 'skipped';
  if (isExcludedMarket({ question: post.body })) return rejectForPolicy(deps, post);
  if (!deps.resolverUrl) {
    await deps.db.query("INSERT INTO market_drafts (post_id, author_id, status, mode) VALUES ($1,$2,'failed','none') ON CONFLICT DO NOTHING", [post.id, post.author_id]);
    return 'failed';
  }
  const res = await deps.fetch(new URL('/draft', deps.resolverUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(deps.resolverToken ? { authorization: `Bearer ${deps.resolverToken}` } : {}) },
    body: JSON.stringify({ post: post.body }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`resolver ${res.status}`); // BullMQ retries with backoff
  const r = DraftResponse.parse(await res.json());
  if (r.draft && isExcludedMarket({ question: `${r.draft.question} ${r.draft.rules ?? ''}` })) return rejectForPolicy(deps, post);
  const status = r.draft ? 'ready' : 'rejected';
  const ins = await deps.db.query<{ id: string }>(
    'INSERT INTO market_drafts (post_id, author_id, status, mode, draft) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (post_id) DO NOTHING RETURNING id',
    [post.id, post.author_id, status, r.mode, r.draft ? JSON.stringify(r.draft) : null],
  );
  if (ins[0] && status === 'ready') await launchOpening(deps, String(post.id), String(post.author_id));
  if (ins[0]) await pushNotification(deps, String(post.author_id), status === 'ready' ? 'draft_ready' : 'draft_rejected', { postId: String(post.id), draftId: String(ins[0].id), question: r.draft?.question ?? null, mode: r.mode });
  return status;
}

/** If the creator set an opening call in the studio, take the market live and place it. Never fails the draft job. */
async function launchOpening(deps: WorkerDeps, postId: string, authorId: string) {
  const o = await getOpening(deps.db, postId);
  if (!o) return;
  try {
    const mid = await marketFromDraft(deps.db, postId);
    const r = await placeOpening(deps.db, deps.bus, postId, mid);
    if (r?.status === 'placed') await pushNotification(deps, authorId, 'opening_placed', { postId, marketId: r.market_id, outcome: r.outcome, amount: r.amount });
    else if (r?.status === 'failed') await pushNotification(deps, authorId, 'opening_failed', { postId, error: r.error });
  } catch (e) {
    await deps.db.query("UPDATE opening_calls SET status='failed', error=$2, updated_at=now() WHERE post_id=$1 AND status<>'placed'", [postId, (e as Error).message.slice(0, 200)]);
    await pushNotification(deps, authorId, 'opening_failed', { postId, error: 'trade_failed' });
  }
}

export const POLICY_MESSAGE = "Called doesn't host markets on politics, elections or world conflicts, so this one stays a post. Try a take on sports, culture, tech or the weather.";

/** Reject a draft that falls under the content policy, and tell the author why. */
async function rejectForPolicy(deps: WorkerDeps, post: { id: string; author_id: string }): Promise<'rejected'> {
  const ins = await deps.db.query<{ id: string }>(
    "INSERT INTO market_drafts (post_id, author_id, status, mode) VALUES ($1,$2,'rejected','policy') ON CONFLICT (post_id) DO NOTHING RETURNING id",
    [post.id, post.author_id],
  );
  if (ins[0]) await pushNotification(deps, String(post.author_id), 'draft_rejected', { postId: String(post.id), draftId: String(ins[0].id), reason: 'policy', message: POLICY_MESSAGE });
  return 'rejected';
}

/** Deliver a notification to the user's devices through Expo push (covers iOS, Android, web). */
export async function notify(deps: WorkerDeps, data: { userId: string; kind: string; payload: Record<string, unknown> }): Promise<number> {
  const tokens = await deps.db.query<{ token: string }>('SELECT token FROM push_tokens WHERE user_id=$1', [data.userId]);
  if (!tokens.length) return 0;
  const messages = tokens.map((t) => ({ to: t.token, title: 'Called', body: notificationText(data.kind, data.payload), data: { kind: data.kind, ...data.payload }, sound: 'default' }));
  const res = await deps.fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...(deps.expoAccessToken ? { authorization: `Bearer ${deps.expoAccessToken}` } : {}) },
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`expo push ${res.status}`);
  const body = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
  // Prune tokens Expo reports as unregistered.
  for (const [i, r] of (body.data ?? []).entries()) {
    const tok = tokens[i]?.token;
    if (tok && r.status === 'error' && r.details?.error === 'DeviceNotRegistered') await deps.db.query('DELETE FROM push_tokens WHERE token=$1', [tok]);
  }
  return messages.length;
}

export function notificationText(kind: string, p: Record<string, unknown>): string {
  switch (kind) {
    case 'follow': return 'You have a new follower';
    case 'draft_ready': return `Your market is ready: ${String(p.question ?? '')}`.slice(0, 180);
    case 'draft_rejected': return p.reason === 'policy' ? POLICY_MESSAGE : "We couldn't turn that post into a fair market";
    case 'opening_placed': return `Your opening call is in: ${Number(p.outcome) === 1 ? 'YES' : 'NO'} $${Number(p.amount ?? 0)}`;
    case 'opening_failed': return p.error === 'insufficient_balance' ? 'Your opening call didn’t go through: not enough play balance. Top up and retry.' : 'Your opening call didn’t go through. Tap to retry.';
    case 'resolved': return 'A market you hold has resolved';
    default: return 'You have a new notification';
  }
}

// ---- Polymarket Gamma (read-only) ----

const GammaMarket = z.object({
  id: z.string(), question: z.string(), slug: z.string(), endDate: z.string().optional(), description: z.string().optional(),
  outcomes: z.string(), outcomePrices: z.string().optional(), volume: z.union([z.string(), z.number()]).optional(),
  volume24hr: z.union([z.string(), z.number()]).optional(), image: z.string().optional(), clobTokenIds: z.string().optional(),
  active: z.boolean(), closed: z.boolean(), events: z.array(z.object({ slug: z.string(), title: z.string().optional(), tags: z.array(z.object({ slug: z.string().optional(), label: z.string().optional() }).passthrough()).optional() }).passthrough()).optional(),
  tags: z.array(z.object({ slug: z.string().optional(), label: z.string().optional() }).passthrough()).optional(), category: z.string().optional(),
});
/** Product policy: no politics, elections, government or central-bank markets anywhere in Called. */
const BLOCKED_TAGS = new Set(['politics', 'elections', 'election', 'us-election', 'us-politics', 'global-elections', 'world-elections', 'geopolitics', 'trump', 'congress', 'senate', 'midterms', 'government', 'fed', 'fed-rates', 'economic-policy']);
const BLOCKED_TERMS = /\b(elections?|electoral|senate|senators?|house of representatives|congress(ional)?|president(ial|cy)?|presidents?|prime minister|governors?|gubernatorial|mayor(al)?|parliament(ary)?|referendum|ballot|primar(y|ies)|nominee|nomination|caucus|democrats?|democratic party|republicans?|gop|political|politics|party|parties|vote|votes|voting|voters?|impeach(ment)?|cabinet|white house|supreme court|balance of power|trump|biden|harris|vance|obama|desantis|newsom|putin|zelensky|netanyahu|starmer|macron|modi|xi jinping|tariffs?|federal reserve|the fed|fed (rate|interest|chair|decision|meeting)|interest rates?|fomc|rate (cut|hike)s?|bps|government shutdown|ceasefire|cease-fire|wars?|blockade|sanctions?|invasion|invade|troops|military|missile|airstrikes?|nuclear deal|nato|treaty|regime|supreme leader|diplomatic|annex(ation)?|iran(ian)?|israel(i)?|gaza|hamas|hezbollah|ukraine|russia(n)?|kremlin|taiwan|north korea|kim jong un|venezuela|maduro|hormuz|minister|ambassador|un security council|geopolitic(s|al))\b/i;

export function isExcludedMarket(m: { question: string; slug?: string; category?: string; tags?: { slug?: string; label?: string }[]; events?: { slug: string; title?: string; tags?: { slug?: string; label?: string }[] }[] }): boolean {
  const tags = [...(m.tags ?? []), ...(m.events ?? []).flatMap((e) => e.tags ?? [])];
  if (tags.some((t) => BLOCKED_TAGS.has((t.slug ?? '').toLowerCase()) || BLOCKED_TAGS.has((t.label ?? '').toLowerCase()))) return true;
  if (m.category && /politic|election|government/i.test(m.category)) return true;
  const text = [m.question, m.slug?.replace(/-/g, ' '), ...(m.events ?? []).flatMap((e) => [e.title, e.slug.replace(/-/g, ' ')])].filter(Boolean).join(' \n ');
  return BLOCKED_TERMS.test(text);
}

/** Remove any stored external market that violates the content policy (cascades to calls and price history). */
export async function purgeExcludedMarkets(db: WorkerDeps['db']): Promise<number> {
  const rows = await db.query<{ id: string; question: string }>("SELECT id, question FROM markets WHERE venue <> 'called'");
  const bad = rows.filter((r) => isExcludedMarket({ question: r.question })).map((r) => String(r.id));
  if (bad.length) await db.query('DELETE FROM markets WHERE id = ANY($1::bigint[])', [bad]);
  return bad.length;
}

export const GAMMA_URL = 'https://gamma-api.polymarket.com';
export const CLOB_URL = 'https://clob.polymarket.com';
const backfilled = new Set<string>();
/** One-time backfill of a week of real odds history from Polymarket's public CLOB prices-history endpoint. */
async function backfillHistory(deps: WorkerDeps, marketId: string, token: string, clobUrl: string) {
  if (backfilled.has(marketId)) return;
  backfilled.add(marketId);
  const [c] = await deps.db.query<{ n: number }>('SELECT count(*)::int AS n FROM market_prices WHERE market_id=$1', [marketId]);
  if ((c?.n ?? 0) >= 8) return;
  const u = new URL('/prices-history', clobUrl);
  u.search = new URLSearchParams({ market: token, interval: '1w', fidelity: '240' }).toString();
  const res = await deps.fetch(u, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return;
  const h = z.object({ history: z.array(z.object({ t: z.number(), p: z.coerce.number() })) }).safeParse(await res.json());
  if (!h.success) return;
  for (const pt of h.data.history.slice(-60)) {
    await deps.db.query('INSERT INTO market_prices (market_id, ts, price_yes) VALUES ($1, to_timestamp($2), $3) ON CONFLICT DO NOTHING', [marketId, pt.t, Math.min(1, Math.max(0, pt.p)).toFixed(6)]);
  }
}
const usd = (v: string | number | undefined) => BigInt(Math.max(0, Math.round(Number(v ?? 0) * 1e6))).toString();

/** Upsert the most active Polymarket binary markets and broadcast odds changes. */
export async function syncPolymarket(deps: WorkerDeps, opts: { limit?: number; gammaUrl?: string; clobUrl?: string } = {}): Promise<{ upserted: number; moved: number }> {
  const url = new URL('/markets', opts.gammaUrl ?? GAMMA_URL);
  url.search = new URLSearchParams({ active: 'true', closed: 'false', limit: String(opts.limit ?? 100), order: 'volume24hr', ascending: 'false' }).toString();
  const res = await deps.fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`gamma ${res.status}`);
  const list = z.array(z.unknown()).parse(await res.json());
  let upserted = 0, moved = 0;
  for (const raw of list) {
    const p = GammaMarket.safeParse(raw);
    if (!p.success || !p.data.endDate) continue;
    const m = p.data;
    if (isExcludedMarket(m)) {
      await deps.db.query("DELETE FROM markets WHERE venue='polymarket' AND external_id=$1", [m.id]);
      continue;
    }
    let outcomes: string[], prices: number[];
    try {
      outcomes = z.array(z.string()).parse(JSON.parse(m.outcomes));
      prices = z.array(z.coerce.number()).parse(JSON.parse(m.outcomePrices ?? '[]'));
    } catch { continue; }
    if (outcomes.length !== 2 || prices.length !== 2) continue;
    // Gamma lists the YES/first outcome first; store it as price_yes.
    const priceYes = Math.min(1, Math.max(0, prices[0] ?? 0.5));
    const pageSlug = m.events?.[0]?.slug ?? m.slug;
    const rows = await deps.db.query<{ id: string; old: string | null; price_yes: string }>(
      `WITH prev AS (SELECT price_yes FROM markets WHERE venue='polymarket' AND external_id=$1)
       INSERT INTO markets (venue, external_id, question, rules, close_ts, price_yes, volume, volume_24h, url, image_url, outcomes, clob_token_ids, updated_at)
       VALUES ('polymarket',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       ON CONFLICT (venue, external_id) DO UPDATE SET question=EXCLUDED.question, close_ts=EXCLUDED.close_ts, price_yes=EXCLUDED.price_yes,
         volume=EXCLUDED.volume, volume_24h=EXCLUDED.volume_24h, image_url=EXCLUDED.image_url, outcomes=EXCLUDED.outcomes, clob_token_ids=COALESCE(EXCLUDED.clob_token_ids, markets.clob_token_ids), updated_at=now()
       RETURNING id, (SELECT price_yes::text FROM prev) AS old, price_yes::text`,
      [m.id, m.question, (m.description ?? '').slice(0, 4000), m.endDate, priceYes.toFixed(6), usd(m.volume), usd(m.volume24hr), `https://polymarket.com/event/${pageSlug}`, m.image ?? null, JSON.stringify(outcomes), (() => { try { const t = z.array(z.string()).length(2).parse(JSON.parse(m.clobTokenIds ?? '')); return JSON.stringify(t); } catch { return null; } })()],
    );
    upserted++;
    const r = rows[0];
    if (r && (r.old === null || Number(r.old) !== Number(r.price_yes))) {
      await deps.db.query('INSERT INTO market_prices (market_id, price_yes) VALUES ($1, $2) ON CONFLICT DO NOTHING', [r.id, r.price_yes]);
    }
    const token = (() => { try { return z.array(z.string()).parse(JSON.parse(m.clobTokenIds ?? '[]'))[0]; } catch { return undefined; } })();
    if (r && token && !opts.gammaUrl) await backfillHistory(deps, String(r.id), token, opts.clobUrl ?? CLOB_URL).catch(() => undefined);
    if (r && r.old !== null && Number(r.old) !== Number(r.price_yes)) {
      moved++;
      await deps.bus.publish(`market:${r.id}`, JSON.stringify({ type: 'odds', data: { marketId: String(r.id), priceYes: Number(r.price_yes) }, ts: Date.now() }));
    }
  }
  await purgeExcludedMarkets(deps.db);
  return { upserted, moved };
}
