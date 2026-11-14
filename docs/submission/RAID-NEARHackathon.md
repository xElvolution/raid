# RAID, for NEAR HACKATHON

A short briefing on the problem, the product, the architecture and the interface. Pair this with the root README (how to try it, and the transaction tables) and with `docs/submission/SUBMISSION.md` (form fields and limits).

Event: NEAR HACKATHON, 1 to 14 Nov 2026. Tracks we recommend: `memecoins` (primary), `defi`, `social`. Status: NEAR testnet. Live app: https://raid.5-189-170-85.sslip.io

## The problem

Meme raids already happen, every day, in Telegram and X. A caller names a coin and a target. A crew piles in from several wallets and several chains. What they do not have is a shared set of rules they can check:

- Who called, and when.
- Who backed, and how much.
- Whether the buy was a surprise.
- Whether the caller sold below the line, or sold first.
- Whether fees were taken on a loss.

The caller can win even when the crew loses. The raid lives in a chat, not in a contract.

## The product

RAID is a war chest on NEAR with a public social layer around it.

1. Call. Anyone, or a crew DAO by vote, calls a raid: a target coin (including coins on other chains, addressed as Intents assets), a line of 1.5x, 2x or 3x, a crew window, and a retreat deadline.
2. Back. Backers send USDC into the chest during the window. A NEAR wallet can back directly. A MetaMask or Phantom user can back with no NEAR account, by signing an Intents payload (ERC-191 or raw Ed25519). Assets on other chains can arrive through a 1Click deposit whose message names the raid and the beneficiary.
3. Public countdown. When the window closes, a public countdown starts (10 minutes in the intended mainnet config; 1 minute on the current testnet chest so judges can finish a call). A buy before that time is refused.
4. Buy together. The chest spends the whole pot in one swap. It accepts only a 1Click-shaped quote whose signature it checks on chain. It can also derive its own key and sign its own buy intent with Chain Signatures. There is no human key on the chest.
5. Sell at the line, or retreat. Before the retreat deadline, `execute_sell` is refused unless the quote's minimum out is at least entry times the line. After retreat, the chest may sell at market.
6. Split. On a hit, fees come only from profit: 2.5% to the caller, 7.5% to a buyback reserve, 90% of profit plus the stake to backers, pro rata. On a miss, caller fee and buyback are zero, and backers share whatever came back.

It is a game with rules enforced by a contract, not an investment product.

Around that loop: crews are Sputnik DAO v2 accounts, so a passed proposal can be the call and the caller fee lands in the crew treasury; a feed and profiles show who called and who backed; a judge page issues a funded testnet account in the browser.

## Architecture

The chest is a NEAR contract, `contracts/raid-chest`, live on testnet as `raidchest-mwgr1bk0.testnet`. Important methods:

- `call_raid` opens a raid and sets the line, the window, the countdown and the retreat time.
- `ft_on_transfer` records a back, including a `for` beneficiary so a bridge can credit an EVM or Solana-style account.
- `execute_buy` / `execute_sell` check the signed quote, then move funds on the Intents account the chest is configured with.
- `mpc_bootstrap`, `mpc_register`, `mpc_sign_buy` talk to Chain Signatures (`v1.signer-prod.testnet` in the testnet run) so the chest can sign its own intent.
- `settle` moves Buying to Held, or Selling to Closed, and on close it writes the fee split.
- `claim_share`, `claim_share_for`, `claim`, `claim_into_intents` pay NEAR wallets and any-chain backers.
- Views include `get_raid`, `list_raids`, `get_backers`, `get_stake`, `get_claimable`, `get_buyback_bucket`.

The chest's `intents` setting is a contract address. On mainnet it should be `intents.near`. On testnet, because Intents and 1Click have no testnet (hackathon Q-007), that address is `contracts/intents-sim` at `raidvenue-mwgr1iba.testnet`. The stand-in speaks the methods the chest already calls (`ft_on_transfer`, `mt_transfer`, `mt_balance_of`, `ft_withdraw`, `add_public_key`). A solver account receives the pot at a deposit address and pays the target coin, or later pays tUSDC back. The solver sets the prices, so the fill and the price move are simulated. The chest rules are not.

Other contracts in the repo: `contracts/raid-launchpad` (a bonding-curve launchpad priced in USDC), `contracts/test-usdc` (tUSDC and the tPEPE target coin), and the Intents stand-in above. Chest and launchpad unit tests: 17 pass.

The app is a Next.js front end in `web/`, with a Fastify social API in `api/`. Raids are read live from the testnet chest. The judge faucet, server-side only, opens a `raid-judge-….testnet` account and sends tUSDC; the key is created in the browser and is not sent to the server.

### Partners actually used

| Partner | Use |
|---|---|
| NEAR Intents (1Click and `intents.near`) | Chest buy and sell, any-chain deposits, MetaMask and Phantom signed backs, payouts into an Intents account. Live fills are mainnet-only; testnet uses the stand-in above. Signatures were checked read-only with `simulate_intents`. |
| Chain Signatures | The chest derives a key and signs its own buy intent. Proven on testnet. |
| Sputnik DAO v2 (`sputnikv2.testnet`) | Crew treasuries and raid proposals that call `call_raid`. Proven on testnet, including the caller-fee claim into the DAO. |
| meme.cooking | Read-only list of live NEAR fair launches, when that page is present. |

Not used, and not claimed: Rhea, HOT, HEX, Aurora, Trezu.

## Interface

The product should feel like a social app whose object is a raid, not a dashboard of contract methods.

- Landing states the rule in one line and sends people into the app.
- The home screen is a feed: posts from callers and backers, with raid cards sitting in the stream, in a single readable column on a phone.
- A profile is a real page. Tap an account and see a bio, the raids they called, the raids they backed, and the wins and losses. Testnet accounts are marked as testnet so judges can see they are genuine test activity.
- A raid page is the room for that call: the chest, the pot, the line, the countdown, the backers, the status, and the list of transactions.
- Call a raid and Back are first-class actions, easy to reach on a phone.
- The judges page is separate from the feed, so instructions do not crowd the product.

The visual system is RAID's own: a light field, a single flare-orange accent, and a chrome war chest that tracks the pot and the line. The interface is being rebuilt around this loop. For the current live layout, open the app; this briefing describes the product the walkthrough should show.

## What has been proven on testnet

Hit path, raid #1, called by `raid-crew-mwgr1iba.sputnikv2.testnet`, 2x line:

- Four backers: two NEAR wallets (40 and 60 tUSDC), one EVM account (12), one Solana-style account (8). Pot 120 tUSDC.
- Buy during the countdown: refused.
- Bad quote signature: refused.
- Chain Signatures signed the chest's own buy intent.
- Buy at 1:1, then a sell below 2x: refused.
- Sell at the line, solver paid 246 tUSDC (2.05x, set by the solver). Closed as a hit. Caller 3.15, buyback 9.45, backers 233.40, all claimed, including any-chain payouts into the venue and the DAO claiming its fee.

Miss path, raid #2, 3x line, 1 hour retreat, 20 tUSDC from one backer: bought and held, then after the retreat deadline the chest sold at market at 0.7x. Result: 20 in, 14 out, no caller fee, no buyback, backer claimed 14.00. Settle tx: https://testnet.nearblocks.io/txns/Fk2k5zgfNKGc1bDVTUmSueZAqG73Vm2jTBi7pBLhSLGP. Full table in the root README; raw log in `evidence/testnet-lifecycle-run.json`.

An earlier rehearsal (`evidence/testnet-e2e-run.json`) passed 21 steps and blocked 4, because those four need Intents on mainnet. The lifecycle run above covers those four against the testnet stand-in.

## How a judge tries it, with no money

1. Open https://raid.5-189-170-85.sslip.io/judges and press Get a testnet judge account. The browser holds the key. The page shows a `raid-judge-…` account and tUSDC.
2. Open https://raid.5-189-170-85.sslip.io/raids/1 and read the hit, the split, and the transaction list. Open any tx on NearBlocks testnet.
3. Open the feed and a profile. Then call a raid and back it with 10 tUSDC. The new raid and the backer list come from the chest.
4. Use the payout slider on the judges page to see a hit and a miss for a chosen stake and line.

Every page is readable without signing in.

## Baseline and limits, in brief

The social app shell started from the team's earlier project Called. That is baseline, disclosed in the root README and in `docs/REUSE-MAP.md`. The chest, the launchpad, the raid loop, crews as DAOs, keyless backing, the judge faucet and the testnet evidence are new in the hackathon window.

Limits to keep visible: testnet only; Intents and 1Click have no testnet, so testnet fills are simulated by a stand-in venue and a solver that sets prices; no live mainnet swap yet; no automatic keeper on the hosted testnet chest; reel rewards are off-chain; buyback has no spend path yet; not audited; tiny amounts only.

License: MIT.
