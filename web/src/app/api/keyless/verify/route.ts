import { NextResponse } from 'next/server';
import { verifyBackIntent } from '@/lib/keyless-server';
import type { SignedIntent } from '@/lib/keyless';

/** Checks a Phantom/MetaMask-signed back intent: payload shape, signature (locally), and intents.near simulate_intents
 *  on mainnet (read-only). Nothing is submitted: execution needs a mainnet chest and RAID_ANYCHAIN_LIVE=1. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { signed?: SignedIntent; chest?: string } | null;
  const s = b?.signed;
  if (!s || typeof s.payload !== 'string' || s.payload.length > 2000 || !['erc191', 'raw_ed25519'].includes(s.standard) || typeof s.signature !== 'string') return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  try { return NextResponse.json(await verifyBackIntent(s, b?.chest), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (e) { return NextResponse.json({ error: 'verify_failed', detail: (e as Error).message.slice(0, 160) }, { status: 400 }); }
}
