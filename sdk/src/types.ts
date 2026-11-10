export type Venue = 'called' | 'polymarket' | 'kalshi';
export type MarketStatus = 'open' | 'proposed' | 'final';
export type Outcome = 'YES' | 'NO' | 'INVALID';

export interface User { id: string; handle: string; display_name: string; avatar_url: string | null; near_account?: string }
export interface Profile extends User { followers: number; following: number; streak: number; longest_streak: number;
  calls?: number;
  calls_resolved?: number;
  calls_won?: number; xp: number; xp_week: number; xp_today: number; posts: number }
export interface Me extends User { mode: 'points' | 'real' }

export interface Market {
  id: string; venue: Venue; external_id: string; question: string;
  price_yes: string | number; volume: string; status: MarketStatus; outcome: Outcome | null;
  close_ts: string | null; created_at: string; url?: string | null; image_url?: string | null; outcomes?: [string, string]; volume_24h?: string; spark?: number[] | null; category?: MarketCategory | null;
}
export interface Trade { account: string; side: 'buy' | 'sell'; outcome: number; amount: string; shares: string; created_at: string }
export interface Resolution {
  outcome: Outcome; signer: string; signed_text: string; receipt_id: string | null; created_at: string;
  /** Full signed AI-judge exchange (present when the resolver stored it). */
  signature?: string | null; signing_algo?: 'ecdsa' | 'ed25519' | null; model?: string | null;
  request_json?: string | null; response_json?: string | null; demo?: boolean;
}
export interface MarketDetail { market: Market; trades: Trade[]; resolution: Resolution | null }

export interface FeedItem {
  id: string; body: string; created_at: string; position: string | null;
  handle: string; display_name: string; avatar_url: string | null;
  market_id: string | null; question: string | null; price_yes: string | null; status: MarketStatus | null; venue: Venue | null; close_ts: string | null; market_image?: string | null; market_category?: MarketCategory | null; market_volume?: string | null;
}
export interface Page<T> { items: T[]; next: string | null }
export interface LeaderboardRow extends User { rank: number; score: number }
export interface Notification { id: string; kind: string; payload: Record<string, unknown>; read: boolean; created_at: string }

export interface SignedMessage { accountId: string; publicKey: string; signature: string; message: string; nonce: string; recipient: string }

export type LiveEvent =
  | { channel: string; type: 'post'; data: { id: string; authorId: string }; ts: number }
  | { channel: string; type: 'trade'; data: { marketId: string; account: string; side: string; outcome: number; amount: string; shares: string; priceYes: number }; ts: number }
  | { channel: string; type: 'odds'; data: { marketId: string; priceYes: number }; ts: number }
  | { channel: string; type: 'notification'; data: { id: string; kind: string; payload: Record<string, unknown> }; ts: number }
  | { channel: string; type: 'resolution'; data: { marketId: string; outcome: Outcome }; ts: number };

export type Channel = 'feed:global' | `feed:user:${string}` | `market:${string}` | `notifications:${string}`;

export interface MarketDraft { question: string; outcomes: ['NO', 'YES']; closeMs: number; rules: string; sources: string[]; clarity: number }
export interface DraftRow { id: string; post_id: string; status: 'ready' | 'rejected' | 'failed'; mode: string; draft: MarketDraft | null; created_at: string }

/** A free call joined with the market's current state. */
export interface Position {
  market_id: string; outcome: number; price_yes: string; created_at: string;
  question: string; venue: Venue; image_url: string | null; outcomes: [string, string] | null;
  status: MarketStatus; result: 'YES' | 'NO' | 'INVALID' | null; close_ts: string | null;
  price_now: string; volume_24h: string | null; volume: string;
}

export type MarketCategory = 'sports' | 'culture' | 'crypto' | 'tech' | 'music' | 'weather';

/** Play-money position (preview/demo). Amounts are play dollars with no value. */
export interface PlayPosition {
  market_id: string; outcome: number; shares: number; cost: number; avg: number; price: number; value: number; pnl: number;
  settled: boolean; won: boolean; redeemed: boolean; question: string; venue: Venue; image_url: string | null; category: MarketCategory | null; status: MarketStatus; close_ts: string;
}
export interface PlayAccount {
  balance: number; deposited: number; positionsValue: number; value: number; pnl: number; pnlToday: number;
  history: { ts: string; value: number }[]; open: PlayPosition[]; settled: PlayPosition[];
}
export interface PlayTradeResult { side: 'buy' | 'sell'; outcome: number; shares: number; amount: number; priceBefore: number; priceYes: number; account: PlayAccount }
export interface PlayTopTrader { handle: string; display_name: string; avatar_url: string | null; pnl: number; pnlPct: number; market: { id: string; question: string; image_url: string | null; category: MarketCategory | null } | null }

export interface BookLevel { price: number; shares: number; total: number }
export interface OrderBook { priceYes: number; asks: BookLevel[]; bids: BookLevel[]; spread: number }
export interface ActivityTrade { handle: string; display_name: string; avatar_url: string | null; side: 'buy' | 'sell'; outcome: number; shares: number; amount: number; priceYes: number; created_at: string }
export interface Holder { handle: string; display_name: string; avatar_url: string | null; outcome: number; shares: number; avg: number }
export interface MarketComment { id: string; body: string; created_at: string; handle: string; display_name: string; avatar_url: string | null; holds: number | null; holds_shares: number | null }

export interface ExternalBook { asks: { price: number; size: number }[]; bids: { price: number; size: number }[]; spread: number | null; mid: number | null; source: 'polymarket'; ts: number; stale?: boolean }
export interface ExternalOrderInput { outcome: 0 | 1; side: 'buy' | 'sell'; type: 'market' | 'limit'; amount: number; limitPrice?: number }

// ---------- social / Caller Card ----------
export interface SocialPost extends FeedItem {
  reply_to?: string | null; quote_of?: string | null; media_url?: string | null; channel?: string | null;
  likes: number; recasts: number; replies: number; quotes?: number; tips_yocto?: string;
  liked: boolean; recasted: boolean; bookmarked: boolean; author_verified?: boolean;
  quote?: SocialPost | null; recast_by?: string | null;
}
export interface ProfileUser {
  id: string; handle: string; display_name: string; avatar_url: string | null; cover_url: string | null; bio: string | null;
  links: string[] | null; location: string | null; verified: boolean; near_account: string | null; created_at: string;
  followers: number; following: number; posts: number; streak: number; longest_streak: number; xp: number;
  am_following: boolean; follows_me: boolean; am_copying: boolean; copiers: number;
}
export interface ProfileStats { called: number; settled: number; winRate: number | null; calibration: number | null; pnl: number; volume: number; trades: number; rank: number | null; rankOf: number | null; bestWinRun: number; created: number; tipsYocto: string }
export interface CallerProfile {
  user: ProfileUser; mutuals: { handle: string; display_name: string; avatar_url: string | null }[]; stats: ProfileStats;
  badges: { id: string; label: string; detail: string }[]; pinned: SocialPost | null; channels: { slug: string; name: string; theme: string | null }[];
  record: { marketId: string; question: string; category?: string | null; theme?: string; won: boolean; outcome: number; settledAt: string; pnl?: number | null }[];
  battle: { theme: string; fought: number; yes: number; no: number; won: number; settled: number }[];
}
export interface OpenCall { market_id: string; question: string; image_url: string | null; category: string | null; outcome: number; shares: number; cost: number; price_yes: number; close_ts: string; avg: number; price: number; value: number; pnl: number; pnlPct: number }
export interface SettledCall { market_id: string; question: string; image_url: string | null; category: string | null; outcome: number; result: string; shares: number; cost: number; close_ts: string; kind: string; won: boolean; payout: number; pnl: number }

export interface LeaderRow { rank: number; change: number; id: string; handle: string; display_name: string; avatar_url: string | null; league: string; xp: number; pnl: number; volume: number; streak: number; hitRate: number | null; settled: number; following: boolean; me: boolean }
export interface LeaderboardV2 { window: string; sort: string; scope: string; items: LeaderRow[]; me: LeaderRow | null; total: number; league: string | null; privateName?: string | null; zones: { promote: number; relegate: number | null } | null; resetsAt: string; prize: { label: string; detail: string } }
