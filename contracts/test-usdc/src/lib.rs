//! Test USDC for the Called testnet deploy. Anyone can call `faucet` for 1,000 tUSDC once per 24h.
//! Accounts are auto-registered on faucet/transfer so testers never need storage_deposit.
use near_contract_standards::fungible_token::metadata::{FungibleTokenMetadata, FungibleTokenMetadataProvider, FT_METADATA_SPEC};
use near_contract_standards::fungible_token::{FungibleToken, FungibleTokenCore, FungibleTokenResolver};
use near_contract_standards::storage_management::{StorageBalance, StorageBalanceBounds, StorageManagement};
use near_sdk::collections::LookupMap;
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, NearToken, PanicOnDefault, PromiseOrValue};

const DECIMALS: u8 = 6;
const FAUCET_AMOUNT: u128 = 1_000 * 1_000_000;
const COOLDOWN_MS: u64 = 24 * 3600 * 1000;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    token: FungibleToken,
    last_claim: LookupMap<AccountId, u64>,
    owner: AccountId,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self { token: FungibleToken::new(b"t".to_vec()), last_claim: LookupMap::new(b"c".to_vec()), owner }
    }

    fn ensure(&mut self, a: &AccountId) {
        if !self.token.accounts.contains_key(a) { self.token.internal_register_account(a); }
    }

    /// Mint 1,000 tUSDC to `account_id` (default: caller). Rate limited per account.
    pub fn faucet(&mut self, account_id: Option<AccountId>) -> U128 {
        let who = account_id.unwrap_or_else(env::predecessor_account_id);
        let now = env::block_timestamp_ms();
        if let Some(t) = self.last_claim.get(&who) {
            require!(now >= t + COOLDOWN_MS || env::predecessor_account_id() == self.owner, "faucet: once per 24h");
        }
        self.last_claim.insert(&who, &now);
        self.ensure(&who);
        self.token.internal_deposit(&who, FAUCET_AMOUNT);
        near_contract_standards::fungible_token::events::FtMint { owner_id: &who, amount: U128(FAUCET_AMOUNT), memo: Some("faucet") }.emit();
        U128(FAUCET_AMOUNT)
    }

    /// Owner mint for seeding liquidity.
    pub fn mint(&mut self, account_id: AccountId, amount: U128) {
        require!(env::predecessor_account_id() == self.owner, "owner only");
        self.ensure(&account_id);
        self.token.internal_deposit(&account_id, amount.0);
    }

    pub fn last_claim_ms(&self, account_id: AccountId) -> Option<u64> { self.last_claim.get(&account_id) }
}

#[near]
impl FungibleTokenCore for Contract {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.ensure(&receiver_id);
        self.token.ft_transfer(receiver_id, amount, memo)
    }
    #[payable]
    fn ft_transfer_call(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>, msg: String) -> PromiseOrValue<U128> {
        self.ensure(&receiver_id);
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }
    fn ft_total_supply(&self) -> U128 { self.token.ft_total_supply() }
    fn ft_balance_of(&self, account_id: AccountId) -> U128 { self.token.ft_balance_of(account_id) }
}

#[near]
impl FungibleTokenResolver for Contract {
    #[private]
    fn ft_resolve_transfer(&mut self, sender_id: AccountId, receiver_id: AccountId, amount: U128) -> U128 {
        let (used, _burned) = self.token.internal_ft_resolve_transfer(&sender_id, receiver_id, amount);
        used.into()
    }
}

#[near]
impl StorageManagement for Contract {
    /// Free registration (the contract pays storage); any attached deposit is refunded.
    #[payable]
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>) -> StorageBalance {
        let _ = registration_only;
        let who = account_id.unwrap_or_else(env::predecessor_account_id);
        self.ensure(&who);
        let d = env::attached_deposit();
        if d > NearToken::from_yoctonear(0) { near_sdk::Promise::new(env::predecessor_account_id()).transfer(d); }
        StorageBalance { total: NearToken::from_yoctonear(0), available: NearToken::from_yoctonear(0) }
    }
    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        let _ = amount;
        StorageBalance { total: NearToken::from_yoctonear(0), available: NearToken::from_yoctonear(0) }
    }
    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool { let _ = force; false }
    fn storage_balance_bounds(&self) -> StorageBalanceBounds { StorageBalanceBounds { min: NearToken::from_yoctonear(0), max: Some(NearToken::from_yoctonear(0)) } }
    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        if self.token.accounts.contains_key(&account_id) { Some(StorageBalance { total: NearToken::from_yoctonear(0), available: NearToken::from_yoctonear(0) }) } else { None }
    }
}

#[near]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        FungibleTokenMetadata { spec: FT_METADATA_SPEC.to_string(), name: "Called Test USD".into(), symbol: "tUSDC".into(), icon: None, reference: None, reference_hash: None, decimals: DECIMALS }
    }
}
