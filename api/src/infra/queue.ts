/** Background jobs (BullMQ on Redis in production). Job ids make enqueues idempotent. */
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export type JobName = 'draft-market' | 'resolve-market' | 'relay-tx' | 'notify' | 'index-reconcile';

export interface Jobs {
  enqueue(name: JobName, data: Record<string, unknown>, opts?: { jobId?: string; delayMs?: number }): Promise<void>;
}

export class MemoryJobs implements Jobs {
  readonly items: { name: JobName; data: Record<string, unknown>; jobId?: string; delayMs?: number }[] = [];
  async enqueue(name: JobName, data: Record<string, unknown>, opts: { jobId?: string; delayMs?: number } = {}) {
    // Mirror BullMQ's custom id rule so tests catch ids production would reject.
    if (opts.jobId?.includes(':')) throw new Error('Custom Id cannot contain :');
    if (opts.jobId && this.items.some((i) => i.name === name && i.jobId === opts.jobId)) return;
    this.items.push({ name, data, ...opts });
  }
}

export class BullJobs implements Jobs {
  private readonly queues = new Map<JobName, Queue>();
  constructor(private readonly connection: Redis) {}
  private q(name: JobName): Queue {
    let q = this.queues.get(name);
    if (!q) this.queues.set(name, (q = new Queue(name, { connection: this.connection })));
    return q;
  }
  async enqueue(name: JobName, data: Record<string, unknown>, opts: { jobId?: string; delayMs?: number } = {}) {
    await this.q(name).add(name, data, {
      jobId: opts.jobId,
      delay: opts.delayMs,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    });
  }
}
