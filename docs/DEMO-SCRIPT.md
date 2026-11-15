# RAID demo video: 2:30 script

Not recorded yet. Record on a phone-sized browser window (390 px wide) against the prod build (`:3420`), on NEAR testnet, in dark mode.
Use a free testnet account (Sign in, then Get a free testnet account) so no wallet popup interrupts the take. Voice-over is in quotes. On-screen text is in **bold**.

| Time | Screen | Voice-over |
|---|---|---|
| 0:00–0:12 | Landing hero, then the ticker scrolling | "Every day, someone in a Telegram group yells 'PEPE to 2x', and the crowd gets dumped on. RAID makes the raid a contract." |
| 0:12–0:30 | `/raids` → tap raid #6 ($TRUMP 2x). Show the sell line on the chart and the step bar | "A raid is a coin, a line and a deadline. The crew backs it, and a war chest on NEAR buys together. It can only sell at the line, or retreat." **Can only sell at 2x** |
| 0:30–0:50 | Back panel → back 5 tUSDC (judge mode). The toast appears, then the receipt link opens NearBlocks testnet | "I back it with test USDC. That's a real testnet transaction, and here is the receipt." |
| 0:50–1:05 | Back panel → **Phantom · MetaMask** tab | "No NEAR account? Back from MetaMask or Phantom. You sign one NEAR Intents message, and the stake belongs to your wallet key." |
| 1:05–1:30 | `/war` → Frog Legion vs Doge Pack. Scroll to the proposals, tap Yes on an open one, show it pass | "Crews are Sputnik DAOs. A raid is a proposal. When it passes, the DAO itself calls the raid, so the fee goes to the crew. Two crews, 24 hours: Raid War." |
| 1:30–1:50 | `/reels`: swipe two reels, tap Back on one | "Reels sell raids. Every reel carries the coin, the live raid and a Back button. Back through a reel and its creator gets a cut of the caller's fee if the raid hits." **DEMO reels, off-chain attribution** |
| 1:50–2:05 | Raid page payoff card: what 10 in pays back if the coin hits the goal | "The deal is on chain: fees come only out of profit, 2.5% to the caller and 7.5% to the buyback. On a miss nobody takes a fee." |
| 2:05–2:20 | Split screen: `docs/TESTNET-E2E.md` checklist, then the Telegram mock card | "We rehearsed the whole flow on testnet in one script: DAO vote, three kinds of backers, a reel, the launchpad, and Chain Signatures signing the buy. The swap itself waits for mainnet Intents." |
| 2:20–2:30 | Logo end card + URL | "RAID. Call it. Back it. Hit the line." **Built on NEAR Intents · Chain Signatures · Sputnik DAO** |

## Shot list and prep
- Before recording, run `node scripts/testnet-e2e.mjs a` so a fresh DAO raid is in its crew window, which keeps the countdown live on screen.
- Judge account: use judge2 (Frog Legion member) for the vote take.
- Don't show `secrets/`, `.local.md` files or a pasted key on screen. Paste the key off-camera.
- The hero numbers, the receipts and the chart are live. Don't edit them in post.

## What the user still needs to do
Record the screen (or approve an automated headless capture), add the voice-over, and add the hosted URL once deployed.
