'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Lock, Search, ShieldCheck, Flame, Timer, Gauge } from 'lucide-react';
import { CHAINS, COINS, type ChainKey, type Coin } from '@/lib/coins';
import { useQuotes, fmtPrice, fmtUsd } from '@/lib/market';
import { callSheet, toast } from '@/lib/bus';
import { send, useAccount, connect } from '@/lib/wallet';
import { tx, NETWORK, CHEST_ID, usdcOf } from '@/lib/raid';
import { useChestConfig } from '@/lib/hooks';
import { Button, CoinAvatar, Delta, Modal } from './ui';
import { PayoutBox, RiskNote, netLabel } from './Payout';

const LINES = [{ bps: 15000, label: '1.5x', note: 'Quick flip' }, { bps: 20000, label: '2x', note: 'Double up' }, { bps: 30000, label: '3x', note: 'Full send' }] as const;
const WINDOWS = [{ m: 15, l: '15m' }, { m: 60, l: '1h' }, { m: 360, l: '6h' }, { m: 1440, l: '24h' }];
const RETREATS = [{ h: 24, l: '1 day' }, { h: 72, l: '3 days' }, { h: 168, l: '7 days' }, { h: 672, l: '28 days' }];

export function CallRaidSheet() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [coin, setCoin] = useState<Coin | null>(null);
  const [q, setQ] = useState('');
  const [chain, setChain] = useState<ChainKey | 'all'>('all');
  const [bps, setBps] = useState(15000);
  const [win, setWin] = useState(60);
  const [ret, setRet] = useState(72);
  const [busy, setBusy] = useState(false);
  const quotes = useQuotes();
  const cfg = useChestConfig();
  const acct = useAccount();

  useEffect(() => callSheet.on(({ symbol }) => {
    const c = symbol ? COINS.find((x) => x.symbol === symbol) ?? null : null;
    setCoin(c); setStep(c ? 1 : 0); setQ(''); setOpen(true);
  }), []);

  const list = useMemo(() => COINS.filter((c) => (chain === 'all' || c.chain === chain) && (!q || `${c.symbol} ${c.name}`.toLowerCase().includes(q.toLowerCase()))), [q, chain]);
  const quote = coin ? quotes.data?.find((x) => x.symbol === coin.symbol) : undefined;
  const title = coin ? `Raid $${coin.symbol} to ${LINES.find((l) => l.bps === bps)?.label}` : '';
  const call = coin ? tx.callRaid({ title, target: coin.assetId, target_x_bps: bps, open_minutes: win, retreat_hours: ret }) : null;
  const feePct = (cfg.data?.caller_fee_bps ?? 0) / 100;

  async function submit() {
    if (!call) return;
    if (!acct) { await connect(); return; }
    setBusy(true);
    try { await send(call); toast({ title: 'Raid called', body: `${title}. Your crew window is open.`, tone: 'lime', href: '/raids' }); setOpen(false); }
    catch (e) { if ((e as Error).message !== 'connect_wallet') toast({ title: 'Wallet didn’t sign', body: (e as Error).message.slice(0, 120), tone: 'down' }); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} label="Call a raid" wide>
      <div className="px-4 pt-4 pb-2.5 md:px-6 md:pt-5 md:pb-3">
        <div className="flex items-center gap-2">
          {step > 0 && <button onClick={() => setStep(step - 1)} aria-label="Back" className="press -ml-1 grid h-8 w-8 place-items-center rounded-full hover:bg-raised"><ArrowLeft size={18} /></button>}
          <p className="eyebrow">Call a raid · step {step + 1} of 3</p>
        </div>
        <h2 className="wide mt-1.5 md:mt-2 text-[1.25rem] leading-[.95] pr-10 md:text-[26px]">{['Pick a target', 'Set your line', 'Lock it in'][step]}</h2>
        <div className="mt-3 md:mt-4 flex gap-1">{[0, 1, 2].map((i) => <motion.span key={i} className="h-[3px] flex-1 rounded-full" animate={{ backgroundColor: i <= step ? '#c6ff3d' : 'var(--color-line)' }} />)}</div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: [0.2, 0.9, 0.3, 1] }} className="px-4 pb-5 md:px-6 md:pb-6">
          {step === 0 && (
            <>
              <label className="mt-1 flex h-[2.875rem] md:h-12 items-center gap-2.5 rounded-[11px] md:rounded-[12px] bg-raised px-3.5 focus-within:shadow-[inset_0_0_0_1.5px_var(--color-brand)]">
                <Search size={18} className="text-mute" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search PEPE, DOGE, TRUMP…" className="h-full flex-1 bg-transparent text-[14px] md:text-[15px] outline-none placeholder:text-faint" aria-label="Search coins" />
              </label>
              <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                {(['all', 'eth', 'sol', 'base', 'near', 'doge'] as const).map((k) => (
                  <button key={k} onClick={() => setChain(k)} className={`press h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold ${chain === k ? 'bg-ink text-bg' : 'hairline text-mute hover:text-ink'}`}>{k === 'all' ? 'All chains' : CHAINS[k].label}</button>
                ))}
              </div>
              <ul className="mt-3 divide-y divide-line rounded-[14px] hairline overflow-hidden">
                {list.map((c) => { const qq = quotes.data?.find((x) => x.symbol === c.symbol); return (
                  <li key={c.symbol}>
                    <button onClick={() => { setCoin(c); setStep(1); }} className="flex w-full items-center gap-2.5 md:gap-3 px-3 md:px-3.5 py-2.5 md:py-3 text-left hover:bg-raised">
                      <CoinAvatar symbol={c.symbol} image={qq?.image} size={36} />
                      <span className="min-w-0 flex-1"><span className="block font-semibold text-[13.5px] md:text-[14.5px]">${c.symbol}</span><span className="block text-[12px] text-mute truncate">{c.name} · {CHAINS[c.chain].label}</span></span>
                      <span className="text-right"><span className="block mono text-[13px]">{fmtPrice(qq?.priceUsd)}</span><Delta pct={qq?.change24h} className="text-[11px]" /></span>
                    </button>
                  </li>
                ); })}
                {!list.length && <li className="px-4 py-8 text-center text-[13.5px] text-mute">No raidable coin matches “{q}”. RAID lists coins NEAR Intents can actually swap.</li>}
              </ul>
              <p className="mt-3 text-[11px] md:text-[12px] text-faint">Every coin here is on the NEAR Intents token list, so the war chest can really buy it. Prices: DexScreener, CoinGecko.</p>
            </>
          )}

          {step === 1 && coin && (
            <>
              <div className="flex items-center gap-3 rounded-[12px] md:rounded-[14px] bg-raised p-3 md:p-3.5">
                <CoinAvatar symbol={coin.symbol} image={quote?.image} size={40} />
                <div className="min-w-0 flex-1"><p className="wide text-[1.0625rem]">${coin.symbol}</p><p className="text-[12px] text-mute">{CHAINS[coin.chain].label} · mcap {fmtUsd(quote?.marketCap)}</p></div>
                <div className="text-right"><p className="mono text-[14px]">{fmtPrice(quote?.priceUsd)}</p><Delta pct={quote?.change24h} className="text-[11px]" /></div>
              </div>
              <p className="eyebrow mt-4 md:mt-5">Sell line</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {LINES.map((l) => (
                  <button key={l.bps} onClick={() => setBps(l.bps)} aria-pressed={bps === l.bps} className={`press relative rounded-[12px] md:rounded-[14px] p-2.5 md:p-3 text-left transition-colors ${bps === l.bps ? 'bg-lime text-[#0a1a00]' : 'hairline hover:bg-raised'}`}>
                    <span className="wide-black block text-[1.5rem] md:text-[30px] leading-none">{l.label}</span>
                    <span className={`mt-1.5 md:mt-2 block text-[11px] md:text-[11.5px] ${bps === l.bps ? 'text-[#0a1a00]/70' : 'text-mute'}`}>Backers <b className="mono">{netLabel(l.bps, cfg.data)}</b></span>
                    <span className="mt-1 block mono text-[11px] truncate">{quote ? `@ ${fmtPrice(quote.priceUsd * l.bps / 1e4)}` : ''}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] md:text-[12px] leading-snug text-faint">Backer returns are net of fees if the chest sells exactly at the line. Line price uses today’s price; the real line is set from what the chest actually pays. The chest only allows 1.5x, 2x and 3x.</p>
              <p className="eyebrow mt-4 md:mt-5">Crew window</p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">{WINDOWS.map((w) => <Pick key={w.m} on={win === w.m} onClick={() => setWin(w.m)}>{w.l}</Pick>)}</div>
              <p className="eyebrow mt-4">Retreat if the line isn’t hit within</p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">{RETREATS.map((r) => <Pick key={r.h} on={ret === r.h} onClick={() => setRet(r.h)}>{r.l}</Pick>)}</div>
              <Button size="lg" tone="lime" className="mt-5 md:mt-6 w-full" onClick={() => setStep(2)}>Review raid</Button>
            </>
          )}

          {step === 2 && coin && call && (
            <>
              <div className="cobalt-field relative overflow-hidden rounded-[16px] p-3.5 md:p-5">
                <div className="dots absolute inset-0 opacity-60" />
                <div className="relative">
                  <p className="eyebrow">Your call</p>
                  <p className="wide-black mt-2 text-[1.5rem] leading-[.9] md:text-[34px]">{title}</p>
                  <div className="mt-3 md:mt-4 grid grid-cols-3 gap-2 md:gap-3 text-[11px] md:text-[12px]">
                    <div><p className="text-white/60">Crew window</p><p className="mono mt-0.5 font-bold">{WINDOWS.find((w) => w.m === win)?.l}</p></div>
                    <div><p className="text-white/60">Retreat after</p><p className="mono mt-0.5 font-bold">{RETREATS.find((r) => r.h === ret)?.l}</p></div>
                    <div><p className="text-white/60">Your fee</p><p className="mono mt-0.5 font-bold">{cfg.data ? `${feePct}% of profit` : '…'}</p></div>
                  </div>
                </div>
              </div>
              <p className="eyebrow mt-4 md:mt-5">What your crew gets, per 100 {NETWORK === 'testnet' ? 'tUSDC' : 'USDC'}</p>
              <PayoutBox stake={100} bps={bps} cfg={cfg.data} unit={NETWORK === 'testnet' ? 'tUSDC' : 'USDC'} className="mt-2" />
              <ul className="mt-3 md:mt-4 space-y-2 md:space-y-2.5 text-[12.5px] md:text-[13.5px]">
                <Rule icon={<Timer size={15} />}>When the crew window closes, a {cfg.data?.buy_delay_minutes ?? 10}-minute public countdown runs before the chest can buy. Target and buy time are public. No surprise buys.</Rule>
                <Rule icon={<Gauge size={15} />}>Size caps: {cfg.data?.max_pot ? `${usdcOf(cfg.data.max_pot).toLocaleString()} per raid, ${usdcOf(cfg.data.max_back ?? '0').toLocaleString()} per backer` : 'per raid and per backer'}. Anything over the cap is refunded.</Rule>
                <Rule icon={<Lock size={15} />}>Your {feePct}% fee is a share of profit, locked until the raid hits the line. No hit, no fee, so dumping on your crew earns you nothing.</Rule>
                <Rule icon={<ShieldCheck size={15} />}>The chest only accepts a 1Click quote whose signed minimum return meets the line. No one holds a key that can move the funds.</Rule>
                <Rule icon={<Flame size={15} />}>{cfg.data ? `${cfg.data.buyback_bps / 100}%` : 'A share'} of a winning raid’s profit goes to the buyback reserve. The chest has no method to withdraw it.</Rule>
              </ul>
              <RiskNote className="mt-4" />
              <details className="mt-4 rounded-[12px] bg-raised px-3.5 py-3 text-[12px]">
                <summary className="cursor-pointer font-semibold text-mute">What your wallet will sign</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all mono text-[11px] text-mute">{`${CHEST_ID}.call_raid(${JSON.stringify(call.args, null, 1)})`}</pre>
              </details>
              <Button size="lg" tone="lime" className="mt-5 w-full" onClick={submit} disabled={busy}>{busy ? 'Waiting for wallet…' : acct ? <><Check size={18} strokeWidth={3} />Call this raid</> : 'Connect wallet to call'}</Button>
              <p className="mt-2 text-center text-[11.5px] text-faint">{NETWORK === 'testnet' ? 'NEAR testnet chest. Test tokens only, no real money.' : 'NEAR mainnet.'} A game, not investment advice.</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}

function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} aria-pressed={on} className={`press h-10 rounded-[10px] mono text-[12.5px] font-bold ${on ? 'bg-ink text-bg' : 'hairline text-mute hover:text-ink'}`}>{children}</button>;
}
function Rule({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <li className="flex gap-2.5"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-raised text-lime">{icon}</span><span className="text-mute leading-snug">{children}</span></li>;
}
