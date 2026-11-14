'use client';
/** Tiny app-wide event buses: toasts, the call-a-raid sheet, the raid-hit celebration. */
export interface Toast { id: number; title: string; body?: string; tone?: 'lime' | 'brand' | 'down'; href?: string }
type L<T> = (v: T) => void;
export function bus<T>() { const s = new Set<L<T>>(); return { on: (f: L<T>) => { s.add(f); return () => { s.delete(f); }; }, emit: (v: T) => s.forEach((f) => f(v)) }; }

export const toasts = bus<Toast>();
export const toast = (t: Omit<Toast, 'id'>) => toasts.emit({ ...t, id: Date.now() + Math.random() });
export const callSheet = bus<{ symbol?: string }>();
export const openCall = (symbol?: string) => callSheet.emit({ symbol });
export interface Hit { id: number; symbol: string; multiple: string; profitUsd?: number; preview?: boolean }
export const hits = bus<Hit>();
export const signInSheet = bus<void>();
