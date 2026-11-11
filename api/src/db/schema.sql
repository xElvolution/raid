-- Called schema. Keyset pagination on (created_at, id) everywhere; see SPEC §11.
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  handle        TEXT NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,20}$'),
  near_account  TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  country       TEXT,
  age_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  mode          TEXT NOT NULL DEFAULT 'points' CHECK (mode IN ('points','real')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS follows (
  follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX IF NOT EXISTS follows_followee ON follows (followee_id);

CREATE TABLE IF NOT EXISTS markets (
  id          BIGSERIAL PRIMARY KEY,
  venue       TEXT NOT NULL CHECK (venue IN ('called')),
  external_id TEXT NOT NULL,
  question    TEXT NOT NULL,
  rules       TEXT NOT NULL DEFAULT '',
  sources     JSONB NOT NULL DEFAULT '[]',
  close_ts    TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','proposed','disputed','final','void')),
  outcome     TEXT CHECK (outcome IN ('YES','NO','INVALID')),
  price_yes   NUMERIC(8,6) NOT NULL DEFAULT 0.5,
  volume      NUMERIC(38,0) NOT NULL DEFAULT 0,
  clarity     REAL,
  creator_id  BIGINT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue, external_id)
);
CREATE INDEX IF NOT EXISTS markets_status_close ON markets (status, close_ts);
CREATE INDEX IF NOT EXISTS markets_created ON markets (created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS posts (
  id         BIGSERIAL PRIMARY KEY,
  author_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 3000),
  market_id  BIGINT REFERENCES markets(id),
  position   JSONB,
  reply_to   BIGINT REFERENCES posts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_author_created ON posts (author_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS posts_created ON posts (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS posts_market ON posts (market_id) WHERE market_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS trades (
  id          BIGSERIAL PRIMARY KEY,
  market_id   BIGINT NOT NULL REFERENCES markets(id),
  user_id     BIGINT REFERENCES users(id),
  account     TEXT NOT NULL,
  side        TEXT NOT NULL CHECK (side IN ('buy','sell')),
  outcome     SMALLINT NOT NULL CHECK (outcome IN (0,1)),
  amount      NUMERIC(38,0) NOT NULL,
  shares      NUMERIC(38,0) NOT NULL,
  receipt_id  TEXT NOT NULL,
  log_index   INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (receipt_id, log_index)
);
CREATE INDEX IF NOT EXISTS trades_market_created ON trades (market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trades_user_created ON trades (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS positions (
  user_id   BIGINT NOT NULL REFERENCES users(id),
  market_id BIGINT NOT NULL REFERENCES markets(id),
  outcome   SMALLINT NOT NULL,
  shares    NUMERIC(38,0) NOT NULL DEFAULT 0,
  cost      NUMERIC(38,0) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, market_id, outcome)
);

CREATE TABLE IF NOT EXISTS resolutions (
  market_id       BIGINT PRIMARY KEY REFERENCES markets(id),
  outcome         TEXT NOT NULL,
  signer          TEXT NOT NULL,
  signed_text     TEXT NOT NULL,
  receipt_id      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  payload    JSONB NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications (user_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS xp_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  xp         INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xp_user_created ON xp_events (user_id, created_at);

CREATE TABLE IF NOT EXISTS streaks (
  user_id  BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current  INT NOT NULL DEFAULT 0,
  longest  INT NOT NULL DEFAULT 0,
  last_day DATE,
  freezes  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS indexer_checkpoint (
  name         TEXT PRIMARY KEY,
  block_height BIGINT NOT NULL
);

ALTER TABLE markets ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS outcomes JSONB NOT NULL DEFAULT '["NO","YES"]';
ALTER TABLE markets ADD COLUMN IF NOT EXISTS volume_24h NUMERIC(38,0) NOT NULL DEFAULT 0;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS markets_venue_vol ON markets (venue, status, volume_24h DESC);

CREATE TABLE IF NOT EXISTS market_drafts (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  author_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('ready','rejected','failed')),
  mode       TEXT NOT NULL,
  draft      JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drafts_author ON market_drafts (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_tokens (
  token      TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_user ON push_tokens (user_id);

-- Free predictions (points mode): non-monetary calls on any market, earn XP and keep streaks.
CREATE TABLE IF NOT EXISTS predictions (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id  BIGINT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  outcome    SMALLINT NOT NULL CHECK (outcome IN (0,1)),
  price_yes  NUMERIC(8,6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, market_id)
);
CREATE INDEX IF NOT EXISTS predictions_market ON predictions (market_id);

-- Odds history (snapshots on change) for sparklines and charts.
CREATE TABLE IF NOT EXISTS market_prices (
  market_id BIGINT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_yes NUMERIC(8,6) NOT NULL,
  PRIMARY KEY (market_id, ts)
);

-- Market category for browsing (sports, culture, crypto, tech, music, weather).
ALTER TABLE markets ADD COLUMN IF NOT EXISTS category TEXT;

-- Play money (preview/demo): mock balance, positions and trades on Called markets. No real value.
CREATE TABLE IF NOT EXISTS play_accounts (
  user_id    BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance    NUMERIC(20,6) NOT NULL DEFAULT 1000,
  deposited  NUMERIC(20,6) NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS play_positions (
  user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id BIGINT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  outcome   SMALLINT NOT NULL CHECK (outcome IN (0,1)),
  shares    NUMERIC(20,6) NOT NULL DEFAULT 0,
  cost      NUMERIC(20,6) NOT NULL DEFAULT 0,
  redeemed  BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, market_id, outcome)
);
CREATE TABLE IF NOT EXISTS play_trades (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id  BIGINT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  outcome    SMALLINT NOT NULL,
  side       TEXT NOT NULL CHECK (side IN ('buy','sell')),
  shares     NUMERIC(20,6) NOT NULL,
  amount     NUMERIC(20,6) NOT NULL,
  price_yes  NUMERIC(8,6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS play_trades_user ON play_trades (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS play_trades_market ON play_trades (market_id, created_at DESC);
CREATE TABLE IF NOT EXISTS play_value_history (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
  value   NUMERIC(20,6) NOT NULL,
  PRIMARY KEY (user_id, ts)
);

-- Proof page: the full signed AI-judge exchange so anyone can re-hash and verify it.
ALTER TABLE resolutions ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE resolutions ADD COLUMN IF NOT EXISTS signing_algo TEXT;
ALTER TABLE resolutions ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE resolutions ADD COLUMN IF NOT EXISTS request_json TEXT;
ALTER TABLE resolutions ADD COLUMN IF NOT EXISTS response_json TEXT;
ALTER TABLE resolutions ADD COLUMN IF NOT EXISTS demo BOOLEAN NOT NULL DEFAULT false;

-- Removed for RAID: external venues (Polymarket/Kalshi) and their order audit table.
ALTER TABLE markets DROP COLUMN IF EXISTS clob_token_ids;
DROP TABLE IF EXISTS external_orders;

-- ===== Social layer: profiles, threads, reactions, channels, tips, DMs, copy calls =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pinned_post_id BIGINT;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS quote_of BIGINT REFERENCES posts(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS channel TEXT;
CREATE INDEX IF NOT EXISTS posts_reply_to ON posts (reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_channel ON posts (channel, created_at DESC) WHERE channel IS NOT NULL;

CREATE TABLE IF NOT EXISTS post_likes (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS post_likes_post ON post_likes (post_id);
CREATE TABLE IF NOT EXISTS post_recasts (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS post_recasts_post ON post_recasts (post_id);
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS channels (
  slug        TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]{2,24}$'),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  theme       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS channel_members (
  slug    TEXT NOT NULL REFERENCES channels(slug) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (slug, user_id)
);

CREATE TABLE IF NOT EXISTS tips (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  from_id    BIGINT NOT NULL REFERENCES users(id),
  to_id      BIGINT NOT NULL REFERENCES users(id),
  amount_yocto NUMERIC(40,0) NOT NULL CHECK (amount_yocto > 0),
  tx_hash    TEXT UNIQUE,
  status     TEXT NOT NULL CHECK (status IN ('pending','verified','failed','demo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tips_post ON tips (post_id);

CREATE TABLE IF NOT EXISTS dm_threads (
  id         BIGSERIAL PRIMARY KEY,
  user_a     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
CREATE TABLE IF NOT EXISTS dm_messages (
  id         BIGSERIAL PRIMARY KEY,
  thread_id  BIGINT NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
  sender_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  market_id  BIGINT REFERENCES markets(id),
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dm_messages_thread ON dm_messages (thread_id, created_at DESC);

-- Copy calls: mirror a caller's play-money buys, capped per trade.
CREATE TABLE IF NOT EXISTS copy_subscriptions (
  follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leader_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_per_trade NUMERIC(20,6) NOT NULL DEFAULT 10 CHECK (max_per_trade > 0 AND max_per_trade <= 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, leader_id),
  CHECK (follower_id <> leader_id)
);
CREATE INDEX IF NOT EXISTS copy_leader ON copy_subscriptions (leader_id);

-- Call it: the creator's opening play-money call, placed once the market goes live from the draft.
CREATE TABLE IF NOT EXISTS opening_calls (
  post_id    BIGINT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outcome    SMALLINT NOT NULL CHECK (outcome IN (0,1)),
  amount     NUMERIC(20,6) NOT NULL CHECK (amount > 0 AND amount <= 1000),
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','placed','failed')),
  error      TEXT,
  market_id  BIGINT REFERENCES markets(id),
  shares     NUMERIC(20,6),
  price_yes  NUMERIC(10,6),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Growth: private leagues, daily challenges, NEAR testnet funding =====
CREATE TABLE IF NOT EXISTS private_leagues (
  id         BIGSERIAL PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6}$'),
  name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 40),
  owner_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private_league_members (
  league_id BIGINT NOT NULL REFERENCES private_leagues(id) ON DELETE CASCADE,
  user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);
CREATE TABLE IF NOT EXISTS challenge_claims (
  user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day       DATE NOT NULL,
  challenge TEXT NOT NULL,
  xp        INT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day, challenge)
);
CREATE TABLE IF NOT EXISTS near_deposits (
  tx_hash    TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  yocto      NUMERIC(40,0) NOT NULL,
  credited   NUMERIC(20,6) NOT NULL,
  demo       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS near_withdrawals (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_account TEXT NOT NULL,
  amount     NUMERIC(20,6) NOT NULL,
  status     TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  tx_hash    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Privy login: users may exist before a NEAR account is linked.
ALTER TABLE users ADD COLUMN IF NOT EXISTS privy_did TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ALTER COLUMN near_account DROP NOT NULL;

-- On-chain mode: Called markets mirror a market in the NEAR contract; trades carry their tx hash.
ALTER TABLE markets ADD COLUMN IF NOT EXISTS chain_market_id TEXT;
ALTER TABLE play_trades ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE play_positions ADD COLUMN IF NOT EXISTS chain_redeemed BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS faucet_claims (
  id      BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount  NUMERIC(20,6) NOT NULL,
  ts      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS faucet_claims_user ON faucet_claims (user_id, ts DESC);

-- ===== RAID social: posts on raids and coins, demo labelling =====
ALTER TABLE posts ADD COLUMN IF NOT EXISTS raid_id BIGINT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS coin TEXT CHECK (coin IS NULL OR coin ~ '^[A-Z0-9]{2,12}$');
CREATE INDEX IF NOT EXISTS posts_raid ON posts (raid_id, created_at DESC) WHERE raid_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_coin ON posts (coin, created_at DESC) WHERE coin IS NOT NULL;
-- Seeded demo accounts are flagged so the app can label them; they are never shown as real people.
ALTER TABLE users ADD COLUMN IF NOT EXISTS demo BOOLEAN NOT NULL DEFAULT false;

-- ===== RAID reels: short vertical videos (or X / Instagram / TikTok links) that market a coin or a raid =====
CREATE TABLE IF NOT EXISTS reels (
  id          BIGSERIAL PRIMARY KEY,
  author_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('video','embed')),
  video_file  TEXT,
  embed_url   TEXT,
  provider    TEXT,
  caption     TEXT NOT NULL DEFAULT '',
  coin        TEXT,
  raid_id     BIGINT,
  launch_id   BIGINT,
  duration_s  REAL,
  demo        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reels_created ON reels (created_at DESC, id DESC);
-- Off-chain attribution (demo): a back on the chest that came through a reel. The tx is checked on NEAR RPC before it counts.
CREATE TABLE IF NOT EXISTS reel_backs (
  tx          TEXT PRIMARY KEY,
  reel_id     BIGINT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  raid_id     BIGINT NOT NULL,
  backer      TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  demo        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reel_backs_reel ON reel_backs (reel_id);
