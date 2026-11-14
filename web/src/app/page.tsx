'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Clapperboard, Radio, ShieldCheck, MessageCircle, BadgeCheck, Trophy, Megaphone, Users, Timer, ArrowLeftRight, Crosshair, Coins, Vote, KeyRound, Network } from 'lucide-react';
import { Wordmark } from '@/components/Brand';
import { TickerTape } from '@/components/Ticker';
import { ThemeToggle } from '@/components/Shell';
import { CoinAvatar, Delta } from '@/components/ui';
import { CallVisual, CrewVisual, HitVisual, KeylessVisual } from '@/components/landing/Visuals';
import { Magnetic, MaskLine, Reveal, Rise, easeOut } from '@/components/landing/Motion';
import { useQuotes, fmtPrice } from '@/lib/market';
import { useRaids, useBuyback, useNow } from '@/lib/hooks';
import { usdcOf, phase, NETWORK, CHEST_ID } from '@/lib/raid';
import { RaidCard, RaidCardSkeleton } from '@/components/RaidCard';
import { ChromeChest, ChromePuck, TwoTone } from '@/components/Chrome';
import { RaidScene } from '@/components/landing/Scene';
import { CHAINS, COINS } from '@/lib/coins';
import { PayoutSlider, WhyNow } from '@/components/Proof';

const PILLARS = [
  { t: 'Reels that sell coins', b: 'Short videos that tag a coin with its live price. Buy it or join the raid right from the reel. Creators earn when a raid from their reel hits.', I: Clapperboard, href: '/reels' },
  { t: 'Live raid rooms', b: 'Watch a raid form in real time: the pot, the price and the chat. Jump in before the timer ends.', I: Radio, href: '/live' },
  { t: 'Raids nobody can rug', b: 'The pooled money sits in a contract with no withdraw button. It only sells at the target or returns what’s left.', I: ShieldCheck, href: '/how' },
  { t: 'A real social feed', b: 'Post takes, memes and $tickers, reply, repost and follow the traders you trust.', I: MessageCircle, href: '/feed' },
  { t: 'Verified callers', b: 'Earn a verified badge from your on-chain hit rate. Followers can auto-join your next raid.', I: BadgeCheck, href: '/leaderboard', soon: true },
  { t: 'Seasons and crew wars', b: 'Groups compete on a season leaderboard for the best results.', I: Trophy, href: '/war', soon: true },
] as const;

const STEPS = [
  { k: 'Call', t: 'Call the raid', b: 'Pick any memecoin NEAR Intents can reach: PEPE on Ethereum, TRUMP on Solana, BRETT on Base, SHITZU on NEAR. Set the line: 1.5x, 2x or 3x.', bg: '#15161a', V: 'call' },
  { k: 'Crew', t: 'Crew up', b: 'Anyone can back your call with USDC while the crew window is open. Everyone’s stake sits in one war chest.', bg: '#2a2622', V: 'crew' },
  { k: 'Chest', t: 'The chest buys. No one holds the key.', b: 'The contract only moves funds against a 1Click quote it verifies on-chain. On mainnet, the chest’s keys are removed.', bg: '#1d1e23', V: 'keyless' },
  { k: 'Line', t: 'Sell at the line', b: 'The chest sells only when the return meets the line. Hit it, and the crew splits the profit, the caller’s fee unlocks, and 7.5% of the profit goes to the buyback reserve.', bg: '#2b1a12', V: 'hit' },
] as const;

function Cta({ href, children, tone = 'signal' }: { href: string; children: React.ReactNode; tone?: 'signal' | 'pearl' | 'ink' }) {
  const cls = tone === 'signal' ? 'btn-signal' : tone === 'ink' ? 'btn-ink' : 'btn-pearl';
  return (
    <Magnetic className="w-full sm:w-auto">
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
        <Link href={href} className={`press inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold tracking-[-0.02em] sm:w-auto sm:min-w-[11rem] md:h-[3.25rem] ${cls}`}>{children}</Link>
      </motion.div>
    </Magnetic>
  );
}

const LIFE = [
  { n: '01', t: 'Call', b: 'Pick a memecoin and a line: 1.5x, 2x or 3x.', I: Megaphone },
  { n: '02', t: 'Crew', b: 'Anyone backs the call with USDC.', I: Users },
  { n: '03', t: 'Countdown', b: 'Ten public minutes before any buy.', I: Timer },
  { n: '04', t: 'Buy', b: 'The chest buys through NEAR Intents.', I: ArrowLeftRight },
  { n: '05', t: 'The line', b: 'It sells only when the line is hit.', I: Crosshair, signal: true },
  { n: '06', t: 'Split', b: 'Backers keep 90% of the profit.', I: Coins },
] as const;

const NEAR = [
  { t: 'NEAR Intents', b: 'One chest reaches memecoins on Ethereum, Solana, Base and NEAR. Every buy and sell is a signed 1Click quote the contract checks before a cent moves.', I: Network },
  { t: 'Chain Signatures', b: 'The chest signs for other chains through NEAR’s MPC network. On mainnet its keys are removed, so only the contract’s rules can move the pot.', I: KeyRound },
  { t: 'Crews are DAOs', b: 'A crew is a Sputnik DAO. Members vote a raid in, and the DAO itself becomes the caller, so the caller fee lands in the crew treasury.', I: Vote },
] as const;

function Nav() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-5 md:pt-4">
      <nav className="mx-auto flex h-14 max-w-6xl min-w-0 items-center justify-between gap-3 rounded-full bg-panel/75 pl-4 pr-2 shadow-[0_0_0_1px_var(--color-line),0_14px_30px_-20px_rgb(21_22_26/.35)] backdrop-blur-xl backdrop-saturate-150 md:h-[3.75rem] md:pl-5" aria-label="Main">
        <Link href="/" className="shrink-0" aria-label="RAID home"><Wordmark size={24} /></Link>
        <div className="hidden items-center gap-1 text-[14px] text-mute md:flex">
          {[['#how', 'How it works'], ['/raids', 'Raids'], ['/feed', 'Feed'], ['/reels', 'Reels'], ['/live', 'Live']].map(([h, l]) => (
            <Link key={h} href={h!} className="rounded-full px-3.5 py-2 transition-colors hover:bg-raised hover:text-ink">{l}</Link>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <Link href="/feed" className="press inline-flex h-10 items-center gap-2 rounded-full btn-ink pl-4 pr-3.5 text-[13.5px] font-semibold md:h-11">
            Open app<span className="h-1.5 w-1.5 rounded-full bg-signal" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function LiveStrip() {
  const raids = useRaids();
  const bb = useBuyback();
  const now = useNow();
  const list = raids.data ?? [];
  const live = list.filter((r) => now && phase(r, now).live).length;
  const pot = list.reduce((s, r) => s + usdcOf(r.pot), 0);
  const hits = list.filter((r) => r.hit).length;
  const latest = [...list].reverse().slice(0, 4);
  const stats = [
    { k: 'Raids on chain', v: raids.data ? String(list.length) : '–' },
    { k: 'Live now', v: raids.data ? String(live) : '–' },
    { k: 'Pot across raids', v: raids.data ? `${pot.toFixed(2)}` : '–', u: 'USDC' },
    { k: 'Lines hit', v: raids.data ? String(hits) : '–' },
    { k: 'Buyback reserve', v: bb.data !== undefined ? usdcOf(bb.data).toFixed(2) : '–', u: 'USDC' },
  ];
  return (
    <section className="mx-auto max-w-6xl min-w-0 px-4 py-14 md:px-5 md:py-28">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-2"><span className="live-dot text-signal" />Live from the chest · {NETWORK}</p>
            <h2 className="display mt-4 text-[26px] md:text-[64px]"><TwoTone a="Real raids." b="Read from the chain." /></h2>
          </div>
          <Link href="/raids" className="press inline-flex h-11 items-center gap-2 rounded-full btn-pearl px-5 text-[14px] font-semibold">All raids<ArrowUpRight size={16} /></Link>
        </div>
      </Reveal>
      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] bg-line shadow-[0_0_0_1px_var(--color-line)] sm:grid-cols-3 md:grid-cols-5">
        {stats.map((x, i) => (
          <div key={x.k} className={`bg-panel px-4 py-4 md:px-5 md:py-5 ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}>
            <dt className="eyebrow">{x.k}</dt>
            <dd className="mt-2 flex items-baseline gap-1.5"><span className="text-[20px] font-semibold tracking-[-0.045em] md:text-[34px]">{x.v}</span>{x.u && <span className="mono text-[11px] text-mute">{x.u}</span>}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {raids.isLoading && [0, 1].map((i) => <RaidCardSkeleton key={i} />)}
        {latest.map((r, i) => <RaidCard key={r.id} r={r} i={i} />)}
      </div>
      <p className="mt-3 mono text-[10.5px] text-faint">src · {CHEST_ID} · list_raids · refreshed every 10s</p>
    </section>
  );
}

export default function Landing() {
  const quotes = useQuotes();
  const pepe = quotes.data?.find((q) => q.symbol === 'PEPE');
  const raids = useRaids();
  const [s, setS] = useState(0);
  const [paused, setPaused] = useState(false);
  const step = STEPS[s]!;
  const howRef = useRef<HTMLElement>(null);
  const howIn = useInView(howRef, { amount: 0.35 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !howIn || paused) return;
    const t = setInterval(() => setS((i) => (i + 1) % STEPS.length), 3800);
    return () => clearInterval(t);
  }, [howIn, paused, reduce]);

  return (
    <div className="min-h-dvh min-w-0 overflow-x-clip bg-bg text-ink">
      <Nav />
      <main>
        {/* Hero */}
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-[640px] bg-[radial-gradient(50%_60%_at_50%_0%,rgb(255_90_31/.12),transparent_70%)]" />
          <div className="relative mx-auto max-w-6xl px-4 pt-12 text-center md:px-5 md:pt-24">
            <Rise delay={0.05}>
              <Link href="/raids" className="inline-flex h-9 items-center gap-2 rounded-full btn-pearl pl-1.5 pr-3.5 text-[13px] text-mute transition-colors hover:text-ink">
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-signal/12 px-2.5 text-[11.5px] font-semibold text-lime"><span className="live-dot" />Live</span>
                {raids.data ? `${raids.data.length} raids on the ${NETWORK} chest` : 'Raids on NEAR, any chain'}
                <ArrowRight size={13} className="text-faint" />
              </Link>
            </Rise>
            <h1 className="display mx-auto mt-6 text-[36px] leading-[.95] md:text-[112px] md:leading-[.88]">
              <MaskLine delay={0.08}>RAID:</MaskLine>
              <span className="tone2 relative block">
                <MaskLine delay={0.2}>Fomo with an army.</MaskLine>
                <span aria-hidden className="raid-sell-line pointer-events-none absolute left-1/2 top-[96%] h-[3px] w-[78%] rounded-full bg-signal md:h-[4px]" />
              </span>
            </h1>
            <Rise delay={0.4}>
              <p className="mx-auto mt-6 max-w-[36rem] text-[14.5px] leading-relaxed text-mute md:mt-10 md:text-[19px]">
                The social app where memecoin fomo turns into a plan. Watch reels, jump into live raid rooms, and pool money with others to buy a coin together. It sells automatically at the target, and nobody can run off with the pot.
              </p>
            </Rise>
            <Rise delay={0.52}>
              <div className="mx-auto mt-9 flex max-w-sm flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
                <Cta href="/feed">Open RAID<ArrowRight size={16} strokeWidth={2.4} /></Cta>
                <Cta href="/how" tone="pearl">How RAID works</Cta>
              </div>
            </Rise>
          </div>
          <div className="mx-auto mt-14 max-w-6xl px-3 md:mt-20 md:px-5">
            <Rise delay={0.65}><RaidScene /></Rise>
          </div>

          {/* Lifecycle row: six chrome pieces */}
          <div className="mx-auto mt-16 max-w-6xl px-4 md:mt-24 md:px-5">
            <ol className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-6 md:gap-6">
              {LIFE.map((x, i) => (
                <motion.li key={x.n} className="min-w-0" initial={reduce ? false : { y: 28 }} whileInView={{ y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.7, delay: i * 0.07, ease: easeOut }}>
                  <ChromePuck size={76} signal={'signal' in x && x.signal}><x.I size={28} strokeWidth={1.8} /></ChromePuck>
                  <p className="mt-4 flex items-baseline gap-2"><span className="mono text-[10.5px] text-faint">{x.n}</span><span className="text-[15px] font-semibold tracking-[-0.02em]">{x.t}</span></p>
                  <p className="mt-1 pl-[1.6rem] text-[13px] leading-snug text-mute">{x.b}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>


        {/* What RAID is */}
        <section className="mx-auto max-w-6xl min-w-0 px-4 pt-16 md:px-5 md:pt-24">
          <Reveal><p className="eyebrow">What you can do</p><h2 className="display mt-3 text-[26px] md:text-[56px]"><TwoTone a="Fomo, but" b="organised." /></h2></Reveal>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((x) => (
              <Link key={x.t} href={x.href} className="lift panel flex min-w-0 gap-3 !rounded-[18px] p-3.5 md:p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-signal/12 text-lime"><x.I size={19} /></span>
                <span className="min-w-0"><span className="flex items-center gap-2 text-[15px] font-semibold">{x.t}{'soon' in x && x.soon && <span className="rounded-full bg-raised px-2 py-0.5 text-[10.5px] font-medium text-mute">Coming soon</span>}</span><span className="mt-0.5 block text-[13px] leading-snug text-mute">{x.b}</span></span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-16 md:mt-28"><TickerTape roomy /></div>

        <LiveStrip />

        {/* How it works */}
        <section id="how" ref={howRef} className="mx-auto max-w-6xl min-w-0 scroll-mt-24 px-4 py-14 md:px-5 md:py-28">
          <Reveal>
            <div className="max-w-2xl">
              <p className="eyebrow">How it works</p>
              <h2 className="display mt-4 text-[26px] md:text-[64px]"><TwoTone a="From a call" b="to the line." /></h2>
            </div>
          </Reveal>
          <div className="mt-10 grid min-w-0 gap-6 md:mt-14 md:grid-cols-[1fr_1.15fr] md:items-stretch md:gap-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <ol className="flex flex-col gap-1.5" role="tablist">
              {STEPS.map((x, i) => (
                <li key={x.k}>
                  <button role="tab" aria-selected={s === i} onClick={() => { setS(i); setPaused(true); }} onMouseEnter={() => setS(i)}
                    className={`relative w-full overflow-hidden rounded-[20px] px-4 py-4 text-left transition-colors md:px-5 md:py-5 ${s === i ? 'panel' : 'hover:bg-raised/60'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`mono text-[11px] ${s === i ? 'text-lime' : 'text-faint'}`}>0{i + 1}</span>
                      <span className="text-[16px] font-semibold tracking-[-0.025em] md:text-[18px]">{x.t}</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {s === i && (
                        <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-8 pt-2 text-[13.5px] leading-relaxed text-mute md:text-[14.5px]">{x.b}</motion.p>
                      )}
                    </AnimatePresence>
                    {s === i && !paused && !reduce && <motion.span key={`bar${s}`} className="absolute bottom-0 left-0 h-[2px] bg-signal" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 3.8, ease: 'linear' }} />}
                  </button>
                </li>
              ))}
            </ol>
            <motion.div className="grain relative grid min-h-[18rem] min-w-0 place-items-center overflow-hidden rounded-[28px] md:min-h-[420px]" animate={{ backgroundColor: step.bg }} transition={{ duration: 0.55 }}>
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_70%_at_80%_10%,rgb(255_90_31/.28),transparent_60%)]" />
              <div className="dots absolute inset-0 opacity-50" />
              <AnimatePresence mode="wait">
                <motion.div key={s} initial={reduce ? false : { y: 18, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -12, scale: 0.97, opacity: 0 }} transition={{ duration: 0.4, ease: easeOut }}>
                  {step.V === 'call' ? <CallVisual q={pepe} /> : step.V === 'crew' ? <CrewVisual /> : step.V === 'keyless' ? <KeylessVisual /> : <HitVisual />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </section>

        <WhyNow className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:py-28" />

        {/* Caller eats last */}
        <section className="px-3 md:px-5">
          <div className="obsidian grain relative mx-auto max-w-6xl overflow-hidden rounded-[32px] md:rounded-[40px]">
            <div className="grid min-w-0 gap-8 px-5 py-14 md:grid-cols-2 md:gap-16 md:px-12 md:py-20">
              <Reveal>
                <div className="min-w-0">
                  <p className="eyebrow">Anti-dump by design</p>
                  <h2 className="display mt-4 text-[28px] md:text-[68px]"><span className="block">The caller</span><span className="block text-white/40">eats last.</span></h2>
                  <div className="mt-8 hidden md:block"><ChromeChest size={240} fill={0.7} /></div>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="grid min-w-0 gap-5 text-[14px] leading-relaxed text-white/60 md:text-[16px]">
                  <p><b className="font-semibold text-white">Callers earn a share of the profit, not of the hype.</b> The fee sits locked in the chest and pays out only when the raid hits its line. If it retreats, the fee is gone.</p>
                  <p><b className="font-semibold text-white">No one can grab the pot.</b> The chest checks every 1Click quote’s signature, recipient and minimum return before it moves a cent.</p>
                  <p><b className="font-semibold text-white">Backers keep 90% of the profit.</b> The caller takes 2.5% and the buyback reserve 7.5%, only on a hit. A 1.5x line nets backers +45%, 2x nets +90%, 3x nets +180%. A miss pays no fees, and you can still lose the pot.</p>
                  <div className="on-pearl rounded-[22px] bg-[#fbfaf7] text-[#15161a]"><PayoutSlider /></div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Built on NEAR */}
        <section className="mx-auto max-w-6xl min-w-0 px-4 py-14 md:px-5 md:py-28">
          <Reveal>
            <p className="eyebrow">Built on NEAR</p>
            <h2 className="display mt-4 text-[26px] md:text-[64px]"><TwoTone a="Three primitives." b="One war chest." /></h2>
          </Reveal>
          <div className="mt-10 grid gap-3 md:mt-14 md:grid-cols-3">
            {NEAR.map((x, i) => (
              <motion.article key={x.t} className="lift panel flex flex-col p-5 md:p-7" initial={reduce ? false : { y: 28 }} whileInView={{ y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.7, delay: i * 0.08, ease: easeOut }}>
                <ChromePuck size={60} signal={i === 0}><x.I size={24} strokeWidth={1.8} /></ChromePuck>
                <h3 className="mt-6 text-[20px] font-semibold tracking-[-0.03em] md:text-[22px]">{x.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-mute">{x.b}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Coins */}
        <section className="mx-auto max-w-6xl min-w-0 px-4 pb-20 md:px-5 md:pb-28">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow">Any chain NEAR Intents reaches</p>
                <h2 className="display mt-4 text-[26px] md:text-[56px]"><TwoTone a="Raid where" b="the memes are." /></h2>
              </div>
              <p className="mono text-[10.5px] text-faint">live prices · DexScreener / CoinGecko</p>
            </div>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {(quotes.data && quotes.data.length ? quotes.data : COINS.map((c) => ({ symbol: c.symbol, chain: c.chain, image: undefined as string | undefined, priceUsd: undefined as number | undefined, change24h: null as number | null }))).slice(0, 8).map((q, i) => (
              <motion.div key={q.symbol} initial={{ y: 0 }} whileInView={reduce ? undefined : { y: [16, 0] }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.55, delay: i * 0.05, ease: easeOut }}>
                <Link href={`/coin/${q.symbol}`} className="lift panel flex min-w-0 items-center gap-2.5 !rounded-full p-2 pr-3.5 md:p-2.5 md:pr-4">
                  <CoinAvatar symbol={q.symbol} image={q.image} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-tight md:text-[14px]">${q.symbol}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-mute">{CHAINS[q.chain].label}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="mono text-[11px] tabular-nums md:text-[12px]">{fmtPrice(q.priceUsd)}</p>
                    <Delta pct={q.change24h} className="text-[10px]" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Final call */}
        <section className="px-3 pb-6 md:px-5">
          <div className="panel relative mx-auto flex max-w-6xl min-w-0 flex-col items-center overflow-hidden !rounded-[32px] px-5 py-12 text-center md:!rounded-[40px] md:py-24">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_50%_100%,rgb(255_90_31/.16),transparent_70%)]" />
            <ChromeChest size={170} fill={0.85} open />
            <h2 className="display relative mt-6 text-[30px] md:text-[96px]"><TwoTone a="Your coin." b="Your army." /></h2>
            <p className="relative mt-5 max-w-[32rem] text-[15px] leading-relaxed text-mute md:text-[18px]">Start a raid or join one that’s live. Everyone buys together and it sells at the target.</p>
            <div className="relative mt-8 flex w-full max-w-sm flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
              <Cta href="/feed">Open RAID<ArrowRight size={16} strokeWidth={2.4} /></Cta>
              <Cta href="/how" tone="pearl">How RAID works</Cta>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 px-5 py-10 text-[13px] text-mute md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-ink"><Wordmark size={20} /><span className="text-mute">· built on NEAR</span></div>
          <p className="max-w-md leading-relaxed">A game with real market risk. Raids can lose money. Not investment advice.</p>
        </div>
      </footer>
    </div>
  );
}
