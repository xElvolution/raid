'use client';
/** Alerts bell: raid events read from the chest contract (opened, bought, hit, sold early). Seen state is kept on this device. */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, Crosshair, Flag, ShoppingCart, TrendingUp } from 'lucide-react';
import { StepSheet } from './Flow';
import { useNow, useRaids } from '@/lib/hooks';
import { target, xLabel } from '@/lib/raid';
import { displayName } from '@/lib/people';
import { useAutoJoin } from './AutoJoin';
import { openJoin } from './Flow';

const KEY = 'raid.alerts.seen';
export function AlertsBell() {
  const raids = useRaids(); const now = useNow(30_000);
  const aj = useAutoJoin();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  useEffect(() => { try { setSeen(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { /* none */ } }, []);
  const items = useMemo(() => (raids.data ?? []).slice().sort((a, b) => b.id - a.id).slice(0, 20).map((r) => {
    const sym = target(r).symbol;
    const k = `${r.id}:${r.status}:${r.hit}`;
    if (r.status === 'Closed') return { k, r, I: r.hit ? TrendingUp : Flag, tone: r.hit ? 'text-up' : 'text-mute', t: r.hit ? `Raid #${r.id} $${sym} hit ${xLabel(r.target_x_bps)}` : `Raid #${r.id} $${sym} sold early`, b: 'Settled on-chain. Backers can claim.' };
    if (r.status === 'Held') return { k, r, I: ShoppingCart, tone: 'text-lime', t: `Raid #${r.id} bought $${sym}`, b: `Holding until ${xLabel(r.target_x_bps)} or the deadline.` };
    const live = now < r.opens_until_ms;
    if (live && r.caller in aj) return { k: k + ':aj', r, I: Crosshair, tone: 'text-lime', t: `Auto-join ready: $${sym} to ${xLabel(r.target_x_bps)}`, b: `${displayName(r.caller)} opened a raid. Join with ${aj[r.caller]} tUSDC, you approve it.`, join: true };
    return { k, r, I: Crosshair, tone: 'text-lime', t: live ? `New raid on $${sym} to ${xLabel(r.target_x_bps)}` : `Raid #${r.id} $${sym} is about to buy`, b: live ? `By ${displayName(r.caller)}. Join before the timer ends.` : 'Join window closed.' };
  }).sort((a, b) => Number('join' in b) - Number('join' in a)), [raids.data, now, aj]);
  const unread = items.filter((x) => !seen.includes(x.k)).length;
  const openSheet = () => { setOpen(true); const ks = items.map((x) => x.k); setSeen(ks); localStorage.setItem(KEY, JSON.stringify(ks)); };
  return (
    <>
      <button onClick={openSheet} aria-label={`Alerts${unread ? `, ${unread} new` : ''}`} className="press relative grid h-9 w-9 place-items-center rounded-full text-mute hover:bg-raised hover:text-ink">
        <Bell size={18} />{unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[9.5px] font-bold text-white">{Math.min(unread, 9)}</span>}
      </button>
      <StepSheet open={open} onClose={() => setOpen(false)} label="Alerts" step={0} total={1}>
        <div className="mt-2 max-h-[60vh] overflow-y-auto">
          {!items.length && <p className="py-8 text-center text-[14px] text-mute">No raid activity yet.</p>}
          {items.map((x) => (
            <Link key={x.k} href={`/raids/${x.r.id}`} onClick={() => setOpen(false)} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-raised ${x.tone}`}><x.I size={17} /></span>
              <span className="min-w-0"><span className="block text-[14px] font-semibold leading-snug">{x.t}</span><span className="block text-[12.5px] text-mute">{x.b}</span></span>
              {'join' in x && <button onClick={(e) => { e.preventDefault(); setOpen(false); openJoin(x.r.id); }} className="press ml-auto h-9 shrink-0 self-center rounded-full btn-signal px-3.5 text-[13px] font-semibold">Join</button>}
            </Link>
          ))}
        </div>
      </StepSheet>
    </>
  );
}
