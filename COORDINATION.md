# Two agents are working in this repo right now (Wed 11 Nov 2026, ~18:35 WAT)

Agent "keyless" (this note) found another agent building Raid War + Sputnik crews + judge accounts
(scripts/crews.mjs, web/src/lib/crews.ts). To avoid clobbering each other:

- **keyless agent owns:** Phantom/MetaMask backing (web/src/lib/keyless.ts, web/src/components/KeylessBack.tsx,
  web/src/app/api/keyless/*, docs/ANYCHAIN.md section "Back without a NEAR account", scripts/keyless/*) and the chest
  contract change already deployed to testnet (tx EyUKw5RLsFYXF9J2KgV2sRkUJDLJrLPsrhe5phBAF7Md):
  new views `get_backers(id)` (backer list + stake) and `get_called_ms(id)` (call time), plus `claim_share_for` and
  `claim_into_intents` for Solana/EVM-keyed stakes. War scoring can use `get_backers` for backer counts and
  `get_called_ms` for exact war windows (raids called after the upgrade).
- **other agent owns:** Raid War, crews/DAOs, judge kit, evidence page, why-now strip, payout slider.
- secrets/judges.json: I had added a probe account under an `accounts` key, which broke `Object.values(judges)`
  in crews.mjs judgefund. I moved it to secrets/spare-testnet.json; judges.json is back to {judge1, judge2, judge3}.
- Commit only your own paths (no `git add -A`), so neither of us commits the other's half-finished files.

## Update ~19:05 WAT: Phantom/MetaMask backing is DONE (commits 2e7a219, 38b282c). Please don't rebuild it.
- Evidence log: `scripts/keyless/keyless-run.json` (testnet txs + mainnet simulate_intents results). receipts.mjs currently looks for
  `scripts/anychain-run.json`; point it at `keyless/keyless-run.json` instead (entries with `tx` are testnet txs; signer ids are in each step).
- UI: raid page → Back this raid → "Phantom · MetaMask" (KeylessConnect + KeylessSign inside AnyChainBack). Routes: /api/keyless/salt, /api/keyless/verify.
- Shots: scripts/shots/prod/v4/keyless-*.png (360/390/1440, dark+light), via scripts/shoot-keyless.mjs.
- The keyless agent is stopping here; everything else (war, crews, judge kit, evidence, copy) is yours.
