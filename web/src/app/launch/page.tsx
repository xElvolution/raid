'use client';
import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, ChevronDown, ImagePlus, Plus, Rocket } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Bar, Button, CoinAvatar, Empty, ErrorState, Identicon, Modal, Segmented, Skeleton } from '@/components/ui';
import { useLaunches, countdown, shortAddr, fmtUsd, fmtPrice, ago } from '@/lib/market';
import { useChestConfig, useNow } from '@/lib/hooks';
import { LAUNCHPAD_ID, NETWORK, coinMcap, coinPrice, curveProgress, launchApi, launchTx, usdcOf, type LaunchCoin } from '@/lib/raid';
import { explorerAccount } from '@/lib/coins';
import { connect, send, useAccount } from '@/lib/wallet';
import { toast } from '@/lib/bus';

const useLaunchCoins = () => useQuery({ queryKey: ['lp-coins'], queryFn: launchApi.list, refetchInterval: 10_000 });

export default function LaunchPage() {
  const now = useNow();
  const l = useLaunches();
  const [f, setF] = useState<'live' | 'recent'>('live');
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState<LaunchCoin | null>(null);
  const [create, setCreate] = useState(false); // phones: the form folds into one row until tapped
  const acct = useAccount();
  const coins = useLaunchCoins();
  const qc = useQueryClient();
  const taken = !!ticker && (coins.data ?? []).some((c) => c.ticker === ticker);
  const imgOk = !image || /^(https|ipfs):\/\//.test(image);
  const canLaunch = name.trim().length > 0 && ticker.length >= 2 && !taken && imgOk && !busy;
  async function launch() {
    if (!acct) return void connect();
    setBusy(true);
    try {
      await send(launchTx.create({ name: name.trim(), ticker, description: desc.trim(), image: image || null }));
      toast({ title: `$${ticker} is live on the curve`, body: 'Nothing was minted to you. Buy on the curve like everyone else.', tone: 'lime' });
      setName(''); setTicker(''); setDesc(''); setImage('');
      void qc.invalidateQueries({ queryKey: ['lp-coins'] });
    } catch (e) { if ((e as Error).message !== 'connect_wallet') toast({ title: 'Wallet didn’t sign', body: (e as Error).message.slice(0, 120), tone: 'down' }); }
    finally { setBusy(false); }
  }
  const items = (l.data ?? []).filter((x) => (f === 'live' ? !x.finalized && x.endsAt > now : true));
  return (
    <Shell title="Launch">
      <section className="grid gap-3 md:gap-4 md:grid-cols-[1.1fr_1fr]">
        <div className="cobalt-field relative overflow-hidden rounded-[14px] md:rounded-[18px] p-3.5 md:p-6">
          <div className="dots absolute inset-0 opacity-50" />
          <div className="relative">
            <span className="chip chip-lime"><span className="live-dot" />Live on NEAR {NETWORK}</span>
            <h2 className="wide-black mt-2.5 md:mt-4 text-[1.25rem] md:text-[48px] leading-[.95] md:leading-[.86]">Launch a coin. <span className="md:block">No presale. No team bag.</span></h2>
            <p className="mt-1.5 md:mt-3 text-[12.5px] md:text-[14px] leading-snug text-white/75 max-w-[40ch]">Every coin starts on the same bonding curve, priced in USDC. The creator gets nothing up front and earns 1% of trades. At 80% sold, the curve closes and the coin graduates.</p>
            <dl className="mt-3 md:mt-5 grid grid-cols-3 gap-3 text-[11px] md:text-[12px]">
              <div><dt className="text-white/60">Supply</dt><dd className="mono mt-0.5 font-bold">1B</dd></div>
              <div><dt className="text-white/60">On the curve</dt><dd className="mono mt-0.5 font-bold">800M</dd></div>
              <div><dt className="text-white/60">Trade fee</dt><dd className="mono mt-0.5 font-bold">1% → creator</dd></div>
            </dl>
          </div>
        </div>
        <form className="panel p-3 md:p-4" onSubmit={(e) => { e.preventDefault(); void launch(); }} aria-describedby="lp-note">
          <button type="button" onClick={() => setCreate((v) => !v)} aria-expanded={create} className="flex w-full items-center gap-2.5 text-left md:hidden">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-lime text-[#0a1a00]"><Plus size={17} strokeWidth={3} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold">Create a coin</span><span className="block truncate text-[11.5px] text-mute">Name, ticker, meme. Live on the curve in one tx.</span></span>
            <ChevronDown size={17} className={`shrink-0 text-mute transition-transform ${create ? 'rotate-180' : ''}`} />
          </button>
          <div className={create ? 'mt-3 md:mt-0' : 'hidden md:block'}>
          <p className="eyebrow hidden md:block">Create a coin</p>
          <div className="mt-0 md:mt-3 flex gap-3">
            <div className="grid h-[5.375rem] w-[5.375rem] shrink-0 max-md:h-[4.75rem] max-md:w-[4.75rem] place-items-center overflow-hidden rounded-[14px] bg-raised text-mute" aria-hidden>{image && imgOk ? <img src={image} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={22} />}</div>
            <div className="min-w-0 flex-1 space-y-2">
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 32))} placeholder="Coin name" aria-label="Coin name" className="h-10 w-full rounded-[10px] bg-raised px-3 text-[14px] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-brand)]" />
              <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} placeholder="TICKER" aria-label="Ticker" className="h-10 w-full rounded-[10px] bg-raised px-3 mono text-[14px] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-brand)]" />
            </div>
          </div>
          {taken && <p className="mt-1.5 text-[12px] text-down">${ticker} is taken on the RAID launchpad.</p>}
          <textarea value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 280))} placeholder="What’s the meme?" aria-label="Description" rows={2} className="mt-2 w-full resize-none rounded-[10px] bg-raised px-3 py-2.5 text-[14px] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-brand)]" />
          <input value={image} onChange={(e) => setImage(e.target.value.trim())} placeholder="Image URL (https:// or ipfs://, optional)" aria-label="Image URL" aria-invalid={!imgOk} className={`mt-2 h-10 w-full rounded-[10px] bg-raised px-3 text-[13px] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-brand)] ${imgOk ? '' : 'shadow-[inset_0_0_0_1.5px_var(--color-down)]'}`} />
          <div className="mt-3 rounded-[12px] hairline p-3">
            <div className="flex items-center justify-between text-[12px]"><span className="text-mute">Bonding curve</span><span className="mono text-faint">price rises as supply sells</span></div>
            <svg viewBox="0 0 200 60" className="mt-2 h-14 w-full" aria-hidden><path d="M0,58 C60,56 110,46 150,26 S190,4 200,2" fill="none" stroke="var(--color-brand)" strokeWidth="2" /><line x1="150" x2="150" y1="0" y2="60" stroke="#c6ff3d" strokeDasharray="3 3" /><text x="146" y="58" textAnchor="end" fontSize="7" fill="var(--color-mute)" fontFamily="monospace">graduates to Rhea</text></svg>
          </div>
          <Button type="submit" size="lg" tone="lime" className="mt-3 w-full" disabled={acct ? !canLaunch : false}>{busy ? 'Waiting for wallet…' : !acct ? 'Connect wallet to launch' : `Launch ${ticker ? `$${ticker}` : 'coin'}`}</Button>
          <p id="lp-note" className="mt-2 text-[11.5px] text-faint">0.05 NEAR storage deposit. {NETWORK === 'testnet' ? 'Testnet: coins and tUSDC have no value. ' : ''}Contract <a className="underline hover:text-ink" href={explorerAccount(LAUNCHPAD_ID, NETWORK)} target="_blank" rel="noreferrer">{shortAddr(LAUNCHPAD_ID)}</a>. Graduation to a Rhea pool isn’t built yet.</p>
          </div>
        </form>
      </section>

      <div className="mt-5 md:mt-8"><h3 className="wide text-[1rem]">On the RAID curve</h3><p className="mt-1 text-[12.5px] text-mute">Coins launched on the RAID launchpad contract, read live from NEAR {NETWORK}.</p></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {coins.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-[10.625rem]" />)}
        {(coins.data ?? []).slice().reverse().map((c, i) => <CoinCard key={c.id} c={c} i={i} onBuy={() => setBuying(c)} now={now} />)}
      </div>
      {coins.error && <ErrorState title="Can’t reach the launchpad contract" retry={() => coins.refetch()} />}
      {!coins.isLoading && !coins.error && !coins.data?.length && <Empty art={<Rocket size={40} className="text-faint" />} title="No RAID coins yet" body="Be the first. Launch one above." />}
      <BuySheet coin={buying} onClose={() => setBuying(null)} />

      <div className="mt-6 md:mt-10 flex flex-wrap items-end justify-between gap-3">
        <div><h3 className="wide text-[1rem]">Cooking on NEAR now</h3><p className="mt-1 text-[12.5px] text-mute">Real fair launches from meme.cooking, NEAR’s live launchpad. Not RAID launches.</p></div>
        <Segmented id="lp" value={f} onChange={setF} options={[{ value: 'live', label: 'Raising' }, { value: 'recent', label: 'Recent' }]} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {l.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[9.375rem]" />)}
        {items.map((x, i) => {
          const live = !x.finalized && x.endsAt > now; const pct = x.raised / Math.max(1, x.softCap);
          return (
            <motion.a key={x.id} href={x.url} target="_blank" rel="noreferrer" className="lift panel block p-3 md:p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="flex items-center gap-3">
                <CoinAvatar symbol={x.symbol} image={x.image} size={44} />
                <div className="min-w-0 flex-1"><p className="wide text-[1rem] truncate">${x.symbol}</p><p className="text-[12px] text-mute truncate">{x.name} · by {shortAddr(x.owner)}</p></div>
                <ArrowUpRight size={16} className="text-mute shrink-0" />
              </div>
              {x.description && <p className="mt-2.5 line-clamp-2 text-[12.5px] text-mute">{x.description}</p>}
              <div className="mt-3 flex items-center justify-between mono text-[11.5px]"><span>{x.raised.toFixed(2)} <span className="text-mute">/ {x.softCap.toFixed(0)} NEAR</span></span><span className={live ? 'text-lime' : 'text-faint'}>{live && now ? `ends ${countdown(x.endsAt - now)}` : pct >= 1 ? 'filled' : 'ended'}</span></div>
              <Bar value={pct} tone="lime" className="mt-2" />
            </motion.a>
          );
        })}
      </div>
      {l.error && <ErrorState title="meme.cooking didn’t answer" retry={() => l.refetch()} />}
      {!l.isLoading && !l.error && !items.length && <Empty art={<Rocket size={40} className="text-faint" />} title="Nothing raising right now" body="No live fair launch on meme.cooking at this moment. Check the Recent tab." />}
    </Shell>
  );
}

function CoinCard({ c, i, onBuy, now }: { c: LaunchCoin; i: number; onBuy: () => void; now: number }) {
  const prog = curveProgress(c);
  return (
    <motion.article className="panel p-3 md:p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
      <div className="flex items-center gap-3">
        <CoinAvatar symbol={c.ticker} image={c.image} size={44} />
        <div className="min-w-0 flex-1"><p className="wide text-[1rem] truncate">${c.ticker}</p><p className="text-[12px] text-mute truncate">{c.name}</p></div>
        {c.graduated ? <span className="chip chip-lime">Graduated</span> : <span className="chip chip-ghost">{c.trades} trades</span>}
      </div>
      {c.description && <p className="mt-2.5 line-clamp-2 text-[12.5px] text-mute">{c.description}</p>}
      <div className="mt-3 grid grid-cols-3 gap-2 mono text-[11.5px]">
        <div><p className="eyebrow">Price</p><p className="mt-1 font-bold">{fmtPrice(coinPrice(c))}</p></div>
        <div><p className="eyebrow">Mcap</p><p className="mt-1 font-bold">{fmtUsd(coinMcap(c))}</p></div>
        <div><p className="eyebrow">Raised</p><p className="mt-1 font-bold">{usdcOf(c.raised).toFixed(2)}</p></div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-mute"><span>Curve {(prog * 100).toFixed(prog < 0.01 ? 2 : 1)}%</span><span className="mono">{c.graduated ? 'closed' : 'graduates at 100%'}</span></div>
      <Bar value={prog} tone="lime" className="mt-1.5" />
      <div className="mt-3 flex items-center gap-2">
        <Identicon seed={c.creator} size={20} className="!rounded-[5px]" /><span className="min-w-0 flex-1 truncate text-[11.5px] text-mute">by {shortAddr(c.creator)}{now ? ` · ${ago(c.created_ms, now)} ago` : ''}</span>
        <Button size="sm" tone="lime" onClick={onBuy} disabled={c.graduated}>Buy</Button>
      </div>
    </motion.article>
  );
}

function BuySheet({ coin, onClose }: { coin: LaunchCoin | null; onClose: () => void }) {
  const [amt, setAmt] = useState('10');
  const [busy, setBusy] = useState(false);
  const acct = useAccount();
  const cfg = useChestConfig();
  const qc = useQueryClient();
  const raw = String(Math.round((Number(amt) || 0) * 1e6));
  const q = useQuery({ queryKey: ['lp-quote', coin?.id, raw], enabled: !!coin && Number(raw) > 0, queryFn: () => launchApi.quoteBuy(coin!.id, raw) });
  const bal = useQuery({ queryKey: ['lp-bal', coin?.id, acct], enabled: !!coin && !!acct, queryFn: () => launchApi.balance(coin!.id, acct!) });
  const unit = NETWORK === 'testnet' ? 'tUSDC' : 'USDC';
  async function buy() {
    if (!coin) return;
    if (!acct) return void connect();
    if (!cfg.data || !q.data) return;
    setBusy(true);
    try {
      await send(launchTx.buy(cfg.data.usdc, coin.id, raw, String(BigInt(q.data) * BigInt(98) / BigInt(100))));
      toast({ title: `Bought $${coin.ticker}`, body: `${amt} ${unit} on the curve.`, tone: 'lime' });
      void qc.invalidateQueries({ queryKey: ['lp-coins'] }); onClose();
    } catch (e) { if ((e as Error).message !== 'connect_wallet') toast({ title: 'Wallet didn’t sign', body: (e as Error).message.slice(0, 120), tone: 'down' }); }
    finally { setBusy(false); }
  }
  return (
    <Modal open={!!coin} onClose={onClose} label={coin ? `Buy $${coin.ticker}` : 'Buy'}>
      {coin && (
        <div className="p-4 md:p-5">
          <div className="flex items-center gap-3 pr-10"><CoinAvatar symbol={coin.ticker} image={coin.image} size={44} /><div><p className="eyebrow">Buy on the curve</p><p className="wide text-[1.375rem]">${coin.ticker}</p></div></div>
          <label className="mt-4 flex h-12 md:h-14 items-center gap-2 rounded-[11px] md:rounded-[12px] bg-raised px-3.5 md:px-4 focus-within:shadow-[inset_0_0_0_1.5px_var(--color-brand)]">
            <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ''))} aria-label={`Amount in ${unit}`} className="w-full bg-transparent mono text-[1.5rem] font-bold outline-none" />
            <span className="mono text-[12px] text-mute">{unit}</span>
          </label>
          <div className="mt-3 rounded-[12px] hairline p-3 mono text-[12.5px]">
            <div className="flex justify-between"><span className="text-mute">You get</span><span className="font-bold">{q.data ? (Number(q.data) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '…'} {coin.ticker}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-mute">Fee to creator</span><span>{((Number(amt) || 0) * 0.01).toFixed(2)} {unit}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-mute">Slippage guard</span><span>2%</span></div>
            {acct && <div className="mt-1 flex justify-between"><span className="text-mute">You hold</span><span>{bal.data ? (Number(bal.data) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'}</span></div>}
          </div>
          <Button size="lg" tone="lime" className="mt-4 w-full" disabled={busy || !q.data} onClick={buy}>{busy ? 'Waiting for wallet…' : acct ? `Buy with ${amt || 0} ${unit}` : 'Connect wallet to buy'}</Button>
          <p className="mt-2 text-[11.5px] text-faint">You can sell back to the curve any time before graduation, minus 1%. You can lose what you put in.</p>
        </div>
      )}
    </Modal>
  );
}
