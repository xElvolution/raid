# Changelog
Pre-hackathon core work for the NEAR Hackathon (1–14 Nov 2026), disclosed as such. Real commit dates; no history rewriting.



## [Unreleased]

### Added
- Settlement proof page (`/markets/[id]/proof`), which re-verifies the AI judge's verdict in your browser: both sha256 hashes and the ECDSA signature against the published signer, with a NEAR receipt link. Demo verdicts are signed by a clearly labelled preview key.
- Polymarket trade screen (`/external/[id]/trade`) with the live CLOB order book (proxied with a cache, timeout and stale fallback), Yes/No, buy/sell, market or limit, tap-a-level pricing, fill and price-impact estimates, and error states.
- `POST /v1/external/:id/order`: auth, region gate, per-user rate limit, validation and an audit table (`external_orders`). It routes through the Polymarket CLOB client only when `POLYMARKET_*` keys are set and answers 503 otherwise. Tests included.
- `POST /v1/drafts/preview`: a live AI market draft with a policy filter and rate limit.
- `KEYS-NEEDED.md` lists every key or account the integrations need.

### Changed
- The battle header now shows live odds as Yes % – No % on every theme instead of a score.
- Feed-card battles use three units per side at about twice the size, kept inside the arena.
- Removed the mascot everywhere. Empty states use the brand mark or an icon on a dot grid, and the 404 page is rewritten.
- A full-screen purple CALLED IT win screen with a circle reveal, staggered letters, a counting payout and confetti, plus Share and Continue buttons with a hard bottom edge. It appears on profitable sells and once for each newly won position on the portfolio.
- Market page tab content slides with a spring in the direction of the tab change.
- Battle themes now follow each market's subject, not just its category. New themes:
  - GTA and gaming: rival cartoon crews in fedoras, getaway cars crashing in and explosions.
  - F1: race cars with kerbs and a chequered frontline.
  - Boxing and UFC: fighters in a roped ring throwing jabs.
  - Movies: clapperboard crew vs critics, popcorn volleys and a projector beam.
  - Space: rockets vs saucers with lasers and a starfield.
- New demo markets for boxing, UFC and Starship, with cover art for each subject.
- Bull vs bear battle for every crypto and Bitcoin market: horned green bulls charge across the field and red bears with ears, fur and claws swipe back. Each trade sends an animal charging at the frontline, the defenders it hits get knocked back, and the trader's avatar rides on the animal.
- Battle view: a live, animated Yes-vs-No arena on canvas. It is the hero of the market page and a mini version on feed cards that plays when scrolled into view. Themes: football (live scoreline and GOAL burst), bull vs bear for crypto, fan armies, robots, sun vs storm, and arcade tanks. Trades drive the attacks, big trades shake and flash the arena, trader avatars appear as units, and there is a sound toggle.
- Shared-element page transitions (View Transitions API): the card question and the battle morph into the market page.
- Generated photo avatars for demo users and cover art for markets, shown behind the battle arena.
- @mentions, $tickers, #tags and links are styled in posts.
- Order book (synthetic LMSR depth), activity, holders and comments endpoints.

### Changed
- Yes is green and No is red everywhere, with tinted odds fills that turn solid once called.
- The market page has one unified call/trade box: the odds rows pick the side, and a free call is offered inside the trade box.

## Unreleased: design v4

- Studied the Farcaster, X, Threads and Instagram feeds (`research/`, `TEARDOWN.md`) and rebuilt the design system from that study: Lucide icons at one stroke weight, a single solid purple accent (#7C5CFF) used only for interactive emphasis, flat near-black surfaces, hairline dividers, edge-to-edge 15px feed rows and a flat tab bar.
- Market embeds are now poll-style link previews. Market detail adds comments, live activity (including play trades), holders and an order book backed by the market maker (`GET /v1/markets/:id/book|activity|comments`).
- No gradients anywhere. The logo mark is a solid purple tile and is used on the landing page too.

## Unreleased: brand, demo account, play trading, new home

- Brand: new geometric "rising check" mark (SVG mark, mono mark, favicon, 1024 app icon, options sheet in `brand/`). Product name lives in one constant (`web/src/lib/brand.ts`).
- API: play-money engine (`api/src/play.ts`) with an LMSR market maker, deposits/withdrawals, buy/sell Yes/No, value history and weekly top traders. One-tap demo sign-in (`POST /v1/auth/demo`, `DEMO_MODE=1`), and `created` flag on sign-in.
- Seed: `api/scripts/seed-demo.ts` creates AI-drafted markets across sports, crypto, culture, tech, music and weather with odds history, plus a fully populated demo trader.
- Web: new signed-in home (portfolio value and P&L chart, deposit/withdraw sheet, weekly top calls strip, Daily 5 card, Watchlist / Called / Polymarket market lists with category chips), floating tab bar, new sign-in with Try demo, balance-first welcome flow, Explore page (Kalshi hidden), trade ticket on market detail, play portfolio, and a "Called it" win moment.

## 2026-10-21 (content policy)

### api
- No politics, elections, government, geopolitics or central-bank markets anywhere: the Polymarket sync drops them by tag/category plus a keyword fallback, deletes any stored copy, and purges existing rows after each sync (cascades to calls and price history). Tests cover the classifier and the purge.
- Landing fallback sample and product screenshots refreshed accordingly.
- AI market drafts follow the same policy: political posts are rejected before reaching the AI, and AI drafts that come back political are rejected too (`mode: policy`). The author gets a friendly notification explaining why. Test added.

## 2026-10-21 (evening)

### design v4
- Restrained product UI: near-black #0A0A0B, hairline borders, a single blue accent, Inter with tight tracking, 8px spacing grid. No gradient blobs, no cartoon chrome; the mascot appears only in onboarding, empty states and celebrations.
- App shell like a desktop social client: left nav, feed column, right rail with trending markets (sparklines) and top callers; clean five-tab mobile bar.
- Market cards with a headline probability, real odds sparkline, change since the start of the window, Yes/No price chips, volume and countdown. Market detail shows a full odds chart.
- New Portfolio (open/settled calls, entry vs current price, edge in probability points, win rate). Leaderboard as a ranked table. Profiles with a stats strip (win rate, settled, calls, streak, XP).
- Landing rebuilt around real product screenshots (desktop frame + phone), a live market card, live volume counter, scroll-linked device tilt.

### api / sdk
- `market_prices` odds history: snapshots on every change plus a one-time backfill from Polymarket's public prices-history endpoint. Markets lists include `spark`; market detail includes the full series. `/v1/predictions/mine` returns positions joined with current market state.

## 2026-10-21 (later)

### design
- Brand v3: dark-first social UI (near-black surfaces, one violet accent, green Yes / red No, Inter). Flat 1px hairline surfaces replace the chunky 3D buttons; mascot appears only in onboarding, empty states and celebrations.
- Feed reads like a social app: avatars, handles, timestamps, reply/repost/like/share actions with spring micro-animations, rich market cards (animated odds bars, volume, countdown, Yes/No chips with live prices), position stamps.
- Profiles get a banner plus win rate, calls and won/settled stats from settled free calls.

### api / sdk
- Free calls ("points mode"): `POST /v1/predictions`, `GET /v1/predictions/mine`, `GET /v1/daily` (5-card deck). 10 XP per call, streak update, no monetary value. Profile adds calls, calls_resolved, calls_won.

### web
- Daily 5 swipe deck (drag to call), XP pop-ups, streak and league celebrations, confetti/coin bursts, haptics, skeleton loaders, page transitions. Served under `/app` (`APP_BASE_PATH`).

### landing
- New `landing/` static site at `/`: animated hero with live Polymarket cards (real odds over websockets, no simulated movement), live ticker, how it works with scroll-linked progress, leagues and streaks, verifiable AI judge pipeline, download CTA, FAQ. Tests + lint + static export.

### deploy
- Edge routes `/` to the landing export, `/app` to the web app, `/v1` + `/health` to the API (path-traversal guarded, tested). Screenshots and screen recordings in `shots/`.

## 2026-10-21

### deploy
- Preview on a shared VPS: isolated Postgres 17 + Redis containers, pm2 `deploy/preview.config.cjs` (services bound to localhost, ports 4710-4715), Cloudflare quick tunnel. API/resolver bind host configurable via `HOST`.
- 390px screenshots of key screens in `shots/`.

### web
- Next.js 16 app with every screen: onboarding, NEAR sign-in (NEP-413 via wallet-selector), home feed (For you / Following, live new-post pill), Called markets + detail (live odds, sparkline, trade panel, AI verdict proof, live activity), external Polymarket markets, create (post → AI draft), leagues, profile, alerts.
- Duolingo-style design system: Calli SVG mascot with moods, chunky 3D buttons, streak/XP chips, divisions, confetti, haptics, reduced-motion support.
- 8 component/unit tests, eslint (next + react-hooks), typecheck, production build.

### api / deploy
- Profile returns XP (total, week, today), longest streak, post count. BullMQ-safe job ids (MemoryJobs now enforces the same rule). RedisBus.close().
- `scripts/seed.ts` dev/preview seed (refuses production). `deploy/` single-port preview edge (HTTP + websocket routing) with test.
- Verified end to end locally on Postgres 17 + Redis: live Polymarket sync, post → resolver (stub) → draft → live notification, websockets through the edge.

### api workers
- `draft-market` (resolver `/draft`, stub mode without NEARAI key), `notify` (Expo push, dead-token pruning), `external-sync` (Polymarket Gamma read-only, odds broadcast on change). BullMQ entrypoint `src/worker.ts`.
- New: `market_drafts`, `push_tokens`; external market fields (url, image, outcomes, 24h volume); `GET /v1/drafts`, `POST /v1/push-tokens`, `GET /v1/markets?sort=volume`. 15 tests.

### sdk
- `@called/sdk`: typed REST client (all endpoints, `CalledError`, cursor `paginate()`), auto-reconnecting `LiveClient` (ref-counted subscriptions replayed on reconnect, jittered backoff), `CalledContract` (RPC views + wallet-ready transactions, slippage helper). 8 tests, eslint strict, builds to ESM + d.ts.
- api: live events normalised to camelCase payloads; `/v1/live` accepts `?token=` for browser sockets.

### api
- Fastify 5 REST API: NEP-413 sign-in (single-use HMAC nonces, RPC full-access key check, JWT), users, follows, posts, cursor-paginated feeds, markets, leaderboards, notifications.
- Realtime `/v1/live` websockets with Redis pub/sub fan-out, per-socket ref-counting and coalesced odds.
- Idempotent indexer for contract events (dedupe on receipt + log index), positions, volume leaderboards.
- Per-IP and per-user rate limits; geofence on real-money external routes (Polymarket order routing still a 501 stub).
- 11 integration tests on PGlite (auth replay/tamper, pagination, indexer idempotency, websocket fan-out).

### contracts
- `trade` events now carry `price_yes_ppm`; `market_created` carries `close_ms`.

- docs: product spec (`SPEC.md`).
- contracts: market factory, NEP-245 outcome tokens, binary CPMM AMM, NEAR AI Cloud signature resolver (ed25519 + ECDSA/EIP-191), bonded disputes, redemption. 19 unit tests pass; clippy clean; wasm builds with cargo-near (283 KB).
- docs: scaling plan (SPEC §11).
- resolver: AI judge service. NEAR AI Cloud client, response-signature verification (ed25519 + ECDSA/EIP-191), TEE attestation binding checks (report data, nonce, MRCONFIGID, RTMR3; quote via dcap-qvl), 2-of-3 panel, post→market drafting with banned-topic filter, Fastify HTTP. 25 tests, eslint strict, tsc strict. Stub judge when no key.
- contracts: cross-language test, a verdict signed by the TS resolver is accepted on-chain (20 tests).

## 2026-10-28 — Testnet production
- Privy login (`POST /v1/auth/privy`, ES256 JWT via JWKS or verification key, linked email/NEAR wallet lookup); web sign-in uses Privy when `NEXT_PUBLIC_PRIVY_APP_ID` is set. Demo and NEAR sign-in behind env flags.
- On-chain mode: contract gains a custodial operator (`set_operator`, `buy_for`/`sell_for`/`redeem_for`/`create_market_for`/`release_for`, `deposit_for`) and `court_resolve`. API executes trades, faucet, withdrawals and payouts on NEAR testnet; DB mirrors chain results with tx hashes.
- Test USDC token (`contracts/test-usdc`) with a 24h faucet; FundsSheet shows the faucet in chain mode.
- Resolution worker: AI judge proposal when NEARAI is configured, finalize after the dispute window, court fallback, holder redemption.
- Deployed to testnet: `called-markets-2478.testnet`, `called-usdc-2478.testnet`. Verified e2e: faucet → buy → sell → court resolve → redeem.
- `deploy/deploy-prod.sh` + `deploy/prod.config.cjs` (called-prod-*, ports 472x). Contract tests 22, API tests 39.
