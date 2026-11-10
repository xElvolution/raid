import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';
import { loadEnv } from '../src/config.js';

describe('http', () => {
  const app = buildServer(loadEnv({ RESOLVER_TOKEN: 'x'.repeat(20) }));
  const auth = { authorization: `Bearer ${'x'.repeat(20)}` };
  it('health reports stub mode without a key', async () => {
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.json()).toEqual({ ok: true, mode: 'stub' });
  });
  it('requires auth', async () => {
    expect((await app.inject({ method: 'POST', url: '/draft', payload: { post: 'x' } })).statusCode).toBe(401);
  });
  it('drafts via heuristic in stub mode', async () => {
    const r = await app.inject({ method: 'POST', url: '/draft', headers: auth, payload: { post: 'BTC will hit 200k by December' } });
    expect(r.statusCode).toBe(200);
    expect(r.json().draft.question).toContain('BTC');
  });
  it('refuses real judging without a key', async () => {
    const r = await app.inject({ method: 'POST', url: '/judge', headers: auth, payload: {} });
    expect(r.statusCode).toBe(503);
  });
});
