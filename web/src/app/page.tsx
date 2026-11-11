'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Mark, Wordmark } from '@/components/Brand';
import { TickerTape } from '@/components/Ticker';
import { ThemeToggle } from '@/components/Shell';
import { CoinAvatar, Delta } from '@/components/ui';
import { Spark } from '@/components/Spark';
import { CallVisual, CrewVisual, HitVisual, KeylessVisual } from '@/components/landing/Visuals';
import { useCandles, useQuotes, fmtPrice } from '@/lib/market';
import { CHAINS } from '@/lib/coins';
import { JudgeBox, PayoutSlider, WhyNow } from '@/components/JudgeKit';

const STEPS = [
  { k: 'Call', t: 'Call the raid', b: 'Pick any memecoin NEAR Intents can reach: PEPE on Ethereum, TRUMP on Solana, BRETT on Base, SHITZU on NEAR. Set the line: 1.5x, 2x or 3x.', bg: '#2448ff', V: 'call' },
  { k: 'Crew', t: 'Crew up', b: 'Anyone can back your call with USDC while the crew window is open. Everyone’s stake sits in one war chest.', bg: '#ff5c7a', V: 'crew' },
  { k: 'Chest', t: 'The chest buys. No one holds the key.', b: 'The contract only moves funds against a 1Click quote it verifies on-chain. On mainnet, the chest’s keys are removed.', bg: '#7a5cff', V: 'keyless' },
  { k: 'Line', t: 'Cash out at the line', b: 'The chest sells only when the return meets the line. Hit it, and the crew splits the profit, the caller’s fee unlocks, and 7.5% of the profit goes to the buyback reserve.', bg: '#1f9d55', V: 'hit' },
] as const;

export default function Landing() {
  const quotes = useQuotes();
  const pepe = quotes.data?.find((q) => q.symbol === 'PEPE');
  const c = useCandles('PEPE', '1h');
  const closes = (c.data?.candles ?? []).slice(-60).map((x) => x.c);
  const [s, setS] = useState(0);
  const step = STEPS[s]!;
  return (
    <div className="min-h-dvh bg-bg">
      <header className="cobalt-field">
        <nav className="mx-auto flex h-[3.5rem] md:h-[68px] max-w-[1240px] items-center justify-between px-4 md:px-8">
          <Wordmark size={24} className="[&_rect]:fill-white [&_rect:nth-child(n+4)]:fill-[#c6ff3d]" />
          <div className="hidden md:flex items-center gap-7 text-[14px] text-white/80"><a href="#how" className="hover:text-white">How it works</a><Link href="/raids" className="hover:text-white">Raids</Link><Link href="/launch" className="hover:text-white">Launch</Link><Link href="/leaderboard" className="hover:text-white">Ranks</Link></div>
          <div className="flex items-center gap-2"><span className="[&_button]:text-white/80"><ThemeToggle /></span><Link href="/live" className="press inline-flex h-10 items-center gap-1.5 rounded-[11px] bg-white px-4 text-[14px] font-semibold text-[#0b1fd1]">Open app<ArrowRight size={15} /></Link></div>
        </nav>
        <section className="relative overflow-hidden">
          <div className="dots absolute inset-0 opacity-40" />
          <div className="relative mx-auto grid max-w-[1240px] gap-6 md:gap-10 px-4 pb-8 pt-6 md:grid-cols-[1.2fr_1fr] md:px-8 md:pb-24 md:pt-16">
            <div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eyebrow !text-white/70">Memecoin raids · built on NEAR</motion.p>
              <h1 className="wide-black relative mt-3 md:mt-5 text-[2.125rem] md:text-[68px] lg:text-[88px] xl:text-[96px] leading-[.86]">
                <motion.span className="block" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 24 }}>Call it.</motion.span>
                <motion.span className="block" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 24 }}>Crew up.</motion.span>
                <motion.span className="relative mt-3 block pt-4 text-lime" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 24 }}>
                  <motion.span aria-hidden className="absolute -left-5 -right-5 top-0 h-[3px] bg-lime md:-left-8 md:right-0" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }} transition={{ delay: 0.7, duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
                  <motion.span aria-hidden className="chip chip-lime absolute right-0 -top-[11px] md:-right-2" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4 }}>Sell line</motion.span>
                  Cash out at the line.</motion.span>
                
              </h1>
              <p className="mt-4 md:mt-7 max-w-[48ch] text-[14px] md:text-[17px] leading-relaxed text-white/80">Call a raid on any memecoin, on any chain. Your crew pools USDC into a war chest that buys through NEAR Intents and only sells when your line is hit. The caller gets paid only if the crew does.</p>
              <div className="mt-5 md:mt-8 flex flex-wrap gap-2 md:gap-3">
                <Link href="/start" className="press inline-flex h-[2.875rem] md:h-[54px] items-center gap-2 rounded-[12px] md:rounded-[14px] bg-lime px-6 text-[0.9688rem] font-bold text-[#0a1a00]">Start raiding<ArrowRight size={17} strokeWidth={2.6} /></Link>
                <Link href="/live" className="press inline-flex h-[2.875rem] md:h-[54px] items-center gap-2 rounded-[12px] md:rounded-[14px] px-6 text-[0.9688rem] font-semibold text-white shadow-[inset_0_0_0_1.5px_rgb(255_255_255/.4)] hover:bg-white/10"><span className="live-dot text-lime" />Watch it live</Link>
              </div>
            </div>
            <motion.div className="relative mx-auto w-full max-w-[420px] self-center" initial={{ opacity: 0, y: 30, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 160, damping: 20 }}>
              <div className="rounded-[22px] bg-[#04061a] p-3.5 md:p-5 text-white shadow-[0_40px_90px_-30px_rgb(0_0_0/.7)]">
                <div className="flex items-center gap-3"><CoinAvatar symbol="PEPE" image={pepe?.image} size={44} /><div className="min-w-0 flex-1"><p className="wide text-[1.25rem]">$PEPE</p><p className="mono text-[11px] text-white/60">Ethereum · live price</p></div><div className="text-right"><p className="mono text-[1.0625rem] font-bold">{fmtPrice(pepe?.priceUsd)}</p><Delta pct={pepe?.change24h} className="text-[11px]" /></div></div>
                <div className="relative mt-4">
                  <Spark values={closes} width={380} height={120} className="w-full" stroke="#ffffff" />
                  <div className="absolute inset-x-0 top-[10px] border-t-2 border-dashed border-lime" /><span className="chip chip-lime absolute right-0 top-0 -translate-y-1/2">Sell 1.5x</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                  {[['Line', '1.5x'], ['Caller fee', 'locked'], ['Keys', 'none']].map(([k, v]) => <div key={k}><p className="eyebrow !text-white/50">{k}</p><p className="mono mt-1 text-[14px] font-bold">{v}</p></div>)}
                </div>
                <p className="mono mt-3 text-[10px] text-white/40">Chart: real PEPE 1h price (GeckoTerminal). Line drawn for illustration.</p>
              </div>
              <motion.div className="absolute -left-6 -bottom-6 hidden md:flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#04061a] shadow-xl" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}><span className="h-2 w-2 rounded-full bg-[#1f9d55]" />Min-out verified on-chain</motion.div>
            </motion.div>
          </div>
        </section>
      </header>
      <TickerTape />

      <section className="mx-auto grid max-w-[1240px] gap-3 px-4 pt-4 md:grid-cols-[1fr_1.4fr] md:gap-6 md:px-8 md:pt-10">
        <JudgeBox />
        <WhyNow />
      </section>

      <section id="how" className="mx-auto max-w-[1240px] px-4 py-10 md:px-8 md:py-28">
        <p className="eyebrow">How a raid works</p>
        <h2 className="wide-black mt-4 max-w-[16ch] text-[1.625rem] md:text-[64px] leading-[.88]">Four moves. One line.</h2>
        <div className="mt-6 md:mt-10 grid gap-5 md:gap-8 md:grid-cols-[1fr_1.2fr] md:gap-14">
          <ol className="flex flex-col gap-1" role="tablist">
            {STEPS.map((x, i) => (
              <li key={x.k}>
                <button role="tab" aria-selected={s === i} onClick={() => setS(i)} onMouseEnter={() => setS(i)} className={`w-full rounded-[14px] px-4 py-4 text-left transition-colors ${s === i ? 'bg-raised' : 'hover:bg-raised/50'}`}>
                  <div className="flex items-center gap-3"><span className={`mono text-[12px] ${s === i ? 'text-lime' : 'text-faint'}`}>0{i + 1}</span><span className="wide text-[1.0625rem]">{x.t}</span></div>
                  <AnimatePresence initial={false}>{s === i && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-8 pt-2 text-[14px] leading-relaxed text-mute">{x.b}</motion.p>}</AnimatePresence>
                </button>
              </li>
            ))}
          </ol>
          <motion.div className="relative grid min-h-[17rem] md:min-h-[360px] place-items-center overflow-hidden rounded-[24px]" animate={{ backgroundColor: step.bg }} transition={{ duration: 0.5 }}>
            <div className="dots absolute inset-0" />
            <AnimatePresence mode="wait"><motion.div key={s} exit={{ opacity: 0, scale: 0.96 }}>{step.V === 'call' ? <CallVisual q={pepe} /> : step.V === 'crew' ? <CrewVisual /> : step.V === 'keyless' ? <KeylessVisual /> : <HitVisual />}</motion.div></AnimatePresence>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-line bg-panel">
        <div className="mx-auto grid max-w-[1240px] gap-5 md:gap-10 px-4 py-10 md:grid-cols-2 md:px-8 md:py-24">
          <div>
            <p className="eyebrow">Anti-dump by design</p>
            <h2 className="wide-black mt-4 text-[1.625rem] md:text-[60px] leading-[.88]">The caller<br />eats last.</h2>
          </div>
          <div className="grid gap-4 text-[0.9375rem] leading-relaxed text-mute">
            <p><b className="text-ink">Callers earn a share of the profit, not of the hype.</b> The fee sits locked in the chest and pays out only when the raid hits its line. If it retreats, the fee is gone.</p>
            <p><b className="text-ink">No one can grab the pot.</b> The chest checks every 1Click quote’s signature, recipient and minimum return before it moves a cent. On mainnet the account’s keys are removed, so only the contract’s rules can move funds.</p>
            <p><b className="text-ink">Backers keep 90% of the profit.</b> The caller takes 2.5% and the buyback reserve 7.5%, only on a hit. A 1.5x line nets backers +45%, 2x nets +90%, 3x nets +180%. A miss pays no fees, and you can still lose the pot.</p>
            <PayoutSlider />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-10 md:px-8 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Any chain NEAR Intents reaches</p><h2 className="wide-black mt-4 text-[1.625rem] md:text-[56px] leading-[.88]">Raid where<br />the memes are.</h2></div><p className="mono text-[11px] text-faint">live prices · DexScreener / CoinGecko</p></div>
        <div className="mt-6 md:mt-10 grid grid-cols-2 gap-2 md:gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {(quotes.data ?? []).slice(0, 8).map((q, i) => (
            <motion.div key={q.symbol} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/coin/${q.symbol}`} className="lift panel flex items-center gap-3 p-3.5">
                <CoinAvatar symbol={q.symbol} image={q.image} size={36} />
                <div className="min-w-0 flex-1"><p className="font-semibold text-[14px]">${q.symbol}</p><p className="text-[11.5px] text-mute">{CHAINS[q.chain].label}</p></div>
                <div className="text-right"><p className="mono text-[12px]">{fmtPrice(q.priceUsd)}</p><Delta pct={q.change24h} className="text-[10.5px]" /></div>
              </Link>
            </motion.div>
          ))}
          {quotes.isLoading && Array.from({ length: 8 }, (_, i) => <div key={i} className="shimmer h-[4.125rem]" />)}
        </div>
      </section>

      <section className="cobalt-field relative overflow-hidden">
        <div className="dots absolute inset-0 opacity-40" />
        <div className="relative mx-auto flex max-w-[1240px] flex-col items-start gap-4 md:gap-6 px-4 py-10 md:py-20 md:flex-row md:items-end md:justify-between md:px-8">
          <h2 className="wide-black text-[1.75rem] md:text-[80px] leading-[.84]">Your line.<br />Your crew.</h2>
          <Link href="/start" className="press inline-flex h-[3.5rem] items-center gap-2 rounded-[14px] bg-lime px-7 text-[1rem] font-bold text-[#0a1a00]">Start raiding<ArrowRight size={18} strokeWidth={2.6} /></Link>
        </div>
      </section>
      <footer className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-8 text-[12px] text-faint md:flex-row md:items-center md:justify-between md:px-8">
        <span className="flex items-center gap-2"><Mark size={16} />RAID · NEAR Hackathon 2026 · testnet preview</span>
        <span>A game with real market risk. Raids can lose money. Not investment advice.</span>
      </footer>
    </div>
  );
}
