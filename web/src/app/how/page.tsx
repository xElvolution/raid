'use client';
import Link from 'next/link';
import { Shell } from '@/components/Shell';

const STEPS = [
  ['Someone starts a raid', 'They pick a coin, say $PEPE, and a target, say 2x. That’s the whole pitch: “let’s buy this together and sell when it doubles.”'],
  ['Others join in', 'Anyone can put money in while the timer runs. The people who join are the crew: the group backing this raid. You can join from a NEAR, EVM or Solana wallet.'],
  ['It buys together', 'When the timer ends, a public countdown starts so everyone knows when the buy happens. Then the contract buys the coin in one go.'],
  ['It sells at the target', 'The money sits in a contract nobody can withdraw from, not even the person who started it. It sells automatically when the target is hit and pays everyone back their share.'],
  ['If the target isn’t hit', 'After a set time it sells at the market price and returns what’s left. You can lose money. The starter earns a small fee only if the target is hit, so they can’t profit from a dump.'],
];
const WORDS = [
  ['Raid', 'A group buy with a target. Many people, one coin, one sell price.'],
  ['Crew', 'The group of people who joined a raid. Crews can also be teams that raid together often.'],
  ['Target (the line)', 'The price multiple where the raid sells, like 2x.'],
  ['War chest', 'The contract that holds the pooled money and does the buying and selling.'],
  ['Retreat', 'Selling early at market price when the target wasn’t reached in time.'],
];

export default function HowPage() {
  return (
    <Shell title="How RAID works" back="/feed">
      <h1 className="pt-2 text-[22px] font-semibold leading-tight tracking-[-0.03em]">RAID is a social app for memecoins where you can buy together.</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-mute">Post, watch reels and follow traders like any social app. The difference: one person can start a raid and everyone else can join to buy and push a coin together.</p>
      <ol className="mt-5 divide-y divide-line">
        {STEPS.map(([t, b], i) => (
          <li key={t} className="flex gap-3 py-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink mono text-[12px] font-semibold text-bg">{i + 1}</span>
            <span><span className="block text-[14.5px] font-semibold">{t}</span><span className="mt-0.5 block text-[13.5px] leading-relaxed text-mute">{b}</span></span>
          </li>
        ))}
      </ol>
      <h2 className="mt-6 text-[17px] font-semibold">Words you’ll see</h2>
      <dl className="mt-2 divide-y divide-line">
        {WORDS.map(([k, v]) => <div key={k} className="py-2.5"><dt className="text-[14px] font-semibold">{k}</dt><dd className="text-[13.5px] text-mute">{v}</dd></div>)}
      </dl>
      <p className="mt-5 rounded-[14px] bg-raised px-3 py-2.5 text-[12.5px] leading-relaxed text-mute">RAID runs on the NEAR testnet today with free test tokens. Memecoins are risky and you can lose what you put in. Nothing here is financial advice.</p>
      <div className="mt-5 flex gap-2"><Link href="/raids" className="press flex h-11 flex-1 items-center justify-center rounded-full btn-signal text-[14px] font-semibold">See open raids</Link><Link href="/settings#funds" className="press flex h-11 flex-1 items-center justify-center rounded-full text-[14px] font-semibold hairline">Get test funds</Link></div>
    </Shell>
  );
}
