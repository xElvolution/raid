'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mark } from '@/components/Brand';
import { BigMoney } from '@/components/home-bits';
import { BRAND } from '@/lib/brand';
import { celebrate, haptic } from '@/lib/fx';
import { usePlayAccount } from '@/lib/play';
import { useSession } from '@/lib/session';

const TOPICS = ['Football', 'NBA', 'Crypto', 'Movies', 'Music', 'AI & Tech', 'Weather', 'Gaming', 'F1', 'Tennis', 'Streaming', 'Space'];
const HOW = [
  { n: '01', t: 'Post a take', b: 'Say what you think will happen. Our AI drafts a fair market with rules and sources.' },
  { n: '02', t: 'Trade the odds', b: 'Buy Yes or No. Prices move live as people trade.' },
  { n: '03', t: 'Verified verdict', b: 'A judge in secure hardware settles it. NEAR checks the signature.' },
];

export default function Welcome() {
  const router = useRouter();
  const { me } = useSession();
  const acct = usePlayAccount();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string[]>(['Football', 'Crypto']);
  const next = () => { haptic('tap'); if (i === 2) { celebrate(); router.push('/'); } else setI(i + 1); };
  return (
    <main className="min-h-dvh flex flex-col max-w-[440px] mx-auto px-6 py-6 overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex gap-1.5">{[0, 1, 2].map((k) => <span key={k} className="h-1 flex-1 rounded-full bg-line overflow-hidden"><motion.span className="block h-full bg-ink" animate={{ width: k <= i ? '100%' : '0%' }} /></span>)}</div>
        <button onClick={() => router.push('/')} className="text-[13px] text-mute hover:text-ink">Skip</button>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {i === 0 && (
            <motion.section key="bal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} className="text-center">
              <div className="relative mx-auto h-[220px] w-[220px] grid place-items-center">
                {[0, 1].map((k) => <motion.span key={k} className="absolute inset-0 rounded-full border border-grape/40" animate={{ scale: [1, 1.35], opacity: [0.6, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: k * 1.2 }} />)}
                <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}><Mark size={96} /></motion.div>
              </div>
              <p className="mt-6 text-[14px] text-mute">Welcome{me ? `, ${me.display_name}` : ''}. Your play balance</p>
              <BigMoney value={acct.data?.value ?? 0} className="mt-2 block text-[56px] leading-none font-semibold tracking-[-0.04em]" />
              <p className="mt-4 text-[15px] text-mute max-w-[320px] mx-auto">Trade any market on {BRAND.name} with it. Free calls earn XP and keep your streak alive.</p>
            </motion.section>
          )}
          {i === 1 && (
            <motion.section key="how" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <h1 className="text-[32px] leading-[1.08] font-semibold tracking-[-0.035em]">How {BRAND.name} works</h1>
              <div className="mt-8 space-y-3">
                {HOW.map((h, k) => (
                  <motion.div key={h.n} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + k * 0.1 }} className="flex gap-4 rounded-2xl border border-line bg-panel p-4">
                    <span className="text-[13px] font-semibold tabular-nums aurora-text">{h.n}</span>
                    <div><div className="text-[16px] font-semibold">{h.t}</div><div className="mt-1 text-[14px] text-mute">{h.b}</div></div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
          {i === 2 && (
            <motion.section key="topics" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <h1 className="text-[32px] leading-[1.08] font-semibold tracking-[-0.035em]">What do you follow?</h1>
              <p className="mt-2 text-[15px] text-mute">We tune Explore and your feed around it.</p>
              <div className="mt-7 flex flex-wrap gap-2">
                {TOPICS.map((t) => {
                  const on = picked.includes(t);
                  return (
                    <motion.button key={t} whileTap={{ scale: 0.92 }} onClick={() => { haptic('tap'); setPicked((p) => (on ? p.filter((x) => x !== t) : [...p, t])); }}
                      className={`h-10 px-4 rounded-full text-[14px] font-medium border transition-colors ${on ? 'bg-ink text-bg border-transparent' : 'border-line text-mute hover:text-ink'}`}>{t}</motion.button>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
      <motion.button whileTap={{ scale: 0.97 }} onClick={next} className="h-[52px] cuts bg-grape text-white text-[16px] font-semibold">
        {i === 0 ? 'Continue' : i === 1 ? 'Got it' : 'Start trading'}
      </motion.button>
    </main>
  );
}
