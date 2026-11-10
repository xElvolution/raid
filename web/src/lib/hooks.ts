'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { raidApi } from './raid';

export const useRaids = () => useQuery({ queryKey: ['raids'], queryFn: () => raidApi.list(0, 100), refetchInterval: 10_000 });
export const useRaid = (id: number) => useQuery({ queryKey: ['raid', id], queryFn: () => raidApi.get(id), refetchInterval: 10_000 });
export const useChestConfig = () => useQuery({ queryKey: ['chest-config'], queryFn: raidApi.config, staleTime: 5 * 60_000 });
export const useBuyback = () => useQuery({ queryKey: ['buyback'], queryFn: raidApi.buyback, refetchInterval: 30_000 });

/** Wall clock that re-renders every `ms` (for countdowns). 0 during SSR so markup matches. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(0);
  useEffect(() => { const t0 = setTimeout(() => setNow(Date.now()), 0); const t = setInterval(() => setNow(Date.now()), ms); return () => { clearTimeout(t0); clearInterval(t); }; }, [ms]);
  return now;
}
