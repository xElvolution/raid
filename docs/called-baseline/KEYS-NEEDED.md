# Keys and accounts (testnet production)

## Already provisioned (on the box, mode 600, never committed)
- `/home/box/.called-testnet.env` — NEAR testnet accounts + keys: CONTRACT (called-markets-2478.testnet), OWNER, COURT, TREASURY, RELAYER (operator + token owner), TOKEN (called-usdc-2478.testnet, test USDC with faucet).
- `/home/box/.called-app-secrets.env` — generated `JWT_SECRET`, `RESOLVER_TOKEN`, `ADMIN_TOKEN`.
- Contracts deployed on testnet: markets `called-markets-2478.testnet` (operator = relayer), collateral `called-usdc-2478.testnet` (6 decimals, `faucet()` 1,000/24h).
- Database / Redis: self-hosted on the VPS (`called-preview-pg` → database `called_prod`, `called-preview-redis` → DB 2), created by `deploy/deploy-prod.sh`.

## Still needed from the user
| Env var | Where to get it | What it is for | Without it |
|---|---|---|---|
| `PRIVY_APP_ID` | dashboard.privy.io → app → Settings | Login (web `NEXT_PUBLIC_PRIVY_APP_ID` + API token audience) | `/v1/auth/privy` answers 503 |
| `PRIVY_APP_SECRET` | same page | Server-side lookup of linked email / NEAR wallet | Login works; no email/wallet linking |
| `PRIVY_VERIFICATION_KEY` (optional) | Privy → Settings → Verification key | Offline token verification | JWKS fetched from Privy |
| `NEARAI_API_KEY` | cloud.near.ai | Verifiable AI judge + AI market drafter | Markets wait for the court (`POST /v1/admin/markets/:id/resolve` with `x-admin-token`) |
| Public URL (domain or named Cloudflare tunnel token) | user DNS / Cloudflare | Stable production URL; Privy allowed origin | No public prod URL |

Optional: `EXPO_ACCESS_TOKEN` (push), Polymarket keys (`POLYMARKET_*`, order routing), `BLOCKED_COUNTRIES` review.

## Env flags
- `PLAY_MONEY=0` disables the play-money ledger; with `NEAR_CONTRACT_ID`+`COLLATERAL_TOKEN`+`RELAYER_*` set, balances/trades/payouts run on-chain.
- `DEMO_MODE=0` / `NEXT_PUBLIC_DEMO_MODE=0` hides demo sign-in. `NEAR_SIGNIN=0` / `NEXT_PUBLIC_NEAR_SIGNIN=0` leaves Privy as the only login.
- `HOUSE_LIQUIDITY` (default 1000 tUSDC) seeds each on-chain market; `FAUCET_AMOUNT` (1000).

## Mainnet later
`NETWORK=mainnet COLLATERAL_TOKEN=<real USDC> SECRETS_FILE=<mainnet accounts> node deploy/testnet/deploy.mjs` (refuses mainnet without COLLATERAL_TOKEN; faucet off on mainnet).
