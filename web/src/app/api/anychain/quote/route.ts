import { NextResponse } from 'next/server';
import { ORIGINS, MAINNET_USDC, isEvmAddr, isNearAccount, isSolAddr, type AnyQuote } from '@/lib/anychain';

const ONECLICK = 'https://1click.chaindefuser.com/v0/quote';
// Valid public addresses used only for DRY (indicative) quotes when the backer hasn't typed a refund address yet.
const PREVIEW_REFUND = { sol: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', evm: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' } as const;

export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as { origin?: string; amount?: string; raidId?: number; beneficiary?: string; refundTo?: string } | null;
  const o = ORIGINS.find((x) => x.key === b?.origin);
  const amt = Number(b?.amount);
  if (!b || !o || !(amt > 0) || !Number.isInteger(b.raidId)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const beneficiary = (b.beneficiary ?? '').trim().toLowerCase();
  if (beneficiary && !isNearAccount(beneficiary)) return NextResponse.json({ error: 'bad_beneficiary' }, { status: 400 });
  const refund = (b.refundTo ?? '').trim();
  const refundOk = o.addr === 'sol' ? isSolAddr(refund) : isEvmAddr(refund);
  if (refund && !refundOk) return NextResponse.json({ error: 'bad_refund' }, { status: 400 });

  const mainnetChest = process.env.NEXT_PUBLIC_RAID_MAINNET_CHEST ?? '';
  const liveFlag = process.env.RAID_ANYCHAIN_LIVE === '1';
  const live = liveFlag && !!mainnetChest && refundOk && !!beneficiary;
  const reason = live ? null : !liveFlag || !mainnetChest ? 'No mainnet chest yet: NEAR Intents has no testnet, so this is a real dry quote and no deposit address is issued.' : !beneficiary || !refundOk ? 'Add your RAID account and refund address to get a deposit address.' : null;
  const msg = JSON.stringify({ back: b.raidId, for: beneficiary || 'your-account.near' });
  const raw = BigInt(Math.round(amt * 10 ** Math.min(o.decimals, 9))) * BigInt(10) ** BigInt(Math.max(0, o.decimals - 9));
  const body = {
    dry: !live, swapType: 'EXACT_INPUT', slippageTolerance: 100, originAsset: o.assetId, depositType: 'ORIGIN_CHAIN',
    destinationAsset: MAINNET_USDC, amount: raw.toString(), refundTo: refundOk ? refund : PREVIEW_REFUND[o.addr], refundType: 'ORIGIN_CHAIN',
    // Dry quotes need a real NEAR account as recipient; intents.near stands in until the mainnet chest exists.
    recipient: mainnetChest || 'intents.near', recipientType: 'DESTINATION_CHAIN', customRecipientMsg: msg,
    deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
  try {
    const r = await fetch(ONECLICK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(12_000), cache: 'no-store' });
    const j = await r.json();
    if (!r.ok || !j.quote) return NextResponse.json({ error: 'quote_failed', detail: String(j.message ?? r.status).slice(0, 140) }, { status: 502 });
    const q = j.quote;
    const out: AnyQuote = {
      mode: live ? 'live' : 'dry', origin: o.key, amountIn: q.amountInFormatted, amountInUsd: q.amountInUsd ?? null,
      usdcOut: q.amountOutFormatted, minUsdcOut: (Number(q.minAmountOut) / 1e6).toFixed(6), etaSec: q.timeEstimate ?? null,
      depositAddress: live ? q.depositAddress ?? null : null, deadline: live ? q.deadline ?? null : null,
      signature: j.signature ?? null, timestamp: j.timestamp ?? null, msg, recipient: body.recipient, reason,
    };
    return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: 'quote_unreachable', detail: (e as Error).message.slice(0, 120) }, { status: 502 });
  }
}
