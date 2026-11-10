'use client';
import Link from 'next/link';
import { use } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, LogOut } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { RaidCard } from '@/components/RaidCard';
import { Button, CountUp, Empty, Identicon } from '@/components/ui';
import { Mark } from '@/components/Brand';
import { useRaids } from '@/lib/hooks';
import { callerStats } from '@/lib/callers';
import { shortAddr, shortName } from '@/lib/market';
import { explorerAccount } from '@/lib/coins';
import { CHEST_ID, NETWORK, usdcOf } from '@/lib/raid';
import { connect, disconnect, useAccount } from '@/lib/wallet';

async function claimable(account: string): Promise<string> {
  const rpc = NETWORK === 'mainnet' ? 'https://rpc.mainnet.fastnear.com' : 'https://rpc.testnet.fastnear.com';
  const r = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'call_function', finality: 'optimistic', account_id: CHEST_ID, method_name: 'get_claimable', args_base64: btoa(JSON.stringify({ account_id: account })) } }) });
  const j = await r.json(); return JSON.parse(new TextDecoder().decode(new Uint8Array(j.result.result)));
}

export default function CallerPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = use(params);
  const acct = useAccount();
  const handle = raw === 'me' ? acct : decodeURIComponent(raw);
  const raids = useRaids();
  const fees = useQuery({ queryKey: ['claimable', handle], enabled: !!handle, queryFn: () => claimable(handle!) });
  if (!handle) return (
    <Shell title="Caller card">
      <Empty art={<Mark size={48} />} title="Your caller card" body="Connect a NEAR wallet to see the raids you’ve called and backed, your hit rate and what you’ve earned." action={<Button tone="lime" size="lg" onClick={() => void connect()}>Connect NEAR wallet</Button>} />
    </Shell>
  );
  const s = callerStats(raids.data ?? []).find((x) => x.account === handle);
  const mine = (raids.data ?? []).filter((r) => r.caller === handle).reverse();
  const rate = s && s.settled ? Math.round((s.hits / s.settled) * 100) : null;
  return (
    <Shell title="Caller card" back="/leaderboard" actions={acct === handle ? <button onClick={() => void disconnect()} aria-label="Disconnect wallet" className="press grid h-9 w-9 place-items-center rounded-[10px] text-mute hover:bg-raised"><LogOut size={17} /></button> : undefined}>
      <motion.section initial={{ rotateX: 12, y: 20, opacity: 0 }} animate={{ rotateX: 0, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }} style={{ perspective: 800 }}
        className="cobalt-field relative overflow-hidden rounded-[22px] p-5 md:p-7">
        <div className="dots absolute inset-0 opacity-60" />
        <div className="relative">
          <div className="flex items-start justify-between"><Mark size={22} /><span className="mono text-[10.5px] text-white/60">CALLER · {NETWORK.toUpperCase()}</span></div>
          <div className="mt-6 flex items-center gap-4">
            <Identicon seed={handle} size={72} className="!bg-white/10 !rounded-[16px]" />
            <div className="min-w-0"><h2 className="wide-black text-[21px] md:text-[34px] leading-[.95] truncate">{shortName(handle)}</h2>
              <a href={explorerAccount(handle, NETWORK)} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 mono text-[11px] text-white/60 hover:text-white">{handle.length > 30 ? shortAddr(handle) : handle}<ArrowUpRight size={11} /></a></div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-3 border-t border-white/20 pt-4">
            <S k="Called" v={s?.called ?? 0} /><S k="Hit" v={s?.hits ?? 0} /><S k="Hit rate" v={rate} suffix="%" /><S k="Rallied" v={s?.rallied ?? 0} dp={2} />
          </div>
          <p className="mt-4 mono text-[11px] text-white/60">Claimable fees: {fees.data !== undefined ? `${usdcOf(fees.data).toFixed(2)} USDC` : '…'} · fees unlock only on hits</p>
        </div>
      </motion.section>
      <h3 className="wide mt-7 text-[15px]">Raids called</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{mine.map((r, i) => <RaidCard key={r.id} r={r} i={i} />)}</div>
      {!raids.isLoading && !mine.length && <p className="mt-2 text-[13.5px] text-mute">No raids called from this account yet. <Link href="/raids" className="text-brand font-semibold">Browse raids</Link></p>}
    </Shell>
  );
}

function S({ k, v, suffix = '', dp = 0 }: { k: string; v: number | null; suffix?: string; dp?: number }) {
  return <div className="min-w-0"><p className="wide-black text-[24px] md:text-[32px] leading-none truncate">{v === null ? '—' : <CountUp value={v} format={(n) => `${n.toFixed(dp)}${suffix}`} />}</p><p className="eyebrow mt-1.5 truncate">{k}</p></div>;
}
