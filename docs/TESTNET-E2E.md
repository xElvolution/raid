# Testnet E2E rehearsal: checklist

One script, `scripts/testnet-e2e.mjs`, runs in two phases. `a` handles the call, the backs, the reel, the war, the launchpad and settle/claim. `b` runs after the 10-min crew window and the 10-min public countdown and covers Chain Signatures.
- Network: **NEAR testnet only.** The MetaMask and Phantom signature checks are free read-only `simulate_intents` views on mainnet `intents.near`.
- No mainnet transaction was sent and no money was spent.
- Raid: **#6** ($TRUMP 2x on `raid-chest-mwab3vnk.testnet`), called by the Frog Legion DAO.
- Run: 2026-11-11T17:57:31.728Z → 2026-11-11T18:24:06.465Z (UTC). Full log: `scripts/testnet-e2e-run.json`, also copied to `evidence/testnet-e2e-run.json`.
- Screenshots: 390 px, dark and light, in `scripts/shots/prod/v4/e2e/`.

**Result: 21 pass · 4 blocked only because NEAR Intents / 1Click don't exist on testnet · 0 fail.**

| # | Step | Result | Tx (NearBlocks testnet) | Screenshot |
|---|---|---|---|---|
| 0 | Preflight: testnet chest, testnet USDC, NEAR Intents stand-in | ✅ pass | — | — |
| 1 | Crew DAO proposal: Frog Legion proposes call_raid $TRUMP 2x | ✅ pass | [`AzaGzU2DzY…`](https://testnet.nearblocks.io/txns/AzaGzU2DzYMEQz2y3mY24V1PwC94dqcdnJpQJPapdBYF) | `e2e-02-crew-proposal-dark-390-fold.png` |
| 2 | Crew vote 1/2: captain approves | ✅ pass | [`63D1m1ZrdN…`](https://testnet.nearblocks.io/txns/63D1m1ZrdNK9rWnhSTGYedxwenVtdPrnsuXHkTPsxyem) | `e2e-02-crew-proposal-dark-390-fold.png` |
| 3 | Crew vote 2/2: member approves, proposal passes, the DAO calls the raid | ✅ pass | [`85jtMEp2Qx…`](https://testnet.nearblocks.io/txns/85jtMEp2Qxqa9KFpt21KnPBxsL9qMe5EBHofemUjXW12) | `e2e-03-raid-called-by-dao-dark-390-fold.png` |
| 4 | Back from a NEAR wallet: 40 tUSDC | ✅ pass | [`6R482mgBBY…`](https://testnet.nearblocks.io/txns/6R482mgBBYoRQm2D27MzW7TnmxTn2qkHHEYPrG9rYLZi) (mint [`4dcjPBWr…`](https://testnet.nearblocks.io/txns/4dcjPBWr8bX7xV16LYgsK1ufmqdWVtyA4EbLTh9SNTTQ)) | `e2e-04-backers-dark-390-fold.png` |
| 5a | MetaMask (ERC-191) signs the back intent; intents.near on mainnet accepts the signature (simulate_intents, read-only) | ✅ pass | — | `e2e-05-phantom-metamask-dark-390-fold.png` |
| 6a | Phantom (raw Ed25519) signs the back intent; intents.near on mainnet accepts the signature (simulate_intents, read-only) | ✅ pass | — | `e2e-05-phantom-metamask-dark-390-fold.png` |
| 5b | MetaMask-derived account backs 12 tUSDC (stand-in bridge delivers with for=0x…) | ✅ pass | [`7CfiouYJWK…`](https://testnet.nearblocks.io/txns/7CfiouYJWK9CThJXDjdFJmPQKitKUAu9cBNQLvZoVa91) (mint [`47qkZ5rz…`](https://testnet.nearblocks.io/txns/47qkZ5rzcSAwzED8fTdNC4hSvrswUJcRx1s848ik26pf)) | `e2e-04-backers-dark-390-fold.png` |
| 6b | Phantom-derived account backs 9 tUSDC (stand-in bridge delivers with for=<64-hex>) | ✅ pass | [`AqTUMBDUta…`](https://testnet.nearblocks.io/txns/AqTUMBDUtajabaYq3vxSdMm8X6ocWmbDZWRUfLSfyZGn) | `e2e-04-backers-dark-390-fold.png` |
| 7 | get_backers lists the NEAR, 0x and Ed25519 accounts with their stakes | ✅ pass | — | `e2e-04-backers-dark-390-fold.png` |
| 8 | Reel creator signs in to the RAID API with NEP-413 (no gas) | ✅ pass | — | `e2e-06-reel-dark-390-fold.png` |
| 9 | Upload a DEMO reel (8 s mp4 rendered from real TRUMP candles) linked to the raid | ✅ pass | — | `e2e-06-reel-dark-390-fold.png` |
| 10 | Back 30 tUSDC through the reel; API verifies the tx on chain and credits the reel (off-chain attribution, demo) | ✅ pass | [`pQivDuLEL9…`](https://testnet.nearblocks.io/txns/pQivDuLEL9DQWXJRrKQHpPDYTAr8xjDMGs2P7vdC9pt) (mint [`G2BUnbwP…`](https://testnet.nearblocks.io/txns/G2BUnbwPR5apwrbGtUQDX5pjC45mdGYUAYeKgqXP1ixw)) | `e2e-07-reel-board-dark-390-fold.png` |
| 11 | Raid War scoring: the new DAO raid counts for Frog Legion's firepower | ✅ pass | — | `e2e-01-war-score-dark-390-fold.png` |
| 12 | Launchpad: create $E2EF9TQM | ✅ pass | [`8xjYTUaBT6…`](https://testnet.nearblocks.io/txns/8xjYTUaBT6fTL16Ae1ezFRLzMauBcvZeziQZHURp3LJH) | `e2e-08-launchpad-dark-390-fold.png` |
| 13 | Launchpad: buy with 10 tUSDC on the bonding curve | ✅ pass | [`DhP5PWjB5x…`](https://testnet.nearblocks.io/txns/DhP5PWjB5x1v89RFxuaNwzm85M8H8gLCsi5fYduYAbYh) (mint [`7wuK2Bio…`](https://testnet.nearblocks.io/txns/7wuK2BiopsVkJ3Tv2S5mcwYSAW9raTcT3KD7HcYqeV1W)) | `e2e-08-launchpad-dark-390-fold.png` |
| 14 | Launchpad: sell half back to the curve | ✅ pass | [`FVwq4CT3Jv…`](https://testnet.nearblocks.io/txns/FVwq4CT3JvWU9bd7XXy17qXggiRD9xHmq8EEdh41xaSF) | `e2e-08-launchpad-dark-390-fold.png` |
| 15 | Launchpad: creator claims trading fees (a real claim on testnet) | ✅ pass | [`7tGeYWLFuX…`](https://testnet.nearblocks.io/txns/7tGeYWLFuX472tKvhXApQwRM2guGi5TAaZAT9eHYx5rN) | `e2e-08-launchpad-dark-390-fold.png` |
| 16 | settle(raid): reads the chest's intents.near balance after a buy or sell | ⏸ Intents only | — | — |
| 17 | claim_share_for(raid, backer): pull a backer's share of a closed raid | ⏸ Intents only | — | — |
| 18 | payout_preview: what the 40 tUSDC NEAR backer gets if the line hits (contract view) | ✅ pass | — | `e2e-10-reel-back-receipt-dark-390-fold.png` |
| 19a | Chain Signatures: the chest derives its own key from v1.signer-prod.testnet (mpc_bootstrap, anyone can call) | ✅ pass | [`3JcLvFxqd5…`](https://testnet.nearblocks.io/txns/3JcLvFxqd5xxk6eUJqdGcig1SeabKgA7BjJWJLVb79Ym) | `e2e-09-countdown-over-mpc-dark-390-fold.png` |
| 19 | Chain Signatures (v1.signer-prod.testnet) signs the chest's buy intent for the whole pot | ✅ pass | [`FZGSY98xpw…`](https://testnet.nearblocks.io/txns/FZGSY98xpwKyJoUuBRAJFW2o34HkNwiTYtNQqpiQXHBZ) | `e2e-09-countdown-over-mpc-dark-390-fold.png` |
| 20 | execute_buy / submit the signed intent to NEAR Intents and buy $TRUMP | ⏸ Intents only | — | — |
| 21 | execute_sell at the line, settle, claim_share, claim / claim_into_intents | ⏸ Intents only | — | — |

## Notes
- **Back transactions show one failed receipt.** It is on `intents-not-on-testnet.raid-chest-mwab3vnk.testnet`. After `raid_backed` records the stake, the chest forwards the USDC into NEAR Intents, and that account does not exist on testnet. The stake is recorded (`get_stake`, `get_backers`). Each step logs `intents_forward_failed_as_expected: true`.
- **MetaMask / Phantom (5a–6b).**
  - Throwaway keys, generated during the run and never funded, sign the exact `ft_withdraw` back intent the app builds. Mainnet `intents.near` accepts both signatures: it answers "insufficient balance", which it only reaches after the signature is verified.
  - On mainnet, Intents executes that intent. On testnet, a stand-in account (`launch.raid-chest-mwab3vnk.testnet`) delivers tUSDC with `{"back", "for": <wallet account>}`, so the stake is owned by the `0x…` / 64-hex account.
- **Reel attribution (8–10).** The creator signs in with NEP-413 (no gas) and uploads a DEMO reel rendered from real TRUMP candles. A back made "through" the reel is posted to the API, which re-reads the tx from the chain (`raid_backed`, same raid, same backer) before counting it. The reward share is **off-chain attribution, demo**.
- **Raid War (11).** Scoring uses the same rule as the app. Hits are 0 because no testnet raid can settle; firepower is backed USDC.
- **Chain Signatures (19a, 19).**
  - The chest's key was cleared by the v2 state migration, so the run re-derived it (`mpc_bootstrap`, same key as the v1 run: `ed25519:7npGSZS4…`).
  - `mpc_sign_buy` returned a valid Ed25519 signature over a `token_diff` intent for the **whole pot**. The script checks it with tweetnacl.
  - `min_out` is `1` here because no testnet price quote exists. On mainnet the keeper passes the quote floor.
- **Intents-only steps (16, 17, 20, 21).** The swap needs a 1Click-signed quote and a live `intents.near`, so the raid can't leave `Open` on testnet. `settle` answers "nothing to settle" and `claim_share_for` answers "raid not closed". The full buy → sell → split → claim path is covered by contract unit tests (`full_raid_lifecycle`, `miss_pays_no_fees_and_backers_can_lose`, `anyone_can_settle_a_keyless_backer_into_intents`) and needs mainnet for a live run.
