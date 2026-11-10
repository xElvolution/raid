# Can a NEAR contract trade through NEAR Intents with no human key? (research, 10 Nov 2026)

**Verdict: yes, two documented ways, and the risky pieces are already proven without spending money.
The one thing not yet proven is a real filled swap on mainnet (that needs funds; see the go/no-go script).**

## Path 1 (default for RAID): 1Click signed quote + contract-checked `mt_transfer`
1. The chest keeps its funds inside `intents.near` under its own account (deposit = `ft_transfer_call` to `intents.near` with `msg: ""`).
2. A keeper (anyone) asks 1Click for a quote with `depositType`, `recipientType`, `refundType` = `INTENTS` and `recipient` = `refundTo` = the chest.
   For `INTENTS`, 1Click's `depositAddress` is "the account ID within NEAR Intents to which you should transfer assets" (1Click OpenAPI, `depositType`).
3. 1Click signs every quote with ed25519: signature over `base58(sha256(json-stable-stringify({...request, ...quote, timestamp})))`, key `ed25519:reYaWhvwu8Jzo3WUM3zhn6VrhuMEF4eADL17qtRVifc` (docs "Verify Quote Signatures"; `@defuse-protocol/one-click-sdk-typescript` 0.1.26 `verifyQuoteSignature`).
4. The keeper passes the signed string + signature to `execute_buy`/`execute_sell`. The contract verifies the signature with `env::ed25519_verify`, then checks assets, amount, recipient/refund = itself, `minAmountOut` >= the raid's line, deadline and age. Only then does it call `intents.near.mt_transfer(depositAddress, token, amount)` as itself.
   `intents.near` lets an account act directly as predecessor (auth-by-predecessor is on by default: `contracts/defuse/src/contract/intents/state.rs`, `is_auth_by_predecessor_id_enabled`).
5. If the swap does not fill, 1Click refunds to the chest's intents balance (refundTo = chest).
- Keyless: the keeper cannot change anything 1Click signed; a wrong quote fails the contract's checks.
- No 1Click API key needed: quotes work without a JWT, with a 0.2% fee (HACKATHON.md Q-006; verified with a live dry quote).
- Trust caveat: the price floor is 1Click's `minAmountOut` promise, enforced by 1Click/solvers, not by the verifier contract.

## Path 2 (stronger, on-chain min-out): Chain Signatures signs `raw_ed25519` token_diff intents
1. Chest calls `v1.signer.derived_public_key(path, predecessor = chest, domain_id = 1)` (EdDSA) and registers that key with `intents.near.add_public_key` (1 yocto). Named accounts must register keys (docs "Account Abstraction").
2. The contract builds the intent JSON itself (`signer_id` = chest, `verifying_contract` = `intents.near`, deadline, nonce = 4-byte current salt + 28 bytes, `token_diff` with the min-out baked in) and asks `v1.signer.sign({path, payload_v2: {Eddsa: hex(payload)}, domain_id: 1})` with 1 yocto. EdDSA payloads may be up to 1232 bytes (`near/mpc` `EDDSA_PAYLOAD_SIZE_UPPER_BOUND_BYTES`).
3. `raw_ed25519` = plain ed25519 over the payload bytes (`near/intents` `contracts/defuse/core/src/payload/raw.rs`), which is exactly what MPC EdDSA produces.
4. The signed intent goes to the solver relay `publish_intent` or 1Click `submit-intent`. Both need a partner API key from https://partners.near-intents.org (free registration, the human's action). In my test the public relay returned quotes for USDC->wNEAR but none for USDC->PEPE/DOGE/TRUMP, so memecoin routing would go through 1Click.
- Production precedent: Trezu `confidential-bulk-payment` contract (merged 6 Jul 2026, NEAR-DevHub/trezu PR #553) does steps 1-2 in production code: `v1.signer.derived_public_key` -> `intents.near.add_public_key` -> `v1.signer.sign` Eddsa.

## What ran (no money spent)
| Check | Result | Evidence |
|---|---|---|
| Real 1Click quote signature verified by SDK and by my own rebuilt string | true | `scripts/quote-check.mjs` |
| Same signature verified **on-chain** by the chest contract (testnet), tampered copy rejected | true / false | `docs/testnet-run-quote.json` |
| Contract got its MPC EdDSA key from `v1.signer-prod.testnet` | `ed25519:7npGSZS4bSvSPA8CNEnVQqpwsgHUbqKoER1DkoEp9x5d` (same as direct view) | tx `BszNAEjBttVtqK7oKzdUhFoqYbS9g1XV8c7aMBAsrqHx` |
| MPC signed a raid token_diff intent the contract built | signature valid for payload | tx `4dYy4uZ8HbBX9zAZX431RK64UoVwXh5B7tmM3H1NZ4Py`, `docs/testnet-run-mpc.json` |
| The **mainnet** verifier accepts an MPC-signed intent (free `simulate_intents` view) | failed only with `insufficient balance or overflow` (signature accepted); flipped-bit control failed with `invalid signature` | `docs/probe-mainnet-sim.json`, probe tx `BzXk6qXHA874DmNyRq9rJgFq4QcarpAg3NbT4YbKmEXk` |
| Dry 1Click quote, $1 USDC -> PEPE | ~188,540 PEPE, ~$0.99 out (≈0.6% cost) | live API, 10 Nov 2026 |

## Not yet proven (needs the funded go/no-go)
- A real fill of a contract-sent `mt_transfer` into a 1Click INTENTS deposit account, and attribution of the arriving PEPE by `settle()`.
- That `intents.near` accepts `mt_transfer` from a contract account (it is the same predecessor auth used by any account, but untested here).
- There is no NEAR Intents testnet (HACKATHON.md Q-007), so these can only be tested on mainnet.

## Sources
- HACKATHON.md: https://nearhackathon.com/HACKATHON.md
- NEAR Intents docs index: https://docs.near-intents.org/llms.txt ; pages saved in `docs/sources/`
  - https://docs.near-intents.org/integration/verifier-contract/account-abstraction
  - https://docs.near-intents.org/integration/verifier-contract/signing-intents
  - https://docs.near-intents.org/integration/verifier-contract/intent-types-and-execution
  - https://docs.near-intents.org/integration/verifier-contract/deposits-and-withdrawals/deposits and /withdrawals
  - https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/signed-intent-execution
  - https://docs.near-intents.org/integration/distribution-channels/1click-api/verify-quote-signature
  - https://docs.near-intents.org/integration/market-makers/message-bus/rpc
  - https://docs.near-intents.org/changelog/overview (1Click swaps settle confidentially since 27 Oct 2026)
  - 1Click OpenAPI: https://1click.chaindefuser.com/docs/v0/openapi.yaml
- Verifier source: https://github.com/near/intents (commit 32cd1f9, 4 Nov 2026); escrow-swap contract README there is a third, unused option (on-chain limit order)
- MPC contract: https://github.com/near/mpc (commit b5bafa3, 9 Nov 2026), `crates/contract/src/api/sign.rs`, `crates/near-mpc-crypto-types`
- Chain Signatures docs: https://docs.near.org/chain-abstraction/chain-signatures and /implementation (mainnet `v1.signer`, testnet `v1.signer-prod.testnet`, domain 1 = Ed25519)
- Trezu precedent: https://github.com/NEAR-DevHub/trezu/pull/553 (`contracts/confidential-bulk-payment`)
- 1Click SDK: https://www.npmjs.com/package/@defuse-protocol/one-click-sdk-typescript
