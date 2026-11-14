'use client';
/** RAID Live: browser camera streams over WebRTC (one broadcaster, many viewers, mesh), signaled through /v1/streams. */
import { useQuery } from '@tanstack/react-query';
import { call } from './social';

export interface LiveStream { id: string; handle: string; display_name: string; near_account: string | null; avatar_url: string | null; title: string; coin: string | null; raid_id: number | null; started_at: number; hearts: number; viewers: number }
export interface LiveMsg { id: number; kind: 'chat' | 'join'; handle: string; body: string; at: number }
export const ICE: RTCConfiguration = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }] };
export const useStreams = () => useQuery({ queryKey: ['streams'], queryFn: () => call<{ items: LiveStream[] }>('/v1/streams').then((d) => d.items), refetchInterval: 5000 });

/** Resolve once ICE gathering finishes (or after `ms`), so the SDP carries its candidates (non-trickle). */
export function iceDone(pc: RTCPeerConnection, ms = 2500) {
  return new Promise<void>((res) => {
    if (pc.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, ms);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
}
const json = (b: unknown) => ({ method: 'POST', body: JSON.stringify(b) });

/** Broadcaster: owns the camera stream and answers each viewer's offer with its own peer connection. */
export class Broadcast {
  id = ''; key = ''; peers = new Map<string, RTCPeerConnection>(); stopped = false; info: LiveStream | null = null;
  coin: string | null; title: string;
  constructor(public media: MediaStream, opts: { title: string; coin: string | null }, public onInfo: (s: LiveStream) => void) { this.coin = opts.coin; this.title = opts.title; }
  async start() {
    const r = await call<{ id: string; key: string }>('/v1/streams', json({ title: this.title, coin: this.coin }));
    this.id = r.id; this.key = r.key; void this.loop(); return r.id;
  }
  private async loop() {
    while (!this.stopped) {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_RAID_API}/v1/streams/${this.id}/beat`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-live-key': this.key }, body: JSON.stringify({ coin: this.coin }) }).then((x) => x.json()) as LiveStream & { pending: { viewer: string; sdp: string }[] };
        if (r.id) { this.info = r; this.onInfo(r); }
        for (const p of r.pending ?? []) if (!this.peers.has(p.viewer)) void this.answer(p.viewer, p.sdp);
      } catch { /* retry */ }
      await new Promise((res) => setTimeout(res, 1200));
    }
  }
  private async answer(viewer: string, sdp: string) {
    const pc = new RTCPeerConnection(ICE); this.peers.set(viewer, pc);
    this.media.getTracks().forEach((t) => pc.addTrack(t, this.media));
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) { pc.close(); this.peers.delete(viewer); } };
    await pc.setRemoteDescription({ type: 'offer', sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await iceDone(pc);
    await fetch(`${process.env.NEXT_PUBLIC_RAID_API}/v1/streams/${this.id}/answer`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-live-key': this.key }, body: JSON.stringify({ viewer, sdp: pc.localDescription!.sdp }) });
  }
  async stop() {
    this.stopped = true; this.peers.forEach((p) => p.close()); this.media.getTracks().forEach((t) => t.stop());
    if (this.id) await fetch(`${process.env.NEXT_PUBLIC_RAID_API}/v1/streams/${this.id}`, { method: 'DELETE', headers: { 'x-live-key': this.key } }).catch(() => {});
  }
}

/** Viewer: send a recvonly offer, wait for the broadcaster's answer, return the peer connection and viewer id. */
export async function watch(id: string, onTrack: (s: MediaStream) => void, signal: { cancelled: boolean }) {
  const pc = new RTCPeerConnection(ICE);
  pc.addTransceiver('video', { direction: 'recvonly' }); pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.ontrack = (e) => onTrack(e.streams[0] ?? new MediaStream([e.track]));
  await pc.setLocalDescription(await pc.createOffer());
  await iceDone(pc);
  const { viewer } = await call<{ viewer: string }>(`/v1/streams/${id}/offer`, json({ sdp: pc.localDescription!.sdp }));
  for (let i = 0; i < 40 && !signal.cancelled; i++) {
    const a = await call<{ sdp: string | null }>(`/v1/streams/${id}/answer/${viewer}`);
    if (a.sdp) { await pc.setRemoteDescription({ type: 'answer', sdp: a.sdp }); return { pc, viewer }; }
    await new Promise((r) => setTimeout(r, 700));
  }
  pc.close(); throw new Error('The streamer didn’t answer. They may have just ended.');
}
export const liveEvents = (id: string, after: number, viewer?: string) => call<LiveStream & { msgs: LiveMsg[] }>(`/v1/streams/${id}/events?after=${after}${viewer ? `&viewer=${viewer}` : ''}`);
export const liveChat = (id: string, body: string) => call(`/v1/streams/${id}/chat`, json({ body }));
export const liveHeart = (id: string) => call<{ hearts: number }>(`/v1/streams/${id}/heart`, { method: 'POST' });
