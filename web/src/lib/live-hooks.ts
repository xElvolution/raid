'use client';
import type { Channel, LiveEvent } from '@called/sdk';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSession } from './session';

export function useLive(channel: Channel | null, fn: (e: LiveEvent) => void): void {
  const { live } = useSession();
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => {
    if (!channel) return;
    return live.subscribe(channel, (e) => ref.current(e));
  }, [live, channel]);
}

/** Live probability with a flash direction for the last move. */
export function useLiveOdds(marketId: string, initial: number): { p: number; dir: 'up' | 'down' | null; history: number[] } {
  const [state, setState] = useState<{ base: number; p: number; dir: 'up' | 'down' | null; history: number[] }>({ base: initial, p: initial, dir: null, history: [initial] });
  // Adopt a new server value (e.g. after the query loads) until live ticks arrive.
  if (state.base !== initial && state.history.length === 1) setState({ base: initial, p: initial, dir: null, history: [initial] });
  useLive(`market:${marketId}`, (e) => {
    if (e.type !== 'odds' && e.type !== 'trade') return;
    const p = e.data.priceYes;
    setState((s) => ({ ...s, p, dir: p > s.p ? 'up' : p < s.p ? 'down' : s.dir, history: [...s.history.slice(-59), p] }));
  });
  return state;
}

export function useLiveStatus(): 'idle' | 'connecting' | 'open' {
  const { live } = useSession();
  return useSyncExternalStore((cb) => live.onStatus(cb), () => live.state, () => 'idle' as const);
}
