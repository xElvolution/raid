'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, KeyRound, LogOut } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Identicon } from '@/components/ui';
import { HonestNotes, PayoutSlider, WhyNow } from '@/components/JudgeKit';
import { JUDGES, FOUNDER_LINE } from '@/lib/judges';
import { enterJudgeMode, leaveJudgeMode, useAccount, isJudgeMode } from '@/lib/wallet';
import { explorerAccount } from '@/lib/coins';
import { CHEST_ID, NETWORK } from '@/lib/raid';
import { CREWS } from '@/lib/crews';
import { toast } from '@/lib/bus';

export default function JudgesPage() {
  const acct = useAccount();
  const [pick, setPick] = useState<string>(JUDGES[0].accountId);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const judging = !!acct && isJudgeMode();
  const go = async () => {
    setBusy(true);
    try { await enterJudgeMode(pick, key); setKey(''); toast({ title: 'Judge mode on', body: `Signing as ${pick} on NEAR testnet.`, tone: 'lime' }); }
    catch (e) { toast({ title: 'Key not accepted', body: (e as Error).message, tone: 'down' }); }
    finally { setBusy(false); }
  };
  return (
    <Shell title="For judges">
      <section className="panel overflow-hidden">
        <div className="border-b border-line px-3 py-2.5 md:px-4 md:py-3">
          <p className="wide text-[1rem] md:text-[20px]">Try a raid in 2 minutes</p>
          <p className="mt-1 text-[12.5px] md:text-[13px] text-mute">No wallet install, no money. Three judge accounts on NEAR testnet hold 10 testnet NEAR and 500 tUSDC each.</p>
        </div>
        {judging ? (
          <div className="flex items-center gap-2.5 px-3 py-3 md:px-4">
            <CheckCircle2 size={18} className="text-lime" />
            <p className="min-w-0 flex-1 truncate text-[13px]">Signing as <b className="mono">{acct}</b></p>
            <button onClick={() => { leaveJudgeMode(); toast({ title: 'Judge mode off' }); }} className="press inline-flex h-[2.375rem] md:h-9 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-semibold hairline"><LogOut size={14} />Leave</button>
          </div>
        ) : (
          <div className="grid gap-2 px-3 py-3 md:px-4">
            <div className="grid grid-cols-3 gap-1.5">
              {JUDGES.map((j) => (
                <button key={j.accountId} onClick={() => setPick(j.accountId)} aria-pressed={pick === j.accountId} className={`press flex min-w-0 items-center gap-1.5 rounded-[9px] p-1.5 text-left hairline ${pick === j.accountId ? 'bg-raised ring-1 ring-lime' : ''}`}>
                  <Identicon seed={j.accountId} size={22} className="!rounded-[6px]" />
                  <span className="min-w-0"><span className="block truncate text-[12px] font-semibold">{j.label}</span><span className="block truncate text-[9.5px] text-mute">{j.crew}</span></span>
                </button>
              ))}
            </div>
            <label className="flex h-10 items-center gap-2 rounded-[10px] bg-raised px-2.5 hairline">
              <KeyRound size={15} className="shrink-0 text-mute" />
              <input value={key} onChange={(e) => setKey(e.target.value)} type="password" autoComplete="off" spellCheck={false} placeholder="Paste judge key (ed25519:…)" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-faint" />
            </label>
            <button disabled={!key || busy} onClick={() => void go()} className="press h-10 rounded-[10px] bg-lime text-[13.5px] font-bold text-[#0a1a00] disabled:opacity-45">{busy ? 'Checking key…' : 'Use this judge account'}</button>
            <p className="text-[10.5px] text-faint">The key stays in this browser only (localStorage). The app checks it matches the account on chain, then signs testnet transactions with it.</p>
          </div>
        )}
        <ol className="grid gap-0 border-t border-line text-[12.5px] md:text-[13px]">
          <Step n={1} href="/raids/3" t="Back Frog Legion’s raid #3" b="Enter 10 tUSDC. Then open the raid’s receipt: your back appears in the chest’s records." />
          <Step n={2} href="/war" t="Cast a crew vote" b={`Judges 1 and 2 are in ${CREWS[0]!.name}, Judge 3 in ${CREWS[1]!.name}. Each crew has a raid proposal at 1 of 2 votes: your Yes passes it and the DAO calls the raid.`} />
          <Step n={3} href="/raids" t="Call your own raid" b="Pick a coin and a line. The 10-minute public countdown starts after the crew window." />
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
