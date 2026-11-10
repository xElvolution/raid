'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { celebrate, haptic, popXp as xpPop } from '@/lib/fx';
import { useSession } from '@/lib/session';
import { Countdown } from './bc';

/** Daily challenges: progress bars, claim for XP, resets at UTC midnight. */
export function Challenges() {
  const { api, me } = useSession();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['challenges'], queryFn: () => api.challenges(), enabled: !!me, refetchInterval: 30_000 });
  const claim = useMutation({ mutationFn: (id: string) => api.claimChallenge(id), onSuccess: (r) => { celebrate(); xpPop(r.xp, 'Challenge'); void qc.invalidateQueries({ queryKey: ['challenges'] }); }, onError: () => haptic('error') });
  if (!me || !q.data) return null;
  const done = q.data.items.filter((c) => c.claimed).length;
  return (
    <section className="px-4 pt-4">
      <div className="flex items-end justify-between"><div><h2 className="cd text-[24px]">Daily challenges</h2><div className="mn text-[11px] text-mute">{done}/{q.data.items.length} CLAIMED</div></div><Countdown to={q.data.resetsAt} /></div>
      <ul className="mt-2 space-y-1.5">
        {q.data.items.map((c, i) => (
          <motion.li key={c.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 380, damping: 30 }}
            className={`cut-tr flex items-center gap-3 p-3 ${c.claimed ? 'bg-mint-light' : 'bg-panel'}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between"><span className="text-[15px] font-bold">{c.label}</span><span className="mn text-[11px] text-mute">{c.id === 'trade50' ? `$${Math.round(c.progress)}/$${c.goal}` : `${c.progress}/${c.goal}`}</span></div>
              <div className="mt-1.5 h-1.5 bg-snow"><motion.div className="h-full bg-grape" initial={{ width: 0 }} animate={{ width: `${(c.progress / c.goal) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div>
            </div>
            <AnimatePresence mode="wait">
              {c.claimed ? <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid h-10 w-[74px] place-items-center bg-mint text-[#000]"><Check size={20} strokeWidth={3} /></motion.span>
                : <motion.button key="go" whileTap={{ scale: 0.94 }} disabled={!c.done || claim.isPending} onClick={() => { haptic('tap'); claim.mutate(c.id); }}
                  className={`cuts cd h-10 w-[74px] text-[18px] ${c.done ? 'bg-grape text-white' : 'bg-snow text-mute'}`}>+{c.xp} XP</motion.button>}
            </AnimatePresence>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
