//! RAID war chest.
//!
//! A raid is a public call: "buy TARGET, sell automatically once it is worth TARGET_X times what we paid".
//! Backers send USDC; the chest keeps everything inside NEAR Intents (intents.near) under its own account.
//!
//! Nobody holds a key that can move the chest's funds:
//! * Swaps go through 1Click. Anyone (a "keeper") may hand the contract a 1Click quote; the contract
//!   checks 1Click's ed25519 signature on it (pinned public key) and every field that matters
//!   (assets, amount, recipient = this contract, refund = this contract, min-out >= the raid's rule,
//!   freshness) before it moves funds to the quote's deposit account with `mt_transfer` on intents.near.
//!   intents.near authorises that call because the predecessor is the chest itself.
//! * Chain Signatures path (optional, `mpc_*`): the contract registers a key derived by the MPC
//!   network (`v1.signer`, EdDSA domain 1) on intents.near and only ever asks MPC to sign
//!   `raw_ed25519` token_diff intents that the contract builds itself, with min-out baked in.
//!
//! Rules are fixed at init. There is no owner method that can withdraw funds.

use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::serde_json::{self, json, Value};
use near_sdk::store::{IterableMap, LookupMap};
use near_sdk::{
    env, ext_contract, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault,
    Promise, PromiseError, PromiseOrValue,
};

mod rules;
pub use rules::*;

const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);
const GAS_TRANSFER: Gas = Gas::from_tgas(30);
const GAS_VIEW: Gas = Gas::from_tgas(10);
const GAS_CB: Gas = Gas::from_tgas(15);
const GAS_SIGN: Gas = Gas::from_tgas(15);
const MAX_QUOTE_AGE_MS: u64 = 10 * 60 * 1000;

#[derive(BorshStorageKey)]
#[near]
enum Key {
    Raids,
    Stakes,
    Accounted,
    Inflight,
    Claimable,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum Status {
    /// Collecting backers.
    Open,
    /// USDC sent to a 1Click deposit account; waiting for the target to land.
    Buying,
    /// Holding the trophy.
    Held,
    /// Trophy sent to a 1Click deposit account; waiting for USDC.
    Selling,
    /// Done. `hit` says whether the target multiple was reached.
    Closed,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Raid {
    pub id: u64,
    pub caller: AccountId,
    pub title: String,
    /// Intents asset id, e.g. "nep141:eth-0x6982...omft.near" (PEPE).
    pub target: String,
    /// Sell line as basis points of the entry cost: 15000 = 1.5x, 20000 = 2x, 30000 = 3x.
    pub target_x_bps: u32,
    pub opens_until_ms: u64,
    pub retreat_at_ms: u64,
    pub pot: U128,
    pub entry_cost: U128,
    pub held: U128,
    pub proceeds: U128,
    pub pending_min_out: U128,
    pub pending_deadline_ms: u64,
    pub status: Status,
    pub hit: bool,
    pub buy_quote_hash: Option<String>,
    pub sell_quote_hash: Option<String>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Config {
    pub intents: AccountId,
    pub usdc: AccountId,
    pub mpc: AccountId,
    /// 1Click quote-signing key, "ed25519:<base58>".
    pub oneclick_key: String,
    pub caller_fee_bps: u32,
    pub buyback_bps: u32,
    pub min_back: U128,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Chest {
    cfg: Config,
    raids: IterableMap<u64, Raid>,
    next_id: u64,
    stakes: LookupMap<(u64, AccountId), u128>,
    /// Per intents token id: how much of our intents.near balance is already attributed to raids/buckets.
    accounted: LookupMap<String, u128>,
    /// One swap in flight per token so balance deltas are attributable.
    inflight: LookupMap<String, u64>,
    claimable: LookupMap<AccountId, u128>,
    buyback_bucket: u128,
    mpc_public_key: Option<String>,
    mpc_registered: bool,
    mpc_nonce_counter: u64,
    last_mpc_signed: Option<SignedIntent>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct SignedIntent {
    pub standard: String,
    pub payload: String,
    pub public_key: String,
    pub signature: String,
}

#[derive(Deserialize, Serialize)]
#[serde(crate = "near_sdk::serde")]
struct BackMsg {
    back: u64,
}

#[ext_contract(ext_ft)]
#[allow(dead_code)]
trait Ft {
    fn ft_transfer_call(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>, msg: String);
}

#[ext_contract(ext_intents)]
#[allow(dead_code)]
trait Intents {
    fn mt_transfer(&mut self, receiver_id: AccountId, token_id: String, amount: U128, approval: Option<(AccountId, u64)>, memo: Option<String>);
    fn mt_balance_of(&self, account_id: AccountId, token_id: String) -> U128;
    fn ft_withdraw(&mut self, token: AccountId, receiver_id: AccountId, amount: U128, memo: Option<String>, msg: Option<String>);
    fn add_public_key(&mut self, public_key: String);
    fn current_salt(&self) -> String;
}

#[ext_contract(ext_mpc)]
#[allow(dead_code)]
trait Mpc {
    fn derived_public_key(&self, path: String, predecessor: AccountId, domain_id: u32) -> String;
    fn sign(&mut self, request: Value) -> Value;
}

#[ext_contract(ext_self)]
#[allow(dead_code)]
trait SelfCb {
    fn on_balance(&mut self, id: u64, token: String, phase: String);
    fn on_derived_key(&mut self);
    fn on_key_registered(&mut self);
    fn on_salt(&mut self, id: u64, min_out: U128);
    fn on_mpc_signed(&mut self, payload: String);
}

#[near]
impl Chest {
    #[init]
    pub fn new(cfg: Config) -> Self {
        require!(cfg.caller_fee_bps + cfg.buyback_bps <= 5000, "fees too high");
        parse_ed25519_key(&cfg.oneclick_key);
        Self {
            cfg,
            raids: IterableMap::new(Key::Raids),
            next_id: 0,
            stakes: LookupMap::new(Key::Stakes),
            accounted: LookupMap::new(Key::Accounted),
            inflight: LookupMap::new(Key::Inflight),
            claimable: LookupMap::new(Key::Claimable),
            buyback_bucket: 0,
            mpc_public_key: None,
            mpc_registered: false,
            mpc_nonce_counter: 0,
            last_mpc_signed: None,
        }
    }

    // ---------- calling and backing ----------

    /// Anyone can call a raid. The caller earns `caller_fee_bps` of the profit, paid only if the target is hit.
    pub fn call_raid(&mut self, title: String, target: String, target_x_bps: u32, open_minutes: u32, retreat_hours: u32) -> u64 {
        require!(title.len() <= 140, "title too long");
        require!(target.starts_with("nep141:") || target.starts_with("nep245:"), "target must be an intents asset id");
        require!(target != self.usdc_asset(), "cannot raid the war chest's own coin");
        require!([15000, 20000, 30000].contains(&target_x_bps), "target must be 1.5x, 2x or 3x");
        require!((1..=24 * 60).contains(&open_minutes), "open window 1 min - 24 h");
        require!((1..=24 * 28).contains(&retreat_hours), "retreat 1 h - 28 days");
        let now = now_ms();
        let id = self.next_id;
        self.next_id += 1;
        let opens_until_ms = now + open_minutes as u64 * 60_000;
        let raid = Raid {
            id,
            caller: env::predecessor_account_id(),
            title,
            target,
            target_x_bps,
            opens_until_ms,
            retreat_at_ms: opens_until_ms + retreat_hours as u64 * 3_600_000,
            pot: U128(0),
            entry_cost: U128(0),
            held: U128(0),
            proceeds: U128(0),
            pending_min_out: U128(0),
            pending_deadline_ms: 0,
            status: Status::Open,
            hit: false,
            buy_quote_hash: None,
            sell_quote_hash: None,
        };
        log_event("raid_called", json!({"id": id, "caller": raid.caller, "target": raid.target, "target_x_bps": target_x_bps}));
        self.raids.insert(id, raid);
        id
    }

    /// NEP-141 receiver: back a raid with USDC. msg = {"back": <raid id>}.
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        require!(env::predecessor_account_id() == self.cfg.usdc, "only USDC");
        let m: BackMsg = serde_json::from_str(&msg).unwrap_or_else(|_| env::panic_str("msg must be {\"back\": id}"));
        require!(amount.0 >= self.cfg.min_back.0, "below minimum");
        let mut raid = self.raid_or_panic(m.back);
        require!(raid.status == Status::Open && now_ms() < raid.opens_until_ms, "raid not open");
        raid.pot = U128(raid.pot.0 + amount.0);
        let k = (m.back, sender_id.clone());
        let s = self.stakes.get(&k).copied().unwrap_or(0);
        self.stakes.insert(k, s + amount.0);
        self.raids.insert(m.back, raid);
        let usdc = self.usdc_asset();
        self.add_accounted(&usdc, amount.0);
        log_event("raid_backed", json!({"id": m.back, "backer": sender_id, "amount": amount}));
        // Move it into NEAR Intents under the chest's own account (msg "" = credit the sender, i.e. us).
        ext_ft::ext(self.cfg.usdc.clone())
            .with_attached_deposit(ONE_YOCTO)
            .with_static_gas(GAS_TRANSFER)
            .ft_transfer_call(self.cfg.intents.clone(), amount, None, String::new())
            .detach();
        PromiseOrValue::Value(U128(0))
    }

    // ---------- 1Click path (no key) ----------

    /// Keeper hands in a signed 1Click quote (the exact json-stable-stringify string 1Click signed).
    pub fn execute_buy(&mut self, id: u64, signed_json: String, signature: String) -> Promise {
        let mut raid = self.raid_or_panic(id);
        require!(raid.status == Status::Open, "raid not open");
        require!(now_ms() >= raid.opens_until_ms || raid.pot.0 > 0, "nothing to buy");
        require!(raid.pot.0 > 0, "empty pot");
        let usdc = self.usdc_asset();
        let q = self.check_quote_inner(&signed_json, &signature, &usdc, &raid.target, raid.pot.0, 1);
        self.lock_inflight(&raid.target, id);
        raid.status = Status::Buying;
        raid.pending_min_out = U128(q.min_amount_out);
        raid.pending_deadline_ms = q.deadline_ms;
        raid.buy_quote_hash = Some(q.hash.clone());
        raid.entry_cost = U128(raid.pot.0);
        self.sub_accounted(&usdc, raid.pot.0);
        self.raids.insert(id, raid.clone());
        log_event("raid_buy", json!({"id": id, "deposit": q.deposit_address, "amount_in": raid.pot, "min_out": raid.pending_min_out, "quote": q.hash}));
        self.send_into_quote(q.deposit_address, usdc, raid.pot.0)
    }

    /// Sell the trophy. Before retreat: min-out must be >= entry_cost * target_x. After retreat: any fill.
    pub fn execute_sell(&mut self, id: u64, signed_json: String, signature: String) -> Promise {
        let mut raid = self.raid_or_panic(id);
        require!(raid.status == Status::Held, "not holding");
        let floor = if now_ms() < raid.retreat_at_ms { mul_bps(raid.entry_cost.0, raid.target_x_bps) } else { 1 };
        let usdc = self.usdc_asset();
        let q = self.check_quote_inner(&signed_json, &signature, &raid.target, &usdc, raid.held.0, floor);
        self.lock_inflight(&usdc, id);
        raid.status = Status::Selling;
        raid.pending_min_out = U128(q.min_amount_out);
        raid.pending_deadline_ms = q.deadline_ms;
        raid.sell_quote_hash = Some(q.hash.clone());
        self.sub_accounted(&raid.target, raid.held.0);
        self.raids.insert(id, raid.clone());
        log_event("raid_sell", json!({"id": id, "deposit": q.deposit_address, "amount_in": raid.held, "min_out": raid.pending_min_out, "floor": U128(floor)}));
        self.send_into_quote(q.deposit_address, raid.target.clone(), raid.held.0)
    }

    /// Anyone: read our intents.near balance and attribute what arrived to the in-flight raid.
    pub fn settle(&mut self, id: u64) -> Promise {
        let raid = self.raid_or_panic(id);
        let (token, phase) = match raid.status {
            Status::Buying => (raid.target.clone(), "buy"),
            Status::Selling => (self.usdc_asset(), "sell"),
            _ => env::panic_str("nothing to settle"),
        };
        ext_intents::ext(self.cfg.intents.clone())
            .with_static_gas(GAS_VIEW)
            .mt_balance_of(env::current_account_id(), token.clone())
            .then(ext_self::ext(env::current_account_id()).with_static_gas(GAS_CB).on_balance(id, token, phase.to_string()))
    }

    #[private]
    pub fn on_balance(&mut self, id: u64, token: String, phase: String, #[callback_result] bal: Result<U128, PromiseError>) -> String {
        let bal = match bal { Ok(b) => b.0, Err(_) => return "balance read failed".into() };
        let accounted = self.accounted.get(&token).copied().unwrap_or(0);
        let arrived = bal.saturating_sub(accounted);
        let mut raid = self.raid_or_panic(id);
        if arrived == 0 {
            // Not filled yet. If the quote expired long ago, the swap was refunded in the input asset.
            if now_ms() > raid.pending_deadline_ms + 30 * 60_000 {
                self.inflight.remove(&token);
                if phase == "buy" {
                    let usdc = self.usdc_asset();
                    self.add_accounted(&usdc, raid.entry_cost.0);
                    raid.status = Status::Open;
                    raid.entry_cost = U128(0);
                } else {
                    let t = raid.target.clone();
                    self.add_accounted(&t, raid.held.0);
                    raid.status = Status::Held;
                }
                self.raids.insert(id, raid);
                return "expired: back to previous state".into();
            }
            return "not filled yet".into();
        }
        self.add_accounted(&token, arrived);
        self.inflight.remove(&token);
        if phase == "buy" {
            raid.held = U128(arrived);
            raid.status = Status::Held;
            log_event("raid_trophy", json!({"id": id, "target": raid.target, "amount": U128(arrived), "cost_usdc": raid.entry_cost}));
        } else {
            raid.proceeds = U128(arrived);
            raid.hit = arrived >= mul_bps(raid.entry_cost.0, raid.target_x_bps);
            raid.status = Status::Closed;
            self.distribute(&raid);
            log_event("raid_closed", json!({"id": id, "proceeds": raid.proceeds, "hit": raid.hit}));
        }
        self.raids.insert(id, raid);
        "settled".into()
    }

    /// Backer or caller withdraws their USDC share out of NEAR Intents to their NEAR account.
    pub fn claim(&mut self) -> Promise {
        let who = env::predecessor_account_id();
        let amt = self.claimable.get(&who).copied().unwrap_or(0);
        require!(amt > 0, "nothing to claim");
        self.claimable.remove(&who);
        let usdc = self.usdc_asset();
        self.sub_accounted(&usdc, amt);
        ext_intents::ext(self.cfg.intents.clone())
            .with_attached_deposit(ONE_YOCTO)
            .with_static_gas(GAS_TRANSFER)
            .ft_withdraw(self.cfg.usdc.clone(), who, U128(amt), Some("RAID loot".into()), None)
    }

    /// Pure check, useful for the UI and for testnet: does this 1Click quote pass the chest's rules?
    pub fn check_quote(&self, signed_json: String, signature: String, origin: String, destination: String, amount_in: U128, min_out_floor: U128) -> Value {
        let q = self.check_quote_inner(&signed_json, &signature, &origin, &destination, amount_in.0, min_out_floor.0);
        json!({"ok": true, "deposit_address": q.deposit_address, "min_amount_out": U128(q.min_amount_out), "deadline_ms": q.deadline_ms, "hash": q.hash})
    }

    /// Signature-only check (works with dry quotes too; used to prove on-chain verification of real 1Click signatures).
    pub fn verify_oneclick_signature(&self, signed_json: String, signature: String) -> bool {
        verify_quote_sig(&signed_json, &signature, &self.cfg.oneclick_key)
    }

    // ---------- Chain Signatures path ----------

    /// Step 1 (anyone): ask v1.signer for the chest's EdDSA key (path "raid-chest", domain 1).
    pub fn mpc_bootstrap(&mut self) -> Promise {
        ext_mpc::ext(self.cfg.mpc.clone())
            .with_static_gas(GAS_VIEW)
            .derived_public_key(MPC_PATH.into(), env::current_account_id(), 1)
            .then(ext_self::ext(env::current_account_id()).with_static_gas(GAS_CB).on_derived_key())
    }

    #[private]
    pub fn on_derived_key(&mut self, #[callback_result] pk: Result<String, PromiseError>) -> String {
        let pk = pk.unwrap_or_else(|_| env::panic_str("derived_public_key failed"));
        require!(pk.starts_with("ed25519:"), "expected ed25519 key");
        self.mpc_public_key = Some(pk.clone());
        pk
    }

    /// Step 2 (anyone, mainnet): register the MPC key on intents.near for this account.
    pub fn mpc_register(&mut self) -> Promise {
        let pk = self.mpc_public_key.clone().unwrap_or_else(|| env::panic_str("bootstrap first"));
        ext_intents::ext(self.cfg.intents.clone())
            .with_attached_deposit(ONE_YOCTO)
            .with_static_gas(GAS_TRANSFER)
            .add_public_key(pk)
            .then(ext_self::ext(env::current_account_id()).with_static_gas(GAS_CB).on_key_registered())
    }

    #[private]
    pub fn on_key_registered(&mut self, #[callback_result] r: Result<(), PromiseError>) -> bool {
        self.mpc_registered = r.is_ok();
        self.mpc_registered
    }

    /// Ask MPC to sign a token_diff intent the CONTRACT builds for a raid buy: -pot USDC, +min_out target.
    /// The keeper only supplies min_out, which must still satisfy `min_out >= floor` checks done off-chain by quotes;
    /// on-chain we require min_out > 0 and record it. Salt is read from intents.near when it exists; otherwise "00000000".
    pub fn mpc_sign_buy(&mut self, id: u64, min_out: U128, salt_hex: Option<String>) -> Promise {
        let raid = self.raid_or_panic(id);
        require!(raid.status == Status::Open && raid.pot.0 > 0, "raid not ready");
        require!(min_out.0 > 0, "min_out must be > 0");
        let payload = self.build_token_diff_payload(&raid.target, raid.pot.0, min_out.0, salt_hex.as_deref().unwrap_or("00000000"));
        self.request_mpc_signature(payload)
    }

    /// Probe for testing the MPC signature against the REAL mainnet verifier with a free `simulate_intents` view:
    /// signs a token_diff whose signer is the implicit intents account of the MPC key itself (no registration needed).
    /// The payload is fixed by the contract (1 unit of USDC for 1 unit of the target); it can never move chest funds.
    pub fn mpc_sign_probe(&mut self, verifying_contract: AccountId, salt_hex: String) -> Promise {
        let pk = parse_ed25519_key(self.mpc_public_key.as_deref().unwrap_or_else(|| env::panic_str("bootstrap first")));
        let implicit: String = pk.iter().map(|b| format!("{:02x}", b)).collect();
        self.mpc_nonce_counter += 1;
        let nonce = make_nonce(&salt_hex, &env::random_seed(), self.mpc_nonce_counter);
        let payload = json!({
            "signer_id": implicit,
            "verifying_contract": verifying_contract,
            "deadline": iso8601_from_ms(now_ms() + 60 * 60_000),
            "nonce": nonce,
            "intents": [{"intent": "token_diff", "diff": {"nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1": "-1", "nep141:wrap.near": "1"}}]
        }).to_string();
        self.request_mpc_signature(payload)
    }

    #[private]
    pub fn on_mpc_signed(&mut self, payload: String, #[callback_result] r: Result<Value, PromiseError>) -> Option<SignedIntent> {
        let v = match r { Ok(v) => v, Err(_) => { log_event("mpc_sign_failed", json!({})); return None } };
        let sig_bytes: Vec<u8> = v.get("signature").and_then(|s| serde_json::from_value(s.clone()).ok())
            .unwrap_or_else(|| env::panic_str("unexpected MPC response"));
        require!(sig_bytes.len() == 64, "bad signature length");
        let signed = SignedIntent {
            standard: "raw_ed25519".into(),
            payload,
            public_key: self.mpc_public_key.clone().unwrap_or_default(),
            signature: format!("ed25519:{}", bs58::encode(&sig_bytes).into_string()),
        };
        log_event("mpc_signed", json!({"payload": signed.payload, "signature": signed.signature}));
        self.last_mpc_signed = Some(signed.clone());
        Some(signed)
    }

    // ---------- views ----------
    pub fn get_config(&self) -> Config { self.cfg.clone() }
    pub fn get_raid(&self, id: u64) -> Option<Raid> { self.raids.get(&id).cloned() }
    pub fn list_raids(&self, from: Option<u64>, limit: Option<u64>) -> Vec<Raid> {
        let from = from.unwrap_or(0);
        (from..self.next_id).take(limit.unwrap_or(50) as usize).filter_map(|i| self.raids.get(&i).cloned()).collect()
    }
    pub fn get_stake(&self, id: u64, account_id: AccountId) -> U128 { U128(self.stakes.get(&(id, account_id)).copied().unwrap_or(0)) }
    pub fn get_claimable(&self, account_id: AccountId) -> U128 { U128(self.claimable.get(&account_id).copied().unwrap_or(0)) }
    pub fn get_buyback_bucket(&self) -> U128 { U128(self.buyback_bucket) }
    pub fn get_mpc(&self) -> Value { json!({"public_key": self.mpc_public_key, "registered": self.mpc_registered, "last_signed": self.last_mpc_signed}) }
}

// ---------- internals ----------
impl Chest {
    fn usdc_asset(&self) -> String { format!("nep141:{}", self.cfg.usdc) }

    fn raid_or_panic(&self, id: u64) -> Raid { self.raids.get(&id).cloned().unwrap_or_else(|| env::panic_str("no such raid")) }

    fn add_accounted(&mut self, token: &str, amt: u128) {
        let v = self.accounted.get(token).copied().unwrap_or(0);
        self.accounted.insert(token.to_string(), v + amt);
    }
    fn sub_accounted(&mut self, token: &str, amt: u128) {
        let v = self.accounted.get(token).copied().unwrap_or(0);
        self.accounted.insert(token.to_string(), v.saturating_sub(amt));
    }
    fn lock_inflight(&mut self, token: &str, id: u64) {
        require!(!self.inflight.contains_key(token), "another swap of this token is in flight");
        self.inflight.insert(token.to_string(), id);
    }

    fn check_quote_inner(&self, signed_json: &str, signature: &str, origin: &str, destination: &str, amount_in: u128, min_out_floor: u128) -> CheckedQuote {
        require!(verify_quote_sig(signed_json, signature, &self.cfg.oneclick_key), "bad 1Click signature");
        let me = env::current_account_id().to_string();
        check_quote_fields(signed_json, &me, origin, destination, amount_in, min_out_floor, now_ms(), MAX_QUOTE_AGE_MS)
            .unwrap_or_else(|e| env::panic_str(&e))
    }

    fn send_into_quote(&self, deposit: String, token: String, amount: u128) -> Promise {
        let receiver: AccountId = deposit.parse().unwrap_or_else(|_| env::panic_str("deposit address is not a NEAR account id"));
        ext_intents::ext(self.cfg.intents.clone())
            .with_attached_deposit(ONE_YOCTO)
            .with_static_gas(GAS_TRANSFER)
            .mt_transfer(receiver, token, U128(amount), None, Some("RAID".into()))
    }

    fn distribute(&mut self, raid: &Raid) {
        let proceeds = raid.proceeds.0;
        let cost = raid.entry_cost.0;
        let profit = proceeds.saturating_sub(cost);
        let (caller_cut, buyback) = if raid.hit { (mul_bps(profit, self.cfg.caller_fee_bps), mul_bps(profit, self.cfg.buyback_bps)) } else { (0, 0) };
        if caller_cut > 0 { let c = self.claimable.get(&raid.caller).copied().unwrap_or(0); self.claimable.insert(raid.caller.clone(), c + caller_cut); }
        self.buyback_bucket += buyback;
        let for_backers = proceeds - caller_cut - buyback;
        // Backers pull their pro-rata share with `claim_share` (stakes are keyed by (raid, account)).
        log_event("raid_pool", json!({"id": raid.id, "for_backers": U128(for_backers), "pot": raid.pot, "caller_cut": U128(caller_cut), "buyback": U128(buyback)}));
    }

    fn build_token_diff_payload(&mut self, target: &str, amount_in: u128, min_out: u128, salt_hex: &str) -> String {
        self.mpc_nonce_counter += 1;
        let nonce = make_nonce(salt_hex, &env::random_seed(), self.mpc_nonce_counter);
        let deadline = iso8601_from_ms(now_ms() + 5 * 60_000);
        let mut diff = serde_json::Map::new();
        diff.insert(self.usdc_asset(), Value::String(format!("-{}", amount_in)));
        diff.insert(target.to_string(), Value::String(min_out.to_string()));
        json!({
            "signer_id": env::current_account_id(),
            "verifying_contract": self.cfg.intents,
            "deadline": deadline,
            "nonce": nonce,
            "intents": [{"intent": "token_diff", "diff": Value::Object(diff)}]
        }).to_string()
    }

    fn request_mpc_signature(&self, payload: String) -> Promise {
        require!(self.mpc_public_key.is_some(), "mpc_bootstrap first");
        require!(payload.len() <= 1232, "payload too large for MPC EdDSA");
        let hex: String = payload.as_bytes().iter().map(|b| format!("{:02x}", b)).collect();
        let req = json!({"path": MPC_PATH, "payload_v2": {"Eddsa": hex}, "domain_id": 1});
        ext_mpc::ext(self.cfg.mpc.clone())
            .with_attached_deposit(ONE_YOCTO)
            .with_static_gas(GAS_SIGN)
            .sign(req)
            .then(ext_self::ext(env::current_account_id()).with_static_gas(GAS_CB).on_mpc_signed(payload))
    }
}

#[near]
impl Chest {
    /// Backer pulls their pro-rata share of a closed raid into `claimable`.
    pub fn claim_share(&mut self, id: u64) -> U128 {
        let raid = self.raid_or_panic(id);
        require!(raid.status == Status::Closed, "raid not closed");
        let who = env::predecessor_account_id();
        let k = (id, who.clone());
        let stake = self.stakes.get(&k).copied().unwrap_or(0);
        require!(stake > 0, "no stake");
        self.stakes.remove(&k);
        let profit = raid.proceeds.0.saturating_sub(raid.entry_cost.0);
        let (caller_cut, buyback) = if raid.hit { (mul_bps(profit, self.cfg.caller_fee_bps), mul_bps(profit, self.cfg.buyback_bps)) } else { (0, 0) };
        let for_backers = raid.proceeds.0 - caller_cut - buyback;
        let share = for_backers * stake / raid.pot.0;
        let c = self.claimable.get(&who).copied().unwrap_or(0);
        self.claimable.insert(who, c + share);
        U128(share)
    }
}

fn now_ms() -> u64 { env::block_timestamp_ms() }

fn log_event(event: &str, data: Value) {
    env::log_str(&format!("EVENT_JSON:{}", json!({"standard": "raid", "version": "1.0.0", "event": event, "data": [data]})));
}

#[cfg(test)]
mod tests;
