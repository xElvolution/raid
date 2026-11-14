# RAID

**Call a raid on any memecoin. Your crew backs it. A keyless war chest on NEAR buys together and can only sell at the line.**

Live page: [https://raid.5-189-170-85.sslip.io](https://raid.5-189-170-85.sslip.io)

> NEAR HACKATHON, Nov 2026. Tracks: `memecoins` (primary), `defi`, `open`, `social` (crews are Sputnik DAOs).
> Status: **NEAR testnet**. Nothing is deployed to mainnet and no real funds are used. Every number below links to a testnet transaction.
> Baseline disclosure (Q-003/Q-004): the social app shell comes from the team's earlier project *Called* (`docs/REUSE-MAP.md`).
> Everything else is new in the window: the chest and launchpad contracts, raids, Raid War, crews, reels, keyless backing, the judge kit and the Telegram bot.

## The problem
Meme "raids" happen in Telegram and X every day. Someone shouts "PEPE to 2x", people pile in, and insiders dump on the crowd.
Nobody can see who bought, when, or whether the caller sold first, and the caller wins either way.

## How RAID works
1. **Call.** Anyone, or a crew DAO by vote, calls a raid: a coin on any chain (PEPE on Ethereum, DOGE, TRUMP on Solana, NEAR tokens), a line (1.5x, 2x or 3x) and a retreat deadline.
2. **Back.** The crew backs it with USDC during the crew window. You can back from a NEAR wallet, from MetaMask or Phantom with **no NEAR account** (NEAR Intents signed intents), or from SOL, ETH or USDC on other chains through 1Click deposit addresses.
3. **Public countdown.** After the window, a 10-minute public countdown runs. The target and the buy time are on chain, so nobody gets a surprise buy.
4. **Buy together.** The chest buys the whole pot in one swap through **NEAR Intents**. It refuses any swap without a quote signed by 1Click that it checks on chain. Alternatively, it signs its own intent with **Chain Signatures**; no human key exists.
5. **Sell at the line, or retreat.** The chest can only sell at ≥ entry × line, or at market after the retreat deadline.
6. **Split.** On a hit, fees come only out of **profit**: 2.5% to the caller and 7.5% to a buyback reserve. Backers keep the stake plus 90% of the profit. On a miss nobody takes a fee, and the caller earns nothing.

| Line | Back 100, line hits | Net | Line misses |
|---|---|---|---|
| 1.5x | 145.00 | +45% | 0 – 100 |
| 2x | 190.00 | +90% | 0 – 100 |
| 3x | 280.00 | +180% | 0 – 100 |

It is a game with rules enforced by a contract, not an investment product.

### Around the raid
- **Raid War** (`/war`): two crews compete for 24 hours. Firepower is USDC backed into their DAO-called raids; hits are realised multiples. A share card is rendered at `/api/war/card`.
- **Crews are Sputnik DAOs** (`sputnikv2.testnet`): a raid is a `FunctionCall` proposal to `call_raid`. When it passes, **the DAO itself is the caller**, so the caller fee goes to the crew treasury.
- **Reels** (`/reels`): a vertical video feed that markets raids. Upload an mp4 of up to 60 s, or paste an X, Instagram or TikTok link. Each reel shows the coin, the live raid phase and a Back button. A back through a reel is verified on chain and credits the creator 20% of the caller's fee on a hit (*off-chain attribution, not yet on the contract*). `/reels/top` ranks creators.
- **Launchpad** (`/launch`): bonding-curve coins priced in USDC, with a 1% creator fee. It also shows live fair launches from meme.cooking (read-only).
- **Social:** a feed and crew chat on every raid, with NEP-413 sign-in (no gas).
- **Telegram bot:** `/raid PEPE 2x` posts a countdown card with a Back button. It edits the card as the crew fills and announces the hit or retreat (code and mock tests; not run live).

## Built with NEAR partners
| Partner | What RAID uses it for | Where |
|---|---|---|
| **NEAR Intents** (1Click + `intents.near`) | The chest's buy and sell swaps, checked against a 1Click-signed quote; any-chain deposits; MetaMask (ERC-191) and Phantom (raw Ed25519) signed backs with no NEAR account; payouts into an intents account (`claim_into_intents`) | `contracts/raid-chest/src/lib.rs` (`execute_buy`, `check_quote`, `ft_on_transfer` `for`), `web/src/lib/keyless.ts`, `docs/ANYCHAIN.md` |
| **Chain Signatures** (`v1.signer-prod.testnet`) | The chest derives its own key and signs its own `token_diff` buy intent (`mpc_sign_buy`); no keeper key | `contracts/raid-chest/src/lib.rs` (`mpc_*`), `docs/KEYLESS-FEASIBILITY.md` |
| **Sputnik DAO v2** (`sputnikv2.testnet`) | Crew treasuries; raids are DAO proposals that call the chest when they pass; Raid War scores DAOs | `scripts/crews.mjs`, `web/src/lib/crews.ts`, `web/src/app/war` |
| **meme.cooking** | Read-only list of live NEAR fair launches on `/launch` | `web/src/app/api/market/launches/route.ts` |

Not used: Rhea, HOT, HEX, Aurora and Trezu. We don't claim them.

## Architecture
```mermaid
flowchart LR
  subgraph Users
    N[NEAR wallet]
    MM[MetaMask / Phantom<br/>no NEAR account]
    X[SOL / ETH / USDC<br/>on other chains]
    J[Judge mode<br/>prefunded testnet key]
  end
  subgraph Web["web/ (Next.js 16)"]
    UI[Raids · War · Reels · Launch · Feed · Judges]
    KV[/api/keyless/verify<br/>simulate_intents/]
    Q[/api/anychain/quote<br/>1Click/]
  end
  subgraph API["api/ (Fastify + Postgres)"]
    SOC[Social feed · NEP-413 sign-in]
    RL[Reels + verified reel attribution]
    TG[Telegram bot]
  end
  subgraph NEAR
    DAO[Crew DAOs<br/>sputnikv2.testnet]
    CH[RAID chest<br/>raid-chest-mwab3vnk.testnet]
    LP[Launchpad]
    MPC[Chain Signatures<br/>v1.signer-prod]
    INT[NEAR Intents<br/>intents.near · mainnet]
  end
  N & J -->|ft_transfer_call back| CH
  MM -->|signed intent ft_withdraw for=signer| INT
  X -->|1Click deposit| INT
  INT -->|ft_transfer_call back,for| CH
  DAO -->|passed proposal: call_raid| CH
  CH -->|execute_buy / execute_sell with signed quote| INT
  CH -->|mpc_sign_buy| MPC
  UI --> CH & LP & DAO
  UI --> SOC & RL
  KV -->|read-only view| INT
  RL -->|check back tx| CH
  TG -->|read raids| CH
```

## Try it with no money
Everything runs on NEAR testnet with a test USDC (`tusdc.raid-chest-mwab3vnk.testnet`).
1. Open `/judges`. Each judge has a **prefunded testnet account** (testnet NEAR plus 500 tUSDC). Paste the key from the submission notes; it stays in your browser's localStorage and only signs testnet transactions. No wallet install is needed.
2. Back a live raid: `/raids` → pick a raid → **Back this raid**. The receipt links to the testnet explorer.
3. Vote in a crew: `/war` → Frog Legion has an open proposal. Your Yes vote can pass it, and then the DAO calls the raid on the chest.
4. Try the payout slider on `/judges`: pick a stake and a line, and see the hit and the miss.
5. No key? Every page is readable without signing. Reels, the war board and raid receipts are all public.

## Evidence (NEAR testnet)
- `evidence/testnet-e2e-run.json`: the full **testnet rehearsal**, one script (`scripts/testnet-e2e.mjs`), with a pass/fail checklist in `docs/TESTNET-E2E.md` and a 390 px screenshot per step in `scripts/shots/prod/v4/e2e/`.
- `evidence/testnet-txs.json`: every logged testnet transaction resolved over the archival RPC: signer, receiver, block, and any failed receipts. It is built by `scripts/receipts.mjs` from `testnet-v2-run.json`, `crews-run.json`, `keyless/keyless-run.json`, `judge-run.json` and `testnet-e2e-run.json`.
- `scripts/keyless/keyless-run.json`: MetaMask and Phantom signatures accepted by mainnet `intents.near` `simulate_intents` (read-only), with tamper controls.
- `evidence/telegram-mock-run.txt`: what the bot posts for `/raid PEPE 2x` against the live testnet chest.

Highlights from the rehearsal (raid #6, `$TRUMP` 2x):
| Step | Tx |
|---|---|
| Crew DAO proposes `call_raid` | `AzaGzU2DzYMEQz2y3mY24V1PwC94dqcdnJpQJPapdBYF` |
| Second vote passes it; the DAO calls raid #6 | `85jtMEp2Qxqa9KFpt21KnPBxsL9qMe5EBHofemUjXW12` |
| Back from a NEAR wallet, 40 tUSDC | `6R482mgBBYoRQm2D27MzW7TnmxTn2qkHHEYPrG9rYLZi` |
| MetaMask-derived account backs 12 | `7CfiouYJWK9CThJXDjdFJmPQKitKUAu9cBNQLvZoVa91` |
| Phantom-derived account backs 9 | `AqTUMBDUtajabaYq3vxSdMm8X6ocWmbDZWRUfLSfyZGn` |
| Back through a reel, verified by the API | `pQivDuLEL9DQWXJRrKQHpPDYTAr8xjDMGs2P7vdC9pt` |
| Launchpad create / buy / sell / creator claims fees | `8xjYTUaBT6fTL16Ae1ezFRLzMauBcvZeziQZHURp3LJH` / `DhP5PWjB5x1v89RFxuaNwzm85M8H8gLCsi5fYduYAbYh` / `FVwq4CT3JvWU9bd7XXy17qXggiRD9xHmq8EEdh41xaSF` / `7tGeYWLFuX472tKvhXApQwRM2guGi5TAaZAT9eHYx5rN` |
| Chain Signatures: the chest derives its key, then signs its own buy intent for the 91 tUSDC pot | `3JcLvFxqd5xxk6eUJqdGcig1SeabKgA7BjJWJLVb79Ym` / `FZGSY98xpwKyJoUuBRAJFW2o34HkNwiTYtNQqpiQXHBZ` |

Result: **21 steps pass, 0 fail, 4 blocked only because NEAR Intents and 1Click are mainnet-only** (the swap, settle and claim). See `docs/TESTNET-E2E.md`.

The back transactions show one failed receipt, on `intents-not-on-testnet.…`: after recording the stake, the chest forwards the USDC into NEAR Intents, which does not exist on testnet. The stake is recorded either way.

## Run it
1. `cd contracts && cargo test`: chest and launchpad unit tests (lifecycle, countdown, fee split, caps, bridged beneficiary, keyless claims).
2. `cd api && npm ci && npm test`: social, reels and Telegram bot tests. `npm run dev:local` serves the API on :8787 with PGlite. `SEED_DEMO=1` adds clearly labelled sample posts and reels (the seed script uses `demo_*` account names).
3. `cd web && npm ci && npm run build && npx next start -p 3420`, then open `/raids`. Raids are read live from the testnet chest.
4. `cd scripts && npm ci && node testnet-e2e.mjs a` (then `b` about 20 minutes later) replays the rehearsal on testnet. `node mainnet-go-no-go.mjs check` is read-only, and spending stages refuse to run without `--i-confirm-mainnet`.
5. `cd api && npm run telegram:mock` is a dry run of the bot. `TELEGRAM_BOT_TOKEN=… npm run telegram` runs it live.

## Layout
| Path | What |
|---|---|
| `contracts/raid-chest` | War chest: `call_raid`, backing (caps, `for` beneficiary), countdown-gated `execute_buy` / `mpc_sign_buy`, `execute_sell`, `settle`, profit split, `claim_share(_for)`, `claim_into_intents`, `get_backers` |
| `contracts/raid-launchpad` | Bonding-curve launchpad: `create_coin`, buy via `ft_transfer_call`, `sell`, `claim_fees` |
| `contracts/test-usdc` | Testnet stablecoin |
| `web/` | Next.js app: raids, war, reels, launch, feed, judges, keyless backing |
| `landing/` | Public static landing page, live at https://raid.5-189-170-85.sslip.io |
| `api/` | Social API, reels, Telegram bot |
| `scripts/` | Testnet runs, E2E rehearsal, receipts, screenshot runner, reel renderer |
| `docs/` | Build log, E2E checklist, any-chain design, keyless research, walkthrough script, X post draft |
| `evidence/` | Resolved testnet transactions and run logs |

## Known limits (honest)
- **Testnet only.** NEAR Intents and 1Click are mainnet services. Testnet raids record stakes, DAO calls and Chain Signatures signatures, but cannot swap, so no testnet raid has settled and Raid War hits are 0. The settle and claim paths are covered by contract unit tests (`full_raid_lifecycle`, `miss_pays_no_fees_and_backers_can_lose`, `anyone_can_settle_a_keyless_backer_into_intents`).
- On testnet, a stand-in account plays the Intents bridge for MetaMask and Phantom backs. The signatures themselves are checked by mainnet `intents.near` (read-only `simulate_intents`).
- Reel-creator rewards are tracked by the API, not by the contract (*off-chain attribution, not yet on the contract*). Seeded reels and posts are marked as sample data and come from `demo_*` accounts; the reels are rendered from real price candles. No real people appear.
- The buyback reserve accumulates on hits and has no spend method yet. Launchpad coins live in the launchpad ledger, not separate NEP-141 contracts. Graduation to a DEX pool is not built.
- One in-flight swap per token, enforced by the contract. **Not audited.** Tiny amounts only.

## License
MIT (see `LICENSE`).
