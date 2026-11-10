/**
 * WebSocket gateway. Clients send {op:"sub"|"unsub", channel}. Each socket's channels are
 * reference-counted onto the shared Bus, so N sockets on one market = 1 Redis subscription per pod.
 * Odds messages are coalesced per channel (max one per 250 ms).
 */
import type { WebSocket } from 'ws';
import type { Bus } from './infra/bus.js';

const CHANNEL = /^(market:\d+|feed:global|feed:user:\d+|notifications:\d+)$/;

export class LiveHub {
  private readonly sockets = new Map<string, Set<WebSocket>>();
  private readonly unsubs = new Map<string, () => Promise<void>>();
  private readonly pendingOdds = new Map<string, string>();
  private readonly timer: NodeJS.Timeout;

  constructor(private readonly bus: Bus, private readonly coalesceMs = 250) {
    this.timer = setInterval(() => this.flushOdds(), coalesceMs);
    this.timer.unref();
  }

  private send(channel: string, msg: string) {
    for (const ws of this.sockets.get(channel) ?? []) if (ws.readyState === 1) ws.send(msg);
  }

  private flushOdds() {
    for (const [ch, msg] of this.pendingOdds) this.send(ch, msg);
    this.pendingOdds.clear();
  }

  async subscribe(ws: WebSocket, channel: string, userId?: string): Promise<boolean> {
    if (!CHANNEL.test(channel)) return false;
    if (channel.startsWith('notifications:') && channel !== `notifications:${userId ?? ''}`) return false;
    let set = this.sockets.get(channel);
    if (!set) {
      this.sockets.set(channel, (set = new Set()));
      const unsub = await this.bus.subscribe(channel, (raw) => {
        let parsed: { type?: string };
        try {
          parsed = JSON.parse(raw) as { type?: string };
        } catch {
          return;
        }
        const msg = JSON.stringify({ channel, ...parsed });
        if (parsed.type === 'odds') this.pendingOdds.set(channel, msg);
        else this.send(channel, msg);
      });
      this.unsubs.set(channel, unsub);
    }
    set.add(ws);
    return true;
  }

  async unsubscribe(ws: WebSocket, channel: string): Promise<void> {
    const set = this.sockets.get(channel);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) {
      this.sockets.delete(channel);
      await this.unsubs.get(channel)?.();
      this.unsubs.delete(channel);
    }
  }

  async drop(ws: WebSocket): Promise<void> {
    for (const ch of [...this.sockets.keys()]) await this.unsubscribe(ws, ch);
  }

  stats() {
    return { channels: this.sockets.size };
  }

  close() {
    clearInterval(this.timer);
  }
}
