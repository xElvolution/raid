# RAID: plan to win (NEAR HACKATHON, Memecoins + Social)

Written Wed 11 Nov 2026, ~18:30 WAT. This is research only: no code was changed, nothing was pushed, nothing touched mainnet.
Deadlines: submit by **Sat 14 Nov 18:00 WAT** (our target). The hard close is **Sun 15 Nov 00:59 WAT** (2026-11-14T23:59Z). Judging runs 16 to 18 Nov.
Every fact below has a link. Where something couldn't be checked, the text says so.

---

## 0. TL;DR

1. **Winners show one complete moment with proof.** Every winner studied had a 2 to 4 minute video that goes from a real user action to a visible result. The serious ones attach proof a judge can check (Cadence lists its mainnet order IDs; Trendr has verified contracts, a status page and its test counts).
2. **Winners plug several sponsors into one product loop.** Trendr won 3 prizes by building one app on Kuru + Perpl + Chainlink + Nansen + Envio + Mera + Agora AUSD + Aurora Intents, and it listed each partner in a credits table.
3. **No wallet, no gas.** Trendr, Desk and Turnstile all sign users in with a passkey. RAID still asks for a NEAR wallet, which was our Founder test's #2 objection.
4. **Social is a game, not a feed.** XOOX's Clans (5v5 Volume Clash, 3v3 PnL Duel, leaderboards, a Clan Hall), Chart Arena's PvE roads and skill cards, and Trendr's calls ranked by hit rate. RAID has crews and a leaderboard but no versus moment.
5. **Biggest RAID-specific risk:** the official `social` track is about **Sputnik DAO / Trezu**, and RAID uses neither. We either make crews run on Sputnik DAO, or we stop leaning on `social` and add `defi` and `open`, whose hints (Intents, Chain Signatures, chain abstraction) match RAID exactly.

---

## 1. Rules and judging for this hackathon (official)
Source: https://nearhackathon.com/HACKATHON.md (re-read 11 Nov).
- Claude Code and Codex **screen every repo first** (reproducibility, feature verification, a preliminary score), then humans decide (Q-017). The README must be written for a machine: "do X, see Y" steps, no marketing.
- Demo = public repo + reproducible README + **X post with a video**. A hosted demo is a plus; keep it up until 18 Nov, ideally 25 Nov (Q-012).
- Demo post advice (official): lead with the user problem; "show one complete moment… from a real user action to a visible result"; explain NEAR's role concretely; give a next step. Tag @NEARProtocol and #NEARHackathon (optionally @NearLegion and @NearBuilders).
- Intents has no testnet, so use mainnet with tiny amounts (Q-007). Testnet-only projects are still eligible (Q-010).
- Prizes: one $55k grand prize, plus $10k / $3k / $2k in each of 13 tracks. **There are no separate sponsor bounties** (checked 10 Nov, see `/workspace/near-scout/quiet-track-pick.md` §2). A project can list every track it fits, still as one submission. The rules don't say whether one project can win more than one track.
- The site FAQ says past NEAR hackathons judged "technical implementation, design, impact, originality and sustainability". No weighted rubric is published.
- Human judges (site, per `docs/called-baseline/HACKATHON_PLAN.md`): Illia Polosukhin, Eddy Lazzarin, Mert Mumtaz, Avichal Garg, Kain Warwick, Haseeb Qureshi and Stepan Gershuni. Mostly investors, so they reward a believable product plus evidence.
- Track text:
  - `memecoins`: "supply that reacts to the community, **treasuries with rules**, onchain rituals… Judged on the mechanic, not the chart." Hints: NEP-141.
  - `social`: "shared budgets, programmable rewards, collective ownership and reputation-based access **on top of Sputnik DAO and Trezu**."
- Ecosystem partners listed in the rules: NEAR Intents, Aurora, HOT, **Rhea**, **meme.cooking** (the memecoin launchpad partner), HEX, NEAR.AI, Trezu, **SputnikDAO**, OutLayer, BRRRAIN (memecoin) and NEAR Business.

**Competition right now** (official API, pulled 11 Nov ~18:20 WAT, 581 projects; raw file: `/workspace/near-scout/board-nov11.json`):
- `memecoins` has 39 entries. It's still the smallest track (it was 24 on 10 Nov).
- `social` has 60 entries.
- New memecoin entries since 10 Nov include **Meme Wars** ("pick DOGS or CATS, stake $WAR in a daily on-chain war. Winners mint, losers burn", 50s testnet video: https://x.com/MemeWarsNear/status/2120401336575656142), BAG HEIST, THE PIT, Slay the Bear, KEYFALL and Anyone Can Rug.
- No other entry's name mentions raids, and none we've seen uses Intents for the mechanic.

---

## 2. Winner patterns (Monad Metropolis, announced 11 Nov)
Announcement: https://x.com/monad/status/2120551113610953111 (X Article "Meet the Metropolis Winners"). The API didn't return the article body. The winner one-liners below come from the article text the user shared with us.
Context: 885 teams (per @trydeskk and the article), 1,256 builders from 76 countries (https://x.com/Monadonafrica/status/2120565581162348694). Submissions closed 13 Oct and winners were announced 11 Nov (Rise In listing: https://www.risein.com/monad/monad-metropolis-hackathon).

### 2.1 Trendr: 3 prizes from one product (Kuru, Monad Foundation "Best Mera-Powered UX", Nansen 3rd)
- **Links:**
  - Site: https://trendr.bid
  - App: https://app.trendr.bid
  - Repo: https://github.com/Aliyaan-Nasir/Trendr (MIT, TypeScript; created 21 Aug, last push 21 Oct)
  - Technical demo, **4:19**: https://youtu.be/sdKZvvC8EGU
  - Pitch video, **2:36**: https://youtu.be/VmYvADNbI5k
  - X: @trendrnow. The X API now reports this account as **suspended**, so there's nothing to read there.
- **Team:** solo. "Built by aliyaan", and the privacy page names Aliyaan Nasir, Karachi (https://trendr.bid/privacy).
- **Pitch:** "Trade the World's Attention… When something starts trending, Trendr opens a market on it." The README's first line: "Trendr turns what the internet is talking about into markets you can trade from any device, on Monad."
- **Network:** **testnet only**, with a mainnet waitlist. It still won 3 prizes. The README sells being "Mainnet ready": a nightly mainnet-fork rehearsal plus a runbook.
- **How it stacked bounties.** One loop (trend → index → markets → trade) has a slot for each sponsor, and the README credits every one in a table:
  - **Kuru:** Up/Down order books, plus graduated trend coins listed on Kuru. This is the Kuru consumer-app prize.
  - **Mera passkeys:** one passkey derives the account, session key, caller identity, vault key and Perpl key, and a relayer pays the gas. This is "Best Mera-Powered UX".
  - **Nansen:** smart-money flows feed the index and Autopilot rules ("attention up 40% and smart money buying"). This is Nansen 3rd.
  - Also used: Chainlink CRE oracle, Perpl perps and copy-trading, Agora AUSD settlement, Aurora Intents any-chain deposits, and an Envio indexer for leaderboards and track records.
- **Social and game hooks:**
  - "Calls": public Up/Down predictions ranked by **hit rate on a leaderboard**.
  - A "curation reward" pays the account that first surfaced a trend.
  - **Share cards** for calls and PnL.
  - A PWA with push notifications.
- **Judge-facing polish:**
  - "Try it in about two minutes" in 4 numbered steps, plus a faucet.
  - A status page and a public API.
  - Every contract verified, in an address table.
  - Architecture and "a trade's life" diagrams.
  - A security-model table.
  - Exact test counts (207 forge, 286 backend…), CI, and a scan for secrets.
  - It discloses that "a few project-owned Testnet accounts made test transactions".
- **Lesson for RAID:** RAID already has this shape (one loop, several NEAR partners, honest limits). What's missing is the **presentation layer**: a partner table, a 2-minute try-it, a status/evidence page, two videos (pitch + technical), share cards, and passkey-grade onboarding.

### 2.2 XOOX: 2nd in Social (the closest winner to RAID)
- **Links:**
  - X: https://x.com/xooxdotfun (306 followers)
  - Team post: https://x.com/Eviltahaa/status/2120563693356540023 ("two friends one clanker and a dream")
  - Video studied: https://x.com/xooxdotfun/status/2114726966582821135 (26 Oct, **30 s**, 51 likes, 2.1k views). Saved to `inspo/xoox/xoox-launch-30s.mp4`, with frames `sheet.jpg` and `f13/f19/f21/f24.jpg`.
- **Network:** the 26 Oct post says "Website is live… **App coming soon**", and on 10 Nov they posted "**XooX testnet is coming soon**" (https://x.com/xooxdotfun/status/2120229320287481987). So the public story was a polished website and concept, **not a live mainnet app**. We can't see what they showed the judges privately.
- **What the 30-second video shows.** It's a scroll through the website with no voice-over, in this order:
  1. Hero "Launch. Trade. Connect." with 6 product icons (NFT launchpad, Token creator, Pro tokens, Staking pools, Clan, XooX World).
  2. "Your token. Your launch." creator card.
  3. "**Different ways to belong**":
     - *OG Holder rewards*: Hold → Earn → Claim. Holders share trading fees, and "selling or transferring permanently ends future eligibility".
     - *Duo Pair*: one token, two pools (MON + WMON), LP locked.
  4. "**Pro tokens. Your rules.**" with a rule studio (on-chain trading rules).
  5. "Launch a pool. Give back to holders."
  6. "**Find your clan. Make your mark.**" Create or join a clan, member chat, verified Users and Clans leaderboards, and a pixel-art **Clan Hall** in "XooX World — every resident is a wallet".
  7. "**The Arena / PvP preview — Your clan. A bigger arena.**" Clan-vs-clan formats:
     - **Volume Clash** (5v5, 24h, spot volume on Kuru, e.g. "Gigabrain Guild 1.24M MON vs Diamond Paws 1.16M MON")
     - **PnL Duel** (3v3, 4h)
     - **Swap Sprint** (5v5, 24h)
     - Solo formats: **Perp Arena** (10 traders) and **Perp Duel** (1v1).

     The fine print says "Formats in preview. Competitions and app integrations are not live."
  8. "A launch is just the start": Trading, NFT market, Portfolio, Stats.
  9. FAQ, and "Make it yours."
- **Also:** one-click generative NFT collections ("No code. No image uploads", https://x.com/xooxdotfun/status/2112143360987165020).
- **Why it likely won Social** (our reading, not a judge quote): teams of traders fighting each other is a social *game* with an instant mental picture, two clans and two progress bars. The fee-share-for-holders-who-stay rule is a sharp mechanic. And the visual identity is strong and consistent: dark, chrome mascots, pixel world.
- **Ideas for RAID to take:**
  1. **Crew vs Crew "Raid War"**: two crews, a fixed window, and two bars with a winner. RAID's version is better because the score is real on-chain raid results (hit rate or realised multiple), not volume.
  2. **"Stay" rewards**: backers who don't withdraw early get a bonus. RAID's chest can't sell early anyway, so the line "the bag you can't paper-hand" sells this for free.
  3. **A Crew Hall page**: crew card, member list, rank, trophies (raided coins that hit).
  4. **One crisp section per mechanic** on the landing page, each with a tiny diagram (Hold → Earn → Claim style).

### 2.3 Other Metropolis winners (shorter)
- **Chart Arena** (Consumer, per the article): perps as a game.
  - Builder: @papabun.
  - Videos of 1:49, 1:07 and 2:00 (https://x.com/papabun/status/2100586147336327389, https://x.com/papabun/status/2100928984565563762, https://x.com/papabun/status/2110248254499934280).
  - Hooks: "battle opponents (the market)", "fight your way through PNL targets (e.g. $1)", "unlock skill cards (e.g. 10x leverage)", "dedicated roads per asset", group trading with face bubbles, comments and reactions, weekly per-asset leaderboards. "Built on @perpltrade", a sponsor.
  - Posted progress videos during the build, with invite codes.
- **Rip Trade**: 1st in Consumer Products, by @sotoalt_ (https://x.com/sotoalt_/status/2120556123187236951). Per the article it's a trading card game where every card is a live 5-second trade. No public demo found yet.
- **Makeo**: Social winner, "TikTok for prediction games". No demo found yet.
- **Rizz.town**: Social, "rip a pack to meet vetted people" (@rizzdottown). No demo found.
- **Corpus**: Grand Champion, also "New Asset Class on Kuru" (@trycorpusai, https://x.com/KuruExchange/status/2120556458886807926): an endowment layer for compute, using x402 compute price feeds.
- **Desk**: Best Mobile Trading App (AUSD bounty). "A perps app where your face is your trading key", native iOS (https://x.com/trydeskk/status/2120563320717521116).
- **Turnstile** (Social track entry; we couldn't confirm a prize): stacked Mera + Envio + Alchemy bounties, listed on its own page (https://turnstile.work/).
- **A counterexample:** MeridianoPay was **live on mainnet** with passkeys and real swaps, and **didn't win** (https://x.com/MallyBhullar/status/2120558529421754437). Mainnet alone doesn't win. The hook and the story still matter.
- The Mera bounty text, as quoted in another team's repo (https://tangled.org/distributed.camp/mallbucks/blob/3ce09cd5d6a10d8302961be6dde7189180ca97e9/docs/hackathon-bounties.md): "Build an app on Monad where Mera is the entire account layer — no seed phrase, no extension." Mera is described here: https://monad.xyz/blog/introducing-mera.

### 2.4 drey.eth playbook (serial winner)
- **Who:** @dreyethh (2,062 followers). GitHub https://github.com/Enoch208.
- **Win count, in their own words:** "yet again another win… makes it no 18". That post was about Selo winning the Algorand x402 hackathon, $1,200 (https://x.com/dreyethh/status/2112824667601764485, 21 Oct).
- **Verified wins** (posts by the person):
  - **Spoke** (@UseSpoke_): **2nd, Nansen track, Monad Metropolis, $1,500** (https://x.com/dreyethh/status/2120559337420550360). Spoke is "an open distribution network that turns customers into distributors, tracks referrals…" (https://github.com/Enoch208/spoke, https://usespoke.xyz). It also integrates Envio HyperIndex (https://x.com/dreyethh/status/2112298781152567578), so it went for a second sponsor.
  - **Selo**: Algorand global x402 hackathon winner, $1,200. "CI for x402 on Algorand. It pays your endpoint before your users do." (https://github.com/Enoch208/selo)
  - **Convex hackathon**: a cash prize plus OpenAI swag (https://x.com/dreyethh/status/2112470974369005834). The amount isn't stated.
  - We didn't verify the other wins in the count of 18 one by one. Search found no older win posts in the X archive.
- **The repeatable pattern** (from their posts and repos):
  1. **Volume and speed.** Their GitHub shows a new hackathon repo roughly every 3 to 6 days since August: Crux, canon, lens, azimuth, vow, knot, morrow, glitch-learning, Reins, selo, spoke, runva, cadence, Clarilot, pavilion, vect. Most were built in 2 to 4 days.
  2. **Idea = one painful, concrete failure, then a fix that proves itself.**
     - Cadence: "Telegram trading groups share setups… everyone trades them differently".
     - Vect: "If the key to a door ends up locked behind that same door, nobody can ever finish".
     - Selo: "pays your endpoint before your users do".
     - The product always verifies its own result: "Exits verified", "Verified", receipts.
  3. **Build squarely on the sponsor's product** (Strike perps, Algorand x402, Nansen/Envio on Monad, VictoriaVR), and add a second sponsor where it fits (Spoke: Nansen + Envio).
  4. **The launch post has a fixed format:**
     - a problem paragraph;
     - the product name in bold Unicode;
     - a numbered HOW IT WORKS (DESCRIBE → BUILD → PLAY → CHANGE → TEST → FIX → PROVE);
     - a "**PROOF ON STRIKE MAINNET**" block listing real order IDs ("one plan sized two sub-accounts differently ($24.58 vs $14.75); orders 11516191287 and 11525670252 filled");
     - links to the product, bot and GitHub;
     - "Here is a 2 minute video walkthrough";
     - tags for the sponsor and its team members.

     Examples: Cadence https://x.com/dreyethh/status/2113612433965072853 (video 2:04) and Vect https://x.com/dreyethh/status/2120546150419693704 (video 2:50).
  5. **The README has a fixed format.** It opens with a one-line promise ("One trade idea. Your own risk."), then a demo video with its length (2:28), the live app, a "**Try it with no money**" practice link, a Telegram bot, and an `evidence/` folder of mainnet IDs. After that: problem, how it works, guarantees, "what the model does and never does", known limitations, build log, credits. (https://github.com/Enoch208/cadence)
  6. **Meet users where they already are.** Cadence is a **Telegram bot** plus a web app. That answers RAID's #1 objection ("already on pump.fun/Telegram").
  7. **Post during the hackathon:** a v1 launch post when submissions close ("heads down shipping… Spoke v1", https://x.com/dreyethh/status/2110433767827386854), then an under-the-hood post per sponsor during judging (the Envio post).

### 2.5 Past NEAR winners
- **Zcash × NEAR Intents** (Mar to Apr 2025). Winners announced at https://x.com/NEARDevHub/status/1910379229361123537 ("three prizes of $15K each"). Results: https://taikai.network/en/hackbox/hackathons/zcashxnear/results, forum: https://forum.zcashcommunity.com/t/zcash-x-near-intents-hackathon/50604.
  - Criteria: innovation, technical execution, privacy/security, UX, impact/feasibility.
  - The 1st places went to working cross-chain products that really executed Intents swaps plus Chain Signatures (summarised in `docs/called-baseline/HACKATHON_PLAN.md`).
- **Agents Without Masters (NEAR AI, Jun 2025)**: https://dorahacks.io/hackathon/agents-without-masters/winner. The winners are narrow and concrete: CopyCat (copy trader), NearPredict, Winvelope, Daoify.
- **NEAR hackathon at the Loops Hacker House (Sep 2025)**: NearMarket took 1st (self-reported). It was a prediction market built on Intents with a "Tinder and TikTok-like UI/UX, gamified experience" (https://ravikantagrawal.medium.com/nearmarket-an-ai-first-prediction-market-with-near-intent-implementation-2f0d7dff21f8).
- **1 Trillion Agents (Bitte)**: the bounty winners included CoolFi (BTC + NEAR Intents + Twitter). See https://bitteprotocol.substack.com/p/from-experiment-to-adoption-how-bittes.

**Patterns across all of the above:**
1. A one-sentence problem a stranger gets.
2. One loop shown end to end in a 2 to 4 minute video.
3. Proof a judge can check (tx or order IDs, verified contracts, an evidence folder).
4. The sponsor's tech carries real weight in that loop, credited by name.
5. A game or social hook: versus, leaderboards, cards, crews.
6. No-wallet onboarding (passkey, gasless, or the bot or chat users already use).
7. Testnet is OK if the README proves mainnet-readiness, but a real mainnet proof beats a promise when the core integration is mainnet-only. NEAR Intents is mainnet-only.

---

## 3. RAID's gaps (honest)

| # | Gap | Why it costs us | Evidence |
|---|---|---|---|
| G1 | **No real mainnet raid yet.** Testnet back txs show a failed forward step. | Intents is the whole mechanic, and the AI screen will see "testnet, swap never ran". Every Intents winner actually swapped. | README "Known limits"; the mainnet account is still unfunded (3:16 PM check) |
| G2 | **The Social track asks for Sputnik DAO/Trezu, and RAID uses neither.** | We'd be scored low in `social` on fit. | HACKATHON.md track table; `rg sputnik` finds nothing in the app code |
| G3 | **A NEAR wallet is required.** | This was Founder-test objection #2 ("no NEAR wallet"). Trendr, Desk and Turnstile won on no-wallet UX. | `docs/FOUNDER-TEST.md` |
| G4 | **No versus or game moment.** Crews and a leaderboard exist, but there's no crew-vs-crew. | XOOX and Chart Arena won Social and Consumer with PvP framing. "Won't sit in a bag" (objection #3) needs a reason to watch. | XOOX frames f19/f21 |
| G5 | **Not where degens already are** (Telegram, X). | Founder-test objection #1. Cadence answered the same thing with a Telegram bot. | FOUNDER-TEST, Cadence README |
| G6 | **Memecoins track hint is NEP-141.** Launchpad coins live inside the contract and aren't NEP-141. | A weaker fit with the track's "lean on". The mechanic ("treasury with rules") still fits the track text exactly. | HACKATHON.md, `contracts/raid-launchpad` |
| G7 | **Presentation for judges.** No partner table, no 2-minute try-it, no evidence folder, no video, no hosted link. | The AI screen checks reproducibility, and the humans are investors. | README vs Trendr/Cadence READMEs |
| G8 | **Scope sprawl.** Feed + launchpad + chest + any-chain. | The Founder board said to lead with the chest. Too many surfaces dilute the "one complete moment". | FOUNDER-TEST board |

---

## 4. Prioritized fix list (fits before Sat 14 Nov 18:00 WAT)
Effort assumes our agents build it; hours are rough. Items marked **needs money/mainnet** need the user's explicit yes first.

| # | Fix | Why it matters | Effort | Money / mainnet |
|---|---|---|---|---|
| **1** | **One real mainnet raid, on tape, plus an `evidence/` folder.** Fund the test account with ~4 NEAR. Do a $1 to $2 buy of a meme (e.g. PEPE) through Intents, signed by the MPC chest. Record tx hashes, the intents.near balance and explorer links in `docs/evidence/` (Cadence's "PROOF ON MAINNET" style). | This closes G1, the biggest single risk. The AI screen and the investor judges both want a real swap. | 3–4 h | **Yes**: ~4 NEAR (~$15), user's yes per step |
| **2** | **Crew vs Crew "Raid War" (the XOOX steal).** Two crews, a 24h window, two bars showing realised raid multiple and hit count, then a winner banner plus a share card. Computed from existing contract events and the API, so **no new contract**. Seed it with a clearly labelled DEMO war on testnet. | Gives the Social and game hook judges reward (XOOX, Chart Arena). Answers "won't sit in a bag": you're watching a fight. | 5–6 h | No |
| **3** | **Back a raid without a NEAR wallet.** Turn on the existing any-chain path (1Click deposit address, refund to the origin chain) as "Back from Phantom / MetaMask" on mainnet. The Intents verifier also accepts **ERC-191 (MetaMask)** and **raw_ed25519 (Phantom)** signatures (`docs/sources/integration_verifier-contract_signing-intents.md`), so the stake can belong to the user's own Solana or EVM key, with no NEAR account needed. Show it in the video. | Closes G3, objection #2, and makes the Trendr-style "no wallet" UX point. It's NEAR-native chain abstraction, which fits the `open` and `defi` hints. | 4–6 h (MVP = deposit-address flow already behind a flag) | **Yes** for the live demo (it uses the same funded mainnet chest) |
| **4** | **Fix track fit (G2).** Option A, recommended if there's time: each crew's treasury is a **Sputnik DAO on testnet**. A crew raid of more than X becomes a DAO proposal, while small backs from proven callers auto-pass. This matches the track's example prompt (tiered approvals plus reputation from finished work, here hit raids). Option B, about 0.5 h: submit `memecoins` + `defi` + `open` and drop `social`. | We're competing in a track whose hint we ignore. Option B costs nothing. Option A adds a real Social-track argument. | A: 6–8 h · B: 0.5 h | No (testnet) |
| **5** | **Telegram raid bot (the Cadence steal).** `/raid PEPE 2x` in a group posts a raid card with the countdown, cap, target and a "Back" deep link. It posts again when the buy fills and when the target hits or the raid retreats, and it shows the caller's hit rate. Use the bot API with the existing API server. | Meets degens where they already are (objection #1), and it's one of the most demo-able moments in the video. | 4–5 h | No (a bot token from the user via BotFather; no money) |
| **6** | **Judge-grade README plus a hosted link.** Use the Trendr/Cadence format: a one-line promise, video links with lengths, "Try it in 2 minutes (no money)" on testnet, the evidence folder, a partner table, exact test counts, a security/guarantees table, honest limits, AI tools used, and disclosed reuse of Called. For the hosted link, deploy to Vercel (needs the user's Vercel login handoff). | The AI screen scores reproducibility first. A hosted demo is an official plus. | 2–3 h (+1 h Vercel with the user) | No |
| **7** | **Two videos + an X post in drey.eth's format.** A 2:30 product demo (beat sheet below) and a 60–90 s pitch. The X post: problem paragraph → bold RAID → numbered HOW IT WORKS → **PROOF ON NEAR MAINNET** with tx hashes → links → tags. The user publishes it. | Required (Q-012), and the winners' strongest lever. | 3–4 h | No (uses the fix 1 footage) |
| **8** | **Focus the story on the chest (G8).** Lead every surface with "call → chest buys on any chain → sells only at target → caller paid only on hit". The feed and launchpad stay as supporting screens. Replace RAID-token buyback copy with **"7.5% reserve buys and burns the raided coin"** (pending the user's decision). Add "the bag you can't paper-hand" plus a stay bonus line (the XOOX OG-holder idea, copy only). | Gives one complete moment and a sharp mechanic for the Memecoins judges. | 1–2 h | No |

**Recommended order, given credit sensitivity:** 8 → 6 → 1 (as soon as the user funds) → 2 → 7 → 3 → 5 → 4A. If time runs short, cut 4A to 4B and treat 5 as a stretch.
**Cut list (don't build now):** Rhea pool graduation for launchpad coins, NEP-141 launchpad tokens, a native app, an AI agent layer.

### 4.1 Bounty and track stacking for RAID
The NEAR hackathon has **no separate sponsor bounties**. Stacking here means (a) listing every track RAID genuinely fits and (b) making each named partner carry real weight, then crediting it in a table like Trendr's. One submission covers every track listed.

| Track / partner | RAID fit today | Small integration that makes it real |
|---|---|---|
| `memecoins` (primary) | "Treasuries with rules": the keyless chest that can only sell at 1.5x/2x/3x | Fix 8 copy; the mechanic page shows the rules as read-only contract params |
| `defi` | Hints are TRADING, NEAR INTENTS, CHAIN SIGNATURES, all core to RAID | Fix 1 (a real Intents swap signed by MPC) is the whole argument |
| `open` | Hint is CHAIN ABSTRACTION; backing from Solana/EVM wallets | Fix 3 |
| `social` | Only if fix 4A ships (Sputnik DAO crew treasuries, reputation from hit raids) | Fix 4A |
| `games` (optional) | Hints include SOCIAL LOGIN and INTENTS; Raid Wars are a game loop | Only after fixes 2 and 3; otherwise don't list it (judged on the game loop) |
| Rhea (added to the main prize pool) | Not used | Stretch: route the 7.5% reserve buy-and-burn through a Rhea swap for NEAR-native memes. Skip if time is short |
| meme.cooking (memecoin launchpad partner) | Not used | Stretch: allow raids on meme.cooking coins (NEAR-native targets via Intents `nep141:` ids). Credit it in the README |
| HOT / HEX (chain abstraction, cross-chain swaps) | Not used | Mention as a possible future route only. Don't claim usage |

Don't list a track unless the README can point to code for it. The AI screen checks claims against features.

---

## 5. One-line pitch
**Main:** "RAID: call a raid on any memecoin, on any chain. A keyless NEAR war chest buys it through Intents and can only sell at your 1.5x, 2x or 3x, and the caller gets paid only if it hits."

Short (for the X post first line, problem-first): "Telegram raid calls are free to post and free to fail. RAID makes the call carry weight: the crowd backs it, a keyless chest buys the coin on its own chain, and it can't sell until the target hits."

## 6. Demo video beat sheet (target 2:30, phone-first screen recording, voice-over)
| Time | Beat | On screen |
|---|---|---|
| 0:00–0:10 | **Problem.** "Raid calls in Telegram cost nothing to post and nothing to get wrong." | Telegram group with a raid call (our bot, fix 5) |
| 0:10–0:25 | **The call.** Caller posts "PEPE 2x" in RAID; the 10-minute public countdown starts; caps visible | Phone UI, call screen → raid card |
| 0:25–0:50 | **Back from anywhere.** One backer uses a NEAR wallet; a second backs from Phantom (fix 3) with no NEAR account | Two phones or a split screen |
| 0:50–1:20 | **The buy, real.** Countdown ends → chest signs the Intents swap via Chain Signatures → PEPE lands. Cut to NEAR explorer + intents.near balance | Mainnet tx hashes (fix 1) |
| 1:20–1:40 | **The rule.** "This chest has no key. It cannot sell below 2x. No admin, no oracle." Show the contract params and a refused early-sell attempt | Contract view / explorer |
| 1:40–2:00 | **Raid War.** Two crews' bars; the caller's hit rate on the leaderboard; share card | Fix 2 screens |
| 2:00–2:15 | **Payout math.** On a hit: caller 2.5%, 7.5% to buy-and-burn, backers +90% at 2x. On a miss: no fees | Simple animated card |
| 2:15–2:30 | **NEAR's role + next step.** "Intents buys on any chain, Chain Signatures makes the chest keyless. Repo and live app below. Which coin should we raid first?" | Links, @NEARProtocol #NEARHackathon |

Rules for the cut: no architecture slides, no setup, start on the problem, one continuous raid from call to fill. Also make a 60–90 s pitch cut from the same footage, the way Trendr did.

## 7. What needs the user
1. **Yes plus ~4 NEAR** for the mainnet raid (fixes 1 and 3).
2. Decide the **7.5% reserve**: buy and burn the raided coin (recommended), or something else.
3. **Track choice**: 4A (Sputnik DAO crews) or 4B (drop `social`, add `defi` + `open`).
4. A **Telegram bot token** (BotFather), if we do fix 5.
5. A **Vercel login handoff** for the hosted link.
6. Approval to **push to a public GitHub repo** before 14 Nov 23:59Z. **The user posts the X demo and approves the final submission JSON.**
