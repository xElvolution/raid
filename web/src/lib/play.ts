'use client';
import type { PlayAccount } from '@called/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calledIt, coinBurst, haptic } from './fx';
import { useSession } from './session';

export function usePlayAccount() {
  const { api, me } = useSession();
  return useQuery({ queryKey: ['play'], queryFn: () => api.playAccount(), enabled: !!me, refetchInterval: 20_000 });
}

export const money = (v: number, sign = false) => `${sign ? (v > 0 ? '+' : v < 0 ? '−' : '') : v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Play-money trade with optimistic balance update, haptics and the win moment on profitable sells. */
export function usePlayTrade() {
  const { api } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: { marketId: string; outcome: 0 | 1; side: 'buy' | 'sell'; amount?: number; shares?: number; origin?: { x: number; y: number }; question?: string }) =>
      api.playTrade({ marketId: t.marketId, outcome: t.outcome, side: t.side, amount: t.amount, shares: t.shares }),
    onMutate: () => ({ before: qc.getQueryData<PlayAccount>(['play']) }),
    onSuccess: (r, t, ctx) => {
      qc.setQueryData<PlayAccount>(['play'], r.account);
      void qc.invalidateQueries({ queryKey: ['market', t.marketId] });
      void qc.invalidateQueries({ queryKey: ['markets'] });
      if (t.side === 'buy') coinBurst(t.origin?.x, t.origin?.y);
      else {
        const pos = ctx?.before?.open.find((p) => p.market_id === t.marketId && p.outcome === t.outcome);
        const pnl = pos ? r.amount - pos.avg * r.shares : 0;
        if (pnl > 0) calledIt({ amount: pnl, question: t.question, label: 'Profit locked in' });
        else haptic('success');
      }
    },
    onError: () => haptic('error'),
  });
}
