'use client';
import { CalledError } from '@called/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coinBurst, haptic, popXp, showCelebration } from './fx';
import { divisionFor } from './gamification';
import { useSession } from './session';

export function useMyCalls() {
  const { api, me } = useSession();
  return useQuery({
    queryKey: ['my-calls', me?.id],
    queryFn: async () => new Map((await api.myPredictions()).items.map((p) => [String(p.market_id), p.outcome as 0 | 1])),
    enabled: !!me,
  });
}

/** Free (points-mode) prediction with the full reward loop: coins, XP pop, streak and league celebrations. */
export function usePredict() {
  const { api, me } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { marketId: string; outcome: 0 | 1; origin?: { x: number; y: number } }) => api.predict(v.marketId, v.outcome),
    onMutate: (v) => {
      haptic('tap');
      qc.setQueryData<Map<string, 0 | 1>>(['my-calls', me?.id], (m) => new Map(m ?? []).set(v.marketId, v.outcome));
    },
    onSuccess: (r, v) => {
      const prev = qc.getQueryData<{ xp: number; streak: number }>(['profile', me?.handle]);
      coinBurst(v.origin?.x, v.origin?.y);
      popXp(r.xpGained, 'Call made');
      if (prev) {
        const before = divisionFor(prev.xp).current.name, after = divisionFor(r.xp).current;
        if (after.name !== before) showCelebration({ kind: 'promotion', title: `${after.name} League!`, body: `You climbed out of ${before}. Keep calling it.` });
        else if (r.streak > prev.streak) showCelebration({ kind: 'streak', title: `${r.streak} day streak!`, body: 'You showed up today. Come back tomorrow to keep the flame alive.' });
      }
      qc.setQueryData(['profile', me?.handle], (p: object | undefined) => (p ? { ...p, xp: r.xp, streak: r.streak, xp_today: r.xpToday } : p));
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e, v) => {
      haptic('error');
      if (!(e instanceof CalledError && e.code === 'already_called'))
        qc.setQueryData<Map<string, 0 | 1>>(['my-calls', me?.id], (m) => { const n = new Map(m ?? []); n.delete(v.marketId); return n; });
    },
  });
}
