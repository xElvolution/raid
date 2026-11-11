# Any-chain backing (NEAR Intents 1Click)

Goal: a Solana or EVM holder backs a raid without first bridging or opening a NEAR DEX, and the stake is credited to **them**, not to the bridge.

## Flow
1. The backer picks an origin (SOL or USDC on Solana; ETH or USDC on Base or Ethereum; USDC on Arbitrum), an amount, their RAID (NEAR) account as beneficiary, and a refund address on the origin chain.
2. `web/src/app/api/anychain/quote` asks 1Click (`POST https://1click.chaindefuser.com/v0/quote`, no API key) for an `EXACT_INPUT` swap to mainnet USDC
   (`nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`) with
   `recipient = <chest>`, `recipientType = DESTINATION_CHAIN` and `customRecipientMsg = {"back": <raid id>, "for": "<beneficiary>"}`.
3. The backer sends to the returned deposit address. 1Click swaps, then calls `ft_transfer_call(chest, amount, msg)`.
4. The chest's `ft_on_transfer` parses `BackMsg { back, for }` and credits the stake to `for`.
   - If the raid is full, past its crew window, or the amount is over the per-backer cap, the bridged amount is **not refunded to the bridge** (that would strand it in the 1Click account). It is parked as `claimable` for the beneficiary, who calls `claim`.
   - Direct NEAR backers (no `for`) still get the excess refunded in the same transaction.

## Flags (why testnet shows no deposit address)
NEAR Intents and 1Click run on mainnet only. Live deposit addresses are issued only when **all** of these hold:
- `RAID_ANYCHAIN_LIVE=1` (server env)
- `NEXT_PUBLIC_RAID_MAINNET_CHEST=<mainnet chest account>`
- a valid refund address for the origin chain and a beneficiary account

Otherwise the route requests a real **dry** quote (indicative price and fees, no deposit address) using a preview refund address and `intents.near` as recipient, and the UI explains why in a dashed reason box.

## Tested
- Contract: `bridged_backing_credits_the_beneficiary_and_parks_overflow` unit test (stake to `for`, overflow parked as claimable).
- Testnet: bridged back of 20 tUSDC for a beneficiary on raid 1, tx `3bqaP3UiJCqrZL3g6Ui2ehtziwBZmDsjXGYmoN3xuCu6` (a stand-in account plays the bridge: beneficiary stake 20, bridge stake 0).
- 1Click: live (non-dry) quote requests return real deposit addresses when the recipient account exists and the refund address is valid; no deposit was ever sent.

## Back without a NEAR account (Phantom / MetaMask)
NEAR Intents accepts intents signed by non-NEAR wallets (source: `docs/sources/integration_verifier-contract_signing-intents.md`):
MetaMask signs **ERC-191** (`personal_sign`), Phantom signs **raw Ed25519** (`signMessage`). Each wallet already controls an intents account:

| Wallet | Intents account (= RAID stake owner) | Signature in the MultiPayload |
|---|---|---|
| MetaMask | lowercase `0x…` address | `{"standard":"erc191","payload":…,"signature":"secp256k1:<65 bytes, v ∈ {0,1}>"}` |
| Phantom | hex of the 32-byte Solana address | `{"standard":"raw_ed25519","payload":…,"public_key":"ed25519:<address>","signature":"ed25519:…"}` |

In the app (raid page → **Back this raid** → **Phantom · MetaMask**):
1. **Connect** Phantom or MetaMask (`web/src/lib/keyless.ts`, `web/src/components/KeylessBack.tsx`). The app derives the intents account,
   puts it in the beneficiary field and uses the wallet address as the refund address. The origin list narrows to that wallet's chains.
2. **Deposit route** (wallet holds SOL/ETH/USDC on its own chain): the existing 1Click quote, now with `for = <intents account>`.
   1Click delivers USDC to the chest with `{"back": id, "for": "0x…"}` and the stake belongs to the wallet key. No NEAR account is created or needed.
3. **Signed-intent route** (wallet already holds USDC inside NEAR Intents): the wallet signs one `ft_withdraw` intent
   (`token` = USDC, `receiver_id` = chest, `msg` = `{"back": id, "for": <signer>}`; nonce = 4-byte `current_salt` + 28 random bytes).
   `POST /api/keyless/verify` checks the shape, recomputes the signer (ethers ERC-191 recovery / Node Ed25519) and runs
   intents.near **`simulate_intents` on mainnet** (a free view, no transaction). A relayer would submit it with `execute_intents`.
4. **Payout without a NEAR tx**: chest methods `claim_share_for(id, account)` and `claim_into_intents(account)` are permissionless
   but can only credit the owner; the second moves the USDC into intents.near under the wallet's account (`mt_transfer`), where only
   that wallet's signature can spend or withdraw it.

### Proof (`scripts/keyless/prove.mjs`, results in `scripts/keyless/keyless-run.json`)
- Throwaway keys (generated, never funded, discarded) signed the exact payload the app builds. intents.near `simulate_intents` on mainnet
  answered **"insufficient balance"** for both, which it only reaches after the signature checks out for that account (ERC-191 signer
  `0x4a8586a241f4e123f209e0fff688b48327e8f5e3`; Ed25519 signer `eb3a4e2d…534cc2a` = Solana `GqENiyu7aL6PctKYbfWbhpTgSN1wX4VyYBmx4n88i5xm`).
  Controls: amount changed after signing → "public key … doesn't exist for account"; beneficiary swapped → "invalid signature".
- Testnet chest code upgrade adding `get_backers`, `get_called_ms`, `claim_share_for`, `claim_into_intents`: `EyUKw5RLsFYXF9J2KgV2sRkUJDLJrLPsrhe5phBAF7Md` (state unchanged).
- Testnet raid #5 ($SHIB 2x, `CckroL8CNXmrHyLCL96DCuodC7BhxXK4xiASvUuBmzQ6`): a stand-in bridge account delivered tUSDC with `for` set to the
  MetaMask account (`2P2dXCD3Cms82DsFtPNzK7CYvVwh4XYu35NS4oevkmf4`, 8 tUSDC) and the Phantom account (`BtD4rP6JcPRndzd3AvsNMNxEfwGdoYqBaurbUCyYiUnb`, 7 tUSDC).
  `get_backers(5)` returns both accounts with their stakes. The transactions show a failed last receipt because the chest forwards to
  NEAR Intents, which doesn't exist on testnet; the stakes are recorded.
- Unit tests: `backers_and_call_time_are_listed`, `anyone_can_settle_a_keyless_backer_into_intents` (contract); `src/test/keyless.test.ts` (web).
- Screens: `scripts/shoot-keyless.mjs` injects test wallets (throwaway keys) and shoots connect → sign → verify at 360/390/1440.

### What is gated for mainnet, and why
- Live deposit addresses: need `RAID_ANYCHAIN_LIVE=1` and `NEXT_PUBLIC_RAID_MAINNET_CHEST` (1Click is mainnet-only).
- Submitting the signed intent (`execute_intents` by a relayer, which pays NEAR gas): not built as a live call. The verify route never submits.
  It needs the mainnet chest, a funded relayer account and the user's explicit yes.
- Sending the deposit from the wallet: the app shows the deposit address to copy. One-tap send from MetaMask/Phantom isn't wired.

## Limits
- Payouts for Solana/EVM-keyed stakes land in NEAR Intents (`claim_into_intents`). Getting them back to Solana or an EVM chain is a normal
  intents withdrawal the wallet signs. RAID doesn't build that withdrawal yet.
- The backer list (`get_backers`) only covers backs made after the 11 Nov upgrade. It stops listing after 2,000 backers per raid (stakes still count).
- 1Click's `minAmountOut` is a quote promise. The chest credits what actually arrives.
