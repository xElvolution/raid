//! Testnet stand-in for intents.near. NEAR Intents and 1Click run on mainnet only, so this contract
//! implements just the methods the RAID chest uses, with the same names and arguments:
//! * `ft_on_transfer`: a NEP-141 deposit credits the sender (or the account named in `msg`).
//! * `mt_transfer`: moves an internal balance from the caller to `receiver_id` (1 yocto, like intents.near).
//! * `mt_balance_of`: internal balance view.
//! * `ft_withdraw`: sends a NEP-141 balance out to `receiver_id`.
//! * `add_public_key`: accepted and recorded, so the Chain Signatures registration step can run.
//! A solver account plays the 1Click market maker: it receives the chest's input at its deposit
//! account and pays the output back with `mt_transfer`. Prices are set by that solver, not by a market.
use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseOrValue};

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct IntentsSim {
    balances: LookupMap<(AccountId, String), u128>,
    keys: LookupMap<AccountId, Vec<String>>,
}

#[near]
impl IntentsSim {
    #[init]
    pub fn new() -> Self {
        Self { balances: LookupMap::new(b"b".to_vec()), keys: LookupMap::new(b"k".to_vec()) }
    }

    fn bal(&self, a: &AccountId, t: &str) -> u128 { self.balances.get(&(a.clone(), t.to_string())).copied().unwrap_or(0) }
    fn set(&mut self, a: &AccountId, t: &str, v: u128) { self.balances.insert((a.clone(), t.to_string()), v); }

    /// NEP-141 receiver. msg "" credits the sender; msg "<account>" credits that account.
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        let token = format!("nep141:{}", env::predecessor_account_id());
        let who: AccountId = if msg.is_empty() { sender_id } else { msg.parse().unwrap_or_else(|_| env::panic_str("msg must be empty or an account id")) };
        let v = self.bal(&who, &token) + amount.0;
        self.set(&who, &token, v);
        env::log_str(&format!("sim_deposit {} {} {}", who, token, amount.0));
        PromiseOrValue::Value(U128(0))
    }

    #[payable]
    pub fn mt_transfer(&mut self, receiver_id: AccountId, token_id: String, amount: U128, approval: Option<(AccountId, u64)>, memo: Option<String>) {
        let _ = (approval, memo);
        require!(env::attached_deposit() == NearToken::from_yoctonear(1), "attach 1 yocto");
        let from = env::predecessor_account_id();
        let b = self.bal(&from, &token_id);
        require!(b >= amount.0, "insufficient balance");
        self.set(&from, &token_id, b - amount.0);
        let r = self.bal(&receiver_id, &token_id) + amount.0;
        self.set(&receiver_id, &token_id, r);
        env::log_str(&format!("sim_transfer {} -> {} {} {}", from, receiver_id, token_id, amount.0));
    }

    pub fn mt_balance_of(&self, account_id: AccountId, token_id: String) -> U128 { U128(self.bal(&account_id, &token_id)) }

    #[payable]
    pub fn ft_withdraw(&mut self, token: AccountId, receiver_id: AccountId, amount: U128, memo: Option<String>, msg: Option<String>) -> Promise {
        let _ = msg;
        let from = env::predecessor_account_id();
        let t = format!("nep141:{}", token);
        let b = self.bal(&from, &t);
        require!(b >= amount.0, "insufficient balance");
        self.set(&from, &t, b - amount.0);
        env::log_str(&format!("sim_withdraw {} -> {} {} {}", from, receiver_id, t, amount.0));
        Promise::new(token)
            .function_call("ft_transfer", near_sdk::serde_json::json!({"receiver_id": receiver_id, "amount": amount, "memo": memo}).to_string().into_bytes(), NearToken::from_yoctonear(1), Gas::from_tgas(10))
    }

    #[payable]
    pub fn add_public_key(&mut self, public_key: String) {
        let who = env::predecessor_account_id();
        let mut v = self.keys.get(&who).cloned().unwrap_or_default();
        if !v.contains(&public_key) { v.push(public_key); }
        self.keys.insert(who, v);
    }

    pub fn public_keys_of(&self, account_id: AccountId) -> Vec<String> { self.keys.get(&account_id).cloned().unwrap_or_default() }
}
