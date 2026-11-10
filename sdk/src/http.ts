import type { LeaderboardV2, CallerProfile, OpenCall, SettledCall, SocialPost, ActivityTrade, DraftRow, Holder, MarketComment, OrderBook, ExternalBook, ExternalOrderInput, FeedItem, LeaderboardRow, Market, MarketDetail, MarketStatus, Me, Notification, Page, PlayAccount, PlayTopTrader, PlayTradeResult, Position, Profile, MarketCategory, SignedMessage, User, Venue } from './types.js';

export type ChartRange = '1h' | '1d' | '1w' | '1m' | 'all';

export class CalledError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(`${status} ${code}`);
    this.name = 'CalledError';
  }
}

export interface ClientOptions {
  baseUrl: string;
  token?: string;
  fetch?: typeof fetch;
  /** Abort requests after this many ms (default 15000). */
  timeoutMs?: number;
  headers?: Record<string, string>;
}

type Query = Record<string, string | undefined>;

export class CalledClient {
  private token: string | undefined;
  private readonly f: typeof fetch;
  constructor(private readonly opts: ClientOptions) {
    this.token = opts.token;
    this.f = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  setToken(token: string | undefined): void { this.token = token; }
  getToken(): string | undefined { return this.token; }

  async request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const url = new URL(path, this.opts.baseUrl.endsWith('/') ? this.opts.baseUrl : `${this.opts.baseUrl}/`);
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, v);
    const headers: Record<string, string> = { ...this.opts.headers };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    const res = await this.f(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(this.opts.timeoutMs ?? 15_000) });
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const json: unknown = text ? JSON.parse(text) : undefined;
    if (!res.ok) throw new CalledError(res.status, (json as { error?: string } | undefined)?.error ?? 'http_error');
    return json as T;
  }

  // auth
  nonce() { return this.request<{ nonce: string; recipient: string; message: string }>('POST', 'v1/auth/nonce'); }
  async signIn(signed: SignedMessage, handle?: string) {
    const r = await this.request<{ token: string; user: User; created?: boolean }>('POST', 'v1/auth/signin', { signed, handle });
    this.token = r.token;
    return r;
  }
  /** Exchange a Privy access token for a Called session. */
  async privySignIn(accessToken: string, handle?: string) {
    const r = await this.request<{ token: string; user: User; created?: boolean }>('POST', 'v1/auth/privy', { accessToken, handle });
    this.token = r.token;
    return r;
  }
  authMethods() { return this.request<{ privy: boolean; near: boolean; demo: boolean; playMoney: boolean; chain: { network: string; contract: string; token: string; faucet: boolean } | null }>('GET', 'v1/auth/methods'); }
  me() { return this.request<Me | null>('GET', 'v1/me'); }

  // social
  user(handle: string) { return this.request<Profile>('GET', `v1/users/${encodeURIComponent(handle)}`); }
  follow(handle: string) { return this.request<undefined>('POST', `v1/follows/${encodeURIComponent(handle)}`); }
  unfollow(handle: string) { return this.request<undefined>('DELETE', `v1/follows/${encodeURIComponent(handle)}`); }
  post(input: { body: string; marketId?: string; makeMarket?: boolean; replyTo?: string }) { return this.request<{ id: string; createdAt: string }>('POST', 'v1/posts', input); }
  feed(q: { tab?: 'foryou' | 'following'; author?: string; cursor?: string } = {}) { return this.request<Page<FeedItem>>('GET', 'v1/feed', undefined, q); }

  // markets
  /** Free (points-mode) call on any open market. Non-monetary; earns XP and keeps streaks. */
  predict(marketId: string, outcome: 0 | 1) { return this.request<{ xpGained: number; streak: number; xp: number; xpToday: number; crowd: { yes: number; total: number } }>('POST', 'v1/predictions', { marketId, outcome }); }
  daily() { return this.request<{ items: Market[] }>('GET', 'v1/daily'); }
  myPredictions() { return this.request<{ items: Position[] }>('GET', 'v1/predictions/mine'); }
  /** Preview/demo only: one-tap demo account. */
  demoSignIn() { return this.request<{ token: string; user: User }>('POST', 'v1/auth/demo', {}); }
  book(id: string) { return this.request<OrderBook>('GET', `v1/markets/${id}/book`); }
  /** Live Polymarket CLOB book for a mirrored market (best-first). outcome 0 reads the NO token. */
  externalBook(id: string, outcome: 0 | 1 = 1) { return this.request<ExternalBook>('GET', `v1/external/${id}/book?outcome=${outcome}`); }
  externalStatus() { return this.request<{ polymarket: { routing: 'enabled' | 'disabled'; reason?: string } }>('GET', 'v1/external/status'); }
  externalOrder(id: string, o: ExternalOrderInput) { return this.request<{ ok: true; orderId?: string; status: string }>('POST', `v1/external/${id}/order`, o); }
  activity(id: string) { return this.request<{ trades: ActivityTrade[]; holders: Holder[] }>('GET', `v1/markets/${id}/activity`); }
  comments(id: string) { return this.request<{ items: MarketComment[] }>('GET', `v1/markets/${id}/comments`); }
  playAccount() { return this.request<PlayAccount>('GET', 'v1/play/account'); }
  playDeposit(amount: number) { return this.request<PlayAccount>('POST', 'v1/play/deposit', { amount }); }
  playWithdraw(amount: number) { return this.request<PlayAccount>('POST', 'v1/play/withdraw', { amount }); }
  playTrade(t: { marketId: string; outcome: 0 | 1; side: 'buy' | 'sell'; amount?: number; shares?: number }) { return this.request<PlayTradeResult>('POST', 'v1/play/trade', t); }
  playTop() { return this.request<{ items: PlayTopTrader[] }>('GET', 'v1/play/top'); }
  drafts() { return this.request<{ items: DraftRow[] }>('GET', 'v1/drafts'); }
  registerPush(token: string, platform: 'ios' | 'android' | 'web') { return this.request<undefined>('POST', 'v1/push-tokens', { token, platform }); }
  markets(q: { status?: MarketStatus; venue?: Venue; cursor?: string; sort?: 'new' | 'volume'; category?: MarketCategory } = {}) { return this.request<Page<Market>>('GET', 'v1/markets', undefined, q); }
  market(id: string) { return this.request<MarketDetail>('GET', `v1/markets/${encodeURIComponent(id)}`); }
  leaderboard(window: '24h' | '7d' | '30d' = '7d') { return this.request<{ window: string; items: LeaderboardRow[] }>('GET', 'v1/leaderboards', undefined, { window }); }
  priceHistory(id: string, range: ChartRange = '1w') { return this.request<{ range: string; points: { t: number; o: number; h: number; l: number; c: number }[] }>('GET', `v1/markets/${encodeURIComponent(id)}/history`, undefined, { range }); }
  leaderboard2(q: { window?: 'day' | 'week' | 'month' | 'all'; sort?: 'pnl' | 'hit' | 'volume' | 'streak'; scope?: 'global' | 'friends' | 'league' | 'private'; code?: string }) { return this.request<LeaderboardV2>('GET', 'v1/leaderboard', undefined, q); }
  leagues() { return this.request<{ items: { id: string; code: string; name: string; mine: boolean; members: number; faces: { handle: string; avatar_url: string | null }[] | null }[] }>('GET', 'v1/leagues'); }
  createLeague(name: string) { return this.request<{ code: string; name: string }>('POST', 'v1/leagues', { name }); }
  joinLeague(code: string) { return this.request<{ code: string; name: string }>('POST', `v1/leagues/${encodeURIComponent(code)}/join`); }
  leaveLeague(code: string) { return this.request<{ joined: false }>('DELETE', `v1/leagues/${encodeURIComponent(code)}/join`); }
  challenges() { return this.request<{ resetsAt: string; items: { id: string; label: string; detail: string; xp: number; goal: number; progress: number; done: boolean; claimed: boolean }[] }>('GET', 'v1/challenges'); }
  claimChallenge(id: string) { return this.request<{ claimed: true; xp: number }>('POST', `v1/challenges/${id}/claim`); }
  fundsConfig() { return this.request<{ network: string; treasury: string | null; rate: number; deposits: boolean; demo: boolean }>('GET', 'v1/funds/config'); }
  nearDeposit(txHash: string) { return this.request<{ credited: number; near: number; demo: boolean }>('POST', 'v1/funds/near/deposit', { txHash }); }
  nearWithdraw(amount: number) { return this.request<{ id: string; status: string; to: string; near: number }>('POST', 'v1/funds/near/withdraw', { amount }); }
  // social / Caller Card
  profile(handle: string) { return this.request<CallerProfile>('GET', `v1/users/${encodeURIComponent(handle)}/profile`); }
  equity(handle: string, range: ChartRange = '1w') { return this.request<{ range: string; baseline: number; points: { t: number; v: number }[] }>('GET', `v1/users/${encodeURIComponent(handle)}/equity`, undefined, { range }); }
  userPosts(handle: string, tab: 'posts' | 'replies' | 'media' | 'likes' = 'posts', cursor?: string) { return this.request<Page<SocialPost>>('GET', `v1/users/${encodeURIComponent(handle)}/posts`, undefined, { tab, cursor }); }
  userCalls(handle: string) { return this.request<{ items: OpenCall[] }>('GET', `v1/users/${encodeURIComponent(handle)}/calls`); }
  userHistory(handle: string) { return this.request<{ items: SettledCall[] }>('GET', `v1/users/${encodeURIComponent(handle)}/history`); }
  userCreated(handle: string) { return this.request<{ items: Market[] }>('GET', `v1/users/${encodeURIComponent(handle)}/created`); }
  copy(handle: string, maxPerTrade = 25) { return this.request<{ copying: boolean }>('POST', `v1/users/${encodeURIComponent(handle)}/copy`, { maxPerTrade }); }
  uncopy(handle: string) { return this.request<{ copying: boolean }>('DELETE', `v1/users/${encodeURIComponent(handle)}/copy`); }
  react(id: string, kind: 'like' | 'recast' | 'bookmark', on: boolean) { return this.request<{ on: boolean; count: number }>(on ? 'POST' : 'DELETE', `v1/posts/${id}/${kind}`); }
  updateProfile(p: { display_name?: string; bio?: string; location?: string; links?: string[]; avatar_url?: string; cover_url?: string }) { return this.request<unknown>('PATCH', 'v1/me/profile', p); }
  notifications() { return this.request<{ items: Notification[] }>('GET', 'v1/notifications'); }

  /** Iterate every page of a cursor endpoint. */
  async *paginate<T>(fetchPage: (cursor?: string) => Promise<Page<T>>): AsyncGenerator<T> {
    let cursor: string | undefined;
    do {
      const p = await fetchPage(cursor);
      yield* p.items;
      cursor = p.next ?? undefined;
    } while (cursor);
  }
}
