'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Mark, Wordmark } from '@/components/Brand';
import { TickerTape } from '@/components/Ticker';
import { ThemeToggle } from '@/components/Shell';
import { CoinAvatar, Delta } from '@/components/ui';
import { Spark } from '@/components/Spark';
import { CallVisual, CrewVisual, HitVisual, KeylessVisual } from '@/components/landing/Visuals';
import { Magnetic, MaskLine, Reveal, Rise, easeOut } from '@/components/landing/Motion';
import { useCandles, useQuotes, fmtPrice } from '@/lib/market';
import { CHAINS, COINS, type Quote } from '@/lib/coins';
import { PayoutSlider, WhyNow } from '@/components/JudgeKit';

const STEPS = [
  { k: 'Call', t: 'Call the raid', b: 'Pick any memecoin NEAR Intents can reach: PEPE on Ethereum, TRUMP on Solana, BRETT on Base, SHITZU on NEAR. Set the line: 1.5x, 2x or 3x.', bg: '#2448ff', V: 'call' },
  { k: 'Crew', t: 'Crew up', b: 'Anyone can back your call with USDC while the crew window is open. Everyone’s stake sits in one war chest.', bg: '#ff5c7a', V: 'crew' },
  { k: 'Chest', t: 'The chest buys. No one holds the key.', b: 'The contract only moves funds against a 1Click quote it verifies on-chain. On mainnet, the chest’s keys are removed.', bg: '#7a5cff', V: 'keyless' },
  { k: 'Line', t: 'Sell at the line', b: 'The chest sells only when the return meets the line. Hit it, and the crew splits the profit, the caller’s fee unlocks, and 7.5% of the profit goes to the buyback reserve.', bg: '#1f9d55', V: 'hit' },
] as const;

function Cta({
  href,
  children,
  tone = 'lime',
}: {
  href: string;
  children: React.ReactNode;
  tone?: 'lime' | 'ghost';
}) {
  const cls =
    tone === 'lime'
      ? 'bg-lime text-[#0a1a00] hover:brightness-95'
      : 'border border-line text-ink hover:bg-raised';
  return (
    <Magnetic className="w-full md:w-auto">
      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
        <Link
          href={href}
          className={`press inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-6 text-[14px] font-semibold md:h-12 md:w-auto md:min-w-[10.5rem] md:text-[15px] ${cls}`}
        >
          {children}
        </Link>
      </motion.div>
    </Magnetic>
  );
}

function RaidPhone({
  pepe,
  closes,
}: {
  pepe?: Quote;
  closes: number[];
}) {
  const reduce = useReducedMotion();
  return (
    <div className="raid-phone-in relative mx-auto w-[272px] md:w-[300px]">
      <div className={reduce ? '' : 'raid-phone-float'}>
        <div className="rounded-[42px] bg-[#16161a] p-[9px] shadow-[0_50px_110px_-28px_rgba(0,0,0,.9)] ring-1 ring-white/10">
          <div className="overflow-hidden rounded-[33px] bg-[#0c0c10] text-white">
            <div className="flex items-center justify-between px-5 pt-3.5 pb-1">
              <span className="text-[11px] font-semibold tracking-tight text-white/40">RAID</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[#c6ff3d]">
                <span className="live-dot pulse-live bg-[#c6ff3d]" />
                Live
              </span>
            </div>
            <div className="px-4 pb-4 pt-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <CoinAvatar symbol="PEPE" image={pepe?.image} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold tracking-tight">$PEPE</p>
                  <p className="truncate text-[11px] text-white/45">Ethereum · live price</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="mono text-[13px] font-bold tabular-nums">{fmtPrice(pepe?.priceUsd)}</p>
                  <Delta pct={pepe?.change24h} className="text-[10px]" />
                </div>
              </div>
              <div className="relative mt-3 min-w-0 overflow-hidden rounded-[14px] bg-white/[.03]">
                <Spark values={closes} width={320} height={96} className="h-[96px] w-full" stroke="#ffffff" draw />
                {closes.length < 2 && (
                  <p className="absolute inset-0 grid place-items-center text-[10px] text-white/35">Live 1h chart</p>
                )}
                <div className="raid-chart-line absolute inset-x-3 top-[14px] origin-left border-t border-dashed border-[#c6ff3d]/90" />
                <motion.span
                  className="absolute right-2 top-1 rounded-full bg-[#c6ff3d] px-2 py-0.5 text-[9.5px] font-bold text-[#0a1a00]"
                  initial={reduce ? false : { scale: 0.6, y: -6 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 1.45 }}
                >
                  Sell 1.5x
                </motion.span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/8 pt-3">
                {[['Line', '1.5x'], ['Caller fee', 'locked'], ['Keys', 'none']].map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <p className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-white/40">{k}</p>
                    <p className="mono mt-0.5 text-[13px] font-bold">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const quotes = useQuotes();
  const pepe = quotes.data?.find((q) => q.symbol === 'PEPE');
  const c = useCandles('PEPE', '1h');
  const closes = (c.data?.candles ?? []).slice(-60).map((x) => x.c);
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
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-6xl min-w-0 items-center justify-between gap-3 px-5 md:h-16" aria-label="Main">
          <Link href="/" className="shrink-0">
            <Wordmark size={22} />
          </Link>
          <div className="hidden items-center gap-8 text-[14px] text-mute md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <Link href="/raids" className="hover:text-ink">Raids</Link>
            <Link href="/launch" className="hover:text-ink">Launch</Link>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/live"
              className="press inline-flex h-9 items-center rounded-full bg-ink px-4 text-[13px] font-semibold text-bg"
            >
              Open app
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative">
          <div className="mx-auto max-w-6xl px-5 pt-14 text-center md:pt-28">
            <Rise delay={0.05}>
              <Link
                href="/live"
                className="inline-flex h-8 items-center gap-2 rounded-full border border-line bg-raised/50 pl-2 pr-3 text-[13px] text-mute transition-colors hover:bg-raised hover:text-ink"
              >
                <span className="inline-flex h-5 items-center rounded-full bg-lime/25 px-2 text-[11px] font-semibold text-[#3d6a00] [html[data-theme=dark]_&]:text-[#c6ff3d]">
                  <span className="live-dot mr-1.5 bg-current" />
                  Live
                </span>
                Live raids, any chain
                <ArrowRight size={12} className="text-faint" />
              </Link>
            </Rise>

            <h1 className="mx-auto mt-6 text-[40px] font-semibold leading-[1.04] tracking-[-0.045em] md:text-[80px] md:leading-[0.98]">
              <MaskLine delay={0.08}>Call the raid.</MaskLine>
              <span className="relative block text-mute">
                <MaskLine delay={0.18}>Sell at the line.</MaskLine>
                <span
                  aria-hidden
                  className="raid-sell-line pointer-events-none absolute left-1/2 top-full mt-1 h-[2px] w-[11.5ch] rounded-full bg-lime"
                />
              </span>
            </h1>

            <Rise delay={0.38}>
              <p className="mx-auto mt-8 max-w-[34rem] text-[15px] leading-relaxed text-mute md:text-[19px]">
                Anyone can call a raid on a memecoin, on any chain. A keyless war chest buys through NEAR Intents, and only sells when the caller’s line is hit. The caller gets paid only if the crew does.
              </p>
            </Rise>

            <Rise delay={0.52}>
              <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
                <Cta href="/start">
                  Start raiding
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Cta>
                <Cta href="/live" tone="ghost">
                  Watch it live
                </Cta>
              </div>
            </Rise>

            <Rise delay={0.72}>
              <dl className="mx-auto mt-12 grid max-w-[560px] grid-cols-3 divide-x divide-line border-y border-line">
                {[
                  { v: 'Any chain', l: 'NEAR Intents' },
                  { v: 'No keys', l: 'Chain Signatures' },
                  { v: 'Your line', l: '1.5x, 2x or 3x' },
                ].map((x) => (
                  <div key={x.l} className="px-2 py-4">
                    <dd className="text-[17px] font-semibold tracking-tight md:text-[24px]">{x.v}</dd>
                    <dt className="mt-1 text-[11px] text-mute md:text-[12px]">{x.l}</dt>
                  </div>
                ))}
              </dl>
            </Rise>
          </div>

          <div className="mx-auto mt-14 max-w-6xl px-5 pb-20 md:mt-20 md:pb-28">
            <RaidPhone pepe={pepe} closes={closes} />
          </div>
        </section>

        <TickerTape roomy />

        <WhyNow className="mx-auto max-w-6xl px-5 py-20 md:py-28" />

        <section id="how" ref={howRef} className="mx-auto max-w-6xl min-w-0 px-5 py-20 md:py-28">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[13px] font-medium text-mute">How it works</p>
              <h2 className="mt-3 text-[32px] font-semibold leading-[1.06] tracking-[-0.035em] md:text-[56px]">
                <MaskLine inView>From a call to the line</MaskLine>
              </h2>
            </div>
          </Reveal>
          <div
            className="mt-12 grid min-w-0 gap-8 md:mt-16 md:grid-cols-[1fr_1.15fr] md:gap-16 md:items-center"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <ol className="flex flex-col gap-1" role="tablist">
              {STEPS.map((x, i) => (
                <li key={x.k}>
                  <button
                    role="tab"
                    aria-selected={s === i}
                    onClick={() => { setS(i); setPaused(true); }}
                    onMouseEnter={() => setS(i)}
                    className={`w-full rounded-[16px] px-3.5 py-3.5 text-left transition-colors md:px-5 md:py-4 ${s === i ? 'bg-raised' : 'hover:bg-raised/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`mono text-[12px] ${s === i ? 'text-lime' : 'text-faint'}`}>0{i + 1}</span>
                      <span className="text-[15px] font-semibold tracking-tight md:text-[17px]">{x.t}</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {s === i && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pl-8 pt-2 text-[13px] leading-relaxed text-mute md:text-[14px]"
                        >
                          {x.b}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </button>
                </li>
              ))}
            </ol>
            <motion.div
              className="relative grid min-h-[16rem] min-w-0 place-items-center overflow-hidden rounded-[24px] md:min-h-[380px]"
              animate={{ backgroundColor: step.bg }}
              transition={{ duration: 0.55 }}
            >
              <div className="dots absolute inset-0 opacity-40" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={s}
                  initial={reduce ? false : { y: 18, scale: 0.97 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: -12, scale: 0.97, opacity: 0 }}
                  transition={{ duration: 0.4, ease: easeOut }}
                >
                  {step.V === 'call' ? (
                    <CallVisual q={pepe} />
                  ) : step.V === 'crew' ? (
                    <CrewVisual />
                  ) : step.V === 'keyless' ? (
                    <KeylessVisual />
                  ) : (
                    <HitVisual />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-line bg-panel">
          <div className="mx-auto grid max-w-6xl min-w-0 gap-8 px-5 py-20 md:grid-cols-2 md:gap-16 md:py-28">
            <Reveal>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-mute">Anti-dump by design</p>
                <h2 className="mt-3 text-[32px] font-semibold leading-[1.06] tracking-[-0.035em] md:text-[56px]">
                  <MaskLine inView>The caller</MaskLine>
                  <MaskLine inView delay={0.08}>eats last.</MaskLine>
                </h2>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="grid min-w-0 gap-5 text-[14.5px] leading-relaxed text-mute md:text-[16px]">
                <p>
                  <b className="font-semibold text-ink">Callers earn a share of the profit, not of the hype.</b> The fee sits locked in the chest and pays out only when the raid hits its line. If it retreats, the fee is gone.
                </p>
                <p>
                  <b className="font-semibold text-ink">No one can grab the pot.</b> The chest checks every 1Click quote’s signature, recipient and minimum return before it moves a cent. On mainnet the account’s keys are removed, so only the contract’s rules can move funds.
                </p>
                <p>
                  <b className="font-semibold text-ink">Backers keep 90% of the profit.</b> The caller takes 2.5% and the buyback reserve 7.5%, only on a hit. A 1.5x line nets backers +45%, 2x nets +90%, 3x nets +180%. A miss pays no fees, and you can still lose the pot.
                </p>
                <PayoutSlider />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-6xl min-w-0 px-5 py-20 md:py-28">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-mute">Any chain NEAR Intents reaches</p>
                <h2 className="mt-3 text-[32px] font-semibold leading-[1.06] tracking-[-0.035em] md:text-[52px]">
                  <MaskLine inView>Raid where</MaskLine>
                  <MaskLine inView delay={0.08}>the memes are.</MaskLine>
                </h2>
              </div>
              <p className="text-[12px] text-faint">Live prices · DexScreener / CoinGecko</p>
            </div>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {(quotes.data && quotes.data.length ? quotes.data : COINS.map((c) => ({
              symbol: c.symbol,
              chain: c.chain,
              image: undefined as string | undefined,
              priceUsd: undefined as number | undefined,
              change24h: null as number | null,
            }))).slice(0, 8).map((q, i) => (
              <motion.div
                key={q.symbol}
                initial={{ y: 0 }}
                whileInView={reduce ? undefined : { y: [16, 0] }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.05, ease: easeOut }}
              >
                <Link
                  href={`/coin/${q.symbol}`}
                  className="lift panel flex min-w-0 items-center gap-2.5 p-3 md:p-3.5"
                >
                  <CoinAvatar symbol={q.symbol} image={q.image} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold leading-tight md:text-[14px]">${q.symbol}</p>
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

        <section className="border-t border-line">
          <div className="mx-auto flex max-w-6xl min-w-0 flex-col items-center px-5 py-20 text-center md:py-28">
            <h2 className="text-[36px] font-semibold leading-[1.04] tracking-[-0.04em] md:text-[80px] md:leading-[0.96]">
              <MaskLine inView>Your line.</MaskLine>
              <MaskLine inView delay={0.1}>Your crew.</MaskLine>
            </h2>
            <Reveal delay={0.15}>
              <p className="mt-5 max-w-[32rem] text-[15px] leading-relaxed text-mute md:text-[18px]">
                Call a raid, or back one that’s already live. The chest buys. You sell at the line.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="mt-8 w-full max-w-xs">
                <Cta href="/start">
                  Start raiding
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Cta>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 px-5 py-10 text-[13px] text-mute md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-ink">
            <Mark size={20} />
            <span className="text-[16px] font-semibold tracking-tight">RAID</span>
            <span className="text-mute">· built on NEAR</span>
          </div>
          <p className="max-w-md leading-relaxed">
            A game with real market risk. Raids can lose money. Not investment advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
