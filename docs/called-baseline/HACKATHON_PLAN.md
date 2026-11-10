# Called × NEAR HACKATHON "Build Beyond Boundaries": plan

Not committed. Research date: 2026-10-31. Official rules: https://nearhackathon.com/HACKATHON.md (re-read before submitting, it says rules may change). Site: https://nearhackathon.com/

## 1. Rules that matter (quoted / paraphrased from the official HACKATHON.md)
- Window: 2026-11-01T00:00Z → **2026-11-14T23:59Z** (Nov 15 00:59 Lagos time). Judging Nov 16–18, results by Nov 18 23:59Z.
- **Q-001 "Code before 2026-11-01? Yes, from the announcement on 2026-10-19 … Earlier commits are baseline."** So Called commits from Oct 19 onward count; anything older is baseline.
- **Q-003 New repo not required**: a dedicated branch, or tags `pre-hackathon` and `hackathon-submission`, plus a README section linking the diff.
- **Q-004** Old project as-is: no. New feature built in the window: yes, if separated per Q-003.
- **Q-002** Only the NEAR integration built in the window is judged; disclose prior work in README.
- **Q-005** Libraries/AI-written code allowed; list them in README.
- **Q-007 NEAR Intents has no testnet, none planned**: use mainnet, separate dev accounts, tiny amounts, `dry: true` quotes.
- **Q-010** Testnet-only projects are eligible; mainnet only where the integration is mainnet-only.
- **Q-011** No mandatory integrations; track hints are hints.
- **Q-012** Demo: public repo + reproducible README + X post **with a video** (screenshots not enough if judges can't open the demo). Hosted demo is a plus; keep it up to Nov 18, ideally Nov 25.
- **Q-014** Add a LICENSE file (MIT is fine); repo stays public through judging.
- **Q-017** Claude Code & Codex screen first (reproducibility, feature verification, preliminary score); humans decide.
- Judging (site FAQ): "Previous NEAR hackathons evaluated technical implementation, design, impact, originality and sustainability — a good guide to prepare by." No other weighted rubric is published.
- Demo post: says built at NEAR HACKATHON, tags **@NEARProtocol** and **#NEARHackathon** (optional @NearLegion, @NearBuilders), video attached. Advice: lead with the user problem, show one complete moment, explain NEAR's role concretely, give a next step.
- Submission: one per project, **cannot be edited**, form https://nearhackathon.com/#apply or POST https://nearhackathon.com/api/applications. Fields: projectName, leadName, email, size, tracks[], nearAddress (mainnet payout), projectUrl, demoUrl, idea (20–2000 chars), consent.
- Prizes: Grand $55,000 ×1; per each of 13 tracks 1st $10,000 / 2nd $3,000 / 3rd $2,000. Paid in NEAR, single payment within 30 days.
- NEAR AI credits: buy at https://cloud.near.ai or claim $10 by joining https://nearbuilders.org/join (Q-000).

Tracks (id: hints): defi (Trading, Intents, Chain Signatures) · thesis · privacy (Private AI, TEE, NEAR AI Cloud) · business · swarms · security (function-call keys, TEE attestation) · agents · realworld (stablecoins, Intents, meta tx) · **games (agent NPCs, social login, Intents, NEP-245)** · nfts · memecoins · social (Sputnik DAO, Trezu) · open (chain abstraction). Example prompts: https://github.com/nearai/near-hackathon-prompt-examples

**Target tracks for Called:** `defi` (primary: prediction market, non-custodial, settles via Intents), `privacy` (TEE-verified AI resolution on NEAR AI Cloud, already partly built), `games` (Called already uses NEP-245 outcome tokens, social login, XP/streaks — "bonus if players never notice the chain"), `open` (chain abstraction). Multiple tracks allowed in one submission.

Past winners signal (Zcash × NEAR Intents hackathon, Mar 2025, https://forum.zcashcommunity.com/t/zcash-x-near-intents-hackathon/50604): criteria were innovation, technical execution, privacy/security, UX, impact/feasibility; 1st places went to working cross-chain products that really executed Intents swaps + Chain Signatures BTC (Chill-Zcash, IntentZ-Bot). Judges awarded only 1st places when quality was low → a fully working, reproducible demo beats breadth.

## 2. Tech facts (verified docs)
| Feature | Where | Testnet? |
|---|---|---|
| Chain Signatures MPC | `v1.signer` (mainnet), `v1.signer-prod.testnet` (testnet). https://docs.near.org/chain-abstraction/chain-signatures/implementation | **Yes** |
| chainsig.js | https://neardefi.github.io/chainsig.js/ — `deriveAddressAndPublicKey(accountId, path)`, `contract.sign({payload,path,keyType})`, adapters EVM/BTC/SOL/XRP/SUI/Aptos | Yes |
| NEAR Intents 1Click API | quickstart https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart ; tokens, quote (`dry:true`), deposit address, status (SUCCESS/REFUNDED/FAILED). JWT optional (0.2% fee without), https://partners.near-intents.org | **Mainnet only** (Q-007) |
| Chain abstraction | social login + NEAR accounts, meta-transactions/relayer (NEP-366), function-call access keys | Yes |
| NEAR AI Cloud | OpenAI-compatible https://cloud-api.near.ai/v1, attestation + per-response signatures, https://docs.near.ai/cloud/verification | Mainnet service, API key needed |

## 3. Current state (what judges would see today)
- `api/src/chain.ts`: API relayer is the **custodial operator**; users are ledger strings `u<id>.<contract>` inside the contract. → judges will flag "custodian".
- `api/src/polymarket-router.ts`: signs Polymarket orders with one server EOA; comment says Chain Signatures "can replace".
- `resolver/`: NEAR AI Cloud client + attestation/signature verification already exist (strong for `privacy`).
- `contracts/`: NEP-245 outcome tokens, CPMM, resolver with on-chain signature check, disputes.
- No Intents, no Chain Signatures code.

## 4. Integration plan
### A. Real NEAR accounts per user (chain abstraction, one login)
- On Privy login, create a per-user NEAR account `<handle>.called.testnet` (sub-account created by API) whose full key stays with the user (Privy embedded wallet signs, or a device key in web/mobile secure storage); the server only gets a **function-call access key limited to `called` contract methods + allowance** → gasless trades via **meta-transactions (NEP-366)** relayed by the API.
- Files: `api/src/auth.ts` (account creation), new `api/src/relayer.ts` (meta-tx relay, replaces operator calls in `chain.ts`), `contracts/src` (`buy`/`sell`/`redeem` keyed by `predecessor_account_id`, retire `buy_for`/`sell_for` operator paths), `sdk/src` (build+sign DelegateAction), `web/` + `mobile/` (sign locally, no popups).
- Demo proof: explorer link shows tx signed by user account, relayer only pays gas; "Export key"/"View on explorer" in Settings.

### B. Chain Signatures: per-user foreign wallets
- New contract method or proxy in `contracts/` (`request_sign(path, payload)`) that calls `v1.signer-prod.testnet`, with path = user account + chain (e.g. `evm-1`, `btc-1`). User → contract → MPC so only that user can sign for their path.
- `api/src/polymarket-router.ts`: derive each user's EVM address (chainsig.js EVM adapter), sign Polymarket EIP-712 orders via MPC instead of the server EOA. (Polymarket trading itself is mainnet/geoblocked → show signing + derived address on testnet; optional tiny mainnet order.)
- Deposit addresses: show user their derived EVM/BTC/SOL address in Portfolio; testnet funds (Sepolia ETH / BTC testnet) sent there can be withdrawn by an MPC-signed tx.
- New `api/src/chainsig.ts`, `web/` + `mobile/` Portfolio "Your addresses" card.
- Demo proof: same Privy login → derived Sepolia address → MPC-signed Sepolia tx on Etherscan.

### C. NEAR Intents: deposit / cash out in any token, any chain
- New `api/src/intents.ts` wrapping 1Click: `GET tokens`, `POST quote` (dry and real), deposit address, `status` polling; handle REFUNDED/FAILED in UI (prompt requirement for defi track).
- Flow "Deposit any token": user picks e.g. SOL/ETH/BTC → quote to **USDC on NEAR** with recipient = user's NEAR account → then `ft_transfer_call` into `called`. Cash-out: winnings USDC → any token/chain to user's own (or Chain-Signatures-derived) address.
- Because Intents is mainnet-only: deploy `called` contract **also on mainnet** with real USDC (get the USDC token id from the 1Click tokens endpoint) and tiny amounts, or keep testnet markets and run Intents in **dry-run mode** + one real tiny mainnet swap recorded in the video. Recommended: "Real mode (mainnet, cents)" toggle + dry-run default so judges can try with no funds.
- Payouts: on `finalize`/`redeem`, offer "Send my winnings as ETH on Base" via 1Click.
- Optional: AI resolution worker pays for its own compute → `agents` angle (skip unless time).

### D. NEAR AI Cloud (already strongest piece)
- `resolver/src/nearai.ts`, `attestation.ts`, `signature.ts`: make the real path default (needs `NEARAI_API_KEY`), fresh nonce per attestation, 3-model panel, show "Verified" receipt panel in web/mobile market page listing each check; contract verifies signature on-chain (already designed).
- Draft generation (post → market) also on NEAR AI Cloud.

### E. Hackathon hygiene
- Tag `pre-hackathon` at the last commit before 2026-10-19 (all 68 commits in this repo are dated Oct 19 or later, so per Q-001 they count; tag the first commit as baseline anyway for clarity) and `hackathon-submission` at the end; README "What was built in the window" with diff link (Q-003). User wants a fresh new GitHub repo: fine, but still keep the tags/diff section.
- README for machine judges: what/problem/"do X → see Y" steps, env, `npm run demo`, list of libraries & AI tools (Q-005), LICENSE (MIT).
- Hosted demo up through Nov 25; seed markets; dry-run mode needing no funds.

## 5. Milestones (Nov 1–14 UTC)
| Days | Deliverable |
|---|---|
| Nov 1–2 | New repo + tags, README skeleton, LICENSE. Contract: user-keyed buy/sell/redeem; deploy to testnet. |
| Nov 3–5 | Per-user NEAR accounts, function-call keys, meta-tx relayer; remove operator custody from `chain.ts`. Web + mobile signing. |
| Nov 5–7 | Chain Signatures: derivation, `request_sign` proxy, derived address UI, MPC-signed Sepolia tx; Polymarket order signing via MPC. |
| Nov 7–10 | 1Click: tokens/quote/dry-run/deposit/status, any-token deposit + cash-out, REFUNDED/FAILED UI; mainnet tiny test run. |
| Nov 10–11 | NEAR AI Cloud real resolution + Verified panel on every resolved market. |
| Nov 12 | End-to-end tests, hosted demo, seed data. |
| Nov 13 | Record 2–3 min video, draft X post, finalize README. |
| Nov 14 (before ~20:00Z) | Make repo public, user posts on X, submit form once (user confirms payload). |

## 6. Judging checklist
| Criterion (source) | How Called satisfies it | Proof in demo |
|---|---|---|
| Runs and does what README says (Q-017 AI screening) | `do X → see Y` README, one-command local run, dry-run mode, hosted demo | Judge follows steps without funds |
| Technical implementation (site FAQ) | Non-custodial user accounts + meta-tx; MPC Chain Signatures; 1Click Intents; on-chain verification of TEE-signed AI verdicts | Explorer links for each step |
| Design (site FAQ) | Existing playful UI, mobile + web, no wallet popups | Video on phone |
| Impact (site FAQ) | Social prediction markets anyone can fund with any token | Deposit SOL → trade → cash out ETH |
| Originality (site FAQ) | Post → AI market → verifiable AI resolution with on-chain checked TEE signature | Resolution receipt panel |
| Sustainability (site FAQ) | Fees in CPMM, builder code on Polymarket routing, hosted beyond Nov 18 | README roadmap + fee config |
| Built in window, separated (Q-001/3/4) | Tags + diff link | README section |
| Demo post format (Procedure §2) | Problem-first, one full moment, NEAR role concrete, tags, video | X post |
| defi hint: no custodian, Intents, Chain Signatures | A + B + C | Custody removed, MPC + Intents tx |
| defi prompt: handle REFUNDED/FAILED, show where funds sit, dry-run | `intents.ts` status UI, funds-location timeline | Video shows refund state |
| privacy hint: TEE, NEAR AI Cloud, attestation with fresh nonce | resolver real path | "Verified" panel |
| games hint: social login, NEP-245, never notice chain | Privy login, NEP-245 outcome tokens, gasless | No popups in video |
| LICENSE, public repo through judging (Q-014) | MIT file | repo |

## 7. Demo flow (2–3 min video)
1. Sign in with Google (Privy) → NEAR account auto-created (chain abstraction).
2. Deposit: pick SOL → 1Click quote → USDC lands on NEAR → balance updates (Intents).
3. Post a take → AI drafts market on NEAR AI Cloud → publish; friend trades YES gaslessly (meta-tx, user-signed).
4. "Your addresses": derived ETH/BTC address from Chain Signatures; MPC-signed tx on Etherscan; Polymarket order signed by user's derived key.
5. Market resolves: 3-model TEE verdict, signature verified on-chain, Verified panel.
6. Cash out winnings as ETH on another chain via Intents.

## 8. Risks
- Intents mainnet-only → needs real (tiny) funds and mainnet deploy; dry-run fallback.
- Chain Signatures latency/deposit fee per sign; testnet MPC flakiness → pre-record backup.
- Key custody for Privy users: must truly leave server without full keys, otherwise "non-custodial" claim fails.
- Polymarket geoblock/mainnet: show signing, don't depend on fills.
- Scope: 14 days; cut order if late: Polymarket MPC → payouts-to-any-chain → keep A, B (derived address + 1 signed tx), C (deposit), D.
- Submission is one-shot and uneditable.

## 9. Needed from the user
- New GitHub repo name/owner; OK to push there from Nov 1.
- NEAR AI Cloud API key/credits (https://cloud.near.ai or $10 via NEAR Builders).
- Small mainnet funds (a few USD of NEAR + USDC) for Intents tests; optional 1Click JWT.
- Mainnet NEAR payout account, team lead name, email, team size (for the form).
- Approval to make repo public, post on X, and send the submission.

## Appendix A: idea comparison (researched 2026-10-31)

### What's trending / already announced (sources)
- Intents: $141.7M/24h, $3.89B/30d, 11% via Confidential Intents (https://nearstats.org/stats, Oct 30).
- Chain Signatures now run fully in TEEs, 17 operators, 11-of-17 (https://www.near.org/blog/chain-signatures-tee, Oct 23).
- Shade Agents = TEE worker agents + contract controlling a Chain-Signatures key (https://www.near.org/blog/shade-agents-the-first-truly-autonomous-ai-agents).
- NEAR Business (confidential multisig treasury, payroll, vendor payments on Intents) is live (https://x.com/NEARProtocol/status/2114052194668261859) → payroll/treasury ideas compete with an official product.
- Announced builder ideas (crowding signal):
  - AI-agent payment guardrails/security: GIDEON (https://x.com/Ade_lekeJr/status/2116225215587869079), AEGIS (https://x.com/aegisonnear/status/2115952057673028026), Clear to Pay (https://x.com/cleartopay/status/2115476513260810624), Clearance (https://x.com/Selliks/status/2115003285233131904) → **very crowded**.
  - Supplier payouts on 1Click (https://x.com/joezzyweb3/status/2115060686627667992); Private Granola on NEAR AI (https://x.com/VictorShallang/status/2113892547823276261); private clinical AI (https://x.com/chun_dik/status/2115480066163613744); proof-of-funds privacy, Jurat (https://x.com/NFTKINGIII/status/2114434720180121990); crowd-kept Tamagotchi (https://x.com/Agent_Minimum/status/2115126871385899038) — Illia suggested "AI Tamagochi" publicly (https://x.com/ilblackdragon/status/2106269343881519444), so expect many.
  - No announced social prediction market found in this search (only 2 X searches; not exhaustive).
- Track example prompts (defi DCA vault, games market-town, privacy expense auditor) will be copied by many → avoid building the literal prompt.

### Scores (1–10; my judgment, not official)
| Idea | Tech | Design | Impact | Orig. | Sustain. | Crowding | Tracks (1st = $10k each; grand $55k) | Nov 1–14 feasibility | Mainnet $ | Wow moment |
|---|---|---|---|---|---|---|---|---|---|---|
| **1. Called + Intents/ChainSig/TEE (Plan above)** | 8 | 9 (UI exists, web+mobile) | 7 | 8 | 7 | Low | defi, privacy, games, open | High: ~70% of app exists, Oct 19+ commits count (Q-001) | ~$20–50 tiny Intents tests | Pay SOL → bet → TEE-verified AI resolves → cash out ETH, no wallet popups |
| **2. Called Arena: Shade-agent swarm market makers inside Called** (each AI trader/market maker is a Shade Agent in a TEE with its own Chain-Sig wallet, competes on Called markets; users back agents) | 9 | 8 | 7 | 9 | 7 | Low–Med | swarms, agents, defi, privacy | Medium: add-on to #1, needs Shade Agent TEE deploy (Phala) | Low; agents trade testnet markets, Intents for funding | Live leaderboard of autonomous agents moving odds; attestation proves no human touched keys |
| 3. Cross-chain remittance for Nigeria/Africa (stablecoin rails via 1Click + confidential intents, social login, meta-tx) | 7 | 7 | 9 | 5 | 8 | Med (NEAR Business, supplier-payout builders) | realworld, open | High technically; off-ramp to naira is the hard/regulated part | Yes, real stablecoin flows | Send USDT on Tron, recipient receives USDC on NEAR in seconds |
| 4. AI-agent spending guardrail wallet (function-call keys, policy engine, TEE) | 8 | 6 | 7 | 4 | 6 | **High** (4+ announced) | security, agents | High | Low | Agent tries to pay scam invoice → blocked |
| 5. Verifiable AI Tamagotchi / NPC economy game | 7 | 8 | 5 | 5 | 5 | **High** (Illia's public idea + already announced) | games, privacy | High | Low | Pet's TEE-signed mood drives its on-chain wallet |

### Honest recommendation
**Keep Called, and add #2 (Shade-agent swarm) as the differentiator.** Reasons: (a) the rules let Oct 19+ work count, so Called starts days ahead of any new idea; (b) nobody visible is building a social prediction market; (c) it genuinely uses every hinted feature — Intents (any-token in/out), Chain Signatures (per-user + per-agent wallets), chain abstraction (one login, gasless), NEAR AI Cloud TEE (verifiable resolution); (d) with agents it fits 5–6 tracks, the best shot at a track 1st and at the $55k grand prize. Switching to #3 is the only reasonable alternative (highest impact) but it's less original and real-money/off-ramp heavy. Avoid #4 and #5 (crowded).

More agents help only if work is split cleanly (contracts / api custody+relayer / chainsig / intents / resolver TEE / shade agents / web / mobile / README+demo) with one integrator; beyond ~8 parallel agents, merge conflicts cost more than they save. The money risk is mostly agent compute; mainnet funds needed are small (tens of USD).

Caveats: crowding check = two X searches + web, not exhaustive; scores are judgment, there is no published rubric weighting; prizes are never guaranteed.

## Appendix B: track-first analysis (2026-10-31, ignores existing Called code)

### Rule confirmations (https://nearhackathon.com/HACKATHON.md, https://nearhackathon.com/)
- **Multiple tracks: yes.** "Tracks: one or more ids … every track the project fits. It is still one submission per project." The form has a tracks multi-select.
- **Grand prize:** "One grand prize overall." Neither page restricts it to any track or says how it's chosen. Reading: open to all submissions, but that is not stated explicitly.
- **Human judges** (site): Illia Polosukhin (NEAR), Eddy Lazzarin (a16z crypto), Mert Mumtaz (Helius), Avichal Garg (Electric Capital), Kain Warwick (Synthetix & Infinex), Haseeb Qureshi (Dragonfly), Stepan Gershuni (cyber•Fund); Claude Code & Codex screen first. Mostly investors → they reward a believable product/market, evidence, and things that clearly run.

### Competition data (THIN: 4 X searches of public posts since Oct 19, ~50 posts; most teams won't announce before Nov 1)
| Track | Prize (1st/2nd/3rd) | Prompt asks (nearai prompt examples) | Announced projects found | Expected strength |
|---|---|---|---|---|
| defi | $10k/$3k/$2k | cross-chain DCA vault via 1Click, dry-run, Chain-Sig BTC stretch | ~4: NearSwaps trading agent (https://x.com/NearSwaps/status/2113255394105589940), Celadon vault (https://x.com/CeladonStub/status/2114702079424090183), Intents app (https://x.com/0xEnsp1re/status/2114734117975957671), cross-chain (https://x.com/smartcoded/status/2112471591078473796); Rhea sponsor push | High, many experienced DeFi teams; Kain Warwick judge raises bar |
| security | same | spending limits, policy engines, FC keys, TEE | **~7**: GIDEON, AEGIS, Clear to Pay, Clearance (Appendix A links), Leash (https://x.com/checkcoula/status/2115445065808265468, already "built"), BLINDKEY (https://x.com/Blindkey43200/status/2112521317459394959) | Very crowded |
| privacy | same | NEAR AI Cloud TEE app with attestation panel | ~3: Private Granola, Áurea clinical, Jurat (Appendix A links) | Medium-high; NEAR AI's own focus |
| agents | same | agents that earn/spend/pay for APIs | overlaps security entries (~3–4) | High |
| realworld | same | payroll/invoicing/remittance, stablecoins, meta-tx | ~1 (supplier payouts, https://x.com/joezzyweb3/status/2115060686627667992); NEAR Business is live (official competitor) | Medium |
| games | same | market-town NPC economy, NEP-245, social login | ~2: Karl fish (https://x.com/Agent_Minimum/status/2115126871385899038), Huddle Gyre (https://x.com/JoinHuddleGyre/status/2112835001159201178); Illia's public "AI Tamagochi" idea will attract more | Medium |
| swarms | same | group-buying agent swarm, sub-accounts, sealed bids, Intents settlement | ~1 (IMD protocol suggestion, https://x.com/CryptoHafuya/status/2112563705162699250) | Medium, technically hard → fewer finish |
| business | same | AI-native business, treasury, Intents payments | 0 found | Medium |
| thesis | same | evidence-first NEAR thesis, BigQuery + Intents Explorer, reproducible charts, THESIS.md | 0 found | Low–medium; few devs enter research tracks |
| nfts | same | NFT that owns a sub-account wallet, NEP-171, transfer threat model | 0 found | Low–medium |
| memecoins | same | streak coin, mechanic fully on-chain, no admin key | 0 found | Low–medium; often low-effort entries |
| social | same | bounty board on Sputnik DAO/Trezu with reputation tiers | 0 found (one dev asked Trezu for testnet: https://x.com/NovaProtoc0l/status/2114310578990702999) | Low–medium; Trezu is mainnet-oriented → friction |
| open | same | anything, chain abstraction | n/a | Unknowable; catch-all, likely big |

### Pick: best odds = low crowding × strong build feasible with ~8 agents × judge appeal
**#1 — NFTs That Do Something (+ tag open, defi): "Vault NFTs" — an NFT that *is* a cross-chain wallet.**
- Each NEP-171 token owns a NEAR sub-account and, via Chain Signatures (path = token id), its own BTC/ETH/SOL addresses. Whoever holds the NFT controls the funds on every chain; sell the NFT and the BTC moves with it, with no bridge and no wrapped token. Deposits in any token via 1Click Intents; a marketplace sale settles atomically; transfer threat model + tests (what the prompt asks).
- Why it beats likely entries: the prompt's version is sub-account-only on NEAR; adding Chain Signatures makes "an NFT that holds real native BTC" — a strong headline that uses NEAR's newest flagship (MPC fully in TEEs, Oct 23) and is legible to investor judges (tradable OTC positions, inheritance, gift cards, escrow). 0 announced competitors found.
- Wow moment: mint NFT → send testnet BTC to its derived address → sell NFT to wallet B → B withdraws the BTC with an MPC-signed tx; A's attempt fails on camera.
- Money: Chain Signatures + BTC/ETH testnets are free; Intents deposit demo needs ~$10–30 mainnet (or dry-run quotes).
- Risks: MPC sign latency; key detail is making the sign path depend only on current owner (must be in contract, carefully tested).

**#2 — Investment Thesis: "Is NEAR Intents real usage?"** reproducible, data-first dashboard (BigQuery NEAR dataset + Intents Explorer API + nearstats), THESIS.md with evidence for and against.
- Why: 0 announced competitors, investor judges literally evaluate theses, cheap ($0 mainnet; BigQuery cost small with block_date filters), easy for agents to parallelise and for AI screening to reproduce ("one command rebuilds every chart").
- Weakness: ceiling — a research dashboard is unlikely to take the grand prize; needs an Intents Explorer JWT (partner dashboard) — confirm availability.

### Ranked recommendation (relative odds are rough guesses, low confidence given thin data)
1. **Vault NFTs (nfts + open + defi)** — best balance: est. ~25–35% chance of a top-3 in nfts, small grand-prize shot. Confidence: low–medium.
2. **Intents thesis (thesis)** — highest odds of *some* track prize (~30–40% top-3) but lowest ceiling. Confidence: low.
3. Called (games/privacy/defi) — real but more crowded tracks; ~15–20% top-3 in one track. Confidence: low.
Avoid security/agents (7+ similar announced) and plain defi (crowded, expert judges).
Option to hedge: Q-015 allows one person up to 2 independent, disclosed projects (different repos, each README names the other) → do #1 and #2 in parallel; they share no code and #2 is cheap.
