# RAID build log (win fixes, 11–14 Nov 2026)

Times are WAT (UTC+1). Testnet only: no mainnet transaction, no money spent, nothing pushed.

## 1. Raid War (crew vs crew, 24 h) — done 11 Nov ~18:40
- `/war`: two crews, a live countdown, a split bar and two firepower bars, the raids each crew DAO called, and a share card.
- Scoring (`web/src/lib/crews.ts` `warScore`, unit-tested in `web/src/test/war.test.ts`): USDC backed on raids the crew's DAO called
  during the war window, times the realised multiple (proceeds / entry cost) once a raid settles. More hits wins first, firepower
  breaks ties. Only chest records are used; no new contract.
- Share card: `GET /api/war/card` returns a 1200x630 PNG (next/og), also the page's OpenGraph image. "Post" opens an X intent.
- War #1 started 18:28 WAT 11 Nov (the crews' first proposals) and ends 18:28 WAT 12 Nov.

## 2. Crews as Sputnik DAO v2 (testnet) — done 11 Nov ~18:40
- Factory verified on chain: `sputnikv2.testnet` (5,578 DAOs, `get_dao_list` returns `*.sputnikv2.testnet`). The README in
  near-daos/sputnik-dao-contract names `sputnik-v2.testnet`, which has no factory methods; `sputnik-dao.testnet` has no code.
- `scripts/crews.mjs` (steps `accounts`, `daos`, `proposals`, `vote`, `back`, `judgefund`, `status`; log in `scripts/crews-run.json`).
- Two DAOs, 3 members each, RoleWeight threshold 1/2 (2 of 3 votes), 0.1 NEAR proposal bond, 24 h voting period; anyone may propose.
  - Frog Legion `raid-frog-legion.sputnikv2.testnet`, Doge Pack `raid-doge-pack.sputnikv2.testnet`.
- A crew raid is a `FunctionCall` proposal to `call_raid` on the chest. When it passes, the DAO itself calls the raid, so the raid's
  on-chain caller is the DAO (raids #3 and #4). One proposal per crew is left at 1/2 votes so a judge (crew member) can cast the
  deciding vote in the app.
- In-app: members, votes needed, each proposal with its vote bar, Yes/No buttons for members (wallet `act_proposal`), and a Propose form.

## 3. Judge kit (PIRY-style) — done 11 Nov ~18:45
- `/judges`: "Try a raid in 2 minutes". 3 prefunded testnet judge accounts (10 testnet NEAR from the faucet helper + 500 tUSDC each):
  `raid-judge1-mwce6ry3.testnet`, `raid-judge2-mwce6vli.testnet` (Frog Legion members), `raid-judge3-mwce6zdz.testnet` (Doge Pack).
  Keys: `secrets/judges.json` and `docs/JUDGE-ACCESS.local.md` (both gitignored) for the submission form only.
- Judge mode (`web/src/lib/wallet.ts`): paste a judge key, the app checks it is an access key of that account on chain, keeps it in
  localStorage only, and signs testnet calls in-browser (no wallet install). Checked end to end in headless Chrome
  (`scripts/judge-e2e.mjs`): Judge 2 backed raid #3 with 5 tUSDC through the UI, stake 0 -> 5,000,000 on the chest.
- Receipts on every raid card and raid page: contract, the tx that called the raid, its block, and each logged back, linked to
  testnet NearBlocks. Built by `scripts/receipts.mjs` from the run logs + RPC (`web/src/lib/receipts.json`, `evidence/testnet-txs.json`).
  Raids called later (not in our logs) link to the contract history instead of a tx.
- "Why now" strip: live CoinGecko `/coins/categories` (Meme, Solana Meme, Pump.fun Ecosystem, Base Meme: market cap, 24 h volume,
  24 h change), each card linked to its CoinGecko page. If CoinGecko fails, numbers are hidden, not guessed.
- Payout slider: stake 1–250, line 1.5x/2x/3x, net on a hit (with caller and reserve cuts) and a miss case with a retreat price slider.
  Uses the chest's live fee config.
- Founder line: `web/src/lib/judges.ts` `FOUNDER_LINE` is empty on purpose; it renders on /judges once Elvis writes it.
- Honest notes on /judges: testnet, no swaps on testnet, not audited.
- Copy fix: landing no longer says "RAID gets burned" (the RAID token is cut).

## 5. Reels (vertical video feed that sells raids)

- **API** (`api/src/reels.ts`, tables `reels` + `reel_backs`): upload a raw `video/mp4` up to 60 s (duration read from the mp4 `mvhd` box, 40 MB cap, stored under `.data/reels/`, served with HTTP Range), or paste an `https://` X / Instagram / TikTok link (an embed card). Every reel can name a coin and a raid.
- **Attribution**: the Back button opens `/raids/:id?reel=ID`; after a back succeeds, the web posts `{tx, backer}` to `/v1/raid/reels/:id/backs`. The API checks the tx on the testnet RPC (`raid_backed` event, same raid, same backer) before it counts. On a hit, the reel creator is credited 20% of the caller's 2.5% fee (= 0.5% of profit), pro rata to the stake their reel brought. **This is off-chain attribution, demo**: the deployed chest contract is unchanged, and the UI says so.
- **Web**: `/reels` is a snap-scroll vertical feed (autoplays muted only when on screen; tap to unmute) with a coin chip, live raid phase from the chest, 24h change, and an inline Back / Buy / Raid-it button. `/reels/top` ranks creators by hits, then by USDC backed through their reels. "+ Reel" opens a composer (upload or link, coin, raid, sign-in with no gas).
- **Nav**: phone tabs are now Feed · Raids · + · Reels · War (5 slots). Launchpad, Live, Ranks and Judges moved to a slim link row on /raids; the desktop rail lists everything.
- **Demo content**: 3 reels (`api/demo-reels/`, made by `scripts/reels/make-demo-reels.py`) are 8 s cards rendered from real 1 h candles (GeckoTerminal / CoinGecko). Each frame says "DEMO REEL" and "Demo content made by the RAID team. Not advice". The seeded authors are `demo_*` accounts. No real people.
- Tests: API 35/35 (3 new reel tests), web 13/13 and tsc clean. Shots: `scripts/shots/prod/v4/reels-*-390-fold.png`, `reels-top-*`, `reels-dark-1440-fold.png`.

## 6. Telegram raid bot (code only, not run live)

- `api/src/telegram/bot.ts` holds the logic, with injected Telegram and chest clients. `run.ts` is the runner.
- `/raid PEPE 2x` finds the open PEPE 2x raid on the chest (the one with the most time left). It posts a countdown card: phase, time left, pot with a fill bar against `max_pot`, the caller, and a **Back raid #N** button to `/raids/N`.
- Every 30 s the bot edits the card (countdown, fill). It replies "+X USDC joined" when the pot grows, and announces **hit** or **retreat** with a Claim button, then stops tracking.
- With no matching raid, it offers "Call $SYM Nx". The bot only reads the chain; it never signs or holds funds.
- The token comes only from `TELEGRAM_BOT_TOKEN`. Without it, `npm run telegram` refuses to start. `npm run telegram:mock` prints what it would post, against the live testnet chest, to a console Telegram (`evidence/telegram-mock-run.txt`).
- Tests: `api/test/telegram.test.ts` (4) cover command parsing, raid choice, card → fill → held → hit, retreat, and no-raid. The bot has not run live; that needs a bot token from @BotFather.
