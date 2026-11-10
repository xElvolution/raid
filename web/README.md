# @called/web

Next.js 16 app for Called: every product screen, Duolingo-style design system, realtime odds and feed over websockets.

## Screens
| Route | Screen |
|---|---|
| `/welcome` | Onboarding with Calli (4 steps, topic picker) |
| `/signin` | NEAR wallet sign-in (NEP-413 signMessage via wallet-selector: Meteor, MyNearWallet) |
| `/` | Home feed: For you / Following, composer with "Make it a market", live "new calls" pill |
| `/markets`, `/markets/[id]` | Called markets: live probability + sparkline, Yes/No trade panel (contract), activity, AI verdict proof |
| `/external`, `/external/[id]` | Live Polymarket markets (synced odds, search), region-aware trade buttons |
| `/create` | Post → AI market draft, drafts list (clarity, rules, sources) |
| `/leaderboard` | Divisions Bronze→Diamond, volume leaderboards (24h / 7d / 30d) |
| `/u/[handle]` | Profile: streak, XP, league, calls, follow |
| `/notifications` | Live alerts |

## Design system
Tokens in `src/app/globals.css` (Called Green `#58CC02`, Sky, Sun, Coral; Nunito). `src/components/ui.tsx`: chunky 3D `Button` (bottom edge collapses on press), `Card`, `Pill`, `Progress`, `Segmented`, `Avatar`. `Calli.tsx`: SVG mascot with moods. `lib/fx.ts`: confetti + haptics (`navigator.vibrate` on mobile). Motion respects `prefers-reduced-motion`. XP/streaks/leagues are non-monetary.

## Run
```
cp .env.example .env.local
npm i && npm run dev        # expects the API on the same origin or NEXT_PUBLIC_API_URL
npm test && npm run lint && npm run typecheck && npm run build
```
Trading on Called markets is disabled in the UI until `NEXT_PUBLIC_CONTRACT_ID` is set.
