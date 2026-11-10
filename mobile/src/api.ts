import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string; webUrl?: string };
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'https://called.5.189.170.85.sslip.io';
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? extra.webUrl ?? 'https://called.5.189.170.85.sslip.io';
export const DEMO_LOGIN = (process.env.EXPO_PUBLIC_DEMO_LOGIN ?? '1') === '1';

const KEY = 'called.token';
let token: string | null = null;
const store = {
  get: async () => (Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY)),
  set: async (v: string | null) => {
    if (Platform.OS === 'web') { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); return; }
    v ? await SecureStore.setItemAsync(KEY, v) : await SecureStore.deleteItemAsync(KEY);
  },
};
export async function loadToken() { token = await store.get(); return token; }
export async function setToken(t: string | null) { token = t; await store.set(t); }

export class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(API_URL + path, {
    method: init.method ?? 'GET',
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!r.ok) throw new ApiError(r.status, (await r.json().catch(() => ({}))).error ?? `http_${r.status}`);
  return r.status === 204 ? (undefined as T) : r.json();
}
export const img = (u?: string | null) => (!u ? undefined : u.startsWith('http') ? u : WEB_URL + u);

export interface User { id: string; handle: string; display_name: string; avatar_url: string | null; near_account?: string }
export interface Market { id: string; question: string; price_yes: string | number; volume?: string; volume_24h?: string; status?: string; outcome?: string | null; close_ts: string; image_url?: string | null; category?: string | null; venue?: string; spark?: number[] | null; history?: number[] }
export interface Post { id: string; body: string; created_at: string; handle: string; display_name: string; avatar_url: string | null; market_id?: string | null; question?: string; price_yes?: string; close_ts?: string; market_category?: string | null; likes?: number; replies?: number; recasts?: number; liked?: boolean; position?: number | null }
export interface Position { market_id: string; outcome: number; shares: number; cost: number; value?: number; pnl?: number; question: string; status: string; result: string | null; category?: string | null; price_yes?: string }
export interface Account { balance: number; deposited: number; positionsValue: number; value: number; pnl: number; pnlToday: number; history: { ts: string; value: number }[]; open: Position[]; settled: (Position & { won?: boolean })[] }
export interface Profile { handle: string; display_name: string; avatar_url: string | null; bio?: string; cover_url?: string | null; location?: string; links?: string[]; followers: number; following: number; streak: number; xp: number; calls: number; calls_resolved: number; calls_won: number; posts: number; created_at?: string; banner_url?: string | null; link?: string | null }
export interface Note { id: string; kind: string; payload: Record<string, unknown>; read: boolean; created_at: string }

export interface FullProfile { user: Profile & { id: string; am_following?: boolean; verified?: boolean }; stats: { called: number; settled: number; winRate: number | null; pnl: number; rank: number | null; created: number }; record: { marketId: string; question: string; won: boolean }[]; battle: { theme: string; fought: number; won: number; settled: number }[] }
/** Rich profile from /v1/users/:h/profile; falls back to the older /v1/users/:h shape on servers that lack it. */
async function fullProfile(h: string): Promise<FullProfile> {
  try { return await api<FullProfile>(`/v1/users/${h}/profile`); } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
    const u = await api<Profile & { id: string }>(`/v1/users/${h}`);
    const top = await api<{ items: { handle: string; pnl: number }[] }>('/v1/play/top').catch(() => ({ items: [] }));
    const rank = top.items.findIndex((t) => t.handle === h);
    return { user: u, stats: { called: u.calls_won, settled: u.calls_resolved, winRate: u.calls_resolved ? u.calls_won / u.calls_resolved : null, pnl: top.items[rank]?.pnl ?? 0, rank: rank >= 0 ? rank + 1 : null, created: 0 }, record: Array.from({ length: u.calls_resolved }, (_, i) => ({ marketId: String(i), question: '', won: i < u.calls_won })), battle: [] };
  }
}
const soft = <T,>(p: Promise<T>, empty: T) => p.catch((e) => { if (e instanceof ApiError && e.status === 404) return empty; throw e; });
export const Api = {
  profile: fullProfile,
  equity: (h: string, range: string) => soft(api<{ baseline: number; points: { t: number; v: number }[] }>(`/v1/users/${h}/equity?range=${range}`), { baseline: 0, points: [] }),
  userPosts: (h: string, tab: string) => soft(api<{ items: Post[] }>(`/v1/users/${h}/posts?tab=${tab}`), { items: [] }).then((r) => (r.items.length || tab !== 'posts' ? r : api<{ items: Post[] }>(`/v1/feed?author=${h}`))),
  userCalls: (h: string) => soft(api<{ items: { market_id: string; question: string; category: string | null; outcome: number; value: number; pnl: number; price_yes: number }[] }>(`/v1/users/${h}/calls`), { items: [] }),
  userHistory: (h: string) => soft(api<{ items: { market_id: string; question: string; outcome: number; won: boolean; pnl: number; close_ts: string }[] }>(`/v1/users/${h}/history`), { items: [] }),
  userCreated: (h: string) => soft(api<{ items: Market[] }>(`/v1/users/${h}/created`), { items: [] }),
  privy: (accessToken: string) => api<{ token: string; user: User; created: boolean }>('/v1/auth/privy', { method: 'POST', body: { accessToken } }),
  methods: () => api<{ chain: { network: string; contract: string; token: string; faucet: boolean } | null; privy: boolean; demo: boolean }>('/v1/auth/methods'),
  faucet: () => api<Account>('/v1/play/deposit', { method: 'POST', body: { amount: 1000 } }),
  demo: () => api<{ token: string; user: User }>('/v1/auth/demo', { method: 'POST' }),
  me: () => api<User>('/v1/me'),
  account: () => api<Account>('/v1/play/account'),
  markets: (q = 'sort=volume') => api<{ items: Market[] }>(`/v1/markets?${q}`),
  market: (id: string) => api<{ market: Market & { rules?: string } }>(`/v1/markets/${id}`).then((r) => r.market),
  feed: (tab = 'foryou', author?: string) => api<{ items: Post[] }>(`/v1/feed?tab=${tab}${author ? `&author=${author}` : ''}`),
  top: () => api<{ items: { handle: string; display_name: string; avatar_url: string | null; pnl: number; pnlPct: number }[] }>('/v1/play/top'),
  trending: () => api<{ topics: { tag: string; posts: number }[]; markets: Market[]; whoToFollow: User[] }>('/v1/trending'),
  user: (h: string) => api<Profile>(`/v1/users/${h}`),
  notes: () => api<{ items: Note[] }>('/v1/notifications'),
  readNotes: () => api('/v1/notifications/read', { method: 'POST', body: {} }),
  trade: (b: { marketId: string; outcome: 0 | 1; side: 'buy' | 'sell'; amount?: number }) => api<unknown>('/v1/play/trade', { method: 'POST', body: b }),
  preview: (text: string) => api<{ status: string; draft: { question: string; rules?: string; close_ts?: string; category?: string } | null; message?: string }>('/v1/drafts/preview', { method: 'POST', body: { text } }),
  post: (body: string, marketId?: string) => api('/v1/posts', { method: 'POST', body: { body, ...(marketId ? { marketId } : {}) } }),
  search: (q: string) => api<{ people: User[]; markets: Market[] }>(`/v1/search?q=${encodeURIComponent(q)}`),
  follow: (h: string) => api(`/v1/follows/${h}`, { method: 'POST' }),
};
export const pct = (p: string | number | undefined) => Math.round(Number(p ?? 0.5) * 100);
/** Test USDC (tUSDC) on NEAR testnet, shown as dollars like the web app. */
export const naira = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function left(ts?: string) { if (!ts) return ''; const ms = new Date(ts).getTime() - Date.now(); if (ms <= 0) return 'CLOSED'; const h = ms / 36e5; return h < 24 ? `${Math.floor(h)}H ${Math.floor((ms % 36e5) / 6e4)}M` : `${Math.floor(h / 24)}D`; }
export function ago(ts: string) { const s = (Date.now() - new Date(ts).getTime()) / 1000; return s < 3600 ? `${Math.max(1, Math.floor(s / 60))}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; }
