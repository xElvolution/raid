/**
 * Realtime + cache primitives. Redis in production (pub/sub fan-out across stateless pods,
 * sorted-set leaderboards, sliding-window rate limits); in-memory for tests and local dev.
 */
import { Redis } from 'ioredis';

export type Handler = (message: string) => void;

export interface Bus {
  publish(channel: string, message: string): Promise<void>;
  /** Returns an unsubscribe function. */
  subscribe(channel: string, handler: Handler): Promise<() => Promise<void>>;
}

export interface Kv {
  zincrby(key: string, by: number, member: string): Promise<void>;
  zrevrange(key: string, start: number, stop: number): Promise<{ member: string; score: number }[]>;
  /** Fixed-window counter; returns count within window. */
  hit(key: string, windowSec: number): Promise<number>;
}

export class MemoryBus implements Bus {
  private readonly subs = new Map<string, Set<Handler>>();
  async publish(channel: string, message: string): Promise<void> {
    for (const h of this.subs.get(channel) ?? []) h(message);
  }
  async subscribe(channel: string, handler: Handler): Promise<() => Promise<void>> {
    let set = this.subs.get(channel);
    if (!set) this.subs.set(channel, (set = new Set()));
    set.add(handler);
    return async () => {
      set.delete(handler);
      if (set.size === 0) this.subs.delete(channel);
    };
  }
  channelCount(): number {
    return this.subs.size;
  }
}

export class MemoryKv implements Kv {
  private readonly z = new Map<string, Map<string, number>>();
  private readonly counters = new Map<string, { n: number; exp: number }>();
  async zincrby(key: string, by: number, member: string): Promise<void> {
    const m = this.z.get(key) ?? new Map<string, number>();
    m.set(String(member), (m.get(String(member)) ?? 0) + by);
    this.z.set(key, m);
  }
  async zrevrange(key: string, start: number, stop: number) {
    return [...(this.z.get(key) ?? new Map<string, number>()).entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(start, stop + 1)
      .map(([member, score]) => ({ member, score }));
  }
  async hit(key: string, windowSec: number): Promise<number> {
    const now = Date.now();
    const c = this.counters.get(key);
    if (!c || c.exp <= now) {
      this.counters.set(key, { n: 1, exp: now + windowSec * 1000 });
      return 1;
    }
    c.n += 1;
    return c.n;
  }
}

/** Redis-backed bus: one subscriber connection per pod, reference-counted channels. */
export class RedisBus implements Bus {
  private readonly sub: Redis;
  private readonly handlers = new Map<string, Set<Handler>>();
  constructor(private readonly pub: Redis) {
    this.sub = pub.duplicate();
    this.sub.on('message', (ch: string, msg: string) => {
      for (const h of this.handlers.get(ch) ?? []) h(msg);
    });
  }
  /** Close the dedicated subscriber connection (the publisher is owned by the caller). */
  close(): void {
    this.sub.disconnect();
  }
  async publish(channel: string, message: string): Promise<void> {
    await this.pub.publish(channel, message);
  }
  async subscribe(channel: string, handler: Handler): Promise<() => Promise<void>> {
    let set = this.handlers.get(channel);
    if (!set) {
      this.handlers.set(channel, (set = new Set()));
      await this.sub.subscribe(channel);
    }
    set.add(handler);
    return async () => {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(channel);
        await this.sub.unsubscribe(channel);
      }
    };
  }
}

export class RedisKv implements Kv {
  constructor(private readonly r: Redis) {}
  async zincrby(key: string, by: number, member: string): Promise<void> {
    await this.r.zincrby(key, by, member);
  }
  async zrevrange(key: string, start: number, stop: number) {
    const raw = await this.r.zrevrange(key, start, stop, 'WITHSCORES');
    const out: { member: string; score: number }[] = [];
    for (let i = 0; i + 1 < raw.length; i += 2) out.push({ member: raw[i] as string, score: Number(raw[i + 1]) });
    return out;
  }
  async hit(key: string, windowSec: number): Promise<number> {
    const n = await this.r.incr(key);
    if (n === 1) await this.r.expire(key, windowSec);
    return n;
  }
}
