'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, Lock, ShieldCheck, Flame, Wallet } from 'lucide-react';
import { Mark } from '@/components/Brand';
import { CoinAvatar, Delta } from '@/components/ui';
import { burst } from '@/components/Overlays';
import { COINS, CHAINS } from '@/lib/coins';
import { useQuotes, fmtPrice } from '@/lib/market';
import { connect, useAccount } from '@/lib/wallet';

const KEY = 'raid.onboard';
const N = 5;

export default function Start() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [line, setLine] = useState(15000);
  const quotes = useQuotes();
  const acct = useAccount();
  useEffect(() => { if (i === N - 1) { localStorage.setItem(KEY, JSON.stringify({ picks, line, at: Date.now() })); setTimeout(burst, 250); } }, [i, picks, line]);
  const next = () => setI((x) => Math.min(N - 1, x + 1));
  const toggle = (s: string) => setPicks((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  return (
    <div className={`min-h-dvh transition-colors duration-500 ${i === 0 || i === N - 1 ? 'cobalt-field' : 'bg-bg'}`}>
      <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 md:min-h-0 md:h-dvh md:max-h-[820px] md:py-10">
        <div className="flex h-10 items-center gap-3">
          {i > 0 && i < N - 1 ? <button onClick={() => setI(i - 1)} aria-label="Back" className="press -ml-2 grid h-9 w-9 place-items-center rounded-full hover:bg-raised"><ArrowLeft size={19} /></button> : <Mark size={22} />}
          {i > 0 && i < N - 1 && <div className="flex flex-1 gap-1">{Array.from({ length: N - 2 }, (_, k) => <motion.span key={k} className="h-[4px] flex-1 rounded-full" animate={{ backgroundColor: k < i ? '#c6ff3d' : 'var(--color-line)' }} />)}</div>}
          {i < N - 1 && <Link href="/live" className={`ml-auto text-[13px] font-semibold ${i === 0 ? 'text-white/70' : 'text-mute'}`}>Skip</Link>}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={i} className="flex flex-1 flex-col" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}>
            {i === 0 && (
              <div className="flex flex-1 flex-col justify-center">
                <motion.div initial={{ scale: 0.3, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }} className="grid h-24 w-24 place-items-center rounded-[26px] bg-[#04061a]"><Mark size={50} /></motion.div>
                <p className="eyebrow mt-10 !text-white/70">Welcome to RAID</p>
                <h1 className="wide-black mt-3 text-[52px] leading-[.84]">Every raid<br />needs a crew.</h1>
                <p className="mt-5 text-[16px] leading-relaxed text-white/80">Call memecoin raids, back other callers, and let a keyless war chest sell at the line. Takes 30 seconds.</p>
                <button onClick={next} className="press mt-10 h-[54px] rounded-[14px] bg-lime text-[16px] font-bold text-[#0a1a00]">Let’s go</button>
              </div>
            )}

            {i === 1 && (
              <div className="flex flex-1 flex-col pt-8">
                <h1 className="wide-black text-[34px] leading-[.9]">Which coins would<br /><span className="text-brand">you raid?</span></h1>
                <p className="mt-3 text-[14px] text-mute">Pick at least two. We’ll put them on your tape.</p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  {COINS.slice(0, 10).map((c, k) => { const q = quotes.data?.find((x) => x.symbol === c.symbol); const on = picks.includes(c.symbol); return (
                    <motion.button key={c.symbol} onClick={() => toggle(c.symbol)} aria-pressed={on} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.03 }} whileTap={{ scale: 0.96 }}
                      className={`relative flex items-center gap-2.5 rounded-[14px] p-3 text-left transition-colors ${on ? 'bg-brand text-white' : 'panel'}`}>
                      <CoinAvatar symbol={c.symbol} image={q?.image} size={32} />
                      <span className="min-w-0"><span className="block text-[13.5px] font-semibold truncate">${c.symbol}</span><span className={`block text-[11px] ${on ? 'text-white/70' : 'text-mute'}`}>{CHAINS[c.chain].label}</span></span>
                      <AnimatePresence>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-lime text-[#0a1a00]"><Check size={12} strokeWidth={3.5} /></motion.span>}</AnimatePresence>
                    </motion.button>
                  ); })}
                </div>
                <div className="mt-auto pt-6"><p className="mb-2 text-center mono text-[11px] text-faint">{picks.length} selected</p><button disabled={picks.length < 2} onClick={next} className="press h-[54px] w-full rounded-[14px] bg-ink text-[15.5px] font-bold text-bg disabled:opacity-30">Build my tape</button></div>
              </div>
            )}

            {i === 2 && (
              <div className="flex flex-1 flex-col pt-8">
                <h1 className="wide-black text-[34px] leading-[.9]">What’s your<br /><span className="text-brand">usual line?</span></h1>
                <p className="mt-3 text-[14px] text-mute">The multiple where the chest sells. You can change it on every raid.</p>
                <div className="mt-6 flex flex-col gap-2">
                  {[{ b: 15000, l: '1.5x', d: 'Quick flips. Hits more often.' }, { b: 20000, l: '2x', d: 'Double or nothing-ish.' }, { b: 30000, l: '3x', d: 'Moonshots. Patient crews only.' }].map((o) => (
                    <motion.button key={o.b} whileTap={{ scale: 0.98 }} onClick={() => setLine(o.b)} aria-pressed={line === o.b} className={`flex items-center gap-4 rounded-[16px] p-4 text-left ${line === o.b ? 'bg-lime text-[#0a1a00]' : 'panel'}`}>
                      <span className="wide-black w-[84px] text-[40px] leading-none">{o.l}</span><span className={`text-[14px] ${line === o.b ? '' : 'text-mute'}`}>{o.d}</span>
                    </motion.button>
                  ))}
                </div>
                <button onClick={next} className="press mt-auto h-[54px] w-full rounded-[14px] bg-ink text-[15.5px] font-bold text-bg">Continue</button>
              </div>
            )}

            {i === 3 && (
              <div className="flex flex-1 flex-col pt-8">
                <h1 className="wide-black text-[34px] leading-[.9]">The chest has<br /><span className="text-brand">rules, not keys.</span></h1>
                <ul className="mt-6 space-y-2">
                  {[[ShieldCheck, 'Keyless', 'Funds move only against a 1Click quote the contract verifies itself.'], [Lock, 'Locked caller fee', 'Callers get paid only if the raid hits its line.'], [Flame, 'Buyback and burn', 'A share of every win buys RAID and burns it.']].map(([I, t, b], k) => { const Ico = I as typeof Lock; return (
                    <motion.li key={t as string} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + k * 0.1 }} className="panel flex gap-3 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-raised text-lime"><Ico size={18} /></span><span><span className="block font-semibold">{t as string}</span><span className="text-[13.5px] text-mute">{b as string}</span></span></motion.li>
                  ); })}
                </ul>
                <div className="mt-auto pt-6 space-y-2">
                  {acct ? <p className="flex items-center justify-center gap-2 text-[13.5px] text-up"><Check size={16} />Connected as {acct}</p>
                    : <button onClick={() => void connect()} className="press flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-brand text-[15.5px] font-bold text-white"><Wallet size={18} />Connect NEAR wallet</button>}
                  <button onClick={next} className="press h-[50px] w-full rounded-[14px] text-[14.5px] font-semibold text-mute hairline">{acct ? 'Finish' : 'Maybe later'}</button>
                </div>
              </div>
            )}

            {i === 4 && (
              <div className="flex flex-1 flex-col justify-center">
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eyebrow !text-white/70">You’re in</motion.p>
                <h1 className="wide-black mt-3 text-[46px] sm:text-[56px] leading-[.84]">
                  {['Welcome', 'to the', 'crew.'].map((w, k) => <motion.span key={w} className={`block ${k === 2 ? 'text-lime' : ''}`} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + k * 0.12, type: 'spring', stiffness: 300, damping: 20 }}>{w}</motion.span>)}
                </h1>
                <motion.div className="mt-8 rounded-[18px] bg-[#04061a] p-4 text-white" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                  <div className="flex items-center justify-between"><p className="eyebrow !text-white/60">Your tape</p><span className="chip chip-lime">Line {line / 1e4}x</span></div>
                  <ul className="mt-2 divide-y divide-white/10">
                    {picks.slice(0, 4).map((s) => { const q = quotes.data?.find((x) => x.symbol === s); return (
                      <li key={s} className="flex items-center gap-3 py-2.5"><CoinAvatar symbol={s} image={q?.image} size={28} /><span className="flex-1 font-semibold text-[14px]">${s}</span><span className="mono text-[12px]">{fmtPrice(q?.priceUsd)}</span><Delta pct={q?.change24h} className="w-[74px] text-right text-[11px]" /></li>
                    ); })}
                  </ul>
                </motion.div>
                <button onClick={() => router.push('/live')} className="press mt-8 h-[54px] rounded-[14px] bg-lime text-[16px] font-bold text-[#0a1a00]">Go to the live feed</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
