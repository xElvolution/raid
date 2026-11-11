'use client';
/** Client for RAID reels (api/src/reels.ts). Attribution of backs to reels is off-chain and labelled demo. */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { API, useSession } from './social';

export interface Reel {
  id: string; kind: 'video' | 'embed'; embed_url: string | null; provider: 'x' | 'instagram' | 'tiktok' | null; caption: string; coin: string | null;
  raid_id: number | null; launch_id: number | null; duration_s: number | null; demo: boolean; created_at: string;
  handle: string; display_name: string; near_account: string | null; author_demo: boolean; backs: number; backed_raw: string;
}
export interface ReelCreator { handle: string; display_name: string; demo: boolean; reels: number; backs: number; backed_raw: number; hits: number; earned_raw: number }
export const videoUrl = (r: Reel) => `${API}/v1/raid/reels/${r.id}/video`;
const token = () => { try { return (JSON.parse(localStorage.getItem('raid.social') ?? 'null') as { token: string } | null)?.token; } catch { return undefined; } };
async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = token();
  const r = await fetch(API + path, { ...init, headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(init.headers ?? {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { message?: string; error?: string }).message ?? (j as { error?: string }).error ?? `http_${r.status}`);
  return j as T;
}
export const useReels = () => useInfiniteQuery({
  queryKey: ['reels'], initialPageParam: '' as string,
  queryFn: ({ pageParam }) => req<{ items: Reel[] }>(`/v1/raid/reels${pageParam ? `?before=${pageParam}` : ''}`),
  getNextPageParam: (p) => (p.items.length === 20 ? p.items[p.items.length - 1]!.id : undefined),
});
export const useReelBoard = () => useQuery({ queryKey: ['reel-board'], queryFn: () => req<{ items: ReelCreator[]; share: string }>('/v1/raid/reels/leaderboard'), refetchInterval: 30_000 });
export const reelsApi = {
  link: (b: { embedUrl: string; caption: string; coin?: string; raidId?: number }) => req<Reel>('/v1/raid/reels', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }),
  upload: (file: Blob, m: { caption: string; coin?: string; raidId?: number }) => {
    const q = new URLSearchParams(Object.entries(m).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
    return req<Reel>(`/v1/raid/reels/upload?${q}`, { method: 'POST', headers: { 'content-type': 'video/mp4' }, body: file });
  },
};
export { useSession };

const REEL_REF = 'raid.reelRef';
/** Remember which reel sent this visitor to a raid (?reel=ID on the raid link), for 1 hour. */
export function rememberReel(raidId: number, reelId: string) { sessionStorage.setItem(REEL_REF, JSON.stringify({ raidId, reelId, at: Date.now() })); }
/** After a successful back: report the tx so the reel gets (off-chain, demo) credit. The API checks the tx on chain. */
export async function attributeReel(tx: string | undefined, backer: string | null) {
  if (!tx || !backer || typeof sessionStorage === 'undefined') return;
  const ref = (() => { try { return JSON.parse(sessionStorage.getItem(REEL_REF) ?? 'null') as { raidId: number; reelId: string; at: number } | null; } catch { return null; } })();
  if (!ref || Date.now() - ref.at > 3_600_000) return;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${API}/v1/raid/reels/${ref.reelId}/backs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tx, backer }) }).catch(() => null);
    if (r?.ok) { sessionStorage.removeItem(REEL_REF); return; }
    await new Promise((s) => setTimeout(s, 2500)); // the tx may not be final yet
  }
}
