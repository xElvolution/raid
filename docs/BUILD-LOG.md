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
