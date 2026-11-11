# RAID: call a raid on any memecoin, on any chain

> Built at NEAR HACKATHON (Nov 2026). Tracks: `memecoins`, `social`. Status: **testnet**. Nothing is deployed to mainnet and no real funds are used.
> Baseline disclosure (HACKATHON.md Q-003/Q-004): the social app shell comes from the team's earlier project *Called*
> (`docs/REUSE-MAP.md`). The RAID chest and launchpad contracts, raid pages, social feed on raids, any-chain backing and the
> Intents / Chain Signatures integration are new in the window.

## What it is
A social feed where anyone can **call a raid** on a memecoin on any chain (PEPE on Ethereum, DOGE, TRUMP on Solana, NEAR tokens...).
A crew backs the call. A **war chest contract** buys the coin through **NEAR Intents** after a public countdown, and sells only when the
price reaches the caller's line (1.5x / 2x / 3x), or at the retreat deadline. It is a game, not an investment product.

### The deal, in numbers (enforced by the contract)
On a **hit**, fees come out of **profit only**: 2.5% to the caller, 7.5% to a buyback reserve. Backers keep the stake plus 90% of profit.
On a **miss** nobody takes a fee, and backers share whatever came back, which can be anything from the full stake down to zero.

| Line | Back 100, line hits | Net return | Line misses |
|---|---|---|---|
| 1.5x | 145.00 | +45% | 0 – 100 |
| 2x | 190.00 | +90% | 0 – 100 |
| 3x | 280.00 | +180% | 0 – 100 |

The app shows "You get X if the line hits / you can lose the pot" in the call and back flows, using the same `payout_preview` view the contract exposes.

### Guard rails
- **Public countdown**: after the crew window closes there is a 10-minute public countdown (`buy_delay_minutes`) before `execute_buy` or `mpc_sign_buy` may run. The target and the buy time are public, so nobody gets a surprise buy.
- **Size caps**: 250 tUSDC per backer, 1,000 per raid on testnet (`max_back`, `max_pot`). Direct backers get the excess refunded in the same transaction. Bridged deposits that overflow are parked as `claimable` for the beneficiary.
- **Minimum crew window**: 10 minutes (`min_open_minutes`). **Fee ceilings** are hard-coded: caller ≤ 5%, buyback ≤ 10% of profit.
- **Keyless chest**: every swap must carry a 1Click-signed quote that the contract checks (assets, amount, min-out ≥ the line, refund to the chest). Optional stronger mode: the contract signs its own `token_diff` intents through Chain Signatures (MPC). See `docs/KEYLESS-FEASIBILITY.md`.

### Back from any chain
Back with SOL or USDC on Solana, ETH or USDC on Base or Ethereum, or USDC on Arbitrum through **NEAR Intents 1Click deposit addresses**.
1Click swaps to USDC and calls `ft_transfer_call` on the chest with `{"back": raid, "for": "<your NEAR account>"}`, so the stake is
credited to you, not the bridge. On testnet the UI shows **real read-only 1Click quotes** (dry, no deposit address). Live deposit
addresses are behind a flag because Intents only runs on mainnet. See `docs/ANYCHAIN.md`.

### Social
Fomo-style feed at `/feed`, plus crew chat on every raid: post, reply, like, follow callers, `$TICKER` and raid tags.
Sign-in is a NEP-413 message signed by your NEAR wallet (no transaction, no gas). Seeded posts come from three accounts marked **DEMO**.

### Launchpad (testnet)
`/launch`: anyone can create a coin on a constant-product bonding curve priced in USDC. 1B supply, 800M on the curve, no presale, no team
allocation, 1% of each trade goes to the creator. Contract: `launch.raid-chest-mwab3vnk.testnet`. There is no RAID token.

## Why NEAR
- **NEAR Intents** lets one NEAR contract buy and sell coins that live on other chains, and lets users fund it from any chain.
- **Chain Signatures** let the chest sign its own intents with no human key.
- Named accounts make crews and callers readable.

## Try it (judges: do X, see Y)
<!-- TODO before submission: add the hosted demo URL -->
1. `cd contracts && cargo test` -> 15 tests pass (11 chest: lifecycle, countdown refusal, fee split, net return per line, size caps, bridged beneficiary; 4 launchpad).
2. `cd api && npm ci && npm test` -> 32 tests. `npm run dev:local` starts the API on :8787 with PGlite and the labelled demo seed.
3. `cd web && npm ci && npm run build && npx next start -p 3311`, open http://localhost:3311/raids -> live raids read from `raid-chest-mwab3vnk.testnet`. `/feed` needs the API from step 2 (`NEXT_PUBLIC_RAID_API`, default `http://localhost:8787`).
4. `cd scripts && npm ci && node quote-check.mjs` -> fetches a dry 1Click quote and prints `sdk verifyQuoteSignature: true`.
5. `node testnet-v2.mjs flows` replays the signed testnet flows. `node mainnet-go-no-go.mjs check` is read-only; spending stages refuse to run without `--i-confirm-mainnet`.

### Testnet v2 transactions (NEAR testnet)
| Step | Tx |
|---|---|
| Chest v2 deploy / `migrate_v2` | `5aLp3MvaVQxyK7WVYMaReFQvip2B4QbAqhqpdzqJrstv` / `EQ2pdVj3gNDCNbSYNsbJgNmDMhjczCvFFRVzRZKCZM2k` |
| Chest upgrade (any-chain backing) | `2c3ekTcz5DSutRG7fQFXF17MaDp288xW3QCB6z93h9BW` |
| `call_raid` PEPE 1.5x (raid 0) | `CqMscZaysodEPjwENV8WmLCdBKEhoJqg4eNf4uoFVnHE` |
| Back 5 tUSDC | `CzeS4dAgf8C2iQbhke6XQrrGinvkAphK23KjGJ3XJfG` |
| Back 260, cap 250, 15 refunded | `5xSuDjitZZagba2Ufo6HNVbCiAhkrYe3pVputB7bPyYj` |
| `call_raid` DOGE 2x (raid 1) | `H3Duup41dvMZHCeUkhy5ZXsv8zoBHmYRQDVEKuiWB3Zd` |
| Bridged back 20 credited to beneficiary | `3bqaP3UiJCqrZL3g6Ui2ehtziwBZmDsjXGYmoN3xuCu6` |
| Launchpad deploy / init | `AXMpvjssax6uj3L8YinUBp7vy59U4Mj8NkaAjkt1kAde` / `DK5QKnnEucukqMAV6CJeD3bxQNdgi3w2Fr86oNKLMmnR` |
| `create_coin` RFROG / buy 20 / sell half | `5hBuJt8Quy6b1JSgiJ4MC2yU9m1ji8tdD2h6ieDJkfpq` / `6VQ2nuMe4HaCWiv9SFbTzsvD4Yp2NEdMJaiQx24LhqNB` / `5RvUw4cm8q6ey3AUEJZ7zb15cGegZhCxkjko7hxdpnzf` |

Back transactions show a failed receipt for the detached forward to Intents: Intents does not exist on testnet. The stake is recorded on the chest either way. Full log: `scripts/testnet-v2-run.json`.

## Layout
| Path | What |
|---|---|
| `contracts/raid-chest` | War chest: `call_raid`, back via `ft_on_transfer` (caps, `for` beneficiary), countdown-gated `execute_buy` / `mpc_sign_buy`, `execute_sell`, `distribute` (profit split), `claim_share`, `payout_preview` |
| `contracts/raid-launchpad` | Bonding-curve launchpad: `create_coin`, buy via `ft_transfer_call`, `sell`, `transfer`, `claim_fees`, quotes |
| `contracts/test-usdc` | Testnet stablecoin with faucet |
| `web/` | Next.js app: feed, live tape, raids, call and back flows, any-chain backing, launchpad, caller cards, ranks |
| `api/` | Social API: posts on raids and coins, replies, likes, follows, NEP-413 sign-in |
| `scripts/` | testnet runs, mainnet go/no-go, quote check, screenshot runner |
| `docs/` | feasibility research with sources, any-chain design, reuse map |

## Known limits (honest)
- Testnet only. Intents, 1Click and the MPC signer are mainnet services, so testnet raids record stakes but cannot swap. A mainnet chest needs funding (see `scripts/mainnet-go-no-go.mjs`).
- Path 1 price floors are 1Click's `minAmountOut` promise, not enforced by the intents verifier; Path 2 enforces it on-chain but needs a 1Click partner API key.
- The buyback reserve accumulates on hits and has no withdraw method yet. What it buys is an open decision now that the RAID token is cut.
- Launchpad coins live in the launchpad's own ledger, not separate NEP-141 contracts; graduation to a Rhea pool is not built.
- Solana-only users need a NEAR account (or an implicit account) as beneficiary to claim.
- Swap attribution assumes one in-flight swap per token (enforced by the contract). Not audited. Tiny amounts only.

## License
MIT (see `LICENSE`).
