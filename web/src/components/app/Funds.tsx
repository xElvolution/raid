'use client';
import { openClaim } from './Flow';
import { useQuery } from '@tanstack/react-query';
import { Droplets } from 'lucide-react';
import { NET } from '@/lib/net';
import { view } from '@/lib/raid';
import { useAccount } from '@/lib/wallet';

async function nearBalance(id: string) {
  const r = await fetch(NET.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'view_account', finality: 'final', account_id: id } }) }).then((x) => x.json());
  return r.result ? Number(r.result.amount) / 1e24 : 0;
}
export const useBalances = (acct: string | null) => useQuery({
  queryKey: ['balances', acct, NET.net], enabled: !!acct, refetchInterval: 30_000,
  queryFn: async () => ({ near: await nearBalance(acct!), usdc: Number(await view<string>('ft_balance_of', { account_id: acct }, NET.usdc).catch(() => '0')) / 1e6 }),
});


/** Wallet nudge: signed in on testnet with no test USDC yet. */
export function FundsNudge() {
  const acct = useAccount();
  const b = useBalances(NET.net === 'testnet' ? acct : null);
  if (!acct || NET.net !== 'testnet' || !b.data || b.data.usdc >= 1) return null;
  return (
    <button onClick={() => openClaim()} className="mx-auto mt-1 flex w-full max-w-[640px] items-center gap-2 rounded-[14px] bg-signal/12 px-3 py-2 text-left text-[13px]">
      <Droplets size={15} className="text-lime" /><span className="flex-1">Your wallet has no test USDC yet.</span><b className="font-semibold text-lime">Get test funds</b>
    </button>
  );
}
