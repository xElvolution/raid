'use client';
import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ImagePlus, Rocket } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Bar, Button, CoinAvatar, Empty, ErrorState, Segmented, Skeleton } from '@/components/ui';
import { useLaunches, countdown, shortAddr } from '@/lib/market';
import { useNow } from '@/lib/hooks';

export default function LaunchPage() {
  const now = useNow();
  const l = useLaunches();
  const [f, setF] = useState<'live' | 'recent'>('live');
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const items = (l.data ?? []).filter((x) => (f === 'live' ? !x.finalized && x.endsAt > now : true));
  return (
    <Shell title="Launch">
      <section className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
        <div className="cobalt-field relative overflow-hidden rounded-[18px] p-5 md:p-6">
          <div className="dots absolute inset-0 opacity-50" />
          <div className="relative">
            <span className="chip chip-lime">Coming soon · not live</span>
            <h2 className="wide-black mt-4 text-[38px] md:text-[48px] leading-[.86]">Launch a coin.<br />Get paid to raid it.</h2>
            <p className="mt-3 text-[14px] text-white/75 max-w-[40ch]">A bonding-curve launchpad on NEAR. Callers who bring buyers earn a cut of the curve’s fees, locked until the coin graduates. The launchpad contract isn’t deployed yet, so nothing below can be submitted.</p>
          </div>
        </div>
        <form className="panel p-4" onSubmit={(e) => e.preventDefault()} aria-describedby="lp-note">
          <p className="eyebrow">Create a coin</p>
          <div className="mt-3 flex gap-3">
            <div className="grid h-[86px] w-[86px] shrink-0 place-items-center rounded-[14px] bg-raised text-mute" aria-hidden><ImagePlus size={22} /></div>
            <div className="min-w-0 flex-1 space-y-2">
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 32))} placeholder="Coin name" aria-label="Coin name" className="h-10 w-full rounded-[10px] bg-raised px-3 text-[14px] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-brand)]" />
              <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} placeholder="TICKER" aria-label="Ticker" className="h-10 w-full rounded-[10px] bg-raised px-3 mono text-[14px] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-brand)]" />
            </div>
          </div>
          <textarea placeholder="What’s the meme?" aria-label="Description" rows={2} className="mt-2 w-full resize-none rounded-[10px] bg-raised px-3 py-2.5 text-[14px] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-brand)]" />
          <div className="mt-3 rounded-[12px] hairline p-3">
            <div className="flex items-center justify-between text-[12px]"><span className="text-mute">Bonding curve preview</span><span className="mono text-faint">illustration</span></div>
            <svg viewBox="0 0 200 60" className="mt-2 h-14 w-full" aria-hidden><path d="M0,58 C60,56 110,46 150,26 S190,4 200,2" fill="none" stroke="var(--color-brand)" strokeWidth="2" /><line x1="150" x2="150" y1="0" y2="60" stroke="#c6ff3d" strokeDasharray="3 3" /><text x="146" y="58" textAnchor="end" fontSize="7" fill="var(--color-mute)" fontFamily="monospace">graduates to Rhea</text></svg>
          </div>
          <Button type="submit" size="lg" tone="lime" className="mt-3 w-full" disabled>Launch {ticker ? `$${ticker}` : 'coin'} · coming soon</Button>
          <p id="lp-note" className="mt-2 text-[11.5px] text-faint">The RAID launchpad contract is still being built. No coins have been launched on RAID yet.</p>
        </form>
      </section>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div><h3 className="wide text-[16px]">Cooking on NEAR now</h3><p className="mt-1 text-[12.5px] text-mute">Real fair launches from meme.cooking, NEAR’s live launchpad. Not RAID launches.</p></div>
        <Segmented id="lp" value={f} onChange={setF} options={[{ value: 'live', label: 'Raising' }, { value: 'recent', label: 'Recent' }]} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {l.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[150px]" />)}
        {items.map((x, i) => {
          const live = !x.finalized && x.endsAt > now; const pct = x.raised / Math.max(1, x.softCap);
          return (
            <motion.a key={x.id} href={x.url} target="_blank" rel="noreferrer" className="lift panel block p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="flex items-center gap-3">
                <CoinAvatar symbol={x.symbol} image={x.image} size={44} />
                <div className="min-w-0 flex-1"><p className="wide text-[16px] truncate">${x.symbol}</p><p className="text-[12px] text-mute truncate">{x.name} · by {shortAddr(x.owner)}</p></div>
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
