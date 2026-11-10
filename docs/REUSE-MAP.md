# What RAID reuses from Called

Called (the user's earlier NEAR project, a social prediction-market app) was found at `/workspace/called`
(git remote https://github.com/xElvolution/called, last commit c4fcd89, 5 Nov 2026). It was copied here without
`.git`, `node_modules`, build output, screenshots, Android build files or env files. Nothing in `/workspace/called` was changed.

| Called part | Status in RAID |
|---|---|
| `web/` Next.js app: Shell, nav, feed, PostCard, social, messages, notifications, leaderboard, caller cards, streaks/XP, charts (lightweight-charts), wallet sign-in | **Kept**, rebranded to RAID. New: `/raids`, `/raids/[id]`, `components/RaidCard.tsx`, `lib/raid.ts` (reads the chest contract live) |
| Polymarket/Kalshi pages and tabs (`app/external`, Polymarket tab on Home, "From Polymarket" on Explore, Polymarket in the rail and feed) | **Removed** |
| Daily 5 (swipe yes/no market deck) | **Removed** |
| `MarketCard`, `MarketDetail`, `TradePanel`, `/markets` (yes/no odds) | Still present; to be replaced by raid cards/detail on Wed |
| `contracts/` prediction market (CPMM AMM, NEP-245 outcome shares, AI resolver) | **Removed**; replaced by `contracts/raid-chest` |
| `contracts/test-usdc` | **Kept** (testnet base coin with faucet) |
| `api/` (Fastify + Postgres): posts, follows, notifications, messages, leaderboard, realtime | Keep the social parts; **to strip on Wed**: `external.ts`, `polymarket-router.ts`, Polymarket sync worker, yes/no market tables; add a raid indexer |
| `resolver/` (AI judge for prediction markets) | Not used by RAID; delete or keep out of the submission |
| `sdk/`, `mobile/`, `landing/`, `design-lab/`, `brand/` | Kept as-is for now; mobile/landing need rebranding before any use |
| Called docs (SPEC, plan, changelog) | Moved to `docs/called-baseline/` |
