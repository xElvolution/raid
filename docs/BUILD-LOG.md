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
