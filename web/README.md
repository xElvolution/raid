# RAID web app

Next.js 16 app for RAID on NEAR testnet. Live at https://raid-near.vercel.app

## Pages
| Route | What you see |
|---|---|
| `/` | Home: the social feed (For you, Following, Tokens) |
| `/raids`, `/raids/[id]` | Raid list and one raid: phase, pot, backers, back form, receipts and its testnet transactions |
| `/settings` | Mainnet/Testnet switch and Get test funds (faucet) |
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
- Test funds faucet, server only: `RAID_FAUCET_ACCOUNT`, `RAID_FAUCET_KEY` (owner of the testnet tUSDC), `RAID_FAUCET_USDC`, optional `RAID_FAUCET_LAUNCH_USDC`. The browser makes the account key; only its public key reaches the server.

`npm test`, `npm run lint` and `npm run typecheck` run the checks.
