# @called/api

Stateless Fastify 5 backend: REST + realtime websockets, NEP-413 sign-in, idempotent chain indexer, BullMQ queues.

## Run
```
cp .env.example .env   # fill DATABASE_URL, REDIS_URL, JWT_SECRET
npm i && npm run migrate && npm run dev
```
`npm test` uses in-process Postgres (PGlite) + in-memory bus/kv/queue; no services needed. `npm run lint`, `npm run typecheck`.

## REST (v1)
| Method | Path | Notes |
|---|---|---|
| POST | /v1/auth/nonce | HMAC-stamped nonce, 5 min TTL, single use |
| POST | /v1/auth/signin | NEP-413 signed message; key checked as full-access via RPC; returns JWT |
| GET | /v1/me | auth |
| GET | /v1/users/:handle | followers / following / streak |
| POST/DELETE | /v1/follows/:handle | auth; follow notifies followee live |
| POST | /v1/posts | auth; `makeMarket: true` queues an AI market draft |
| GET | /v1/feed?tab=foryou\|following&author=&cursor= | keyset cursor pagination |
| GET | /v1/markets?status=&venue=&sort=new\|volume&cursor= | `sort=volume` = top 50 open by 24h volume |
| GET | /v1/markets/:id | market + last 50 trades + verifiable resolution |
| GET | /v1/leaderboards?window=24h\|7d\|30d | Redis sorted sets |
| GET | /v1/notifications | auth |
| GET | /v1/drafts | auth; AI market drafts from your posts |
| POST | /v1/push-tokens | auth; Expo push token |
| POST | /v1/external/polymarket/order | auth + geofence (451 in blocked regions). Order routing **not implemented yet** (501) |

## Realtime: `GET /v1/live` (WebSocket)
Send `{"op":"sub","channel":"market:42"}` / `{"op":"unsub",...}`. Channels: `feed:global`, `feed:user:{id}`, `market:{id}`, `notifications:{yourId}` (only your own; auth with Bearer header).
Events: `post`, `trade`, `odds` (coalesced to max 4/s per market), `notification`, `resolution`.
Each node subscribes to Redis channels it has sockets for only (ref-counted), so the API scales horizontally behind any LB.

## Scaling
See SPEC.md §11: replicas for reads, Redis for pub/sub, rate limits and leaderboards, BullMQ for side effects, indexer dedup on `(receipt_id, log_index)`.

## Workers (`npm run worker`)
BullMQ processors in `src/workers.ts` (pure functions, tested on PGlite):
- `draft-market`: post → resolver `/draft` (NEAR AI Cloud, or the resolver's labelled stub mode without a key) → `market_drafts` + live `draft_ready` notification. Idempotent per post; resolver errors throw so BullMQ retries with backoff.
- `notify`: Expo push to registered devices, prunes `DeviceNotRegistered` tokens.
- `external-sync`: Polymarket Gamma read-only sync every 30 s (one scheduler across replicas). Upserts the top binary markets by 24h volume and broadcasts `odds` on `market:{id}` when prices move.
