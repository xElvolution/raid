# RAID Founder-style stress test

**Date:** 11 Nov 2026, Africa/Lagos (WAT).  
**Question:** is the idea cool — as a NEAR Hackathon entry, and as something people would actually use?  
**Method:** one capped pass in the style of the Founder skills from the reel saved at `/workspace/raid/inspo/ig/DfjNZJuxD5q.info.json`. The skills repo is public and MIT-licensed: [Jakeschincariol/founder-skill](https://github.com/Jakeschincariol/founder-skill). This pass borrows its structure (board lenses and fund / fund-if / pass votes, a sourced competitor map, labelled unit economics, a 100-persona panel, a plain verdict). It does not run the repo's 100 sub-agent buyer calls or its Python tools.

**This is a simulated gut check, not proof.** The reel and the Founder README both warn that language-model panels lean agreeable (their coffee example: the AI panel said yes 92% of the time, a real-people read was 41%). Treat every "use" here as the most you might get, then test on real people. Persona names are fictional. Nothing in the panel is customer testimony.

**Product scored, as it stands today (11 Nov 2026):** a Fomo-style social feed plus a planned pump.fun-like launchpad on NEAR; anyone can call a raid on a memecoin on any chain; a keyless war chest buys through NEAR Intents / Chain Signatures and auto-sells only at 1.5x, 2x or 3x (or at a retreat deadline); on a hit, 5% of profit goes to the caller (fee locked until then) and 20% to a RAID buyback-and-burn bucket; backers share the rest. Tracks: Memecoins and Social. Hard deadline: Sun 15 Nov 00:59 Africa/Lagos (WAT). The chest is on testnet; a real mainnet fill is still waiting on the user's yes and a small fund. The launchpad is not shipped. The contract is not audited. Sources for the product: `/workspace/raid/README.md`, `/workspace/raid/contracts/raid-chest`, `/workspace/raid/docs/KEYLESS-FEASIBILITY.md`, `/workspace/near-scout/quiet-track-pick.md`.

No app code was changed. Nothing was pushed, signed or spent.

---

## 1. Board

The board applies published frameworks. It is not Hormozi, Thiel or Jobs, does not speak as them, and does not claim they would endorse anything. Lenses, in short: Offers (value equation from *$100M Offers* — dream outcome, perceived likelihood, time delay, effort and sacrifice, plus a real guarantee); Monopoly (from *Zero to One* — a secret, a monopoly wedge, not a 1-to-n clone); Product (from Isaacson's *Steve Jobs* — focus, taste, saying no until one loop is right). A fourth seat is added because this is also a hackathon entry: a NEAR judge looking at the official Memecoins and Social tracks.

**Vote: 3 FUND IF, 1 PASS. Average score: 5.8 / 10.**

### Offers lens — Score: 5 / 10 — Vote: PASS

**What is strong.** The offer has a real guarantee element, which is the best part of the value equation here: the caller is paid only if the line is hit, the chest is meant to be keyless, and a sale before retreat cannot go through below 1.5x / 2x / 3x. That is more honest than a paid Telegram raid shift, which is billed whether the chart prints or not.

**What would kill it.** (1) Perceived likelihood is poor. A public raid is a late entry. Most memecoins do not deliver 1.5x after that kind of call, and the base-case backer math in section 3 is negative. (2) Effort and sacrifice are high: a NEAR wallet, a new app, USDC sitting in a chest until a line or a retreat. Incumbents (pump.fun, Fomo, GMGN, Axiom, Telegram) already own the habit. (3) Time delay can be days to 28 days, which is a long time to be stuck in a joke coin.

**Questions.** What share of raids actually hit 1.5x from a post-call entry? Why would a Solana degen open a NEAR wallet this week? Where does the protocol itself earn, if caller fee and buyback only fire on a win and there is no protocol cut today?

**Why PASS.** As a business to put real capital behind, this is not a grand slam offer. The mechanism is clever; the value equation for a typical backer, under assumptions labelled below, does not clear. A PASS is a result, not a slight. It does not mean the hackathon entry is worthless — that is the judge's seat.

### Monopoly lens — Score: 6 / 10 — Vote: FUND IF

**What is strong.** There is a real secret, not a vibe: one keyless NEAR contract can buy native memecoins on other chains through Intents and refuse to sign a sale below a fixed line, with no price oracle and no admin key. Telegram raid groups cannot do that. Fomo cannot do that. pump.fun cannot do that. If the team's earlier board survey is right, no current Memecoins-track entry uses Intents for the mechanic itself.

**What would kill it.** (1) Leading with "Fomo-style feed plus pump.fun-like launchpad" is 1-to-n copying in markets that already have the users and the liquidity. (2) Distribution. A wedge on NEAR does not become a monopoly if the customers never leave Solana. (3) The RAID token buyback is a circular game and is not the secret.

**Conditions.** Fund only if the product is the keyless cross-chain chest and the locked-until-hit caller rule — not a social clone, not a third NEAR launchpad. Drop or defer the launchpad until the chest has live fills.

### Product lens — Score: 5 / 10 — Vote: FUND IF

**What is strong.** The loop that could be beautiful is short: call a line, the chest buys, it can only sell at the line or at retreat, the proof is on-chain, the caller is unpaid if it fails. Auto-sell is a product decision, not a dashboard setting.

**What would kill it.** (1) Scope. A social network, a launchpad, a platform token, a war chest and a video in four days is how none of them get finished. (2) The social shell is reused from Called. That is allowed if disclosed (HACKATHON.md Q-003/Q-004), but a reskin with an unproven loop will not feel inevitable. (3) Fixed 1.5x / 2x / 3x only is a sharp rule, and also a reason many short-cycle traders will bounce.

**Conditions.** Ship one proven raid loop on mainnet, on video, with do-X/see-Y steps. Say no to the launchpad and the token until that loop is real. If the mainnet fill is not on the tape, this is a well-designed prototype, not a finished product.

### NEAR hackathon judge lens — Score: 7 / 10 — Vote: FUND IF

**What is strong.** Memecoins is still a relatively quiet track. The mechanic uses NEAR Intents and Chain Signatures in a load-bearing way, which is what the stack prizes. The README already lists honest limits (Path 1 min-out is a 1Click promise, not an intents-verifier rule; unaudited; tiny amounts). Reuse of Called is disclosed. The "fee locked until the line hits" rule is easy to explain in a demo.

**What would kill it.** (1) No mainnet raid-and-sell on the video — the go/no-go in the plan. A testnet chest plus a dry 1Click quote is not the same claim. (2) "Raid" as coordinated buying is a reputational problem, even as a game. (3) Half-built launchpad and a reused feed will read as unfinished scope.

**Conditions.** A real mainnet buy and a rule-respecting sell (or an honest failed-fill, with the contract refusing a sub-line sale) on the demo video by Sat 14 Nov 18:00 Africa/Lagos (WAT), with explorer links in the README. Keep the reuse disclosure obvious. Do not market it as an investment product.

### Risks more than one member raised

- Mainnet fill still unproven.
- Incumbents already have the users.
- Coordinated-buying / "raid" optics.
- Unaudited chest and cross-chain attribution risk.
- Scope (launchpad + social + token) distracting from the one loop that matters.

### Strongest version the board can see

This may differ from the pitch. The strongest version is not "Fomo plus pump.fun on NEAR." It is a small, public, rule-bound treasury game: anyone can call a line on a named coin, a keyless chest buys it, it cannot sell below that line until retreat, the caller is unpaid if it misses, and every fill is a link on an explorer. The feed exists only to show live raids. There is no launchpad and no platform token until that loop has been used with real money.

---

## 2. Competitors

Only verified names, prices and complaints. If a figure is from a secondary article, that is said. Nothing here was invented.

### Direct and close

**pump.fun** — Solana memecoin launchpad, the default place to launch and trade new coins.  
Prices (official fees page, last updated 17 Oct 2026): no platform fee to create a coin (network rent only); bonding-curve trades 1.25% total (0.30% creator, 0.95% protocol, 0% LP); graduation 0.015 SOL; PumpSwap canonical pool fees are tiered by market cap, from 1.25% down to 0.30%. From 17 Oct 2026, trades in the pump.fun web or mobile app also pay a 0.45% Platform Fee (0.40% with a referral code). Custom-pair and holder-rewards variants are documented on the same page.  
Source: [https://pump.fun/docs/fees](https://pump.fun/docs/fees)  
Complaints (sourced): the co-founder has said the creator-fee model "failed" and skewed people toward low-risk coin creation instead of trading ([Cryptonews](https://cryptonews.com/news/pump-fun-co-founder-says-fee-model-failed-announces-system-revamp/)). Critics argued deployers are not "creators" and that value is extracted from traders. The platform later limited post-launch creator-fee redirects to curb griefing, against a backdrop of lower volume than the 2025 peak ([Crypto Economy](https://crypto-economy.com/pump-fun-limits-creator-fee-changes/)). A cashback design was also criticised as easier to wash-trade than a holder reward ([Memeburn](https://memeburn.com/pump-fun-copied-stonk-but-the-fees-work-differently/)).

**Fomo** — social trading app with a live feed of other people's buys and sells, heavy on Solana memecoins. This is the feed RAID is visually and socially compared to.  
Prices: a SolanaFloor report, citing Fomo's Terms of Service at the time, gave 0.50% per transaction with a $0.95 minimum ([SolanaFloor](https://solanafloor.com/news/pump-fun-vs-fomo-gets-serious)). Bitquery's on-chain study (13 Jan to 7 Oct 2026, 829,539 wallets) found the typical minimum was $0.95 until the end of July 2026 and $0.10 from August, with fees averaging about 0.5% of volume and about $40 million in fees on Solana in that window. After fees, 90% of those wallets were behind; the median wallet lost $25. In coins with 1,000+ app buyers, the first 10 made +71% on what they spent; from the 1,001st buyer on, buyers lost 11%.  
Source: [https://bitquery.io/investigations/fomo-app-traders-lose-money](https://bitquery.io/investigations/fomo-app-traders-lose-money)  
Complaints (sourced): the $0.95-style minimum made small tickets very expensive; the feed itself makes people chase late ([a 2026 Reddit roundup](https://fomo.radio.fm/reddit/)); reviewers also report failed sells on thin coins, lag when trying to exit, and distrust of PnL numbers ([CoinCodex](https://coincodex.com/article/89985/is-the-fomo-crypto-app-legit/), [AXL review](https://www.axltoken.com/trading-bots/fomo-app-review/)). Late-buyer underperformance in the Bitquery study is the warning that matters most for RAID: a public raid is, by design, not a first-10 entry.

**meme.cooking** — the established NEAR fair-launch pad (auction, same price for every depositor, LP locked 69 years on Ref). RAID's UI already labels these "Not RAID launches."  
Prices (official docs): 0.5% deposit fee (kept even if the token does not launch), 2% launch fee on a successful launch, 2% early-withdrawal fee redistributed to remaining depositors; ~0.045 NEAR recoverable storage; ~0.001 NEAR gas.  
Sources: [https://docs.meme.cooking/other/fees/](https://docs.meme.cooking/other/fees/), [https://docs.meme.cooking/for-buyers/how-it-works/](https://docs.meme.cooking/for-buyers/how-it-works/)  
Complaints / limits (sourced, not invented reviews): the project's own docs warn that a dev can still "soft rug" by walking away ([How Not To Get Rugged](https://docs.meme.cooking/for-buyers/how-not-to-get-rugged/)). DefiLlama, fetched 11 Nov 2026, showed about $6.45 in fees over 30 days and about $16.6k cumulative — current activity is very small ([DefiLlama](https://defillama.com/protocol/meme-cooking)). No large independent complaint thread was found in this pass; absence of reviews is not evidence of satisfaction.

**JustHoot** — NEAR launchpad that opens a RHEA DCL pool at launch (no bonding curve, no graduation), and already lets Solana and EVM wallets trade through NEAR Intents.  
Prices (official docs): launch about 0.04 NEAR plus storage; 1% pool fee on every trade (0.2% RHEA, 0.8% JustHoot); optional 0–5% transfer tax, locked at launch; first buy optional, up to 50% of supply. Half of platform revenue is documented as $HOOT buyback-and-burn.  
Source: [https://justhoot.fun/docs](https://justhoot.fun/docs)  
Complaints: official risk copy on that page (thin pools, tickers are not unique, contract risk, Intents dependence). No separate independent complaint set was verified in this pass.

**NearFun** — NEAR bonding-curve launchpad that graduates to a locked Rhea pool, with a price floor at the start price.  
Prices (official docs): launch fee 0.1 NEAR plus storage; 1% tax on Fair / Win-win coins (1–10% on Advanced); NearFun takes 20% of the tax first; selling in the first 60 minutes costs 10% in all; creator first-buy coins unlock over 17 days; also routes SOL/ETH/USDC/BTC in via Intents.  
Source: [https://nearfun.io/docs](https://nearfun.io/docs)  
NEARRR.fun also presents itself as a NEAR meme launchpad ([docs](https://nearrr.fun/docs)); its fee schedule was not independently fetched in this pass, so no prices are listed here.

### Indirect: copy-trading terminals

**GMGN** — on-chain terminal with documented Solana copy trading.  
Prices (official docs): 1% handling fee per swap; gas, priority/tip, slippage and launchpad fees are separate and not kept by GMGN. Official tips suggest 0.002–0.005 SOL on-chain fees for unhurried trades and 0.006 SOL or more for auto buy/sell.  
Source: [https://docs.gmgn.ai/index/gmgn-fees-settings](https://docs.gmgn.ai/index/gmgn-fees-settings)  
Complaints (sourced): a Reddit thread described copy tasks that "didn't actually work," and one tester went from 1 SOL to 0.35 SOL despite a 75% "win rate," blaming fees and exits ([r/solana](https://www.reddit.com/r/solana/comments/1h07gy1/copy_trading_on_gmgnai_doesnt_actually_work/)). Users also report copy latency, becoming exit liquidity, and unexpected costs. Play Store reviews in 2026 complain about high fees eating small profits and failed sells ([Google Play listing](https://play.google.com/store/apps/details?hl=en_US&id=com.gmgn.app)). Trustpilot threads include harsh scam accusations; GMGN's reply is that it is a tool, not a token issuer, and cannot guarantee safety against rugs ([Trustpilot](https://www.trustpilot.com/review/gmgn.ai)).

**Axiom** — competing Solana terminal.  
Prices (official docs): 1% gross trading fee, with volume-tier SOL cashback from 0.05% (Wood, net 0.95%) to 0.25% (Champion, net 0.75%). Network priority fees and bribes are extra.  
Source: [https://docs.axiom.trade/getting-started/fees/axiom-fees](https://docs.axiom.trade/getting-started/fees/axiom-fees)

### Indirect: paid Telegram / X raid services (the status-quo "raid")

These are marketing and shill shifts, not a shared on-chain chest. They are what "call a raid" means in the wild today.

**Raid Randy** (Memecoin Roster listing, last updated 2 Oct 2026): $60 per single raid shift; $250 per launch week. The listing itself says work examples have not been added, and to confirm scope before paying.  
Source: [https://memecoinroster.com/p/raid-randy](https://memecoinroster.com/p/raid-randy)

Complaints about the category (sourced, not about RAID): a Reddit warning that many Telegram "alpha" groups are scams ([r/memecoins](https://www.reddit.com/r/memecoins/comments/1gyz6vm/warning-telegram_alpha_groups_are_scams/)); a Bitcointalk report of escrowed raid-bounty funds allegedly not paid ([thread](https://bitcointalk.org/index.php?topic=5504985.0)). Listed prices on a roster are not proof of delivery.

### What this means for RAID

No verified competitor combines all three of: a keyless contract that buys across chains, a public auto-sell line, and a caller fee that is unpaid on a miss. That is the gap. The gap does not, by itself, move users. The money, the habit and the friends are on pump.fun, Fomo, GMGN/Axiom and Telegram. On NEAR, JustHoot and NearFun already take Solana and EVM wallets through Intents, which is a distribution trick RAID has not shipped. meme.cooking's near-dead recent fees are a warning about NEAR memecoin volume, not a vacancy waiting to be filled.

---

## 3. Economics (CFO pass)

Every number below traces to a contract parameter, a documented fee, or a **labelled assumption**. This is not a forecast and not advice.

### Contract parameters (verified in code and deploy scripts)

From `contracts/raid-chest` and the testnet / mainnet init in `scripts/testnet-run.mjs` and `scripts/mainnet-go-no-go.mjs`:

- Sell line: 1.5x, 2x or 3x of `entry_cost` only (`target_x_bps` in {15000, 20000, 30000}).
- Retreat window: 1 hour to 28 days. After `retreat_at_ms`, a sale may fill at any price.
- On a **hit**: `profit = proceeds - entry_cost`. Caller gets 5% of profit (`caller_fee_bps = 500`). Buyback bucket gets 20% of profit (`buyback_bps = 2000`). Backers share `entry_cost + 75% of profit`.
- On a **miss**: caller gets 0, buyback gets 0, backers share whatever came back, including a loss.
- Cap in code: caller + buyback cannot exceed 50% of profit. Protocol take today: **none**. There is no RAID treasury fee on volume.

### Swap drag (documented, not assumed)

- NEAR Intents protocol fee: 0.0001% per tx. 1Click without an API key: +0.25% on non-`ANY_INPUT` quotes. With an API key and no `appFees`: 0.20% typical (1 bp on some stable routes). Source: [docs.near-intents.org fees](https://docs.near-intents.org/resources/fees), saved at `docs/sources/resources_fees.md`.
- Live dry quote, 10 Nov 2026, $1 USDC → PEPE: about $0.99 out, **≈0.6% all-in** (spread and route included). Source: `docs/KEYLESS-FEASIBILITY.md`.
- **Assumption used below:** 0.6% drag on the buy and 0.6% on the sell, so a 1.5x *proceeds* hit needs the coin to rise by roughly 1.52x from the post-fee fill, not 1.50x. Round-trip drag is about 1.2% before any price move. Thin coins can be worse. This is an assumption beyond the single dry quote.

### Worked example — $1,000 pot, fees as in the contract

All figures in USDC, before any platform token effects.

| Outcome | Proceeds | Profit | Caller 5% | Buyback 20% | Backers receive | Backer ROI |
|---|---:|---:|---:|---:|---:|---:|
| Hit 1.5x | 1,500 | 500 | 25 | 100 | 1,375 | +37.5% |
| Hit 2x | 2,000 | 1,000 | 50 | 200 | 1,750 | +75% |
| Hit 3x | 3,000 | 2,000 | 100 | 400 | 2,500 | +150% |
| Miss, −25% | 750 | 0 | 0 | 0 | 750 | −25% |
| Miss, −40% | 600 | 0 | 0 | 0 | 600 | −40% |

A "1.5x raid" is not a 50% payday for backers. A quarter of the profit is skimmed on a win, and 0% of a loss is socialised to the caller or the token.

### Hit-rate scenarios — **assumptions, not measured**

No live RAID raid has been filled on mainnet, so hit rates are scenarios only. They are informed by the Fomo late-buyer pattern (public attention is usually a late entry) and by ordinary memecoin failure rates, not by RAID data.

| Scenario | 1.5x hits | 2x hits | 3x hits | Misses (avg. loss) | Expected backer value on $1,000 | Backer EV |
|---|---:|---:|---:|---:|---:|---:|
| Optimistic | 30% | 10% | 5% | 55% at −20% | $1,152.50 | +15.3% |
| Base | 15% | 5% | 2% | 78% at −25% | $928.75 | **−7.1%** |
| Harsh | 8% | 2% | 1% | 89% at −35% | $748.50 | −25.2% |

**Break-even, labelled assumption:** if every hit is only 1.5x and misses lose 25%, backers need about a **40% hit rate** just to break even after the 25% profit skim (`0.625 × p ≥ 0.25`). That is a high bar for a public, post-call entry. The base mix above does not clear it.

Caller EV, same $1,000 raids, if the caller does not also back the pot: about $17.50 / $8.25 / $4.00 per raid in the three scenarios. A listed Telegram shift at $60 is paid even when the chart dies. Serious paid callers will stay on Telegram. The callers RAID can attract are reputation-driven, not shift-workers.

### Protocol / token

Under the current contract, RAID the product earns $0. The 20% buyback only exists on a win, and only helps a RAID token if that token exists, has a Rhea pool, and has buyers who are not just recycling raid profits. That is circular until proven otherwise. Year-1 "profit margin" as a company: **not yet**, because there is no take. A 1Click `appFees` line or a small protocol bps on volume would be a different business, and has not been shipped.

Cash needed to *prove* the loop is small (the team has been waiting on about 4 NEAR plus the user's explicit yes). Cash needed to run a chest that can move a liquid memecoin is a different, larger, unestimated number — do not pretend otherwise.

---

## 4. 100 simulated users

**Label again: simulated, not real users.** Personas were generated programmatically (seed `20261111`) with distinct names, ages, locations, incomes, habits and doubts, then a per-persona decision from their attributes. A consistency pass then honoured deal-breaker doubts that are already true of the product today (no mainnet fill; thin solver depth on memecoins, which the team's own docs flag). Seven "use" decisions were flipped to "wouldn't" on that pass (six NEAR natives, one judge). Full table: [`founder-personas.csv`](./founder-personas.csv).

**Pitch each persona saw, in plain words:** a social feed where anyone can call a raid on a memecoin on any chain; a crew backs it; a keyless NEAR chest buys through Intents and only sells at 1.5x, 2x or 3x, or at retreat; if the line hits, the caller gets 5% of profit (otherwise nothing) and 20% goes to buyback-and-burn; backers share the rest, including losses; you need a NEAR wallet; the chest is not yet proven with a mainnet fill; the contract is not audited; this is a game, not an investment.

### Tally

**28 use · 72 walk.**

For judges, "use" means they would seriously run the demo and score the mechanic, not that they would deposit. Counted as money-on-the-line (judges excluded): **22 use / 70 walk**, 24% of those 92 personas, or 22% of the full 100. That is the figure to remember. And it is still an upper bound.

| Segment | n | Use | Walk | Use rate |
|---|---:|---:|---:|---:|
| Memecoin degen | 22 | 9 | 13 | 41% |
| KOL / raid caller | 10 | 1 | 9 | 10% |
| Cautious holder | 14 | 0 | 14 | 0% |
| NEAR native | 12 | 6 | 6 | 50% |
| Non-crypto social user | 12 | 0 | 12 | 0% |
| Hackathon judge / reviewer | 8 | 6 | 2 | 75% (demo, not deposits) |
| Copy trader (GMGN / Axiom) | 10 | 4 | 6 | 40% |
| Launchpad deployer / token dev | 6 | 2 | 4 | 33% |
| Compliance-minded professional | 6 | 0 | 6 | 0% |
| **Total** | **100** | **28** | **72** | **28%** |

Who actually leans in: some degens who hate giving back winners, half the NEAR natives, most judges as reviewers, a few copy-traders parking a side pot, two deployers who like the "paid only on a hit" look, and one caller who wants a cleaner public record. Who does not: every cautious holder, every non-crypto user, every compliance-minded professional, and 9 of 10 paid callers.

### Top 3 objections (walk cluster)

1. **I already live on pump.fun, Fomo, Solana terminals or Telegram.** Switching chains, or moving a raid pack into a new app, is how you miss the only green trade of the day. This was the largest walk cluster, including most locked-in degens and almost all paid callers.
2. **I don't have (and won't open) a NEAR wallet.** All 12 non-crypto personas walked on setup alone. Degens who will not bridge said the same thing in trench language.
3. **I won't sit in a bag I can't sell until 1.5x, or for up to 28 days.** Cautious holders went 0/14. Short-cycle traders called the fixed lines a video-game rule, not how these charts pay.

Close behind, and more dangerous than their counts: **unaudited / rug shape**, **no mainnet fill yet**, and **"this is just a coordinated pump."** The last of those zeroed the compliance segment and will follow the project into judging and into any real-world launch.

### Top 3 pulls (use cluster)

1. **The Intents / keyless mechanic is the actual product.** NEAR natives and judges who said yes said it for this, not for the feed or the launchpad.
2. **Forced take-profit.** Degens and copy-traders who said yes mostly said: I never sell winners, and a line I cannot override is worth a small ticket.
3. **Caller paid only if the line hits, plus one-screen cross-chain.** The distinctive rule, and the chance to poke PEPE or DOGE without hopping wallets. Quieter than the first two, but this is the offer the board wants leaned on.

---

## 5. Verdict

### Is the idea cool?

**Yes-ish as a hackathon mechanic. No-ish as a product people would leave Fomo or GMGN for, and no as a business to fund with real backer money today.**

The cool part is real and specific: a keyless chest, a public line, a caller who is unpaid on a miss, a swap that is supposed to show up on an explorer. That is a better game than a $60 Telegram shift. The uncool part is also real: the word "raid," a late public entry, a base-case EV that does not clear for backers, a chain the customers are not on, a mainnet fill that does not exist yet, and a pitch that keeps adding a launchpad and a token the loop does not need.

### Three changes that would most raise adoption and judge appeal

1. **Put a real mainnet buy and a rule-respecting sell on the demo video, with explorer links, by Sat 14 Nov 18:00 Africa/Lagos (WAT).** This is the single highest-leverage move for judges and for anyone who would actually deposit. Without it, the Intents story is a claim. An honest failed fill that the contract refuses to under-sell is still a proof.
2. **Let Solana and EVM wallets in through Intents, the way JustHoot and NearFun already do, and do not ask degens to open a NEAR-native wallet first.** The panel's two biggest walks are incumbent lock-in and wallet friction. A beautiful NEAR-only onboarding will not beat that.
3. **Cut scope and fix the optics.** Lead with the chest and the locked-until-hit rule. Defer the launchpad and the platform token. Frame it as a public, rule-bound treasury *game* with a delay before the buy so it is not a sneak pump, hard position limits, a plain "you can lose the pot" warning, and less war-room language. That helps judges, cautious people, and anyone who would otherwise write "market manipulation" in a memo.

### Key risks

- **Regulatory / market-manipulation perception.** A product that pools money to buy a traded coin together and sell into a line can be described as coordinated trading, even when the rules are on-chain and public. This pass is not legal advice; it is a flag. The branding (raid, war chest, plunder) makes the flag louder.
- **Base-case backer math.** Under the labelled base hit-rate assumption, expected value is negative after the 25% win skim. A public call is usually a late entry (see Fomo's first-10 vs 1,001st-buyer gap).
- **Rug and operational risk.** Unaudited contract. Path 1 min-out is a 1Click promise, not an intents-verifier rule. Swap attribution assumes one in-flight swap per token. Cross-chain fills can fail or fill badly. The team's own feasibility note lists these.
- **Thin liquidity.** Solver depth on smaller memecoins may be poor or zero. A war chest does not create a market.
- **Incumbent gravity.** pump.fun, Fomo, GMGN, Axiom and Telegram already have the habit. NEAR memecoin flow is small (meme.cooking's recent DefiLlama fees are a data point).
- **Token circularity.** Buyback-and-burn of a new RAID token does not, by itself, make the game sound.
- **Deadline.** The hard cutoff is Sun 15 Nov 00:59 Africa/Lagos (WAT). Scope still includes a launchpad and a rebuilt social feed. The board's product lens says to drop them.

### One-line verdict

**Cool mechanic, unproven product, weak backer math: worth finishing as a tight mainnet raid demo for the hackathon, not yet something to call a crowd into with real size.**
