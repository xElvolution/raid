'use client';
/** Small local preferences (notifications) with a subscribe hook. */
import { useSyncExternalStore } from 'react';
export interface Prefs { newRaids: boolean; hits: boolean; replies: boolean; push: boolean }
const KEY = 'raid.prefs';
const DEF: Prefs = { newRaids: true, hits: true, replies: true, push: false };
let cache: Prefs | null = null;
const subs = new Set<() => void>();
export function getPrefs(): Prefs { if (typeof localStorage === 'undefined') return DEF; if (!cache) { try { cache = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { cache = DEF; } } return cache!; }
export function setPrefs(p: Partial<Prefs>) { cache = { ...getPrefs(), ...p }; localStorage.setItem(KEY, JSON.stringify(cache)); subs.forEach((f) => f()); }
export const usePrefs = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getPrefs, () => DEF);
/** Toast plus, when allowed, a system notification. */
export function notifyUser(title: string, body?: string) {
  if (getPrefs().push && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) new Notification(title, { body, icon: '/icon.svg' });
}
