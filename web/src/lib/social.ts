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

export async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
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

/** A post from the main feed (/v1/feed, /v1/posts). Raid posts carry raid_id; token posts carry coin. */
export interface FeedPost {
  id: string | number; body: string; created_at: string; reply_to: string | null; quote_of: string | null; media_url: string | null;
  raid_id: number | null; coin: string | null; handle: string; display_name: string; avatar_url: string | null; near_account: string | null; verified?: boolean;
  likes: number; recasts: number; replies: number; quotes: number; liked: boolean; recasted: boolean; bookmarked: boolean;
  reply_to_handle?: string | null; quoted?: { id: string; body: string; created_at: string; handle: string; display_name: string; avatar_url: string | null; media_url: string | null; raid_id?: number | null; near_account?: string | null } | null;
}
export interface StoryGroup { handle: string; display_name: string; avatar_url: string | null; near_account: string; latest: string; items: { id: string; body: string; media_url: string | null; coin: string | null; bg: number; created_at: string }[] }
export const mediaSrc = (u: string | null | undefined) => (!u ? null : u.startsWith('/v1/') ? API + u : u);
export const posts = {
  feed: (tab: 'foryou' | 'following' | 'tokens', cursor?: string, author?: string) => call<{ items: FeedPost[]; next: string | null }>(`/v1/feed?tab=${tab}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}${author ? `&author=${author}` : ''}`),
  get: (id: string) => call<{ post: FeedPost; ancestors: FeedPost[]; replies: FeedPost[] }>(`/v1/posts/${id}`),
  create: (b: { body: string; replyTo?: string; quoteOf?: string; mediaUrl?: string; raidId?: number; coin?: string }) => call<{ id: string }>('/v1/posts', { method: 'POST', body: JSON.stringify(b) }),
  react: (id: string, kind: 'like' | 'recast' | 'bookmark', on: boolean) => call<{ on: boolean; count: number }>(`/v1/posts/${id}/${kind}`, { method: on ? 'POST' : 'DELETE' }),
  bookmarks: () => call<{ items: FeedPost[]; next: string | null }>('/v1/bookmarks'),
  upload: (dataUrl: string) => call<{ url: string }>('/v1/media', { method: 'POST', body: JSON.stringify({ data: dataUrl }) }),
  stories: () => call<{ items: StoryGroup[] }>('/v1/stories'),
  story: (b: { body: string; mediaUrl?: string; coin?: string; bg?: number }) => call<{ id: string }>('/v1/stories', { method: 'POST', body: JSON.stringify(b) }),
  me: () => call<{ handle: string; display_name: string; avatar_url: string | null; near_account: string } | null>('/v1/me'),
  profile: (handle: string) => call<{ handle: string; display_name: string; bio?: string; avatar_url: string | null }>(`/v1/users/${handle}`),
  updateProfile: (b: { display_name?: string; bio?: string; avatar_url?: string }) => call<void>('/v1/me/profile', { method: 'PATCH', body: JSON.stringify(b) }),
  notifications: () => call<{ items: { id: string; kind: string; payload: Record<string, unknown>; created_at: string; read: boolean }[] }>('/v1/notifications'),
};

export const social = {
  feed: (q: { tab?: 'all' | 'following'; raid?: number; coin?: string; author?: string; cursor?: string }) => {
    const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
    return call<{ items: Post[]; next: string | null }>(`/v1/raid/feed?${p}`);
  },
  thread: (id: string) => call<{ post: Post; replies: Post[] }>(`/v1/raid/posts/${id}`),
  post: (b: { body: string; raidId?: number; coin?: string; replyTo?: string }) => call<Post>('/v1/raid/posts', { method: 'POST', body: JSON.stringify(b) }),
  like: (id: string, on: boolean) => call<{ liked: boolean; likes: number }>(`/v1/raid/posts/${id}/like`, { method: on ? 'POST' : 'DELETE' }),
  follow: (handle: string, on: boolean) => call<void>(`/v1/follows/${handle}`, { method: on ? 'POST' : 'DELETE' }),
  callers: () => call<{ items: Caller[] }>('/v1/raid/callers'),
};
