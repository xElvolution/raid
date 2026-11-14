'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, KeyRound, LogOut } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Avatar } from '@/components/app/Avatar';
import { HonestNotes, PayoutSlider, WhyNow } from '@/components/JudgeKit';
import { FOUNDER_LINE } from '@/lib/judges';
import { createJudgeAccount, enterJudgeMode, leaveJudgeMode, useAccount, isJudgeMode } from '@/lib/wallet';
import { explorerAccount } from '@/lib/coins';
import { CHEST_ID, NETWORK } from '@/lib/raid';
import { CREWS } from '@/lib/crews';
import { toast } from '@/lib/bus';

export default function JudgesPage() {
  const acct = useAccount();
  const [pick, setPick] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [making, setMaking] = useState(false);
  const judging = !!acct && isJudgeMode();
  const make = async () => {
    setMaking(true);
    try { const r = await createJudgeAccount(); toast({ title: 'Testnet account ready', body: r.warning ?? `Signing as ${r.accountId}. It holds testnet NEAR and 500 tUSDC.`, tone: r.warning ? 'down' : 'lime' }); }
    catch (e) { toast({ title: 'Faucet did not answer', body: (e as Error).message, tone: 'down' }); }
    finally { setMaking(false); }
  };
  const go = async () => {
    setBusy(true);
    try { await enterJudgeMode(pick.trim(), key); setKey(''); toast({ title: 'Judge mode on', body: `Signing as ${pick} on NEAR testnet.`, tone: 'lime' }); }
    catch (e) { toast({ title: 'Key not accepted', body: (e as Error).message, tone: 'down' }); }
    finally { setBusy(false); }
  };
  return (
    <Shell title="Judges">
      <header className="pb-6 pt-4 md:pt-2">
        <span className="chip chip-ghost">NEAR testnet · free</span>
        <h1 className="mt-4 text-[34px] font-semibold leading-[1.02] tracking-[-0.045em] md:text-[44px]">Try a raid in two minutes. <span className="text-faint">No wallet, no money.</span></h1>
        <p className="mt-3 max-w-[44ch] text-[16px] leading-relaxed text-mute">One tap opens a NEAR testnet account in this browser with testnet NEAR for gas and 500 tUSDC to raid with.</p>
      </header>

      <section className="panel rounded-[28px] p-5">
        {judging ? (
          <div className="flex items-center gap-3">
            <Avatar id={acct} size={44} />
            <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 text-[15px] font-semibold"><CheckCircle2 size={17} className="text-lime" />Judge mode on</p><p className="truncate mono text-[13px] text-mute">{acct}</p></div>
            <button onClick={() => { leaveJudgeMode(); toast({ title: 'Judge mode off' }); }} className="press inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold hairline"><LogOut size={15} />Leave</button>
          </div>
        ) : (
          <>
            <button disabled={making} onClick={() => void make()} className="press h-14 w-full rounded-full btn-signal text-[16px] font-semibold disabled:opacity-60">{making ? 'Opening your testnet account…' : 'Get a testnet judge account'}</button>
            <p className="mt-3 text-[13px] leading-relaxed text-mute">The key is made in this browser and stays in its local storage. Only the public key goes to the faucet, which opens the account on NEAR testnet and sends it test tokens. Testnet tokens have no value.</p>
            <details className="mt-4 border-t border-line pt-4 text-[14px]">
              <summary className="cursor-pointer font-medium text-mute">Already have a testnet account? Use its key</summary>
              <div className="mt-3 grid gap-2.5">
                <input value={pick} onChange={(e) => setPick(e.target.value)} autoComplete="off" spellCheck={false} placeholder="account.testnet" className="h-12 rounded-[16px] bg-raised px-4 text-[15px] outline-none placeholder:text-faint" />
                <label className="flex h-12 items-center gap-2 rounded-[16px] bg-raised px-4">
                  <KeyRound size={16} className="shrink-0 text-mute" />
                  <input value={key} onChange={(e) => setKey(e.target.value)} type="password" autoComplete="off" spellCheck={false} placeholder="ed25519:…" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
                </label>
                <button disabled={!key || !pick || busy} onClick={() => void go()} className="press h-12 rounded-full text-[15px] font-semibold hairline disabled:opacity-45">{busy ? 'Checking key…' : 'Use this account'}</button>
              </div>
            </details>
          </>
        )}
      </section>

      <h2 className="mt-10 text-[20px] font-semibold tracking-[-0.03em]">Three things to try</h2>
      <ol className="mt-1 divide-y divide-line">
        <Step n={1} href="/raids/1" t="Open a finished raid" b="Raid #1 was called by a crew DAO, bought, sold at 2.05x, and every backer was paid. Each step links to its testnet transaction." />
        <Step n={2} href="/raids" t="Call your own raid" b="Tap the orange plus, pick a coin and a line. The crew window and the public countdown are 1 minute each on this chest." />
        <Step n={3} href="/feed" t="Back a raid and post about it" b="Back an open raid with 10 tUSDC, then post in its room. Your stake shows in the crew list." />
      </ol>

      {FOUNDER_LINE && <p className="mt-8 border-l-2 border-signal pl-4 text-[17px] leading-relaxed">“{FOUNDER_LINE}”</p>}

      <h2 className="mt-10 text-[20px] font-semibold tracking-[-0.03em]">What a backer gets</h2>
      <PayoutSlider className="mt-3" />
      <WhyNow className="mt-10" />

      <h2 className="mt-10 text-[20px] font-semibold tracking-[-0.03em]">Check it yourself</h2>
      <ul className="mt-1 divide-y divide-line">
        <Ext href={explorerAccount(CHEST_ID, NETWORK)} t="War chest" a={CHEST_ID} />
        {CREWS.map((c) => <Ext key={c.key} href={explorerAccount(c.dao, NETWORK)} t={`${c.name} DAO`} a={c.dao} />)}
        <Ext href={explorerAccount('sputnikv2.testnet', NETWORK)} t="Sputnik DAO v2 factory" a="sputnikv2.testnet" />
      </ul>
      <p className="mt-3 text-[13px] text-faint">Every transaction hash from our runs is in the repo’s <code>evidence/</code> folder.</p>

      <h2 className="mt-10 text-[20px] font-semibold tracking-[-0.03em]">Honest notes</h2>
      <div className="mt-3 text-[15px]"><HonestNotes /></div>
    </Shell>
  );
}

function Step({ n, t, b, href }: { n: number; t: string; b: string; href: string }) {
  return (
    <li>
      <Link href={href} className="flex items-start gap-4 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink mono text-[14px] font-semibold text-bg">{n}</span>
        <span className="min-w-0 flex-1"><span className="block text-[16px] font-semibold">{t}</span><span className="mt-0.5 block text-[14.5px] leading-relaxed text-mute">{b}</span></span>
        <ArrowRight size={18} className="mt-2 shrink-0 text-faint" />
      </Link>
    </li>
  );
}
function Ext({ href, t, a }: { href: string; t: string; a: string }) {
  return <li><a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3.5"><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{t}</span><span className="block truncate mono text-[12.5px] text-mute">{a}</span></span><ExternalLink size={16} className="shrink-0 text-faint" /></a></li>;
}
