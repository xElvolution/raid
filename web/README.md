# RAID web app

Next.js 16 app for RAID on NEAR testnet. Live at https://app.raid.5-189-170-85.sslip.io

## Pages
| Route | What you see |
|---|---|
| `/` | Home: live raids, coins you can raid, the judge box |
| `/raids`, `/raids/[id]` | Raid list and one raid: phase, pot, backers, back form, receipts and its testnet transactions |
| `/judges` | One-click testnet judge account (judge faucet), payout slider, links to check every contract |
| `/war` | Raid War: two crews (Sputnik DAOs) scored from chest records |
| `/launch` | Bonding-curve launchpad on testnet, plus live meme.cooking launches (read-only) |
| `/feed`, `/reels`, `/leaderboard`, `/u/[handle]` | Social feed, reels, callers, profiles (RAID API) |

## Run
```
cd ../sdk && npm ci && npm run build
cd ../web && npm ci && npm run build && npx next start -p 3420
```
Env (all optional, testnet defaults shown in `src/lib/raid.ts`):
- `NEXT_PUBLIC_RAID_CHEST`: chest contract (live app: `raidchest-mwgr1bk0.testnet`)
- `NEXT_PUBLIC_RAID_API`: RAID API origin for the feed and reels
- `NEXT_PUBLIC_RAID_RPC`: NEAR RPC
- Judge faucet, server only: `RAID_FAUCET_ACCOUNT`, `RAID_FAUCET_KEY` (owner of the testnet tUSDC), `RAID_FAUCET_USDC`, optional `RAID_FAUCET_LAUNCH_USDC`. The browser makes the judge key; only its public key reaches the server.

`npm test`, `npm run lint` and `npm run typecheck` run the checks.
