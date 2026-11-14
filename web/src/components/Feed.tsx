'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Cpu, Flag, HandCoins, Rocket } from 'lucide-react';
import { useMemo } from 'react';
import { CHAINS, coinBySymbol, explorerTx, type ChestTx, type Launch, type Trade } from '@/lib/coins';
import { ago, fmtAmount, fmtUsd, shortAddr, useQuotes } from '@/lib/market';
import { type Raid, target, xLabel, NETWORK } from '@/lib/raid';
import { openCall } from '@/lib/bus';
import { Bar, CoinAvatar, Identicon } from './ui';

export type FeedItem =
  | { kind: 'trade'; t: number; key: string; trade: Trade }
  | { kind: 'chest'; t: number; key: string; tx: ChestTx; raid?: Raid }
  | { kind: 'launch'; t: number; key: string; launch: Launch };

const TX_EXPLORER: Record<string, (h: string) => string> = {
  eth: (h) => `https://etherscan.io/tx/${h}`, base: (h) => `https://basescan.org/tx/${h}`, sol: (h) => `https://solscan.io/tx/${h}`, near: (h) => `https://nearblocks.io/txns/${h}`,
};

/** Merge every live source into one time-ordered stream. Chest call_raid txs are matched to raid ids in order. */
export function useFeedItems(trades: Trade[] = [], chest: ChestTx[] = [], launches: Launch[] = [], raids: Raid[] = []): FeedItem[] {
  return useMemo(() => {
    const calls = chest.filter((c) => c.method === 'call_raid' && c.ok).sort((a, b) => a.t - b.t);
    const items: FeedItem[] = [
      ...trades.map((t) => ({ kind: 'trade' as const, t: t.t, key: `t${t.id}`, trade: t })),
      ...chest.filter((c) => ['call_raid', 'ft_transfer_call', 'mpc_sign_buy', 'mpc_bootstrap'].includes(c.method) && c.ok).map((c) => ({ kind: 'chest' as const, t: c.t, key: `c${c.hash}`, tx: c, raid: c.method === 'call_raid' ? raids.find((r) => r.id === calls.indexOf(c)) : undefined })),
      ...launches.slice(0, 12).map((l) => ({ kind: 'launch' as const, t: l.createdAt, key: `l${l.id}`, launch: l })),
    ];
    return items.sort((a, b) => b.t - a.t);
  }, [trades, chest, launches, raids]);
}

export function FeedList({ items, now }: { items: FeedItem[]; now: number }) {
  return (
    <ul className="flex flex-col">
      <AnimatePresence initial={false}>
        {items.map((it, i) => (
          <motion.li key={it.key} layout initial={{ opacity: 0, y: -18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 36, delay: i < 12 ? i * 0.025 : 0 }} className="border-b border-line">
            {it.kind === 'trade' ? <TradePost t={it.trade} now={now} /> : it.kind === 'chest' ? <ChestPost tx={it.tx} raid={it.raid} now={now} /> : <LaunchPost l={it.launch} now={now} />}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Row({ avatar, who, verb, when, src, href, children }: { avatar: React.ReactNode; who: React.ReactNode; verb: React.ReactNode; when: string; src: string; href?: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 md:gap-3 px-3 py-2.5 md:px-5 md:py-3.5 hover:bg-raised/40 transition-colors">
      <div className="pt-0.5">{avatar}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 text-[13px] md:text-[13.5px] leading-snug">
          <span className="min-w-0 truncate"><span className="font-semibold">{who}</span> <span className="text-mute">{verb}</span></span>
          <span className="ml-auto shrink-0 mono text-[11px] text-faint">{when}</span>
        </div>
        {children}
        <div className="mt-1.5 md:mt-2 flex items-center gap-2 mono text-[10px] md:text-[10.5px] text-faint">
          <span>src · {src}</span>
          {href && <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-ink">tx<ArrowUpRight size={11} /></a>}
        </div>
      </div>
    </div>
  );
}

function TradePost({ t, now }: { t: Trade; now: number }) {
  const q = useQuotes().data?.find((x) => x.symbol === t.symbol);
  const whale = t.usd >= 10_000;
  const buy = t.kind === 'buy';
  return (
    <Row avatar={<Identicon seed={t.from} size={38} />} who={shortAddr(t.from)} verb={<>{buy ? 'bought' : 'sold'} <b className="text-ink">${t.symbol}</b></>} when={now ? ago(t.t, now) : ''} src={`${CHAINS[t.chain].label} · ${q?.dexId ?? 'DEX'} · GeckoTerminal`} href={TX_EXPLORER[t.chain]?.(t.tx)}>
      <div className="mt-1.5 md:mt-2 flex items-center gap-2 md:gap-3">
        <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-[13px] md:rounded-[16px] px-2.5 py-2 md:px-3 md:py-2.5 ${buy ? 'bg-up/10' : 'bg-down/10'}`}>
          <CoinAvatar symbol={t.symbol} image={q?.image} size={30} />
          <div className="min-w-0">
            <p className={`mono text-[1.0625rem] md:text-[19px] font-bold leading-none ${buy ? 'text-up' : 'text-down'}`}>{buy ? '+' : '−'}{fmtUsd(t.usd)}</p>
            <p className="mono mt-1 text-[11px] text-mute truncate">{fmtAmount(t.amount)} {t.symbol}</p>
          </div>
          {whale && <span className="chip chip-lime ml-auto">Whale</span>}
        </div>
        {coinBySymbol(t.symbol) && <button onClick={() => openCall(t.symbol)} className="press h-9 md:h-10 shrink-0 rounded-[13px] md:rounded-[14px] px-3 md:px-3.5 text-[12px] md:text-[12.5px] font-bold hairline hover:bg-lime hover:text-[#1c0900]">Raid it</button>}
      </div>
    </Row>
  );
}

function ChestPost({ tx, raid, now }: { tx: ChestTx; raid?: Raid; now: number }) {
  const net = NETWORK;
  const verb = tx.method === 'call_raid' ? 'called a raid' : tx.method === 'ft_transfer_call' ? 'moved tUSDC into a raid' : tx.method === 'mpc_sign_buy' ? 'got a buy intent signed by NEAR MPC' : 'derived its keyless MPC key';
  const icon = tx.method === 'call_raid' ? <Flag size={17} /> : tx.method === 'ft_transfer_call' ? <HandCoins size={17} /> : <Cpu size={17} />;
  const tg = raid ? target(raid) : null;
  return (
    <Row avatar={<span className="grid h-[2.375rem] w-[2.375rem] place-items-center rounded-[12px] bg-brand text-white">{icon}</span>} who={shortAddr(tx.signer)} verb={verb} when={now ? ago(tx.t, now) : ''} src={`NearBlocks ${net}`} href={explorerTx(tx.hash, net)}>
      {raid && tg && (
        <Link href={`/raids/${raid.id}`} className="lift mt-1.5 md:mt-2 flex items-center gap-2.5 md:gap-3 rounded-[13px] md:rounded-[16px] hairline px-2.5 py-2 md:px-3 md:py-2.5">
          <span className="wide text-[1rem]">${tg.symbol}</span><span className="chip chip-lime">Line {xLabel(raid.target_x_bps)}</span>
          <span className="ml-auto mono text-[11px] text-mute">Raid #{raid.id}</span><ArrowUpRight size={15} className="text-mute" />
        </Link>
      )}
      {tx.method.startsWith('mpc') && <p className="mt-1.5 text-[12.5px] text-mute">Chain Signatures: the chest signs only intents it built itself, with the min-out baked in.</p>}
    </Row>
  );
}

function LaunchPost({ l, now }: { l: Launch; now: number }) {
  const live = !l.finalized && l.endsAt > now;
  return (
    <Row avatar={<CoinAvatar symbol={l.symbol} image={l.image} size={38} />} who={`$${l.symbol}`} verb={<>launched on NEAR <span className="text-faint">by {shortAddr(l.owner)}</span></>} when={now ? ago(l.createdAt, now) : ''} src="meme.cooking" href={l.url}>
      <div className="mt-1.5 md:mt-2 rounded-[13px] md:rounded-[16px] hairline px-2.5 py-2 md:px-3 md:py-2.5">
        <div className="flex items-center justify-between text-[12px]"><span className="font-semibold truncate">{l.name}</span><span className="mono text-mute shrink-0">{l.raised.toFixed(1)} / {l.softCap.toFixed(0)} NEAR</span></div>
        <Bar value={l.raised / Math.max(1, l.softCap)} tone="lime" className="mt-2" />
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-mute"><Rocket size={12} />{live ? 'Raising now' : l.raised >= l.softCap ? 'Filled' : 'Ended under soft cap'} · {l.stakers} backers</div>
      </div>
    </Row>
  );
}
