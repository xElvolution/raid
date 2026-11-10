# Called: product specification
> **Called is a social prediction market.** You post a take, AI turns it into a market, your friends trade it, and verifiable AI settles it.

Status: pre-hackathon core work, disclosed as such. Source research: `/workspace/hackathons/NEAR-STUDY.md`. Network: NEAR testnet, then mainnet.

## 1. Product pillars
1. **Social first.** Posts and theses (up to 3,000 chars) carry the author's position. Users follow callers, get notifications, and climb caller leaderboards.
2. **Post → market.** The AI reads a post and, if it's falsifiable, drafts a market with rules, a deadline, sources and a clarity score. It's created in one tap.
3. **Verifiable resolution.** A verifiable model on NEAR AI Cloud judges the outcome. The response signature, bound to the TEE attestation, is checked on-chain. There's a bonded dispute window.
4. **Every market in one place.** Called's own NEAR markets, plus external markets: Polymarket is tradable directly; Kalshi is read-only in v1.
5. **Playful.** Mascot, streaks, XP, weekly divisions, celebrations and haptics. All gamification is non-monetary.

## 2. Repository layout (each folder is standalone and has its own README and `.env.example`)
| Folder | What | Stack |
|---|---|---|
| `contracts/` | Market factory, NEP-245 outcome tokens, CPMM AMM, resolver, disputes | Rust, near-sdk 5 |
| `resolver/` | AI judge service: drafts markets, judges outcomes, verifies NEAR AI Cloud signatures | TypeScript (Node 20) |
| `api/` | REST + WebSocket realtime: feed, odds, trades, notifications | TypeScript, Fastify, ws, Postgres (Neon) |
| `sdk/` | `@called/sdk`: typed client for the API and contracts | TypeScript |
| `web/` | Web app | Next.js (App Router) |
| `mobile/` | iOS/Android app | Expo (React Native) |
| `landing/` | Marketing site + waitlist | Next.js static export |

## 3. Navigation and screens (same on mobile and web)
Tab bar on mobile, left rail on web:
1. **Home (feed).** For You / Following. Post cards, inline **market cards** (live odds sparkline, Yes/No chunky buttons), "called it" stamps, quote/reply/repost.
2. **Markets.** Called markets by category (Trending, Closing soon, New, Sports, Crypto, Culture, Politics, Macro*). Market page: chart, rules, sources, holders, comments, **resolution receipt**.
3. **External.** Polymarket (tradable where the geoblock allows) and Kalshi (read-only, with deep link). The same market card UI carries a venue badge and fee disclosure.
4. **Create (+).** Composer: text, link, screenshot (vision), or voice (Whisper). The AI draft panel shows question, outcomes, close time, resolution sources, a clarity score and edit fields. Publish post / publish post + market.
5. **Profile.** Handle (`name.called.near`), caller score (Brier and accuracy), PnL, win rate, streak, division badge, positions, posts. Tabs: Leaderboards (24h/7d/30d by category), Divisions (weekly league), Portfolio (own and external positions, deposit/withdraw).

Other screens:
- **Gamified onboarding:** 3 practice calls with the mascot, then sign-in (Google/Apple/email/passkey), age gate and region check.
- Notifications.
- Settings: limits, self-exclusion, points mode, security.
- Receipt viewer.
- Dispute flow.

*Macro and event topics are only shown as real-money markets where legal (§9).

## 4. Data model (Postgres)
- `users(id, handle, near_account, evm_address, display_name, avatar, country, age_verified, mode[points|real], created_at)`
- `follows(follower_id, followee_id, created_at)`
- `posts(id, author_id, body, thesis, media, market_ref, position_snapshot, created_at)`
- `markets(id, venue[called|polymarket|kalshi], external_id, question, outcomes[], rules, sources[], close_ts, status[open|closed|proposed|disputed|final|void], outcome, clarity, creator_id, created_at)`
- `trades(id, market_id, user_id, side, outcome, amount, shares, price, tx_hash, venue, created_at)`
- `positions(user_id, market_id, outcome, shares, cost_basis)` (materialised from trades)
- `resolutions(market_id, outcome, model, request_sha256, response_sha256, signature, signing_address, signing_algo, attestation_ref, tx_hash, created_at)`
- `disputes(id, market_id, disputer_id, bond, status, created_at)`
- `xp_events(user_id, kind, xp, created_at)`; `streaks(user_id, current, longest, last_day, freezes)`; `divisions(week, user_id, tier, xp)`
- `notifications(id, user_id, kind, payload, read, created_at)`

## 5. API (api/)
- REST `/v1`:
  - `auth/session`
  - `me`
  - `users/:handle`
  - `follows`
  - `posts` (GET feed?tab=foryou|following, POST)
  - `posts/:id`
  - `markets` (GET list, POST from draft)
  - `markets/:id`
  - `markets/:id/quote?side&amount`
  - `trades` (POST → returns tx to sign or relays a signed meta-tx)
  - `external/polymarket/markets`
  - `external/polymarket/order` (builds the EIP-712 order with the builder code; signature via Chain Signatures)
  - `external/kalshi/markets`
  - `leaderboards?window=24h|7d|30d&category`
  - `divisions/current`
  - `notifications`
  - `drafts` (proxy to resolver `/draft`)
- WebSocket `/v1/live`: subscribe to channels `feed:foryou`, `feed:user:{id}`, `market:{id}` (odds, trades), `notifications:{user}`. Server messages: `{type:"odds"|"trade"|"post"|"notification"|"resolution", channel, data, ts}`.
- Validation with zod, rate limits per IP and user, geofence middleware (§9).

## 6. Contracts (contracts/)
v1 is a single contract `called.near`, with market state inside it; a sub-account per market is v2.
- **Collateral:** a NEP-141 stablecoin (USDC), received via `ft_on_transfer` with msg `{"action":"deposit"}`. Internal balances; `withdraw` sends it back.
- **Market factory:** `create_market(question, close_ts_ms, liquidity)` takes seed liquidity from the creator's balance and emits an event.
- **Outcome tokens (NEP-245 core):** token id `"{market_id}:{0|1}"` (0 = NO, 1 = YES). `mt_balance_of`, `mt_batch_balance_of`, `mt_transfer`, `mt_total_supply`. Event logs follow the NEP-245 standard format (`mt_mint`, `mt_burn`, `mt_transfer`).
- **AMM:** a binary complete-set CPMM (Gnosis FPMM-style).
  - Buy with `x` collateral: mint `x` YES + `x` NO into the pool, then pay out the bought side keeping `pool_yes*pool_no` constant.
  - Sell is the inverse.
  - Fee in bps goes to the LP/creator and protocol split.
  - Price of YES = `pool_no/(pool_yes+pool_no)`.
- **Resolver:**
  - The owner registers judge keys (`ed25519` 32-byte pubkey or `ecdsa` 20-byte address) after the off-chain attestation check (§7).
  - `propose_resolution(market_id, outcome, request_sha256, response_bytes, signature, signer)` checks that:
    1. the signer is registered;
    2. `text = request_sha256 ":" sha256(response_bytes)`;
    3. the signature is valid over `text` (ed25519_verify, or EIP-191 ecrecover);
    4. `response_bytes` contains the verdict tag `CALLED_VERDICT:{market_id}:{YES|NO|INVALID}` matching `outcome`.
  - That opens a dispute window.
- **Dispute:** `dispute(market_id)` with a bond, during the window. The `court` account (multisig/DAO) calls `settle_dispute(market_id, outcome)`. The bond is refunded if the dispute succeeds and slashed to the treasury if it fails. `finalize(market_id)` runs after the window with no dispute.
- **Redeem:** after final, each winning share = 1 collateral unit; INVALID pays 0.5 per share of each side.

## 7. AI judge (resolver/)
- **Draft:** post text → JSON `{question, outcomes, close_ts, rules, sources, clarity}` (verifiable model, structured output).
- **Judge:**
  1. The resolver fetches the sources itself, hashes them, and puts the evidence inside the prompt, so the evidence sits inside the signed request bytes.
  2. The model must end with `CALLED_VERDICT:{id}:{YES|NO|INVALID}`.
  3. A 3-model panel (kimi-k2.6, deepseek-v3.2, qwen3.5-397b) with a 2-of-3 majority. If there's no majority the result is INVALID, which escalates to the court.
- **Verification flow (docs.near.ai):**
  1. `GET /v1/attestation/report?model=…&signing_algo=…&nonce=…` → verify the TDX/NVIDIA quotes (or the Intel Trust Authority JWT); extract `signing_address`.
  2. `POST /v1/chat/completions` (exact request bytes kept).
  3. `GET /v1/signature/{chat_id}?model=…&signing_algo=…` → `{text, signature, signing_address, signing_algo}`.
  4. Locally check `text == sha256(req):sha256(resp)` and the signature, and that the signer matches the attested address.
  5. Submit to the contract.
- Without `NEARAI_API_KEY`, a deterministic **stub judge** signs with a local ed25519 key using the identical format, so the contract path is tested end-to-end.

## 8. Design system ("playful")
- **Palette:** Called Green `#58CC02`-family primary, Sky `#1CB0F6`, Sun `#FFC800`, Coral `#FF4B4B` (NO), Leaf (YES), Ink `#1F2937`, Cloud `#F7F7F7`; dark mode equivalents.
- **Type:** rounded geometric (Nunito / "Feather"-style), heavy weights for numbers.
- **Chunky 3D buttons:** a solid face plus a 4px darker bottom border. On press, translateY 4px and remove the border. Spring animation (Reanimated), with haptic `impactMedium`.
- **Mascot "Calli":** a Rive state machine with idle / thinking / cheer / faint / fire (streak) / sleepy states, which reacts to trades, wins, losses and streak danger.
- **Celebrations:** confetti (Lottie) plus a coin burst plus `notificationSuccess` haptics on wins; a gentle "faint" on losses.
- **Streaks:** at least one call per day (points or real). Freezes, with Revival events.
- **XP:** for calls, accurate calls and well-rated theses.
- **Divisions:** weekly Bronze → Silver → Gold → Sapphire → Ruby → Emerald → Diamond, with the top 7 promoted and the bottom 5 demoted.
- **Daily 5:** a swipe deck of 5 quick calls.
- **Rule:** XP, streaks, divisions and badges are **never** convertible to money or tokens (Apple 3.1.5(v)).

## 9. Compliance
- **Geofence:** IP plus declared country. The Polymarket geoblock endpoint is checked before every external order. Real-money modes are only allowed in an allow-list of jurisdictions after legal review.
- **Age gate:** 18+ (21+ where required).
- **Points mode:** the default on iOS and in restricted regions; no cash value.
- **Limits:** daily deposit and loss limits, cool-off, self-exclusion, responsible-play links.
- **Fees:** disclosed before every trade, including builder fees on external venues.
- **Moderation:** banned market topics (death, assassination, self-harm, minors, private persons).
- **KYC tier:** required above withdrawal thresholds (partner).
- **Branding:** Called is clearly independent of external venues.

## 11. Scaling plan (target: millions of users)
- **API:**
  - Stateless Fastify pods behind a load balancer, autoscaled on CPU and p95 latency.
  - No session state in memory: JWT access tokens, with refresh tokens in Postgres.
  - All per-user state lives in Postgres or Redis.
- **Postgres (Neon / managed PG):**
  - One primary for writes; **read replicas** serve feed, leaderboard and market reads (the API routes read-only queries to the replica pool).
  - PgBouncer or another connection pooler.
  - **Indexes:**
    - `posts(author_id, created_at desc, id)`, `posts(created_at desc, id)`
    - `follows(follower_id, followee_id)` (PK), `follows(followee_id)`
    - `trades(market_id, created_at desc)`, `trades(user_id, created_at desc)`
    - `positions(user_id)`, `markets(status, close_ts)`, `markets(venue, external_id)` unique
    - `notifications(user_id, read, created_at desc)`, `xp_events(user_id, created_at)`
  - Partition `trades` and `xp_events` by month once they pass ~100M rows.
- **Cursor pagination everywhere:** keyset `(created_at, id)`, never OFFSET.
- **Feeds:**
  - Hybrid fan-out. A post from a normal user is pushed to followers' timelines (Redis sorted sets `tl:{user}` capped at 800 entries).
  - Celebrity callers (more than 10K followers) are pulled at read time and merged.
  - For You comes from a ranking job (engagement, recency, follow graph) cached per segment.
- **Redis cluster:**
  - Cache: market snapshots and odds with a 1–5s TTL, profiles, leaderboards (sorted sets `lb:{window}:{category}`).
  - **Rate limits:** sliding window per IP, user and route.
  - **Pub/sub:** fan-out channels `market:{id}`, `feed:*`, `notif:{user}`.
- **WebSockets:**
  - Separate stateless `ws` gateway pods. Each pod subscribes to Redis pub/sub only for channels its connected clients hold (reference-counted).
  - Horizontal scale ≈ 50–100K connections per pod (estimate); sticky sessions are not required.
  - Odds updates are coalesced (at most one per market per 250 ms).
- **Queues (BullMQ on Redis):**
  - `draft-market` (AI post→market)
  - `resolve-market` (judge panel at close_ts, with retries and backoff, idempotent by market id)
  - `relay-tx` (meta-tx relayer)
  - `notify` (push)
  - `index-reconcile`
  - Workers scale independently. NEAR AI Cloud concurrency (default 64 per model per org) caps resolver throughput, so jobs are rate-limited per model.
- **Indexer:**
  - Consumes NEAR blocks (NEAR Lake / an indexer framework) and parses `EVENT_JSON` logs (`called`, `nep245`).
  - **Idempotent:** upserts are keyed by `(receipt_id, log_index)`, a checkpoint table stores the last block height, and reorg/finality handling uses final blocks only.
  - Writes trades, positions and resolutions, then publishes to Redis.
- **Media:** user uploads go to object storage (R2/S3) through presigned URLs and are served via CDN with image resizing. The landing page and the web app's static assets are also on the CDN.
- **Observability:** OpenTelemetry traces, Prometheus metrics (p95 latency, WS connections, queue lag, indexer lag), Sentry, structured logs.
- **Contracts:** v1 keeps all markets in one contract. Hot markets contend on a single shard. v2 moves to a sub-account per market (`{id}.markets.called.near`) so state spreads across shards.

## 10. Out of scope for v1 (roadmap)
Called Arcade (physics prediction games, points-first), Called Audio, Kalshi execution (ISV agreement), sub-account-per-market, limit orders.
