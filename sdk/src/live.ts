import type { Channel, LiveEvent } from './types.js';

/** Minimal WebSocket surface shared by browsers, React Native and `ws`. */
export interface WsLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}
export type WsFactory = (url: string, token?: string) => WsLike;

export interface LiveOptions {
  url: string;
  token?: string;
  /** Defaults to global WebSocket (token passed as `?token=` since browsers cannot set headers). */
  connect?: WsFactory;
  minBackoffMs?: number;
  maxBackoffMs?: number;
}

type Listener = (e: LiveEvent) => void;

/**
 * Auto-reconnecting realtime client. Subscriptions are reference counted and
 * replayed on reconnect, so components can subscribe/unsubscribe freely.
 */
export class LiveClient {
  private ws: WsLike | null = null;
  private readonly listeners = new Map<string, Set<Listener>>();
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private status: 'idle' | 'connecting' | 'open' = 'idle';
  private readonly statusListeners = new Set<(s: LiveClient['status']) => void>();

  constructor(private readonly opts: LiveOptions) {}

  get state() { return this.status; }
  onStatus(fn: (s: LiveClient['status']) => void): () => void { this.statusListeners.add(fn); return () => this.statusListeners.delete(fn); }

  subscribe(channel: Channel, fn: Listener): () => void {
    let set = this.listeners.get(channel);
    if (!set) {
      this.listeners.set(channel, (set = new Set()));
      this.sendOp('sub', channel);
    }
    set.add(fn);
    this.ensure();
    return () => {
      const s = this.listeners.get(channel);
      if (!s) return;
      s.delete(fn);
      if (s.size === 0) {
        this.listeners.delete(channel);
        this.sendOp('unsub', channel);
      }
    };
  }

  close(): void {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
    this.setStatus('idle');
  }

  private setStatus(s: LiveClient['status']) { this.status = s; for (const f of this.statusListeners) f(s); }

  private sendOp(op: 'sub' | 'unsub', channel: string) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ op, channel }));
  }

  private ensure() {
    if (this.ws || this.closed) return;
    const connect: WsFactory = this.opts.connect ?? ((url, token) => {
      const u = new URL(url);
      if (token) u.searchParams.set('token', token);
      return new (globalThis as unknown as { WebSocket: new (u: string) => WsLike }).WebSocket(u.toString());
    });
    this.setStatus('connecting');
    const ws = connect(this.opts.url, this.opts.token);
    this.ws = ws;
    ws.onopen = () => {
      this.attempt = 0;
      this.setStatus('open');
      for (const ch of this.listeners.keys()) ws.send(JSON.stringify({ op: 'sub', channel: ch }));
    };
    ws.onmessage = (ev) => {
      let e: LiveEvent;
      try { e = JSON.parse(String(ev.data)) as LiveEvent; } catch { return; }
      const set = this.listeners.get(e.channel);
      if (set) for (const fn of set) fn(e);
    };
    ws.onerror = () => undefined;
    ws.onclose = () => {
      this.ws = null;
      if (this.closed) return;
      this.setStatus('connecting');
      const min = this.opts.minBackoffMs ?? 500, max = this.opts.maxBackoffMs ?? 15_000;
      const delay = Math.min(max, min * 2 ** this.attempt++) * (0.5 + Math.random() / 2);
      this.timer = setTimeout(() => { this.timer = null; if (this.listeners.size) this.ensure(); }, delay);
    };
  }
}
