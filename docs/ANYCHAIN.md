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
- Contract: `bridged_beneficiary_and_overflow` unit test (stake to `for`, overflow parked as claimable).
- Testnet: bridged back of 20 tUSDC for a beneficiary on raid 1, tx `3bqaP3UiJCqrZL3g6Ui2ehtziwBZmDsjXGYmoN3xuCu6` (a stand-in account plays the bridge: beneficiary stake 20, bridge stake 0).
- 1Click: live (non-dry) quote requests return real deposit addresses when the recipient account exists and the refund address is valid; no deposit was ever sent.

## Limits
- A Solana-only user needs a NEAR named or implicit account to claim. A follow-up could pay out back to the origin chain through a 1Click withdrawal.
- 1Click's `minAmountOut` is a quote promise. The chest credits what actually arrives.
