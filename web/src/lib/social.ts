'use client';
/** Typed wrappers for the social endpoints (threads, DMs, channels, connections). Reuses the session client. */
import type { Page, SocialPost } from '@called/sdk';
import { useSession } from './session';

export interface PostThread { post: SocialPost; ancestors: SocialPost[]; replies: SocialPost[] }
export interface Channel { slug: string; name: string; description: string | null; image_url: string | null; theme: string | null; members: number; posts_week?: number; joined: boolean }
export interface DmThreadRow { id: string; last_at: string; handle: string; display_name: string; avatar_url: string | null; verified: boolean; last_body: string | null; last_from_me: boolean; unread: number }
export interface DmMessage { id: string; body: string; created_at: string; read_at: string | null; mine: boolean; market_id: string | null; question: string | null; price_yes: number | null }
export interface DmPeer { handle: string; display_name: string; avatar_url: string | null; verified: boolean }
export interface Connection { handle: string; display_name: string; avatar_url: string | null; bio: string | null; verified: boolean; am_following: boolean }

export function useSocialApi() {
  const { api } = useSession();
  const enc = encodeURIComponent;
  return {
    thread: (id: string) => api.request<PostThread>('GET', `v1/posts/${enc(id)}`),
    publish: (b: { body: string; replyTo?: string; quoteOf?: string; channel?: string; mediaUrl?: string }) => api.request<{ id: string }>('POST', 'v1/posts', b),
    react: (id: string, kind: 'like' | 'recast' | 'bookmark', on: boolean) => api.react(id, kind, on),
    channels: () => api.request<{ items: Channel[] }>('GET', 'v1/channels'),
    channel: (slug: string) => api.request<{ channel: Channel; faces: { handle: string; avatar_url: string | null }[] }>('GET', `v1/channels/${enc(slug)}`),
    channelFeed: (slug: string, cursor?: string) => api.request<Page<SocialPost>>('GET', 'v1/feed', undefined, { channel: slug, cursor }),
    join: (slug: string, on: boolean) => api.request<{ joined: boolean }>(on ? 'POST' : 'DELETE', `v1/channels/${enc(slug)}/join`),
    dms: () => api.request<{ items: DmThreadRow[] }>('GET', 'v1/dms'),
    dm: (handle: string, cursor?: string) => api.request<{ with: DmPeer; items: DmMessage[]; next: string | null }>('GET', `v1/dms/${enc(handle)}`, undefined, { cursor }),
    sendDm: (handle: string, body: string) => api.request<{ id: string; createdAt: string }>('POST', `v1/dms/${enc(handle)}`, { body }),
    connections: (handle: string, list: 'followers' | 'following') => api.request<{ items: Connection[] }>('GET', `v1/users/${enc(handle)}/connections`, undefined, { list }),
    follow: (handle: string, on: boolean) => (on ? api.follow(handle) : api.unfollow(handle)),
  };
}
