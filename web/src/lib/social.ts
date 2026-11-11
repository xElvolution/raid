'use client';
/** Client for the RAID social API (api/src/raid-social.ts). Session = JWT from NEP-413 sign-in, kept in localStorage. */
import { useSyncExternalStore } from 'react';
import { signMessage } from './wallet';

export const API = process.env.NEXT_PUBLIC_RAID_API ?? 'http://localhost:8787';
export interface Post {
  id: string; body: string; created_at: string; raid_id: number | null; coin: string | null; reply_to: string | null;
  handle: string; display_name: string; near_account: string | null; demo: boolean; likes: number; replies: number; liked: boolean; following: boolean;
}
export interface Caller { handle: string; display_name: string; near_account: string | null; demo: boolean; followers: number; posts: number; following: boolean }

const KEY = 'raid.social';
type Sess = { token: string; handle: string; account: string } | null;
let sess: Sess = null;
let loaded = false;
const subs = new Set<() => void>();
function load() { if (loaded || typeof window === 'undefined') return; loaded = true; try { sess = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { sess = null; } }
function set(s: Sess) { sess = s; if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); subs.forEach((f) => f()); }
export function useSession(): Sess {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => { load(); return sess; }, () => null);
}
export const signOutSocial = () => set(null);

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  load();
  const r = await fetch(API + path, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(sess ? { Authorization: `Bearer ${sess.token}` } : {}), ...(init.headers ?? {}) } });
  if (r.status === 401 && sess) { set(null); throw new Error('session_expired'); }
  if (r.status === 204) return undefined as T;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `http_${r.status}`);
  return j as T;
}

export async function signInSocial(): Promise<void> {
  const n = await call<{ nonce: string; recipient: string; message: string }>('/v1/auth/nonce', { method: 'POST', body: '{}' });
  const s = await signMessage({ message: n.message, recipient: n.recipient, nonceB64: n.nonce });
  const r = await call<{ token: string; user: { handle: string } }>('/v1/auth/signin', { method: 'POST', body: JSON.stringify({ signed: { accountId: s.accountId, publicKey: s.publicKey, signature: s.signature, message: n.message, nonce: n.nonce, recipient: n.recipient } }) });
  set({ token: r.token, handle: r.user.handle, account: s.accountId });
}

export const social = {
  feed: (q: { tab?: 'all' | 'following'; raid?: number; coin?: string; cursor?: string }) => {
    const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
    return call<{ items: Post[]; next: string | null }>(`/v1/raid/feed?${p}`);
  },
  thread: (id: string) => call<{ post: Post; replies: Post[] }>(`/v1/raid/posts/${id}`),
  post: (b: { body: string; raidId?: number; coin?: string; replyTo?: string }) => call<Post>('/v1/raid/posts', { method: 'POST', body: JSON.stringify(b) }),
  like: (id: string, on: boolean) => call<{ liked: boolean; likes: number }>(`/v1/raid/posts/${id}/like`, { method: on ? 'POST' : 'DELETE' }),
  follow: (handle: string, on: boolean) => call<void>(`/v1/follows/${handle}`, { method: on ? 'POST' : 'DELETE' }),
  callers: () => call<{ items: Caller[] }>('/v1/raid/callers'),
};
