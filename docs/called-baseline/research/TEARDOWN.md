# Feed design teardown: Farcaster, X, Threads, Instagram

Sources: App Store screenshots (US listings, Oct 2026) saved here as `<app>-N.png`, plus a contact sheet for each app in `sheet-<app>.jpg`. Mobbin and Refero need a login, so their boards are not mirrored here. Sizes are given in iOS points at 390pt width, measured from the screenshots and checked against the live web apps.

## Type
| | Name | Handle / time | Body | Counts | Header title |
|---|---|---|---|---|---|
| X | 15 semibold | 15 regular, grey | 15 / 20 line | 13 grey | 17 semibold |
| Farcaster | 15 semibold | 14 grey | 15 / 21 | 13 grey | 17 semibold, centred |
| Threads | 15 semibold | 15 grey (time on right) | 15 / 21 | 13 grey | wordmark only |
| Instagram | 14 semibold | 14 grey | 14 / 18 | 14 semibold (likes) | logo only |

Takeaways: a single body size (15), weight carries the hierarchy (semibold for names, regular for everything else), grey for secondary text, and no font size above 17 inside the feed. Big numbers appear only on money screens (X Money uses about 40pt for the balance, with dimmed cents).

## Spacing and rows
- Edge-to-edge rows with no cards. Horizontal padding is 16 (X and Threads) or 12 to 16 (Farcaster).
- Avatar column: X 40, Farcaster 40, Threads 36, Instagram 32 (with a story ring). The gap from avatar to text is 10 to 12.
- Vertical padding is 12 at the top and 12 at the bottom. The action row sits 8 to 10 under the body.
- Text-only rows come out at roughly 90 to 120 tall.
- Separators: a 0.5 to 1px hairline running the full width (#2f3336 on X dark, #eee on Farcaster light). Threads draws a vertical thread line between a reply and its parent.

## Icons
- One outline set with a single stroke weight (about 1.5 to 1.75 at 20 to 24pt). Active tabs switch to the filled version.
- The action row holds 4 or 5 icons at 18 to 20pt, spread evenly (X, Farcaster) or grouped on the left (Threads, Instagram), all grey, with counts at 13pt.
- The tab bar has 5 icons on a flat bar with a hairline above it. There are no labels (X, Threads, Farcaster) and no floating pill.

## Brand colour
- Farcaster uses purple only for the active tab underline, @mentions and links, the verified badge, the Follow button, the compose button and its own message bubbles. Everything else is black, white or grey.
- X uses white, black and grey. Its blue is reserved for links and verified badges, and the primary button is white on black.
- Threads uses no colour at all. Instagram keeps colour for the story ring and the heart.
- So the rule: one accent, used for interactive emphasis only, under 5% of the pixels on any screen. No gradients anywhere.

## Embeds
- Link and quote previews are a 1px bordered box with radius 12 to 16 and 12 padding inside. The title is 15 semibold, the meta line is 13 grey, and the image (if any) sits on the left or top. They are quiet and carry no colour.
- Threads polls are flat rows: a grey fill for each option's share, the winning row slightly darker, the percentage on the right, and a "103 votes · 6h left" line underneath. That is the model for a market embed.

## Profile
- Banner around 120 tall, avatar 72 to 80 overlapping it with a 3 to 4 bg-coloured ring, name 20 to 22 bold, handle 15 grey, bio 15, then a stats line ("3.4K Following 255K Followers": bold numbers, grey labels).
- Buttons: Follow is the accent colour (purple on Farcaster, white on X) and Message is grey, both with radius 8 to 10 and a height of 32 to 36.
- Tabs: Casts / Replies / Likes as text with an accent underline.

## Motion
- Transitions are short (150 to 250ms) and slide in from the edge. The tap feedback is an opacity or scale drop to 0.96.
- Liking: the heart pops (scale to 1.2) with a burst of particles and the count rolls. Repost spins.
- Pull to refresh and a new-posts pill are the only feed-level motion. Nothing animates unless the user asked for it.

## Rules for Called (v4)
1. Inter. 15 body, 13 meta, 17 titles, 20 to 22 profile name, 32 to 40 for money only.
2. Edge-to-edge rows, 16 padding, 40 avatar, 12 gap, full-width 1px hairlines (#1f1f23).
3. Lucide icons, stroke 1.75, 20pt in the action row and 24 in the tab bar. Filled or bolder when active.
4. One accent, #7C5CFF purple: primary CTA, Follow, active tab underline, links and mentions, the compose button. Green and red only for Yes/No and up/down.
5. Market embeds look like polls or link previews: a bordered box with two flat outcome rows (fill shows the share) and a meta line.
6. Flat surfaces (#0A0A0B background, #111113 raised), no gradients, no glows, no floating pills.
