# RAID walkthrough script

Length: 2:30 to 3:00. Voice: one female voiceover, clear, close to the mic, no echo. Burn in captions (same words as the voice, short lines, high contrast). Music, if any, stays under the voice and drops on the NearBlocks shot. Do not say the product is on mainnet. Do not claim a live mainnet run, and do not present this as someone else's product.

Shoot the live testnet app: https://raid.5-189-170-85.sslip.io
Prefer a phone frame for the feed, profiles, call, back and countdown. Use a desktop or wide shot for NearBlocks and the judges page if those read better. Cursor or thumb should move slowly. Hold each result long enough to read the numbers.

If the UI worker has just shipped a new layout, follow the screens that exist: landing, feed, profile, call a raid, back, countdown, buy, line hit, payout, judges faucet, NearBlocks. Do not linger on leftover pages that are not part of this loop.

## Runtime and word count

About 450 to 500 spoken words, at a calm 160 to 170 words per minute, with pauses on the numbers. Total target 2:45, with a few seconds of hold at the end.

## Scene list

### 0:00 to 0:14: Landing
On screen: the RAID landing page, full frame, then a slow move toward the chest or the main call to action.
VO: You've seen the raid in the group chat. Someone calls a coin. Friends pile in. Then the caller is gone, and nobody can prove who sold first.
Caption the same text.

### 0:14 to 0:30: Feed
On screen: open the app feed, a single column, and scroll once through posts from the testnet accounts. Pause on a post that carries a raid card. If an account has a testnet tag, leave it visible.
VO: RAID puts that raid on a NEAR contract, and wraps it in a public feed. These are testnet accounts, each with real calls, backs and posts you can open.
Caption the same text.

### 0:30 to 0:46: Profile
On screen: tap one of those accounts. Show the profile: bio, raid history, wins and losses, raids called and raids backed. Scroll once, then return.
VO: Tap a person and you see their record. Not a private tip group. A public history of the raids they called and the ones they backed, with the outcome on chain.

### 0:46 to 1:02: Call a raid
On screen: go to Call a raid. Pick a coin, set a line at 2x, and set a retreat deadline. Show the confirm step and the receipt landing on the new raid page.
VO: Anyone, or a crew DAO by vote, can call a raid. You name the coin, the line, 1.5x, 2x or 3x, and the retreat deadline. That call is a contract, not a message.

### 1:02 to 1:16: Back
On screen: open the back action on that raid, or on raid #1 if the new call is not useful on camera. Show a NEAR back going in, then point to backers from a NEAR wallet, an EVM account and a Solana-style account on raid #1.
VO: The crew backs it with USDC in a public window. You can back from a NEAR wallet, or from MetaMask or Phantom with no NEAR account, through NEAR Intents.

### 1:16 to 1:30: Countdown
On screen: the raid page during the public countdown. Show the clock, the pot, and the line. If a premature buy was refused, flash that receipt, or cut to raid #1's "buy during the countdown: refused" row.
VO: When the window closes, a public countdown starts. The buy time is on chain, so nobody gets a surprise purchase. A buy before that clock ends is refused.

### 1:30 to 1:48: Buy
On screen: the chest buys. Show the pot moving, the status changing to Held, and the entry. Keep the war chest or status chip in frame.
VO: Then the chest buys the whole pot in one swap. It is keyless. It can sign its own intent with Chain Signatures, and it refuses a quote whose signature does not match. Everyone is in at the same price.

### 1:48 to 2:08: Line hit and payout
On screen: raid #1, already closed at the line. Show 120 in, 246 out. Show the fee split: caller 3.15, buyback 9.45, backers 233.40. Then show a backer claim, and the crew DAO claiming the caller fee.
VO: The chest can only sell at the line, or at market after retreat. This raid hit. One hundred and twenty went in, two hundred and forty six came out. Fees came only from profit. Two and a half percent to the caller, seven and a half to buyback, the rest to the crew. On a miss, nobody takes a fee.

### 2:08 to 2:22: Free testnet account
On screen: https://raid-near.vercel.app. Tap Sign in, then Get a free testnet account. Show the new account name and the test USDC arriving. Do not show any private key.
VO: If you want to try it yourself, tap Sign in and take a free funded testnet account in one tap. No real funds. The key stays in your browser.

### 2:22 to 2:48: NearBlocks proof, and the miss
On screen: first open the raid #1 settle transaction on NearBlocks testnet:
https://testnet.nearblocks.io/txns/9sBPwXS8mYkj1HM2mgojvrcUChuecNSFknEumtfrbpvn
Hold the success, the chest account, and the closed state. Then cut to raid #2, the miss: sell after retreat at 0.7x, no fees, backer repaid what came back.
https://testnet.nearblocks.io/txns/Fk2k5zgfNKGc1bDVTUmSueZAqG73Vm2jTBi7pBLhSLGP
VO: Every step has a testnet transaction you can open. This is the hit. And this is the miss: after retreat the chest sold at market, the caller earned nothing, and the backer took back what was left. The rules held.

### 2:48 to 3:00: Close
On screen: return to the landing or the feed, with the live app URL on screen. If the public repo is up, show that URL too.
VO: RAID is a game with rules a contract can enforce. Built on NEAR, at NEAR HACKATHON. Come try a raid on testnet.
Hold the URL until the audio ends.

## Honest line, if a mid-roll card is needed

If a lower-third is used during the buy or the NearBlocks shot, use this wording, not a shorter claim:

NEAR Intents and 1Click are mainnet-only. This testnet run uses a venue that speaks the same methods, and a solver that sets the prices. The chest rules are the real contract.

## Edit notes

- Keep cuts on action: tap, confirm, status change, tx success.
- Do not show secret keys, `.env` files, or the raid-secrets folder.
- If the live feed is still being rebuilt at record time, record the feed and profile last, after the app is up, and cut them into the slots above.
- Export 1080p, 30 fps, landscape for X, plus a 9:16 crop if a phone-first cut is needed. Captions should stay inside a 4:5 safe area so X does not crop them.
