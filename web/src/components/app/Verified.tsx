'use client';
/** Verified caller badge and the "Get verified" progress sheet. The rule is read from on-chain raid records only. */
import { useState } from 'react';
import { BadgeCheck, Check } from 'lucide-react';
import { StepSheet } from './Flow';
import { useRaids } from '@/lib/hooks';
import { callerStats, verifyProgress, VERIFY } from '@/lib/callers';
import { openCall } from '@/lib/bus';

export function useVerified(account?: string | null) {
  const raids = useRaids();
  const s = account ? callerStats(raids.data ?? []).find((x) => x.account === account) : undefined;
  return verifyProgress(s);
}

export function VerifiedBadge({ account, size = 15 }: { account?: string | null; size?: number }) {
  const v = useVerified(account);
  if (!v.verified) return null;
  return <BadgeCheck size={size} className="shrink-0 fill-[#1d9bf0] text-white" aria-label="Verified caller" />;
}

export function GetVerified({ account }: { account?: string | null }) {
  const [open, setOpen] = useState(false);
  const v = useVerified(account);
  const steps = [
    { t: `${VERIFY.hits} raids hit their goal`, now: `${Math.min(v.hits, VERIFY.hits)} / ${VERIFY.hits}`, done: v.hits >= VERIFY.hits, pct: Math.min(1, v.hits / VERIFY.hits) },
    { t: `Half your settled raids hit`, now: v.settled ? `${Math.round(v.rate * 100)}% of ${v.settled}` : 'No settled raids yet', done: v.settled > 0 && v.rate >= VERIFY.rate, pct: v.settled ? Math.min(1, v.rate / VERIFY.rate) : 0 },
  ];
  return (
    <>
      <button onClick={() => setOpen(true)} className="glass press flex w-full items-center gap-3 rounded-[18px] p-3.5 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1d9bf0]/15 text-[#1d9bf0]"><BadgeCheck size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-semibold">{v.verified ? 'You’re a verified caller' : 'Get verified'}</span><span className="block text-[12.5px] text-mute">{v.verified ? 'Earned from your on-chain results' : 'Earn the badge with real raid results'}</span></span>
        <span className="text-[13px] font-semibold text-lime">{v.verified ? 'View' : 'See progress'}</span>
      </button>
      <StepSheet open={open} onClose={() => setOpen(false)} label="Get verified" step={0} total={1}>
        <p className="pt-3 text-[14px] text-mute">The badge is earned, not bought. RAID checks your raids on the chest contract.</p>
        {!account && <p className="mt-3 rounded-[14px] bg-raised px-3 py-2.5 text-[13px]">Connect a wallet to see your progress.</p>}
        <div className="mt-4 space-y-3">
          {steps.map((s) => (
            <div key={s.t} className="rounded-[16px] bg-raised/70 p-3">
              <div className="flex items-center gap-2.5"><span className={`grid h-7 w-7 place-items-center rounded-full ${s.done ? 'bg-up text-white' : 'bg-bg text-faint hairline'}`}><Check size={15} /></span><span className="flex-1 text-[14px] font-medium">{s.t}</span><span className="mono text-[12.5px] text-mute">{s.now}</span></div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bg"><div className={`h-full rounded-full ${s.done ? 'bg-up' : 'bg-signal'}`} style={{ width: `${s.pct * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <button onClick={() => { setOpen(false); if (!v.verified) openCall(); }} className="press mt-4 h-12 w-full rounded-full btn-signal text-[14.5px] font-semibold">{v.verified ? 'Done' : 'Start a raid'}</button>
      </StepSheet>
    </>
  );
}
