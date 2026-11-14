'use client';
/**
 * Follow a caller and turn on Auto-join. Auto-join is an off-chain preference kept on this device: when the caller opens a raid,
 * RAID alerts you with a ready Join for your amount, and you still approve it. RAID can never move your funds on its own.
 */
import { useState, useSyncExternalStore } from 'react';
import { BellRing, Check, ShieldCheck, UserPlus } from 'lucide-react';
import { H, P, StepSheet } from './Flow';
import { personByAccount, displayName } from '@/lib/people';
import { social, useSession } from '@/lib/social';
import { toast } from '@/lib/bus';

const KEY = 'raid.autojoin';
type Map = Record<string, number>;
const subs = new Set<() => void>();
let cache: string | null = null;
const read = (): string => (typeof window === 'undefined' ? '{}' : (cache ??= localStorage.getItem(KEY) ?? '{}'));
export const autoJoinList = (): Map => { try { return JSON.parse(read()) as Map; } catch { return {}; } };
function write(m: Map) { cache = JSON.stringify(m); localStorage.setItem(KEY, cache); subs.forEach((f) => f()); }
export function useAutoJoin(): Map { const s = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, read, () => '{}'); try { return JSON.parse(s) as Map; } catch { return {}; } }

export function FollowCaller({ account }: { account: string }) {
  const aj = useAutoJoin();
  const sess = useSession();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [amt, setAmt] = useState<number>(aj[account] ?? 10);
  const [busy, setBusy] = useState(false);
  const on = account in aj;
  const p = personByAccount(account);
  const name = displayName(account);
  async function confirm() {
    setBusy(true);
    try { if (p?.handle && sess) await social.follow(p.handle, true).catch(() => {}); write({ ...autoJoinList(), [account]: amt }); setStep(2); }
    finally { setBusy(false); }
  }
  const off = () => { const m = autoJoinList(); delete m[account]; write(m); setOpen(false); toast({ title: `Auto-join off for ${name}`, tone: 'brand' }); };
  return (
    <>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStep(0); setOpen(true); }} className={`press rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${on ? 'hairline text-ink' : 'bg-ink text-bg'}`}>{on ? 'Following' : 'Follow'}</button>
      <StepSheet open={open} onClose={() => setOpen(false)} label={`Follow ${name}`} step={step} total={3} onBack={step === 1 ? () => setStep(0) : undefined}>
        {step === 0 && <>
          <span className="mt-3 grid h-12 w-12 place-items-center rounded-[16px] bg-signal/12 text-lime"><UserPlus size={22} /></span>
          <H>Follow {name}</H>
          <P>See their raids first in your alerts. You can also turn on Auto-join for their next raid.</P>
          <button onClick={() => setStep(1)} className="press mt-5 h-12 w-full rounded-full btn-signal text-[15px] font-semibold">Next</button>
          {on && <button onClick={off} className="mt-2 w-full py-2 text-[13px] font-medium text-mute">Turn off Auto-join</button>}
        </>}
        {step === 1 && <>
          <H>Auto-join amount</H>
          <P>When {name} opens a raid, you get an alert with a ready Join for this amount.</P>
          <div className="mt-4 grid grid-cols-4 gap-2">{[5, 10, 25, 50].map((v) => <button key={v} onClick={() => setAmt(v)} className={`h-12 rounded-[14px] text-[15px] font-semibold ${amt === v ? 'bg-ink text-bg' : 'bg-raised'}`}>{v}</button>)}</div>
          <p className="mt-1.5 text-center text-[12px] text-mute">tUSDC per raid</p>
          <div className="mt-4 flex gap-2.5 rounded-[16px] bg-raised/70 p-3 text-[12.5px] leading-relaxed text-mute"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-up" /><span>Saved on this device, off-chain. RAID never moves your money by itself: you approve each Join in your wallet.</span></div>
          <button disabled={busy} onClick={() => void confirm()} className="press mt-4 h-12 w-full rounded-full btn-signal text-[15px] font-semibold disabled:opacity-60">Approve</button>
        </>}
        {step === 2 && <div className="py-4 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-up/15 text-up"><Check size={26} /></span>
          <H>You follow {name}</H>
          <P>Auto-join is on at {amt} tUSDC. Their next raid shows up in your alerts <BellRing size={13} className="inline" /> ready to join.</P>
          <button onClick={() => setOpen(false)} className="press mt-5 h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-bg">Done</button>
        </div>}
      </StepSheet>
    </>
  );
}
