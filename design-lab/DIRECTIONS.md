# Called: three visual directions

All three share the same rules. Brand is solid #7C5CFF with no decorative gradients. Yes is green (#1FD17A) and No is red (#FF4B5C). Battles show % instead of a score, and the divider sits at the Yes share. There's no mascot and there are no political markets. Every direction keeps the same signature pieces: the themed Yes-vs-No battle arena (GTA gangsters, bull vs bear, football, F1, music stage), the flipping Caller Card, the 30-tile call-record strip and the CALLED IT moment. The directions differ in type, shape, density and motion.

Screens per direction: home, feed (mini battle), market (battle hero + trade sheet), profile (Caller Card), callit (AI create), calledit. PNGs are 780x1688 (2x of 390x844).

## A · ARENA (dark, soft, chunky, springy)
*The fight is the product.* It's a night arena with huge Bricolage Grotesque numbers sitting on the battle.
- Type: Bricolage Grotesque 800 (condensed width) for display and money, Inter for UI.
- Shape: soft 20–34px radii, pill controls, a rounded bottom trade sheet and a purple tile tab button.
- Density: roomy, with one big thing per screen.
- Standouts: Home has the "Fight of the day" card. Market has 76px 71% / 29% numbers over a full-bleed battle. The profile is a 3D-tilted purple-framed Caller Card. CALLED IT fills the screen in purple with tilted type and a payout card.
- Motion: springy overshoot as screens rise up and settle, and units bob.
- Risk: it's the most familiar of the three (dark fintech energy), even though the battle-first layout keeps it ownable.

## B · TICKET (warm paper, editorial, sharp)
*Every call is a printed betting slip.* It uses cream paper, ink rules, perforated stubs and a purple rubber stamp.
- Type: Instrument Serif for headlines and %, Geist for UI, Geist Mono for labels and numbers.
- Shape: sharp 4px corners, 1.5px ink outlines, hard offset shadows and ticket perforations. The battles are drawn in an ink-outline style.
- Density: medium and editorial, like a match programme.
- Standouts: the trade sheet is a "Your slip" ticket ending in "Print my Yes ticket". Feed posts embed tilted tickets. The Caller Card is a cream "Series 01" card with a TOP 3% stamp. On CALLED IT the "Called it!" stamp slams onto the settled ticket.
- Motion: tickets are dealt in from the side with a slight rotation and settle crisply.
- Risk: a light theme is unusual for betting. That's also why it stands out most clearly from the rest of the market.

## C · BROADCAST (black, condensed, hard cuts, kinetic)
*Called as live matchday TV.* Every market has a scoreboard bug: YES CREW | 71% | 29% | NO CREW.
- Type: Big Shoulders Display 900 caps, JetBrains Mono for data, Inter for body.
- Shape: zero radius, 45° clipped corners and full-bleed bars. Purple is used like a broadcast chyron (LIVE bug, CTA, wipes).
- Density: the highest of the three, though it reads in one glance thanks to the giant type.
- Standouts: the F1 home has a LAP 31/50 bug and a countdown. The market's score bar is BULLS 64% / 36% BEARS. The Caller Card is a sports card with a giant 73 hit rate over halftone. CALLED IT is a purple wall of repeating outlined "CALLED IT" type with a full-time score panel.
- Motion: fast diagonal purple wipes between screens and kinetic type.
- Risk: it can get loud. The type scale has to be enforced strictly.

## Files
- `A/ B/ C/`: `home.png feed.png market.png profile.png callit.png calledit.png`, `<X>-board.png` (one-page board) and `<X>-motion.mp4` (about 14.5s, all six screens with that direction's transitions)
- `refs/`: 46 App Store screenshots from the 12 reference apps, plus `sheet-all.jpg` and `REFS.md`
- `src/`: mockup source (`lab.html?d=A&s=market`, `?s=reel` for motion). `battle.js` is a shared SVG battle renderer with soft, ink and hard styles. `render.sh X` re-renders the PNGs, `rec.js X` re-records the clip and `board.py X` rebuilds the board.
