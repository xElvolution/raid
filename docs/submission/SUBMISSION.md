# RAID submission pack

Drafts for the NEAR HACKATHON form, the public X post, and the walkthrough video. Nothing here has been submitted or posted. The team lead fills the personal fields, posts on X themselves, makes the repository public, and confirms the exact JSON payload before anyone sends it.

Live rules read on 14 Nov 2026 (Africa/Lagos) from https://nearhackathon.com/HACKATHON.md. Re-read that file just before sending, because dates and rules can change.

Deadline: development ends 2026-11-14T23:59:00Z (00:59, Africa/Lagos, 15 Nov 2026). One submission per project. A second submit of the same repository is rejected (409). Mistakes go to https://nearhackathon.com/request-changes, not a second submit.

Form: https://nearhackathon.com/#apply
API: POST https://nearhackathon.com/api/applications (Content-Type: application/json, body up to 12000 bytes). Send exactly the fields below. Do not add other fields. In particular `website` is a spam trap: any non-empty value rejects the submission.

## Form fields and limits

| Field | Type | Rule |
|---|---|---|
| requestId | string | UUID, generated once per submission and reused on retries (network error or 503). Generate with `uuidgen \| tr A-Z a-z` or `node -e 'console.log(crypto.randomUUID())'`. Keep it outside the repo. Do not commit the payload: it contains personal data. |
| projectName | string | 2-80 characters. Suggested: `RAID` |
| leadName | string | 2-80 characters. The team lead's name. Leave blank here; the lead fills it. |
| email | string | Valid email, max 160 characters. One person can send at most 2 submissions, for different projects that are independent and disclosed (Q-015). Leave blank here. |
| size | string | Exactly one of: `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+`. Leave blank here until the lead confirms. |
| tracks | array of strings | One or more of: `defi`, `thesis`, `privacy`, `business`, `swarms`, `security`, `agents`, `realworld`, `games`, `nfts`, `memecoins`, `social`, `open`. Each id at most once. Recommended for RAID: `memecoins`, `defi`, `social` (see reasons below). `open` is optional. |
| nearAddress | string | 2-64 characters, lowercase, matching `^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$`. This is the mainnet payout account. A named account such as `team.near`, or a 64-character implicit account. The team creates it in any NEAR wallet (https://docs.near.org/). Never create or invent one on their behalf. Do not use a `.testnet` account. The regex would accept one, but prizes are paid on mainnet only. Leave blank here. |
| projectUrl | string | http(s) URL of the public repository, max 300 characters. Unique: each repository is submitted once. Intended: `https://github.com/xElvolution/raid` after the lead makes it public. The local copy is still private to this machine and has not been pushed for this pack. |
| demoUrl | string | http(s) URL of the public X post, max 300 characters. The lead writes and publishes the post themselves, then pastes the status link (https://x.com/<handle>/status/<id>). See `X-POST.md`. |
| idea | string | 20-2000 characters. The problem, the product, and how NEAR fits in. Paste the "Form description" below (character count is noted under it). |
| consent | boolean | `true` only after the lead agrees to this notice, read verbatim: "I agree that the organizers may use these details to review our submission and contact us about this hackathon." |

API status codes: 201 saved; 400 fix the fields in `fields` and resend with the same requestId; 403 submissions are not open or the request looked cross-site (tell the lead, do not retry); 409 repository already submitted or this email already has 2 submissions (do not change the link or the email to get around it); 413 shorten the description; 503 wait a minute and resend with the same requestId.

Never send the submission without printing the full JSON payload and waiting for an explicit yes from the lead.

## Short description

Call a raid on any memecoin. Your crew backs it. A keyless war chest on NEAR buys together and can only sell at the line.

## Form description (idea field)

Use this text in `idea`. It is plain text, within the 20-2000 character limit.

Meme raids happen in Telegram and X every day. Someone calls a coin and a target, people pile in, and there is no way to see who bought, when, or whether the caller sold first. The caller can win even when the crew loses.

RAID puts that raid on a NEAR contract. A caller, or a crew DAO by vote, names a coin, a line (1.5x, 2x or 3x) and a retreat deadline. The crew backs the raid with USDC during a public window, from a NEAR wallet or from MetaMask or Phantom with no NEAR account, through NEAR Intents. After a public countdown, a keyless war chest buys the whole pot in one swap. It can only sell at or above the line, or at market after the retreat deadline. On a hit, fees come only from profit: 2.5% to the caller and 7.5% to a buyback reserve. On a miss, nobody takes a fee.

Around the chest is a social app: a feed, reels with a live coin card, camera livestreams with a pinned coin, a live Tokens list, callers verified by their on-chain hit rate, and monthly seasons ranked by realised on-chain profit.

NEAR is the settlement and the rules layer. The chest lives on NEAR, checks 1Click-signed quotes on chain, can sign its own buy intent with Chain Signatures, and pays any-chain backers into an Intents account. Crews are Sputnik DAO v2 accounts, so a passed proposal is the call, and the caller fee lands in the crew treasury.

Status: NEAR testnet. One raid has gone the whole way: Open, Bought, Held, Sold at the line, Closed, every backer and the caller paid (120 in, 246 out). A second raid missed the line after retreat: the chest sold at market and paid no fees. NEAR Intents and 1Click have no testnet, so testnet swaps run against a venue contract that speaks the same methods as intents.near, with a solver that sets the prices. The chest rules, quote checks, countdown, line, fee split and claims are the real contract. Nothing is on mainnet yet.

Character count of the form description above: 1872 (limit 2000).

## Tracks chosen, with reasons

It is still one submission. List every track the project fits.

1. `memecoins` (primary). Track brief: memecoins where the meme does something, treasuries with rules, onchain rituals and challenges, judged on the mechanic. A RAID call is that mechanic: a public line, a shared chest, a forced sell rule, and a fee that exists only on a hit.
2. `defi`. Track brief: trading that settles across chains through NEAR Intents and Chain Signatures. The chest buys and sells through Intents, checks 1Click-signed quotes on chain, can sign its own buy intent with Chain Signatures, and accepts backs from NEAR, EVM and Solana-style accounts.
3. `social`. Track brief: shared budgets and collective ownership on Sputnik DAO, without rebuilding the multisig. Each crew is a Sputnik DAO v2. A raid can be a FunctionCall proposal to `call_raid`. When it passes, the DAO is the caller, and the caller fee goes to the crew treasury. The app is social first: a feed, reels, camera livestreams, profiles, follows, verified callers and a seasons leaderboard for callers and crews.

Optional: `open`, if the lead wants the "does not fit a single category" track as well. The product already fits the three above, so `open` is not required.

Not recommended: `thesis`, `privacy`, `business`, `swarms`, `security`, `agents`, `realworld`, `games`, `nfts`. Collective buying has a faint overlap with `swarms`, and the loop is game-like, but RAID is not a multi-agent market or a game with a player economy, and stretching tracks looks weak.

## Honest limits (say these in the form, the README, and the video)

- Testnet only. Nothing is deployed to mainnet. No real funds were used in these runs.
- NEAR Intents and 1Click are mainnet-only (Q-007). There is no Intents testnet. On testnet, the chest points at `contracts/intents-sim` (`raidvenue-mwgr1iba.testnet`), which implements the methods the chest calls on `intents.near`. A solver account plays the market maker and sets the prices, so fills and the price move are simulated. The chest code, quote checks, countdown, line rule, fee split and claims are the real contract.
- No swap has run through live `intents.near` and 1Click yet. That needs a small mainnet run, which the lead has not approved.
- MetaMask and Phantom signatures were checked read-only with mainnet `intents.near` `simulate_intents`. On testnet, a stand-in account plays the bridge for those backs.
- Raids called on the hosted app stay Open until someone runs the buy with a solver quote. There is no automatic keeper on testnet.
- Reel-creator rewards are tracked by the API, not by the contract. The buyback reserve accumulates on hits and has no spend method yet. The launchpad does not yet graduate coins to a DEX. The contract is not audited. Tiny amounts only.
- Verified badges and the seasons leaderboard are computed in the app from on-chain raid records (the contract has no badge or season state). Auto-join is an off-chain preference saved on the device: it prepares a Join when a followed caller opens a raid, and the user still approves it in their wallet.
- Livestreams are browser-to-browser WebRTC (one streamer to each viewer) with signaling on the RAID API and public STUN only. There is no TURN relay, so a viewer behind a strict network can fail to connect. Streams are not recorded.
- Test funds come from the in-app faucet. It opens a testnet account `u-xxxx.raidapp.testnet` for a key made in the browser, then sends test NEAR and 500 tUSDC. The parent key stays on the server.

## Required X post

The lead records the walkthrough and publishes a public post on X. Do not post on their behalf.

The post must:

- Say the project was built at NEAR HACKATHON.
- Tag `@NEARProtocol` and `#NEARHackathon`. Optional: `@NearLegion` and `@NearBuilders`.
- Attach the walkthrough video (preferred). Rules also allow screenshots, but if judges cannot open the live app, screenshots are not enough (Q-012). RAID has a hosted app, and the plan is still a 2:30 to 3:00 video with a female voiceover and captions. See `X-POST.md` and `VIDEO-SCRIPT.md`.

A good post, from the official tips: lead with the user problem; show one complete moment from a user action to a visible result; say what NEAR enables, concretely; link the live app and the public repo; ask a genuine question or invite feedback.

After the post is up, the lead sends the status URL. That URL is `demoUrl`.

## Payout account rules

- Mainnet only. Named account or 64-character implicit account, lowercase, 2-64 characters.
- The team creates it in any NEAR wallet. Nobody else may create or invent it.
- Prizes are a single payment in NEAR, no vesting, within 30 days of results (Q-016). Amounts are fixed in USD: grand prize $55,000; each track 1st $10,000, 2nd $3,000, 3rd $2,000.
- Changing a submitted payout account later goes through https://nearhackathon.com/request-changes. Organizers may message the lead to confirm.

## README and disclosure rules

Write the README for a machine reader as well as a human one (Q-017): what the product is, the problem it solves, and how to try it as "do X, see Y" steps. No marketing.

Relevant Qs:

- Q-001 / Q-003 / Q-004 / Q-005: work from the 2026-10-19 announcement to 2026-11-14 counts. Earlier commits are baseline. Libraries and the team's own pre-window code are allowed if listed. RAID already discloses that the social app shell comes from the team's earlier project Called (`docs/REUSE-MAP.md`), and that the chest, launchpad, raids, crews, keyless backing, reels, livestreams, the Tokens list, verified callers, seasons, alerts and the test-funds faucet are new in the window.
- Q-010: testnet-only projects are eligible. Mainnet is required only where the integration is mainnet-only. RAID is eligible as a testnet project, with the Intents stand-in disclosed.
- Q-012: the repository must be public by the deadline. A hosted app is a plus; keep it up to 2026-11-18, ideally 2026-11-25.
- Q-014: any license is fine; MIT is already in the repo. Keep the repo public through judging.
- Q-015: one person may submit at most two different, independent projects. Each README must name the other project. The same project must not be submitted twice. If the lead is also submitting another project (the earlier question was about Calledit.game in the `defi` track), both READMEs must name each other before the repositories go public. Do not add that line until the lead confirms the second project and its exact name.

The repository may stay private while building, but judges cannot open a private one. Do not make it public, push, or force-push without the lead's explicit confirmation.

## What the team lead must provide before anyone can submit

1. A mainnet NEAR account they created, for the prize payout (named or implicit). Not testnet.
2. Team lead name, contact email, and team size (`1` / `2 - 4` / `4 - 6` / `6 - 8` / `8+`).
3. Confirmation of the track list (recommended: `memecoins`, `defi`, `social`).
4. They post the X post themselves, with the video attached, then send the status URL.
5. They confirm the repository should be made public at `https://github.com/xElvolution/raid` (or another URL they choose). The submission cannot use a private repo.
6. Whether they are also submitting a second project. If yes, the exact name, so each README can disclose the other (Q-015).
7. Consent to the contact notice, after it is read verbatim.
8. A yes on the printed JSON payload. Only then may the form or the API be used, once.

## Testnet proof (for the description, the README, and the video)

Hit path, raid #1 on `raidchest-mwgr1bk0.testnet`: 120 tUSDC in, 246 tUSDC out. Profit 126. Caller (the crew DAO) 3.15, buyback 9.45, backers 233.40. Sold at the line. Full tx table is in the root README.

Miss path, raid #2 (3x line, 1 hour retreat): 20 tUSDC backed, bought, held, then sold at market after the retreat deadline at 0.7x. Result: 20 in, 14 out, `hit` false, caller fee 0, buyback 0, backer claimed 14.00. Run at 20:57 Africa/Lagos, 14 Nov 2026.

- Sell after retreat: https://testnet.nearblocks.io/txns/JBECpgPFy5cn7Yv1nL8xmVyvjBphRfngUBfN48NDdNV2
- Solver pays 14 tUSDC: https://testnet.nearblocks.io/txns/Czq9P7oA272av1rwLHWNYzxRyxBrNiNc85hbCcS58yWX
- Settle, Closed, miss, no fees: https://testnet.nearblocks.io/txns/Fk2k5zgfNKGc1bDVTUmSueZAqG73Vm2jTBi7pBLhSLGP
- Backer claim: https://testnet.nearblocks.io/txns/HxA7yWXE6WZtCyjKemRThvzhLRELH5xMWFjyhn1XkeLQ

Full table: root README. Raw log: `evidence/testnet-lifecycle-run.json`. Receipt list for the app: `evidence/lifecycle-receipts.json` (not written into `web/`; the UI worker can copy it).

Live app (NEAR testnet): https://raid.5-189-170-85.sslip.io (also https://raid-near.vercel.app)

What to open, as "do X, see Y":

- Home `/feed`: stories row, then For you, Following and Tokens tabs. Tokens is a live list (price, 24h, volume, market cap) with a Watchlist tab. Tap a row to see its token page: interactive chart, raids on the coin, posts about it, Buy and Start raid.
- Raid `/raids`: open raids, then a raid page such as `/raids/1`. It shows the coin, the goal badge, the caller with verified badge and Follow, an interactive chart (5m to 1D, candles or line, pinch zoom) with Entry and Target lines, the pot meter, the payoff in plain words, three steps (Join, Buys together, Sells at the line), and Chat, Who's in and Activity tabs. Join raid and Share to X sit in a bottom bar. Each raid has its own share image for X.
- Reels `/reels`: For you, Following and Live tabs. Each reel shows the creator, Follow, "@x is shilling $COIN" and a coin card with price, 24h, market cap, sparkline, Buy and Join raid.
- Live: the + button, then Go live (`/golive`). Turn on the camera, pin a coin, go live. Viewers open Reels, then Live, and see the video with chat, hearts, viewer count and the pinned coin.
- Ranks `/leaderboard`: the season leaderboard for callers and crews by realised profit, and Get verified with progress toward the badge.
- Alerts: the bell in the top bar lists raids opened, bought, hit or sold early, and Auto-join prompts.
- Test funds: sign in, then Get test funds. The account is created under `raidapp.testnet`.

Every page is readable without signing in.
