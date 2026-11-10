# RAID: call a raid on any memecoin, on any chain

> Built at NEAR HACKATHON (Nov 2026). Tracks: `memecoins`, `social`. Status: work in progress, not deployed to mainnet.
> Baseline disclosure (HACKATHON.md Q-003/Q-004): the social app shell comes from the team's earlier project *Called*
> (`docs/REUSE-MAP.md`). The RAID chest contract, raid pages and Intents/Chain Signatures integration are new in the window.

## What it is
A fast social feed (Fomo-style) where anyone can **call a raid** on a memecoin on any chain (PEPE on Ethereum, DOGE, TRUMP on Solana, NEAR tokens...).
A crew backs the call. A **war chest contract** buys the coin through **NEAR Intents** and auto-sells only when it is worth the caller's line (1.5x / 2x / 3x), or at the retreat deadline.
Profit goes to the crew; a share buys back and burns RAID; the caller's fee is locked and paid **only if the line is hit** (no reward for hype-and-dump).
It is a game, not an investment product.

## Why NEAR
- **NEAR Intents** lets one NEAR contract buy and sell coins that live on other chains, in one place.
- **No human key on the chest.** Every swap must come with a 1Click-signed quote that the contract checks itself (assets, amount, min-out >= the raid's line, refund to the chest) before it moves funds. Optional stronger mode: the contract signs its own `token_diff` intents through **Chain Signatures** (MPC EdDSA). See `docs/KEYLESS-FEASIBILITY.md`.
- NEP-141 for RAID and launchpad coins (planned), named accounts for crews.

## Try it (judges: do X, see Y)
<!-- TODO before submission: replace testnet values with the mainnet deployment and a hosted demo URL -->
1. `cd contracts && cargo test` -> 5 tests pass, including a real 1Click quote signature checked by the contract's rules.
2. `cd web && npm ci && npm run build && npx next start -p 3311`, open http://localhost:3311/raids -> live raids read from the chest contract `raid-chest-mwab3vnk.testnet`.
3. `cd scripts && npm ci && node quote-check.mjs` -> fetches a dry 1Click quote and prints `sdk verifyQuoteSignature: true`.
4. `node mainnet-go-no-go.mjs check` -> read-only mainnet check (salt, dry quote). Spending stages refuse to run without `--i-confirm-mainnet`.

## Layout
| Path | What |
|---|---|
| `contracts/raid-chest` | War chest: `call_raid`, back via `ft_on_transfer`, `execute_buy` / `execute_sell` (1Click-signed quotes), `settle`, `claim_share`, `claim`, `mpc_bootstrap` / `mpc_register` / `mpc_sign_buy` |
| `contracts/test-usdc` | Testnet stablecoin with faucet |
| `web/` | Next.js app (feed, raids, caller cards, leaderboard) |
| `api/` | Social API (posts, follows, notifications), raid indexer planned |
| `scripts/` | testnet run, mainnet go/no-go, quote check |
| `docs/` | feasibility research with sources, reuse map, run logs |

## Roadmap (Wed-Sat)
- RAID NEP-141 token + launchpad coins; Rhea buyback-and-burn of the buyback bucket.
- Replace yes/no market components with raid cards; memecoin price charts; call composer; backer flow with wallet.
- Strip remaining prediction-market API code; raid indexer for the feed.
- Mainnet chest on a named account with keys removed; demo video.

## Known limits (honest)
- Path 1 price floors are 1Click's `minAmountOut` promise, not enforced by the intents verifier; Path 2 enforces it on-chain but needs a 1Click partner API key.
- Swap attribution assumes one in-flight swap per token (enforced by the contract).
- Not audited. Tiny amounts only.

## License
MIT (see `LICENSE`).
