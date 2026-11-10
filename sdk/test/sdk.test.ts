import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { CalledClient, CalledContract, CalledError, LiveClient, ppmToProb, withSlippage, type LiveEvent, type WsLike } from '../src/index.js';

type Call = { url: string; init: RequestInit };
function mockFetch(responder: (c: Call) => { status?: number; body?: unknown }) {
  const calls: Call[] = [];
  const f = (async (url: URL | string, init: RequestInit = {}) => {
    const c = { url: String(url), init };
    calls.push(c);
    const r = responder(c);
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as typeof fetch;
  return { f, calls };
}

describe('CalledClient', () => {
  it('builds urls, query strings and auth headers', async () => {
    const m = mockFetch(() => ({ body: { items: [], next: null } }));
    const c = new CalledClient({ baseUrl: 'https://api.called.app', token: 'abc', fetch: m.f });
    await c.feed({ tab: 'following', cursor: 'xyz' });
    expect(m.calls[0]?.url).toBe('https://api.called.app/v1/feed?tab=following&cursor=xyz');
    expect((m.calls[0]?.init.headers as Record<string, string>).authorization).toBe('Bearer abc');
  });
  it('stores the token after sign-in and sends JSON bodies', async () => {
    const m = mockFetch(() => ({ body: { token: 'jwt', user: { id: '1', handle: 'a' } } }));
    const c = new CalledClient({ baseUrl: 'http://x/', fetch: m.f });
    await c.signIn({ accountId: 'a.near', publicKey: 'ed25519:x', signature: 's', message: 'm', nonce: 'n', recipient: 'r' });
    expect(c.getToken()).toBe('jwt');
    expect(JSON.parse(String(m.calls[0]?.init.body)).signed.accountId).toBe('a.near');
  });
  it('maps errors to CalledError and handles 204', async () => {
    const m = mockFetch((c) => (c.url.includes('follows') ? { status: 204 } : { status: 429, body: { error: 'rate_limited' } }));
    const c = new CalledClient({ baseUrl: 'http://x', fetch: m.f });
    await expect(c.follow('bob')).resolves.toBeUndefined();
    await expect(c.me()).rejects.toMatchObject({ status: 429, code: 'rate_limited' });
    await expect(c.me()).rejects.toBeInstanceOf(CalledError);
  });
  it('paginates through cursors', async () => {
    const m = mockFetch((c) => ({ body: c.url.includes('cursor=p2') ? { items: [3], next: null } : { items: [1, 2], next: 'p2' } }));
    const c = new CalledClient({ baseUrl: 'http://x', fetch: m.f });
    const all: unknown[] = [];
    for await (const i of c.paginate((cursor) => c.markets({ cursor }))) all.push(i);
    expect(all).toEqual([1, 2, 3]);
  });
});

describe('CalledContract', () => {
  it('decodes RPC view results', async () => {
    const m = mockFetch(() => ({ body: { result: { result: [...new TextEncoder().encode('"640000"')] } } }));
    const k = new CalledContract('called.testnet', 'https://rpc', m.f);
    expect(await k.quoteBuy('1', 1, '100')).toBe('640000');
    const req = JSON.parse(String(m.calls[0]?.init.body));
    expect(JSON.parse(atob(req.params.args_base64))).toEqual({ market_id: '1', outcome: 1, amount: '100' });
  });
  it('surfaces contract errors', async () => {
    const m = mockFetch(() => ({ body: { result: { error: 'Smart contract panicked' } } }));
    await expect(new CalledContract('c', 'r', m.f).getMarket('9')).rejects.toThrow(/panicked/);
  });
  it('builds wallet-ready transactions', () => {
    const k = new CalledContract('called.testnet', 'https://rpc');
    const d = k.deposit('usdc.testnet', '5000000');
    expect(d.receiverId).toBe('usdc.testnet');
    expect(d.actions[0]?.params.deposit).toBe('1');
    expect(JSON.parse(String(d.actions[0]?.params.args.msg))).toEqual({ action: 'deposit' });
    expect(k.buy('3', 1, '10', withSlippage('1000', 100)).actions[0]?.params.args.min_shares).toBe('990');
    expect(ppmToProb('640000')).toBe(0.64);
  });
});

describe('LiveClient', () => {
  let wss: WebSocketServer | undefined;
  afterEach(() => wss?.close());

  it('subscribes, receives, replays subscriptions after reconnect', async () => {
    wss = new WebSocketServer({ port: 0 });
    const port = (wss.address() as { port: number }).port;
    const subs: string[] = [];
    let conns = 0;
    wss.on('connection', (s, req) => {
      conns++;
      expect(req.url).toContain('token=t1');
      s.on('message', (d) => {
        const m = JSON.parse(d.toString()) as { op: string; channel: string };
        subs.push(`${m.op}:${m.channel}`);
        if (m.op === 'sub') s.send(JSON.stringify({ channel: m.channel, type: 'odds', data: { marketId: '7', priceYes: 0.6 }, ts: 1 }));
        if (conns === 1) setTimeout(() => s.terminate(), 20);
      });
    });
    const live = new LiveClient({ url: `ws://127.0.0.1:${port}/v1/live`, token: 't1', minBackoffMs: 10, connect: (url, token) => new WebSocket(`${url}?token=${token ?? ''}`) as unknown as WsLike });
    const got: LiveEvent[] = [];
    const off = live.subscribe('market:7', (e) => got.push(e));
    await new Promise((r) => setTimeout(r, 300));
    expect(conns).toBe(2);
    expect(subs.filter((s) => s === 'sub:market:7')).toHaveLength(2);
    expect(got.length).toBeGreaterThanOrEqual(2);
    expect(got[0]?.type).toBe('odds');
    off();
    await new Promise((r) => setTimeout(r, 50));
    expect(subs).toContain('unsub:market:7');
    live.close();
    expect(live.state).toBe('idle');
  });
});
