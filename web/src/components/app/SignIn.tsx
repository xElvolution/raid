'use client';
/** Sign-in sheet (wallet, or on testnet a free browser account with test funds) and the 3-card first-run intro. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Users, Target, Wallet, X } from 'lucide-react';
import { signInSheet, toast } from '@/lib/bus';
import { connectWallet, createTestAccount, useAccount } from '@/lib/wallet';
import { NETWORK } from '@/lib/raid';

export function SignInSheet() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => signInSheet.on(() => setOpen(true)), []);
  async function fresh() {
    setBusy(true);
    try { const r = await createTestAccount(); toast({ title: 'You’re in', body: r.warning ?? `Signed in as ${r.accountId}. It has test NEAR and 500 test USDC.`, tone: r.warning ? 'down' : 'lime' }); setOpen(false); }
    catch (e) { toast({ title: 'Couldn’t open an account', body: (e as Error).message, tone: 'down' }); }
    finally { setBusy(false); }
  }
  return (
    <AnimatePresence>{open && (
      <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/40 md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
        <motion.div role="dialog" aria-label="Sign in" onClick={(e) => e.stopPropagation()} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} className="w-full max-w-[420px] glass-strong rounded-t-[26px] p-4 pb-[max(16px,env(safe-area-inset-bottom))] md:rounded-[22px]">
          <div className="flex items-center"><h2 className="text-[18px] font-semibold tracking-[-0.02em]">Sign in to RAID</h2><button onClick={() => setOpen(false)} aria-label="Close" className="ml-auto grid h-8 w-8 place-items-center rounded-full hover:bg-raised"><X size={17} /></button></div>
          <p className="mt-1 text-[13px] text-mute">Your wallet is your account. Posting only needs a signature, no gas.</p>
          <button onClick={() => { setOpen(false); void connectWallet(); }} className="press mt-4 flex h-12 w-full items-center gap-3 rounded-[14px] bg-ink px-4 text-[14px] font-semibold text-bg"><Wallet size={18} />Connect a NEAR wallet<span className="ml-auto text-[12px] font-normal opacity-60">Meteor, MyNEAR</span></button>
          {NETWORK === 'testnet' && (
            <button disabled={busy} onClick={() => void fresh()} className="press mt-2 flex h-12 w-full items-center gap-3 rounded-[14px] px-4 text-[14px] font-semibold hairline disabled:opacity-60"><Sparkles size={18} className="text-lime" />{busy ? 'Opening your account…' : 'New here? Get a free testnet account'}<span className="ml-auto text-[12px] font-normal text-mute">with test USDC</span></button>
          )}
          <p className="mt-3 text-[11.5px] leading-relaxed text-faint">A free testnet account keeps its key in this browser only. Test tokens have no value. <Link href="/how" onClick={() => setOpen(false)} className="underline">How RAID works</Link></p>
        </motion.div>
      </motion.div>
    )}</AnimatePresence>
  );
}

const CARDS = [
  { Icon: Users, t: 'Post and follow traders', b: 'Share takes, tag coins with $PEPE to show live prices, and follow people whose calls you like.' },
  { Icon: Target, t: 'Join a raid with friends', b: 'A raid is a group buy. One person picks a coin and a target, others put money in, and everyone buys together.' },
  { Icon: Sparkles, t: 'It only sells at the target', b: 'Money sits in a contract nobody can withdraw from. It sells when the target is hit, or returns what’s left if time runs out. The caller only earns on a win.' },
];
const ONB = 'raid.onboarded';
export function Onboarding() {
  const acct = useAccount();
  const [i, setI] = useState<number | null>(null);
  useEffect(() => { if (!acct) return; const t = setTimeout(() => { if (!localStorage.getItem(ONB)) setI(0); }, 400); return () => clearTimeout(t); }, [acct]);
  const done = () => { localStorage.setItem(ONB, '1'); setI(null); };
  const c = i !== null ? CARDS[i] : null;
  return (
    <AnimatePresence>{c && (
      <motion.div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div key={i} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, d) => { if (d.offset.x < -50) (i! < 2 ? setI(i! + 1) : done()); if (d.offset.x > 50 && i! > 0) setI(i! - 1); }}
          initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-full max-w-[420px] glass-strong rounded-t-[26px] p-5 pb-[max(20px,env(safe-area-inset-bottom))] md:rounded-[22px]">
          <div className="flex items-center gap-1.5">{CARDS.map((_, k) => <span key={k} className={`h-1.5 rounded-full ${k === i ? 'w-5 bg-signal' : 'w-1.5 bg-line'}`} />)}<button onClick={done} className="ml-auto text-[13px] font-medium text-mute">Skip</button></div>
          <span className="mt-5 grid h-12 w-12 place-items-center rounded-full bg-signal/15 text-lime"><c.Icon size={22} /></span>
          <h2 className="mt-3 text-[20px] font-semibold tracking-[-0.02em]">{c.t}</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-mute">{c.b}</p>
          <button onClick={() => (i! < 2 ? setI(i! + 1) : done())} className="press mt-5 h-11 w-full rounded-full btn-signal text-[14px] font-semibold">{i! < 2 ? 'Next' : 'Start'}</button>
        </motion.div>
      </motion.div>
    )}</AnimatePresence>
  );
}
