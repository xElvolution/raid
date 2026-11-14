'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, KeyRound, LogOut } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Identicon } from '@/components/ui';
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
    <Shell title="For judges">
      <section className="panel overflow-hidden">
        <div className="border-b border-line px-3 py-2.5 md:px-4 md:py-3">
          <p className="wide text-[1rem] md:text-[20px]">Try a raid in 2 minutes</p>
          <p className="mt-1 text-[12.5px] md:text-[13px] text-mute">No wallet install, no money. One click makes a NEAR testnet account in this browser with testnet NEAR and 500 tUSDC.</p>
        </div>
        {judging ? (
          <div className="flex items-center gap-2.5 px-3 py-3 md:px-4">
            <CheckCircle2 size={18} className="text-lime" />
            <p className="min-w-0 flex-1 truncate text-[13px]">Signing as <b className="mono">{acct}</b></p>
            <button onClick={() => { leaveJudgeMode(); toast({ title: 'Judge mode off' }); }} className="press inline-flex h-[2.375rem] md:h-9 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-semibold hairline"><LogOut size={14} />Leave</button>
          </div>
        ) : (
          <div className="grid gap-2 px-3 py-3 md:px-4">
            <button disabled={making} onClick={() => void make()} className="press h-11 rounded-[10px] bg-lime text-[14px] font-bold text-[#0a1a00] disabled:opacity-45">{making ? 'Making your testnet account…' : 'Get a testnet judge account'}</button>
            <p className="text-[10.5px] text-faint">The key is made in this browser and stays in localStorage. Only the public key goes to the faucet, which opens the account on NEAR testnet and sends it test tokens. Testnet tokens have no value.</p>
            <details className="text-[12px]">
              <summary className="cursor-pointer text-mute">Already have a testnet account? Use its key</summary>
              <div className="mt-2 grid gap-2">
                <input value={pick} onChange={(e) => setPick(e.target.value)} autoComplete="off" spellCheck={false} placeholder="account.testnet" className="h-10 rounded-[10px] bg-raised px-2.5 text-[12.5px] outline-none hairline placeholder:text-faint" />
                <label className="flex h-10 items-center gap-2 rounded-[10px] bg-raised px-2.5 hairline">
                  <KeyRound size={15} className="shrink-0 text-mute" />
                  <input value={key} onChange={(e) => setKey(e.target.value)} type="password" autoComplete="off" spellCheck={false} placeholder="ed25519:…" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-faint" />
                </label>
                <button disabled={!key || !pick || busy} onClick={() => void go()} className="press h-10 rounded-[10px] text-[13px] font-semibold hairline disabled:opacity-45">{busy ? 'Checking key…' : 'Use this account'}</button>
              </div>
            </details>
          </div>
        )}
        <ol className="grid gap-0 border-t border-line text-[12.5px] md:text-[13px]">
          <Step n={1} href="/raids/1" t="See a finished raid: #1, called by a crew DAO" b="Open, bought, sold at 2.05x, fees split and every backer paid. Each step links to its testnet transaction." />
          <Step n={2} href="/raids" t="Call your own raid" b="Pick a coin and a line. The crew window and the public countdown are 1 minute each on this testnet chest." />
          <Step n={3} href="/raids" t="Back a raid with tUSDC" b="Enter 10 tUSDC on an open raid. Your stake shows in the chest’s backer list." />
        </ol>
      </section>

      {FOUNDER_LINE && <p className="mt-3 rounded-[12px] bg-raised px-3 py-2.5 text-[13px] italic">“{FOUNDER_LINE}”</p>}

      <PayoutSlider className="mt-3" />
      <WhyNow className="mt-4" />

      <section className="panel mt-4 p-3 md:p-4">
        <p className="eyebrow">Check it yourself</p>
        <ul className="mt-2 grid gap-1.5 mono text-[11px] md:text-[11.5px]">
          <Ext href={explorerAccount(CHEST_ID, NETWORK)}>War chest · {CHEST_ID}</Ext>
          {CREWS.map((c) => <Ext key={c.key} href={explorerAccount(c.dao, NETWORK)}>{c.name} DAO · {c.dao}</Ext>)}
          <Ext href={explorerAccount('sputnikv2.testnet', NETWORK)}>Sputnik DAO v2 factory · sputnikv2.testnet</Ext>
        </ul>
        <p className="mt-2 text-[11px] text-faint">Every transaction hash from our runs is in the repo’s <code>evidence/</code> folder.</p>
      </section>
      <section className="mt-4 px-1"><p className="eyebrow mb-1.5">Honest notes</p><HonestNotes /></section>
    </Shell>
  );
}

function Step({ n, t, b, href }: { n: number; t: string; b: string; href: string }) {
  return (
    <li className="border-b border-line last:border-0">
      <Link href={href} className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-raised/50 md:px-4">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime mono text-[11px] font-bold text-[#0a1a00]">{n}</span>
        <span className="min-w-0 flex-1"><span className="block font-semibold">{t}</span><span className="block text-[12px] text-mute leading-snug">{b}</span></span>
        <ArrowRight size={15} className="mt-1 shrink-0 text-mute" />
      </Link>
    </li>
  );
}
function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return <li><a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-mute hover:text-ink"><ExternalLink size={11} className="shrink-0" /><span className="truncate">{children}</span></a></li>;
}
