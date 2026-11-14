# X post draft (not posted)

The team lead publishes this themselves. Do not post it on their behalf. Attach the 2:30 to 3:00 walkthrough video on the first post (file upload on X, not a link-only). After it is live, send back the status URL for the submission field `demoUrl` (max 300 characters).

Required in the first post: say it was built at NEAR HACKATHON, tag `@NEARProtocol` and `#NEARHackathon`, and attach the video. Optional tags: `@NearLegion` and `@NearBuilders`.

Replace `[repo]` with the public repository URL once the lead has made it public. Until then, link only the live app.

## Post 1 (with the video)

Group-chat meme raids let the caller sell first, and nobody can prove it.

RAID is a @NEARProtocol contract: a keyless chest buys the crew pot through NEAR Intents and can only sell at the line.

Built at NEAR HACKATHON. #NEARHackathon
https://raid.5-189-170-85.sslip.io

<!-- CHARCOUNT_POST1: 259 with t.co URL counting -->

## Reply 1 (how the money works)

On chain:
- Hit: 2.5% of profit to the caller, 7.5% to buyback, rest to backers
- Miss: no fees. Backers share what came back
- Public countdown before any buy. Selling below the line is refused until retreat

Back from NEAR, or MetaMask or Phantom with no NEAR account.

<!-- CHARCOUNT_REPLY1: 270 -->

## Reply 2 (proof and optional tags)

Both paths on NEAR testnet.

Hit, raid #1: 120 in, 246 out. Caller 3.15, backers 233.40.
https://testnet.nearblocks.io/txns/9sBPwXS8mYkj1HM2mgojvrcUChuecNSFknEumtfrbpvn

Miss, raid #2: sold at market after retreat, no fees.
https://testnet.nearblocks.io/txns/Fk2k5zgfNKGc1bDVTUmSueZAqG73Vm2jTBi7pBLhSLGP

Try it on testnet, no real funds:
https://raid.5-189-170-85.sslip.io/judges

@NearLegion @NearBuilders

<!-- CHARCOUNT_REPLY2: 277 with both NearBlocks links counted as 23 each. Replace https://testnet.nearblocks.io/txns/Fk2k5zgfNKGc1bDVTUmSueZAqG73Vm2jTBi7pBLhSLGP with the full NearBlocks URL for the raid #2 settle tx. -->


## Reply 3 (repo, once it is public)

Public repo (once it is open):
https://github.com/xElvolution/raid

If you had to encode one group-chat ritual on chain, which one would you pick?

<!-- CHARCOUNT_REPLY3: 134 with t.co URL counting. Skip this reply until the repo is public. -->

## Notes for the lead

- Post from the account they want judges to see. The submission needs that status link.
- Do not claim mainnet. Do not claim live Intents fills. The video and the replies should say testnet, and that Intents is mainnet-only so the testnet venue is a stand-in that sets prices.
- If the first post goes over 280 characters after X expands the URL, drop the blank lines between the last two sentences, or move the app link to the first reply.
- A short question at the end is welcome if there is room, for example: "If you had to encode one group-chat ritual on chain, which one would you pick?" That can sit in reply 2 if post 1 is tight.
- Screenshots of the feed, a profile, raid #1 and a NearBlocks tx can be added to the replies, but the video belongs on post 1.
