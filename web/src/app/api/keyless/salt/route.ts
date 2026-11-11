import { NextResponse } from 'next/server';
import { currentSalt } from '@/lib/keyless-server';

/** intents.near current_salt on mainnet (read-only view). Wallet-signed intents must start their nonce with it. */
export async function GET() {
  try { return NextResponse.json({ salt: await currentSalt(), source: 'intents.near current_salt (mainnet view)' }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (e) { return NextResponse.json({ error: 'salt_unreachable', detail: (e as Error).message.slice(0, 140) }, { status: 502 }); }
}
