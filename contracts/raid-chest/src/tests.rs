use super::*;
use ed25519_dalek::{Signer, SigningKey};
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::testing_env;

fn key() -> SigningKey { SigningKey::from_bytes(&[7u8; 32]) }
fn key_str() -> String { format!("ed25519:{}", bs58::encode(key().verifying_key().to_bytes()).into_string()) }
const NOW: u64 = 1_794_000_000_000; // 2026-11-07

fn ctx(pred: AccountId, ms: u64) {
    testing_env!(VMContextBuilder::new().current_account_id("chest.near".parse().unwrap()).predecessor_account_id(pred).block_timestamp(ms * 1_000_000).build());
}
fn chest() -> Chest {
    ctx(accounts(0), NOW);
    Chest::new(Config { intents: "intents.near".parse().unwrap(), usdc: "usdc.near".parse().unwrap(), mpc: "v1.signer".parse().unwrap(),
        oneclick_key: key_str(), caller_fee_bps: 500, buyback_bps: 2000, min_back: U128(100_000) })
}
fn sign(s: &str) -> String {
    let h = bs58::encode(<sha2::Sha256 as sha2::Digest>::digest(s.as_bytes())).into_string();
    format!("ed25519:{}", bs58::encode(key().sign(h.as_bytes()).to_bytes()).into_string())
}
fn quote(origin: &str, dest: &str, amount: u128, min_out: u128, dry: bool) -> String {
    // keys sorted like json-stable-stringify
    format!(r#"{{"amount":"{a}","amountIn":"{a}","amountOut":"{mo}","deadline":"2026-11-07T08:00:00.000Z","depositAddress":"abc123.near","depositType":"INTENTS","destinationAsset":"{d}","dry":{dry},"minAmountOut":"{mo}","originAsset":"{o}","recipient":"chest.near","recipientType":"INTENTS","refundTo":"chest.near","refundType":"INTENTS","swapType":"EXACT_INPUT","timestamp":"2026-11-07T07:55:00.000Z"}}"#,
        a = amount, mo = min_out, d = dest, o = origin, dry = dry)
}
const PEPE: &str = "nep141:eth-0x6982508145454ce325ddbe47a25d4ec3d2311933.omft.near";
const T: u64 = 1_794_038_400_000; // 2026-11-07T08:00:00Z

#[test]
fn time_roundtrip() {
    assert_eq!(parse_rfc3339_ms("2026-11-07T08:00:00.000Z"), Some(T));
    assert_eq!(iso8601_from_ms(T), "2026-11-07T08:00:00.000Z");
    assert_eq!(parse_rfc3339_ms("1970-01-01T00:00:01Z"), Some(1000));
}

#[test]
fn quote_rules() {
    let c = chest();
    let q = quote("nep141:usdc.near", PEPE, 1_000_000, 500, false);
    let now = T - 4 * 60_000;
    let ok = check_quote_fields(&q, "chest.near", "nep141:usdc.near", PEPE, 1_000_000, 1, now, 600_000).unwrap();
    assert_eq!(ok.deposit_address, "abc123.near");
    assert!(verify_quote_sig(&q, &sign(&q), &c.cfg.oneclick_key));
    assert!(!verify_quote_sig(&q.replace("abc123", "evil99"), &sign(&q), &c.cfg.oneclick_key));
    assert!(check_quote_fields(&q, "other.near", "nep141:usdc.near", PEPE, 1_000_000, 1, now, 600_000).is_err());
    assert!(check_quote_fields(&q, "chest.near", "nep141:usdc.near", PEPE, 1_000_000, 501, now, 600_000).is_err());
    assert!(check_quote_fields(&q, "chest.near", "nep141:usdc.near", PEPE, 2_000_000, 1, now, 600_000).is_err());
    assert!(check_quote_fields(&q, "chest.near", "nep141:usdc.near", PEPE, 1_000_000, 1, T + 1, 600_000).is_err());
    let d = quote("nep141:usdc.near", PEPE, 1_000_000, 500, true);
    assert!(check_quote_fields(&d, "chest.near", "nep141:usdc.near", PEPE, 1_000_000, 1, now, 600_000).is_err());
}

#[test]
fn full_raid_lifecycle() {
    let mut c = chest();
    ctx(accounts(1), T - 60 * 60_000);
    let id = c.call_raid("Raid PEPE".into(), PEPE.into(), 15000, 10, 24);
    ctx("usdc.near".parse().unwrap(), T - 59 * 60_000);
    c.ft_on_transfer(accounts(2), U128(600_000), r#"{"back":0}"#.into());
    c.ft_on_transfer(accounts(3), U128(400_000), r#"{"back":0}"#.into());
    assert_eq!(c.get_raid(id).unwrap().pot.0, 1_000_000);
    // buy
    ctx(accounts(4), T - 4 * 60_000);
    let q = quote("nep141:usdc.near", PEPE, 1_000_000, 900, false);
    let _ = c.execute_buy(id, q.clone(), sign(&q));
    assert_eq!(c.get_raid(id).unwrap().status, Status::Buying);
    c.on_balance(id, PEPE.into(), "buy".into(), Ok(U128(1000)));
    assert_eq!(c.get_raid(id).unwrap().status, Status::Held);
    // a sell below 1.5x before retreat is refused
    let low = quote(PEPE, "nep141:usdc.near", 1000, 1_400_000, false);
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| { let mut c2 = chest_clone(&c); let _ = c2.execute_sell(id, low.clone(), sign(&low)); }));
    assert!(r.is_err());
    let good = quote(PEPE, "nep141:usdc.near", 1000, 1_600_000, false);
    let _ = c.execute_sell(id, good.clone(), sign(&good));
    c.on_balance(id, "nep141:usdc.near".into(), "sell".into(), Ok(U128(1_600_000)));
    let raid = c.get_raid(id).unwrap();
    assert!(raid.hit);
    assert_eq!(c.get_claimable(accounts(1)).0, 30_000); // 5% of 600k profit to the caller
    assert_eq!(c.get_buyback_bucket().0, 120_000); // 20% to buy back and burn RAID
    ctx(accounts(2), T);
    assert_eq!(c.claim_share(id).0, (1_600_000 - 150_000) * 6 / 10);
}

fn chest_clone(c: &Chest) -> Chest { near_sdk::borsh::from_slice(&near_sdk::borsh::to_vec(c).unwrap()).unwrap() }

#[test]
fn nonce_has_salt_prefix() {
    let _ = chest();
    use base64::Engine;
    let n = base64::engine::general_purpose::STANDARD.decode(make_nonce("252812b3", &[1; 32], 1)).unwrap();
    assert_eq!(&n[..4], &[0x25, 0x28, 0x12, 0xb3]);
}

#[test]
fn real_oneclick_dry_quote_signature_verifies() {
    let _ = chest();
    let f: Value = serde_json::from_str(include_str!("../tests/fixtures/quote-dry.json")).unwrap();
    let sj = f["signed_json"].as_str().unwrap();
    let sig = f["signature"].as_str().unwrap();
    let real = "ed25519:reYaWhvwu8Jzo3WUM3zhn6VrhuMEF4eADL17qtRVifc";
    assert!(verify_quote_sig(sj, sig, real));
    assert!(!verify_quote_sig(&sj.replace("\"amount\":\"1000000\"", "\"amount\":\"1000001\""), sig, real));
}
