//! Pure rule checks (no state), unit-tested in tests.rs.
use near_sdk::env;
use near_sdk::serde_json::{self, Value};

pub const MPC_PATH: &str = "raid-chest";

pub fn mul_bps(x: u128, bps: u32) -> u128 { x * bps as u128 / 10_000 }

/// Hard ceilings, checked at init, so no deployment can take more than this from backers' profit.
pub const MAX_CALLER_FEE_BPS: u32 = 500;
pub const MAX_BUYBACK_BPS: u32 = 1000;

/// How a closed raid's proceeds are split. Fees are a share of PROFIT and only on a hit; a miss pays no fees.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Split { pub caller_cut: u128, pub buyback: u128, pub for_backers: u128 }

pub fn split(proceeds: u128, cost: u128, hit: bool, caller_fee_bps: u32, buyback_bps: u32) -> Split {
    let profit = proceeds.saturating_sub(cost);
    let (caller_cut, buyback) = if hit { (mul_bps(profit, caller_fee_bps), mul_bps(profit, buyback_bps)) } else { (0, 0) };
    Split { caller_cut, buyback, for_backers: proceeds - caller_cut - buyback }
}

/// What a backer gets back if the chest sells exactly at the line (the minimum a pre-retreat sale can fill at).
/// Returns (payout, net gain in bps of the stake).
pub fn payout_at_line(stake: u128, target_x_bps: u32, caller_fee_bps: u32, buyback_bps: u32) -> (u128, u32) {
    let s = split(mul_bps(stake, target_x_bps), stake, true, caller_fee_bps, buyback_bps);
    let gain_bps = if stake == 0 { 0 } else { ((s.for_backers.saturating_sub(stake)) * 10_000 / stake) as u32 };
    (s.for_backers, gain_bps)
}

pub fn parse_ed25519_key(k: &str) -> [u8; 32] {
    let b58 = k.strip_prefix("ed25519:").unwrap_or_else(|| env::panic_str("key must start with ed25519:"));
    let v = bs58::decode(b58).into_vec().unwrap_or_else(|_| env::panic_str("bad base58 key"));
    v.try_into().unwrap_or_else(|_| env::panic_str("key must be 32 bytes"))
}

/// 1Click signs base58(sha256(json_stable_stringify({...request, ...quote, timestamp}))) with ed25519.
pub fn quote_hash(signed_json: &str) -> String { bs58::encode(env::sha256(signed_json.as_bytes())).into_string() }

pub fn verify_quote_sig(signed_json: &str, signature: &str, key: &str) -> bool {
    let pk = parse_ed25519_key(key);
    let sig_b58 = match signature.strip_prefix("ed25519:") { Some(s) => s, None => signature };
    let sig: [u8; 64] = match bs58::decode(sig_b58).into_vec().ok().and_then(|v| v.try_into().ok()) { Some(s) => s, None => return false };
    env::ed25519_verify(&sig, quote_hash(signed_json).as_bytes(), &pk)
}

#[derive(Debug, Clone)]
pub struct CheckedQuote {
    pub deposit_address: String,
    pub min_amount_out: u128,
    pub deadline_ms: u64,
    pub hash: String,
}

fn s<'a>(v: &'a Value, k: &str) -> Result<&'a str, String> { v.get(k).and_then(|x| x.as_str()).ok_or(format!("quote missing {k}")) }
fn eq(v: &Value, k: &str, want: &str) -> Result<(), String> {
    let got = s(v, k)?;
    if got == want { Ok(()) } else { Err(format!("quote {k} is {got}, expected {want}")) }
}

#[allow(clippy::too_many_arguments)]
pub fn check_quote_fields(signed_json: &str, me: &str, origin: &str, destination: &str, amount_in: u128, min_out_floor: u128, now_ms: u64, max_age_ms: u64) -> Result<CheckedQuote, String> {
    let v: Value = serde_json::from_str(signed_json).map_err(|_| "quote is not JSON".to_string())?;
    if v.get("dry") != Some(&Value::Bool(false)) { return Err("dry quotes cannot be executed".into()); }
    eq(&v, "swapType", "EXACT_INPUT")?;
    eq(&v, "originAsset", origin)?;
    eq(&v, "destinationAsset", destination)?;
    for k in ["depositType", "recipientType", "refundType"] { eq(&v, k, "INTENTS")?; }
    eq(&v, "recipient", me)?;
    eq(&v, "refundTo", me)?;
    let a = amount_in.to_string();
    eq(&v, "amount", &a)?;
    eq(&v, "amountIn", &a)?;
    for k in ["depositMemo", "customRecipientMsg", "virtualChainRecipient", "virtualChainRefundRecipient"] {
        if v.get(k).is_some() { return Err(format!("quote has unsupported field {k}")); }
    }
    let min_out: u128 = s(&v, "minAmountOut")?.parse().map_err(|_| "bad minAmountOut".to_string())?;
    if min_out == 0 || min_out < min_out_floor { return Err(format!("minAmountOut {min_out} below the raid's floor {min_out_floor}")); }
    let deposit = s(&v, "depositAddress")?.to_string();
    let deadline_ms = parse_rfc3339_ms(s(&v, "deadline")?).ok_or("bad deadline")?;
    if deadline_ms <= now_ms { return Err("quote expired".into()); }
    let ts = parse_rfc3339_ms(s(&v, "timestamp")?).ok_or("bad timestamp")?;
    if now_ms > ts + max_age_ms { return Err("quote too old".into()); }
    Ok(CheckedQuote { deposit_address: deposit, min_amount_out: min_out, deadline_ms, hash: quote_hash(signed_json) })
}

/// Parses "YYYY-MM-DDTHH:MM:SS[.fff]Z" (UTC only) to unix ms.
pub fn parse_rfc3339_ms(t: &str) -> Option<u64> {
    let t = t.strip_suffix('Z')?;
    let (date, time) = t.split_once('T')?;
    let mut d = date.split('-');
    let (y, mo, da): (i64, i64, i64) = (d.next()?.parse().ok()?, d.next()?.parse().ok()?, d.next()?.parse().ok()?);
    let (hms, frac) = match time.split_once('.') { Some((a, b)) => (a, b), None => (time, "0") };
    let mut h = hms.split(':');
    let (hh, mm, ss): (i64, i64, i64) = (h.next()?.parse().ok()?, h.next()?.parse().ok()?, h.next()?.parse().ok()?);
    let ms: i64 = format!("{:0<3}", &frac[..frac.len().min(3)]).parse().ok()?;
    let days = days_from_civil(y, mo, da);
    Some(((days * 86400 + hh * 3600 + mm * 60 + ss) * 1000 + ms) as u64)
}

fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

pub fn iso8601_from_ms(ms: u64) -> String {
    let secs = (ms / 1000) as i64;
    let days = secs.div_euclid(86400);
    let rem = secs.rem_euclid(86400);
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + if m <= 2 { 1 } else { 0 };
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z", y, m, d, rem / 3600, rem % 3600 / 60, rem % 60, ms % 1000)
}

/// intents.near nonce: [4-byte current salt][28 bytes unique], base64.
pub fn make_nonce(salt_hex: &str, seed: &[u8], counter: u64) -> String {
    use base64::Engine;
    let mut n = [0u8; 32];
    for i in 0..4 { n[i] = u8::from_str_radix(salt_hex.get(i * 2..i * 2 + 2).unwrap_or("00"), 16).unwrap_or(0); }
    let h = env::sha256(&[seed, &counter.to_le_bytes()].concat());
    n[4..].copy_from_slice(&h[..28]);
    base64::engine::general_purpose::STANDARD.encode(n)
}
