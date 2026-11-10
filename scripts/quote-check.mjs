// Fetch a DRY 1Click quote (no funds move) and verify 1Click's ed25519 signature, rebuilding the exact signed string.
import { verifyQuoteSignature } from "@defuse-protocol/one-click-sdk-typescript";
import stringify from "json-stable-stringify";
import fs from "node:fs";
const USDC = "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
const PEPE = "nep141:eth-0x6982508145454ce325ddbe47a25d4ec3d2311933.omft.near";
const who = process.argv[2] || JSON.parse(fs.readFileSync(new URL("../secrets/mainnet-test.json", import.meta.url))).account_id;
const dry = process.argv[3] !== "live";
const body = { dry, swapType: "EXACT_INPUT", slippageTolerance: 100, originAsset: USDC, depositType: "INTENTS",
  destinationAsset: PEPE, amount: process.argv[4] || "1000000", refundTo: who, refundType: "INTENTS", recipient: who, recipientType: "INTENTS",
  deadline: new Date(Date.now() + 20 * 60e3).toISOString() };
const r = await fetch("https://1click.chaindefuser.com/v0/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const q = await r.json();
if (!r.ok) { console.log("quote error", r.status, q); process.exit(1); }
console.log("sdk verifyQuoteSignature:", verifyQuoteSignature(q));
// rebuild signed string the same way the SDK does (undefined keys are dropped by stable-stringify)
const pick = (o, ks) => Object.fromEntries(ks.map(k => [k, o[k] || undefined]));
const reqKeys = ["dry","swapType","slippageTolerance","originAsset","depositType","destinationAsset","amount","refundTo","refundType","recipient","recipientType","deadline","quoteWaitingTimeMs","referral","virtualChainRecipient","virtualChainRefundRecipient","customRecipientMsg"];
const req = pick(q.quoteRequest, reqKeys); req.dry = q.quoteRequest.dry; req.slippageTolerance = q.quoteRequest.slippageTolerance;
const qk = dry ? ["amountIn","amountInFormatted","amountInUsd","minAmountIn","amountOut","amountOutFormatted","amountOutUsd","minAmountOut"]
  : ["amountIn","amountInFormatted","amountInUsd","minAmountIn","amountOut","amountOutFormatted","amountOutUsd","minAmountOut","depositAddress","depositMemo","deadline","timeWhenInactive","timeEstimate","refundFee","withdrawFee"];
const signed = stringify({ ...req, ...pick(q.quote, qk), timestamp: q.timestamp });
const out = { signed_json: signed, signature: q.signature, amountOut: q.quote.amountOut, minAmountOut: q.quote.minAmountOut, depositAddress: q.quote.depositAddress || null };
fs.writeFileSync(new URL(`../contracts/raid-chest/tests/fixtures/quote-${dry ? "dry" : "live"}.json`, import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ amountIn: q.quote.amountIn, amountOut: q.quote.amountOut, minAmountOut: q.quote.minAmountOut, amountOutUsd: q.quote.amountOutUsd, timestamp: q.timestamp, signed_len: signed.length }));
