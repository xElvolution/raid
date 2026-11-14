'use client';
import { motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Mood } from './Calli';
/* eslint-disable @next/next/no-img-element -- static export, pre-sized product shots */
import { Flame, IconCheck, IconShield, IconSpark } from './icons';
import { LandingMarket } from './LandingMarket';
import { DIVISIONS } from '@/lib/gamification';
import { compactUsd, useLiveMarkets } from '@/lib/markets';

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '/app';
const spring = { type: 'spring' as const, stiffness: 500, damping: 22 };

export function Cta({ children, href = APP_URL, tone = 'grape', className = '' }: { children: ReactNode; href?: string; tone?: 'grape' | 'white' | 'sun'; className?: string }) {
  const cls = tone === 'white' ? 'bg-white/[.04] text-ink border border-line hover:bg-white/[.08]' : 'bg-[#fff] text-black hover:bg-[#fff]/90';
  return (
    <motion.a href={href} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={spring}
      onClick={() => { if ('vibrate' in navigator) navigator.vibrate(10); }}
      className={`inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full text-[15px] font-semibold transition-colors ${cls} ${className}`}>
      {children}
    </motion.a>
  );
}

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ type: 'spring', stiffness: 120, damping: 20, delay }}>{children}</motion.div>;
}

/* ---------------- Hero ---------------- */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function Counter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const mv = useMotionValue(0);
  const sp = useSpring(mv, { stiffness: 60, damping: 20 });
  const [v, setV] = useState(0);
  useEffect(() => { mv.set(value); }, [mv, value]);
  useEffect(() => sp.on('change', (x) => setV(x)), [sp]);
  return <span className="tabular-nums">{prefix}{v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : Math.round(v)}{suffix}</span>;
}

export function Hero() {
  const { markets, odds, live } = useLiveMarkets(12);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const tilt = useTransform(scrollYProgress, [0, 0.5], [14, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.94, 1]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [40, -80]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const vol = markets.reduce((a, m) => a + Number(m.volume_24h ?? 0) / 1e6, 0);
  const lead = markets[0];
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 26 } } };
  return (
    <section ref={ref} className="relative overflow-hidden">
      <motion.div variants={stagger} initial="hidden" animate="show" className="relative max-w-6xl mx-auto px-6 pt-16 md:pt-28 text-center">
        <motion.a variants={item} href={APP_URL} className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[.03] pl-2 pr-3 h-8 text-[13px] text-ink/80 hover:bg-white/[.06] transition-colors">
          <span className="rounded-full bg-mint-light text-mint px-2 h-5 grid place-items-center text-[11px] font-semibold">{live ? 'Live' : 'New'}</span>
          Polymarket odds, streamed in real time <span aria-hidden className="text-mute">→</span>
        </motion.a>
        <motion.h1 variants={item} className="mt-6 text-[48px] leading-[1.02] md:text-[84px] md:leading-[0.98] font-semibold tracking-[-0.045em]">
          Call it. <span className="text-mute">Prove it.</span>
        </motion.h1>
        <motion.p variants={item} className="mt-6 text-[17px] md:text-[20px] leading-relaxed text-mute max-w-[620px] mx-auto">
          The social prediction market. Your takes become markets, your friends take the other side, and a verifiable AI settles every result on NEAR.
        </motion.p>
        <motion.div variants={item} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Cta>Open the app</Cta>
          <Cta tone="white" href="#how">How it works</Cta>
        </motion.div>
        <motion.dl variants={item} className="mt-12 grid grid-cols-3 max-w-[560px] mx-auto divide-x divide-line border-y border-line">
          {[
            { l: '24h volume tracked', v: <Counter value={vol} prefix="$" /> },
            { l: 'Odds refresh', v: <span>10s</span> },
            { l: 'Settlement', v: <span>On-chain</span> },
          ].map((s) => <div key={s.l} className="py-4"><dd className="text-[22px] md:text-[26px] font-semibold tracking-tight">{s.v}</dd><dt className="text-[12px] text-mute mt-1">{s.l}</dt></div>)}
        </motion.dl>
      </motion.div>

      <div className="relative max-w-6xl mx-auto px-6 mt-16 md:mt-20 pb-24" style={{ perspective: 1600 }}>
        <motion.div style={{ rotateX: tilt, scale }} initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.4 }}
          className="relative hidden md:block rounded-[14px] border border-white/10 bg-[#0c0c0e] shadow-[0_60px_120px_-30px_rgba(0,0,0,.9),0_0_0_1px_rgba(255,255,255,.03)] overflow-hidden origin-top">
          <div className="h-9 flex items-center gap-2 px-4 border-b border-white/[.06]">
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" /><span className="h-2.5 w-2.5 rounded-full bg-white/10" /><span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="mx-auto h-5 w-72 rounded-md bg-white/[.04] text-[11px] text-mute grid place-items-center">called.app</span>
          </div>
          <img src={`${BASE}/product/desktop.png`} alt="Called home feed with live market cards, trending markets and leaderboard" className="block w-full" />
        </motion.div>
        <motion.div style={{ y: phoneY }} initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1 }} transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.6 }}
          className="relative mx-auto md:absolute md:right-0 md:-bottom-6 w-[280px] md:w-[300px] rounded-[44px] bg-[#1a1a1d] p-[10px] ring-1 ring-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,.95)]">
          <img src={`${BASE}/product/phone.png`} alt="Called mobile feed" className="block w-full rounded-[34px]" />
        </motion.div>
        {lead && (
          <motion.div style={{ y: cardY }} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 16, delay: 0.9 }}
            className="hidden md:block absolute left-0 bottom-24 w-[300px] z-10">
            <LandingMarket m={lead} p={odds[lead.id] ?? Number(lead.price_yes)} />
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Ticker ---------------- */
export function Ticker() {
  const { markets, odds, live } = useLiveMarkets(14);
  if (!markets.length) return <div className="h-16 bg-[#0b0c10]" />;
  const row = [...markets, ...markets];
  return (
    <section className="bg-[#0b0c10] text-ink py-4 overflow-hidden border-y border-line" aria-label="Live markets">
      <div className="flex items-center gap-4 w-max marquee">
        {row.map((m, i) => {
          const p = odds[m.id] ?? Number(m.price_yes);
          return (
            <span key={`${m.id}-${i}`} className="shrink-0 flex items-center gap-3 rounded-full bg-white/[.04] border border-line px-4 py-2 font-medium">
              <span className="h-2 w-2 rounded-full bg-mint" />
              <span className="max-w-[260px] truncate">{m.question}</span>
              <span className={`text-lg ${p >= 0.5 ? 'text-mint' : 'text-coral'}`}>{Math.round(p * 100)}%</span>
              <span className="text-white/50 text-sm">{compactUsd(m.volume_24h)}</span>
            </span>
          );
        })}
      </div>
      <p className="sr-only">{live ? 'Live odds from Polymarket' : 'Example markets'}</p>
    </section>
  );
}

/* ---------------- How it works ---------------- */
function StepVisual({ k, on }: { k: number; on: boolean }) {
  if (k === 0) return (
    <div className="card3d p-3 w-full text-left">
      <div className="flex gap-2 items-center mb-2"><span className="h-8 w-8 rounded-xl bg-sky" /><span className="font-semibold text-sm">Zara</span></div>
      <p className="font-semibold text-sm min-h-10">{on ? <TypeOut text="Burna drops an album before Christmas. Calling it." /> : '\u00a0'}</p>
      <div className="mt-2 flex justify-end"><span className="rounded-lg bg-grape text-white text-xs font-semibold px-3 py-1.5">CALL IT</span></div>
    </div>
  );
  if (k === 1) return (
    <div className="card3d p-3 w-full text-left relative overflow-hidden">
      <div className="flex items-center gap-1 text-xs font-semibold text-grape mb-1"><IconSpark size={14} /> AI DRAFT</div>
      <p className="font-semibold text-sm">Will Burna Boy release a new album before 25 Dec 2026?</p>
      <div className="flex gap-1.5 mt-2 flex-wrap">{['Deadline', 'Rules', '3 sources'].map((t, i) => <motion.span key={t} initial={{ scale: 0 }} animate={on ? { scale: 1 } : { scale: 0 }} transition={{ delay: 0.3 + i * 0.15, ...spring }} className="rounded-full bg-grape-light text-grape text-[11px] font-semibold px-2 py-0.5">{t}</motion.span>)}</div>
    </div>
  );
  if (k === 2) return (
    <div className="card3d p-3 w-full">
      {(['mint', 'coral'] as const).map((t, i) => (
        <div key={t} className={`relative h-8 rounded-lg overflow-hidden mb-1.5 ${t === 'mint' ? 'bg-mint-light' : 'bg-coral-light'}`}>
          <motion.div className={`absolute inset-y-0 left-0 ${t === 'mint' ? 'bg-mint' : 'bg-coral'}`} initial={{ width: '50%' }} animate={on ? { width: i ? ['50%', '38%', '31%'] : ['50%', '62%', '69%'] } : { width: '50%' }} transition={{ duration: 2.2 }} />
          <span className="relative px-2.5 text-xs font-semibold text-white leading-8">{i ? 'No' : 'Yes'}</span>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 mt-2"><span className="h-8 rounded-lg bg-mint text-white text-xs font-semibold grid place-items-center edge" style={{ ['--edge' as string]: 'var(--color-mint-dark)' }}>CALL YES</span><span className="h-8 rounded-lg bg-coral text-white text-xs font-semibold grid place-items-center edge" style={{ ['--edge' as string]: 'var(--color-coral-dark)' }}>CALL NO</span></div>
    </div>
  );
  return (
    <div className="card3d p-3 w-full flex items-center gap-3">
      <motion.div initial={{ scale: 0, rotate: -40 }} animate={on ? { scale: 1, rotate: 0 } : { scale: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.3 }} className="h-14 w-14 rounded-full bg-mint text-white grid place-items-center shrink-0 edge" style={{ ['--edge' as string]: 'var(--color-mint-dark)' }}><IconCheck size={30} /></motion.div>
      <div className="text-left"><div className="font-semibold">Verdict: YES</div><div className="text-xs text-mute font-semibold">Signed in a TEE · checked on NEAR</div></div>
    </div>
  );
}

function TypeOut({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 35); return () => clearInterval(t); }, [text]);
  return <>{text.slice(0, n)}<motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="inline-block w-0.5 h-4 bg-grape align-middle ml-0.5" /></>;
}

const STEPS = [
  { t: 'Post a take', b: 'Say it like you would to friends.', mood: 'wink' as Mood, c: '#e2f2ff' },
  { t: 'AI makes it a market', b: 'Our AI writes a fair question with a deadline, rules and sources.', mood: 'thinking' as Mood, c: '#efe8ff' },
  { t: 'Everyone makes a call', b: 'Friends pick a side. Odds move live as calls come in.', mood: 'wow' as Mood, c: '#dcfaf2' },
  { t: 'Verified verdict', b: 'An AI judge in secure hardware settles it, and NEAR checks the signature.', mood: 'cheer' as Mood, c: '#fff5d6' },
];

function Step({ i }: { i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { once: true, margin: '-120px' });
  const s = STEPS[i]!;
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 60 }} animate={on ? { opacity: 1, y: 0 } : {}} transition={{ type: 'spring', stiffness: 110, damping: 18 }}
      className="relative card3d p-5 flex flex-col items-start text-left gap-3">
      <span className="absolute -top-4 left-5 h-8 w-8 rounded-full bg-[#fff] text-black text-[13px] font-semibold grid place-items-center">{i + 1}</span>
      <h3 className="text-xl font-semibold mt-3">{s.t}</h3>
      <p className="text-mute text-sm">{s.b}</p>
      <StepVisual k={i} on={on} />
    </motion.div>
  );
}

export function How() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] });
  const width = useSpring(useTransform(scrollYProgress, [0, 1], ['0%', '100%']), { stiffness: 80, damping: 20 });
  return (
    <section id="how" ref={ref} className="max-w-6xl mx-auto px-5 py-24">
      <Reveal className="text-center mb-14">
        <p className="text-mute font-medium text-[14px]">How it works</p>
        <h2 className="text-[36px] md:text-[56px] leading-[1.05] font-semibold tracking-[-0.035em] mt-2">From hot take to<br />verified result</h2>
      </Reveal>
      <div className="hidden md:block relative h-2 rounded-full bg-line mb-10 mx-10"><motion.div className="absolute inset-y-0 left-0 rounded-full bg-grape" style={{ width }} /></div>
      <div className="grid md:grid-cols-4 gap-8 md:gap-5">{STEPS.map((_, i) => <Step key={i} i={i} />)}</div>
    </section>
  );
}

/* ---------------- Leagues & streaks ---------------- */
function CountUp({ to, on }: { to: number; on: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!on) return;
    const start = performance.now();
    let raf = 0;
    const f = (t: number) => { const k = Math.min(1, (t - start) / 1400); setV(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [on, to]);
  return <>{v.toLocaleString()}</>;
}

export function Leagues() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { once: true, margin: '-100px' });
  return (
    <section id="leagues" className="bg-[#0b0c10] border-y border-line py-24 overflow-hidden">
      <div ref={ref} className="max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-14 items-center">
        <div>
          <Reveal>
            <p className="text-mute font-medium text-[14px]">Streaks · XP · Leagues</p>
            <h2 className="text-[36px] md:text-[56px] leading-[1.05] font-semibold tracking-[-0.035em] mt-2">Show up daily.<br />Climb the leagues.</h2>
            <p className="text-mute mt-5 text-[17px] leading-relaxed">Swipe through the Daily 5, keep your flame lit, earn XP for sharp calls, and rise from Bronze to Diamond. Just for bragging rights: XP and leagues never turn into money.</p>
          </Reveal>
          <dl className="grid grid-cols-3 mt-10 border-y border-line divide-x divide-line">
            {[{ v: 21, l: 'Day streak', s: 'd' }, { v: 1240, l: 'XP this season', s: '' }, { v: 6, l: 'Divisions', s: '' }].map((x, i) => (
              <motion.div key={x.l} initial={{ opacity: 0, y: 12 }} animate={on ? { opacity: 1, y: 0 } : {}} transition={{ ...spring, delay: i * 0.08 }} className="py-4 pl-4 first:pl-0">
                <dd className="text-[28px] font-semibold tracking-tight tabular-nums"><CountUp to={x.v} on={on} />{x.s}</dd><dt className="text-[12px] text-mute mt-1">{x.l}</dt>
              </motion.div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2 mt-6">
            {DIVISIONS.map((d, i) => (
              <motion.span key={d.name} initial={{ opacity: 0 }} animate={on ? { opacity: 1 } : {}} transition={{ delay: 0.3 + i * 0.06 }}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-line text-[13px] text-ink/80"><span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />{d.name}</motion.span>
            ))}
          </div>
        </div>
        <Reveal delay={0.1} className="flex justify-center">
          <div className="w-[300px] rounded-[44px] bg-[#1a1a1d] p-[10px] ring-1 ring-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,.95)]">
            <img src={`${BASE}/product/phone-leaderboard.png`} alt="Called leaderboard and league progress" className="block w-full rounded-[34px]" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Verifiable judge ---------------- */
const PIPE = [
  { t: 'Public sources', b: 'Evidence fetched and hashed' },
  { t: '3 open models', b: 'Panel must agree 2 of 3' },
  { t: 'Secure hardware', b: 'Runs in an attested TEE' },
  { t: 'Signed verdict', b: 'Contract checks the signature' },
];

export function Judge() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { once: true, margin: '-120px' });
  const [lit, setLit] = useState(-1);
  useEffect(() => {
    if (!on) return;
    let i = -1;
    const t = setInterval(() => { i = (i + 1) % (PIPE.length + 2); setLit(i); }, 700);
    return () => clearInterval(t);
  }, [on]);
  return (
    <section id="trust" className="relative bg-[var(--color-bg)] text-ink py-24 overflow-hidden">
            <div ref={ref} className="relative max-w-6xl mx-auto px-5">
        <Reveal className="max-w-2xl">
          <p className="text-mute font-medium text-[14px]">Verifiable AI judge</p>
          <h2 className="text-[36px] md:text-[56px] leading-[1.05] font-semibold tracking-[-0.035em] mt-2">Results you can check yourself</h2>
          <p className="text-mute mt-5 text-[17px] leading-relaxed">No anonymous moderator, no black box. A panel of open models reads the sources inside secure hardware on NEAR AI Cloud. Every verdict is signed, and the Called contract verifies it on-chain before anyone gets paid. Disagree? Dispute it with a bond.</p>
        </Reveal>
        <div className="grid md:grid-cols-4 gap-4 mt-12">
          {PIPE.map((p, i) => (
            <motion.div key={p.t} animate={{ borderColor: lit >= i ? '#1fd286' : 'rgba(255,255,255,.12)', backgroundColor: lit >= i ? 'rgba(31,210,134,.10)' : 'rgba(255,255,255,.04)' }}
              className="relative rounded-2xl border-2 p-5">
              <motion.div animate={{ scale: lit === i ? [1, 1.25, 1] : 1, backgroundColor: lit >= i ? '#1fd286' : 'rgba(255,255,255,.12)' }} className="h-10 w-10 rounded-full grid place-items-center mb-3">
                {lit >= i ? <IconCheck size={20} /> : <span className="font-semibold">{i + 1}</span>}
              </motion.div>
              <h3 className="font-semibold text-xl">{p.t}</h3>
              <p className="text-mute text-sm mt-1">{p.b}</p>
            </motion.div>
          ))}
        </div>
        <motion.div animate={{ opacity: lit >= PIPE.length ? 1 : 0.25, scale: lit >= PIPE.length ? 1 : 0.97 }} className="mt-6 rounded-2xl bg-black/40 border-2 border-white/10 p-5 font-mono text-sm flex flex-col md:flex-row md:items-center gap-3">
          <span className="flex items-center gap-2 text-mint font-semibold"><IconShield size={20} /> Verified on NEAR</span>
          <span className="text-white/60 break-all">CALLED_VERDICT:42:YES · ed25519 ✓ · attestation ✓ · dispute window 24h</span>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- Download / CTA ---------------- */
export function Download() {
  const { markets, odds } = useLiveMarkets(4);
  return (
    <section id="download" className="max-w-6xl mx-auto px-5 py-24">
      <div className="relative overflow-hidden rounded-[24px] border border-line bg-panel text-ink p-8 md:p-14 grid md:grid-cols-2 gap-10 items-center">
        <div className="relative">
          <h2 className="text-[36px] md:text-[56px] leading-[1.05] font-semibold tracking-[-0.035em]">Got a take?<br />Call it.</h2>
          <p className="text-mute mt-4 text-lg">Play on the web today. iOS and Android apps are in the works.</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Cta>Open Called</Cta>
            <span className="inline-flex items-center justify-center h-12 px-6 rounded-full border border-line font-medium text-mute">App Store · Google Play soon</span>
          </div>
        </div>
        <div className="relative flex justify-center">
          <motion.div initial={{ y: 80, rotate: 6, opacity: 0 }} whileInView={{ y: 0, rotate: -3, opacity: 1 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 80, damping: 14 }}
            className="w-[260px] rounded-[2.4rem] bg-[#1a1b20] p-2 shadow-[0_40px_80px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10">
            <div className="rounded-[2rem] bg-[var(--color-bg)] overflow-hidden h-[480px] text-ink">
              <div className="h-12 flex items-center justify-between px-4 border-b border-line"><span className="font-semibold">called</span><span className="flex items-center gap-1 text-flame font-semibold"><Flame size={18} />21</span></div>
              <div className="p-2.5 space-y-2.5">{markets.slice(0, 3).map((m) => <LandingMarket key={m.id} m={m} p={odds[m.id] ?? Number(m.price_yes)} compact />)}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
