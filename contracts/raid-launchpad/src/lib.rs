//! RAID lean launchpad (testnet).
//!
//! Anyone creates a memecoin. Every coin starts on the same constant-product bonding curve priced in USDC
//! (pump.fun style virtual reserves): price only moves with buys and sells, nobody can pre-mint, and the
//! creator gets nothing up front. 1% of each trade goes to the coin's creator, claimable in USDC.
//! When 80% of supply has been sold the coin "graduates": the curve stops trading and the remaining 20%
//! is reserved for a DEX pool (Rhea). Pool seeding is not implemented yet; the README says so.
//!
//! Coins live in this contract's ledger (one contract, many coins) to keep testnet costs low.
//! There is no owner and no withdraw method for the USDC that backs the curves.

use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::serde_json::{self, json, Value};
use near_sdk::store::{IterableMap, LookupMap};
use near_sdk::{env, ext_contract, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise, PromiseError, PromiseOrValue};

pub const DECIMALS: u8 = 6;
pub const UNIT: u128 = 1_000_000;
pub const TOTAL_SUPPLY: u128 = 1_000_000_000 * UNIT;
pub const CURVE_SUPPLY: u128 = 800_000_000 * UNIT;
pub const VIRTUAL_TOKENS: u128 = 1_073_000_000 * UNIT;
pub const FEE_BPS: u128 = 100;
pub const CREATE_DEPOSIT: NearToken = NearToken::from_millinear(50);
const GAS_FT: Gas = Gas::from_tgas(10);
const GAS_CB: Gas = Gas::from_tgas(10);
const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);

#[derive(BorshStorageKey)]
#[near]
enum Key { Coins, Balances, Tickers, Fees }

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Coin {
    pub id: u64,
    pub creator: AccountId,
    pub name: String,
    pub ticker: String,
    pub description: String,
    pub image: Option<String>,
    pub created_ms: u64,
    /// Curve state (virtual + real reserves).
    pub v_usdc: U128,
    pub v_tokens: U128,
    /// Real USDC in the curve and tokens sold so far.
    pub raised: U128,
    pub sold: U128,
    pub trades: u64,
    pub graduated: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(crate = "near_sdk::serde")]
struct BuyMsg { buy: u64, min_out: Option<U128> }

#[ext_contract(ext_ft)]
#[allow(dead_code)]
trait Ft { fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>); }

#[ext_contract(ext_self)]
#[allow(dead_code)]
trait SelfCb {
    fn on_sell_paid(&mut self, id: u64, seller: AccountId, amount: U128, gross: U128, fee: U128);
    fn on_fees_paid(&mut self, who: AccountId, amount: U128);
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Launchpad {
    usdc: AccountId,
    virtual_usdc: u128,
    coins: IterableMap<u64, Coin>,
    next_id: u64,
    balances: LookupMap<(u64, AccountId), u128>,
    tickers: LookupMap<String, u64>,
    fees: LookupMap<AccountId, u128>,
}

/// Tokens out for `usdc_in` (after fee) on a curve with reserves (v_usdc, v_tokens).
pub fn curve_out(v_usdc: u128, v_tokens: u128, usdc_in: u128) -> u128 { v_tokens * usdc_in / (v_usdc + usdc_in) }
/// USDC out (before fee) for selling `tokens_in`.
pub fn curve_back(v_usdc: u128, v_tokens: u128, tokens_in: u128) -> u128 { v_usdc * tokens_in / (v_tokens + tokens_in) }
pub fn fee_of(x: u128) -> u128 { x * FEE_BPS / 10_000 }

#[near]
impl Launchpad {
    #[init]
    pub fn new(usdc: AccountId, virtual_usdc: U128) -> Self {
        require!(virtual_usdc.0 >= 10 * UNIT, "virtual reserve too small");
        Self { usdc, virtual_usdc: virtual_usdc.0, coins: IterableMap::new(Key::Coins), next_id: 0, balances: LookupMap::new(Key::Balances), tickers: LookupMap::new(Key::Tickers), fees: LookupMap::new(Key::Fees) }
    }

    /// Create a coin. Attach 0.05 NEAR for storage. Nothing is minted to the creator: they buy on the curve like everyone else.
    #[payable]
    pub fn create_coin(&mut self, name: String, ticker: String, description: String, image: Option<String>) -> u64 {
        require!(env::attached_deposit() >= CREATE_DEPOSIT, "attach 0.05 NEAR for storage");
        let name = name.trim().to_string();
        require!((1..=32).contains(&name.chars().count()), "name 1-32 characters");
        require!((2..=10).contains(&ticker.len()) && ticker.chars().all(|c| c.is_ascii_uppercase() || c.is_ascii_digit()), "ticker 2-10 of A-Z 0-9");
        require!(description.chars().count() <= 280, "description up to 280 characters");
        if let Some(i) = &image { require!(i.len() <= 300 && (i.starts_with("https://") || i.starts_with("ipfs://")), "image must be an https or ipfs url"); }
        require!(!self.tickers.contains_key(&ticker), "ticker taken");
        let id = self.next_id;
        self.next_id += 1;
        let coin = Coin { id, creator: env::predecessor_account_id(), name, ticker: ticker.clone(), description, image, created_ms: env::block_timestamp_ms(),
            v_usdc: U128(self.virtual_usdc), v_tokens: U128(VIRTUAL_TOKENS), raised: U128(0), sold: U128(0), trades: 0, graduated: false };
        log_event("coin_created", json!({"id": id, "creator": coin.creator, "ticker": ticker, "name": coin.name}));
        self.tickers.insert(ticker, id);
        self.coins.insert(id, coin);
        id
    }

    /// Buy: send USDC with ft_transfer_call, msg = {"buy": id, "min_out": "..."}. Unused USDC is refunded.
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        require!(env::predecessor_account_id() == self.usdc, "only USDC");
        let m: BuyMsg = serde_json::from_str(&msg).unwrap_or_else(|_| env::panic_str("msg must be {\"buy\": id}"));
        let mut c = self.coin_or_panic(m.buy);
        require!(!c.graduated, "coin graduated: the curve is closed");
        let fee = fee_of(amount.0);
        let mut net = amount.0 - fee;
        let mut out = curve_out(c.v_usdc.0, c.v_tokens.0, net);
        let left = CURVE_SUPPLY - c.sold.0;
        let mut used = amount.0;
        if out >= left {
            // Last buy: take only what fills the curve, refund the rest.
            out = left;
            net = c.v_usdc.0 * out / (c.v_tokens.0 - out) + 1;
            let fee2 = fee_of(net);
            used = (net + fee2).min(amount.0);
            net = used - fee2;
            c.graduated = true;
        }
        require!(out > 0, "amount too small");
        if let Some(mo) = m.min_out { require!(out >= mo.0, "price moved: below your min_out"); }
        let fee = used - net;
        c.v_usdc = U128(c.v_usdc.0 + net);
        c.v_tokens = U128(c.v_tokens.0 - out);
        c.raised = U128(c.raised.0 + net);
        c.sold = U128(c.sold.0 + out);
        c.trades += 1;
        self.add_bal(m.buy, &sender_id, out);
        self.add_fee(&c.creator.clone(), fee);
        log_event("trade", json!({"id": m.buy, "side": "buy", "account": sender_id, "usdc": U128(used), "tokens": U128(out), "price_e12": U128(price_e12(&c))}));
        if c.graduated { log_event("graduated", json!({"id": m.buy, "raised": c.raised})); }
        self.coins.insert(m.buy, c);
        PromiseOrValue::Value(U128(amount.0 - used))
    }

    /// Sell back to the curve. Pays USDC minus 1%.
    pub fn sell(&mut self, id: u64, amount: U128, min_out: Option<U128>) -> Promise {
        let who = env::predecessor_account_id();
        let mut c = self.coin_or_panic(id);
        require!(!c.graduated, "coin graduated: the curve is closed");
        let bal = self.bal(id, &who);
        require!(amount.0 > 0 && amount.0 <= bal, "not enough balance");
        let gross = curve_back(c.v_usdc.0, c.v_tokens.0, amount.0).min(c.raised.0);
        let fee = fee_of(gross);
        let out = gross - fee;
        require!(out > 0, "amount too small");
        if let Some(mo) = min_out { require!(out >= mo.0, "price moved: below your min_out"); }
        self.balances.insert((id, who.clone()), bal - amount.0);
        c.v_usdc = U128(c.v_usdc.0 - gross);
        c.v_tokens = U128(c.v_tokens.0 + amount.0);
        c.raised = U128(c.raised.0 - gross);
        c.sold = U128(c.sold.0 - amount.0);
        c.trades += 1;
        log_event("trade", json!({"id": id, "side": "sell", "account": who, "usdc": U128(out), "tokens": amount, "price_e12": U128(price_e12(&c))}));
        self.coins.insert(id, c);
        ext_ft::ext(self.usdc.clone()).with_attached_deposit(ONE_YOCTO).with_static_gas(GAS_FT).ft_transfer(who.clone(), U128(out), Some("RAID launchpad sell".into()))
            .then(ext_self::ext(env::current_account_id()).with_static_gas(GAS_CB).on_sell_paid(id, who, amount, U128(gross), U128(fee)))
    }

    #[private]
    pub fn on_sell_paid(&mut self, id: u64, seller: AccountId, amount: U128, gross: U128, fee: U128, #[callback_result] r: Result<(), PromiseError>) -> bool {
        let mut c = self.coin_or_panic(id);
        if r.is_ok() { self.add_fee(&c.creator.clone(), fee.0); return true; }
        // Payout failed: undo the sale.
        c.v_usdc = U128(c.v_usdc.0 + gross.0);
        c.v_tokens = U128(c.v_tokens.0 - amount.0);
        c.raised = U128(c.raised.0 + gross.0);
        c.sold = U128(c.sold.0 + amount.0);
        self.coins.insert(id, c);
        self.add_bal(id, &seller, amount.0);
        false
    }

    /// Send tokens to another account inside the launchpad ledger.
    pub fn transfer(&mut self, id: u64, receiver_id: AccountId, amount: U128) {
        let who = env::predecessor_account_id();
        let bal = self.bal(id, &who);
        require!(amount.0 > 0 && amount.0 <= bal, "not enough balance");
        self.balances.insert((id, who.clone()), bal - amount.0);
        self.add_bal(id, &receiver_id, amount.0);
        log_event("transfer", json!({"id": id, "from": who, "to": receiver_id, "amount": amount}));
    }

    /// Creator withdraws their trading fees (USDC).
    pub fn claim_fees(&mut self) -> Promise {
        let who = env::predecessor_account_id();
        let amt = self.fees.get(&who).copied().unwrap_or(0);
        require!(amt > 0, "no fees");
        self.fees.remove(&who);
        ext_ft::ext(self.usdc.clone()).with_attached_deposit(ONE_YOCTO).with_static_gas(GAS_FT).ft_transfer(who.clone(), U128(amt), Some("RAID creator fees".into()))
            .then(ext_self::ext(env::current_account_id()).with_static_gas(GAS_CB).on_fees_paid(who, U128(amt)))
    }

    #[private]
    pub fn on_fees_paid(&mut self, who: AccountId, amount: U128, #[callback_result] r: Result<(), PromiseError>) -> bool {
        if r.is_err() { self.add_fee(&who, amount.0); }
        r.is_ok()
    }

    // ---------- views ----------
    pub fn get_config(&self) -> Value { json!({"usdc": self.usdc, "virtual_usdc": U128(self.virtual_usdc), "virtual_tokens": U128(VIRTUAL_TOKENS), "total_supply": U128(TOTAL_SUPPLY), "curve_supply": U128(CURVE_SUPPLY), "fee_bps": FEE_BPS as u32, "decimals": DECIMALS, "create_deposit": CREATE_DEPOSIT.as_yoctonear().to_string()}) }
    pub fn get_coin(&self, id: u64) -> Option<Coin> { self.coins.get(&id).cloned() }
    pub fn list_coins(&self, from: Option<u64>, limit: Option<u64>) -> Vec<Coin> {
        let from = from.unwrap_or(0);
        (from..self.next_id).take(limit.unwrap_or(50).min(100) as usize).filter_map(|i| self.coins.get(&i).cloned()).collect()
    }
    pub fn coin_by_ticker(&self, ticker: String) -> Option<Coin> { self.tickers.get(&ticker).and_then(|i| self.coins.get(i).cloned()) }
    pub fn balance_of(&self, id: u64, account_id: AccountId) -> U128 { U128(self.bal(id, &account_id)) }
    pub fn fees_of(&self, account_id: AccountId) -> U128 { U128(self.fees.get(&account_id).copied().unwrap_or(0)) }
    pub fn quote_buy(&self, id: u64, usdc_in: U128) -> U128 {
        let c = self.coin_or_panic(id);
        U128(curve_out(c.v_usdc.0, c.v_tokens.0, usdc_in.0 - fee_of(usdc_in.0)).min(CURVE_SUPPLY - c.sold.0))
    }
    pub fn quote_sell(&self, id: u64, tokens_in: U128) -> U128 {
        let c = self.coin_or_panic(id);
        let g = curve_back(c.v_usdc.0, c.v_tokens.0, tokens_in.0).min(c.raised.0);
        U128(g - fee_of(g))
    }
}

impl Launchpad {
    fn coin_or_panic(&self, id: u64) -> Coin { self.coins.get(&id).cloned().unwrap_or_else(|| env::panic_str("no such coin")) }
    fn bal(&self, id: u64, a: &AccountId) -> u128 { self.balances.get(&(id, a.clone())).copied().unwrap_or(0) }
    fn add_bal(&mut self, id: u64, a: &AccountId, x: u128) { let b = self.bal(id, a); self.balances.insert((id, a.clone()), b + x); }
    fn add_fee(&mut self, a: &AccountId, x: u128) { if x == 0 { return; } let f = self.fees.get(a).copied().unwrap_or(0); self.fees.insert(a.clone(), f + x); }
}

/// Spot price: USDC per whole token, scaled by 1e12 (both reserves use 6 decimals, so this is v_usdc / v_tokens * 1e12).
pub fn price_e12(c: &Coin) -> u128 { c.v_usdc.0 * 1_000_000_000_000 / c.v_tokens.0 }

fn log_event(event: &str, data: Value) {
    env::log_str(&format!("EVENT_JSON:{}", json!({"standard": "raid_launchpad", "version": "1.0.0", "event": event, "data": [data]})));
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn ctx(pred: AccountId, deposit: NearToken) {
        testing_env!(VMContextBuilder::new().current_account_id("lp.near".parse().unwrap()).predecessor_account_id(pred).attached_deposit(deposit).block_timestamp(1_794_000_000_000_000_000).build());
    }
    fn lp() -> Launchpad { ctx(accounts(0), NearToken::from_yoctonear(0)); Launchpad::new("usdc.near".parse().unwrap(), U128(300 * UNIT)) }
    fn buy(l: &mut Launchpad, who: AccountId, id: u64, amt: u128) -> u128 {
        ctx("usdc.near".parse().unwrap(), NearToken::from_yoctonear(0));
        match l.ft_on_transfer(who, U128(amt), format!(r#"{{"buy":{id}}}"#)) { PromiseOrValue::Value(v) => v.0, _ => panic!() }
    }

    #[test]
    fn create_buy_sell_graduate() {
        let mut l = lp();
        ctx(accounts(1), CREATE_DEPOSIT);
        let id = l.create_coin("Raid Frog".into(), "RFROG".into(), "test coin".into(), None);
        assert_eq!(l.balance_of(id, accounts(1)).0, 0, "creator gets nothing up front");
        let q = l.quote_buy(id, U128(10 * UNIT)).0;
        assert_eq!(buy(&mut l, accounts(2), id, 10 * UNIT), 0);
        assert_eq!(l.balance_of(id, accounts(2)).0, q);
        assert_eq!(l.fees_of(accounts(1)).0, 100_000); // 1% of 10 USDC to the creator
        // an immediate round trip loses the fees both ways
        assert!(l.quote_sell(id, U128(q)).0 < 10 * UNIT);
        let p1 = price_e12(&l.get_coin(id).unwrap());
        buy(&mut l, accounts(3), id, 50 * UNIT);
        assert!(price_e12(&l.get_coin(id).unwrap()) > p1, "price rises with buys");
        assert!(l.quote_sell(id, U128(q)).0 > 10 * UNIT, "early buyer is up after later buys");
        // huge buy fills the curve, refunds the excess and graduates
        let refund = buy(&mut l, accounts(4), id, 5_000 * UNIT);
        let c = l.get_coin(id).unwrap();
        assert!(c.graduated);
        assert_eq!(c.sold.0, CURVE_SUPPLY);
        assert!(refund > 0);
        // raised ~ k / (v_tokens at 80% sold) - virtual: about 879 USDC for a 300 USDC virtual reserve
        assert!(c.raised.0 > 870 * UNIT && c.raised.0 < 890 * UNIT, "raised {}", c.raised.0);
    }

    #[test]
    #[should_panic(expected = "ticker taken")]
    fn unique_ticker() {
        let mut l = lp();
        ctx(accounts(1), CREATE_DEPOSIT);
        l.create_coin("A".into(), "AAA".into(), "".into(), None);
        l.create_coin("B".into(), "AAA".into(), "".into(), None);
    }

    #[test]
    #[should_panic(expected = "attach 0.05 NEAR")]
    fn needs_storage_deposit() {
        let mut l = lp();
        ctx(accounts(1), NearToken::from_yoctonear(0));
        l.create_coin("A".into(), "AAA".into(), "".into(), None);
    }

    #[test]
    fn sell_updates_curve() {
        let mut l = lp();
        ctx(accounts(1), CREATE_DEPOSIT);
        let id = l.create_coin("A".into(), "AAA".into(), "".into(), None);
        buy(&mut l, accounts(2), id, 20 * UNIT);
        let bal = l.balance_of(id, accounts(2)).0;
        let q = l.quote_sell(id, U128(bal / 2)).0;
        ctx(accounts(2), NearToken::from_yoctonear(0));
        let _ = l.sell(id, U128(bal / 2), Some(U128(q)));
        assert_eq!(l.balance_of(id, accounts(2)).0, bal - bal / 2);
        assert_eq!(l.get_coin(id).unwrap().trades, 2);
    }
}
