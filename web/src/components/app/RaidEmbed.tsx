'use client';
/** A raid embedded in a post: coin, line, the five-step loop, pot, crew size and the clock. Everything read from the chest. */
import Link from 'next/link';
import { Users } from 'lucide-react';
import { CoinAvatar } from '../ui';
import { useBackers, useNow, useRaids } from '@/lib/hooks';
import { phase, STEPS, stepIndex, target, usdcOf, xLabel, type Raid } from '@/lib/raid';
import { raidClock } from './Radar';

export function Loop({ r, className = '' }: { r: Raid; className?: string }) {
  const at = stepIndex(r);
  const miss = r.status === 'Closed' && !r.hit;
  return (
    <div className={`grid grid-cols-5 gap-1 ${className}`} aria-label={`Step ${at + 1} of 5: ${STEPS[at]}`}>
      {STEPS.map((s, i) => (
        <span key={s} className="min-w-0">
          <span className={`block h-[5px] rounded-full ${i < at || (i === at && r.status === 'Closed') ? (miss && i >= 3 ? 'bg-faint' : 'bg-signal') : i === at ? 'bg-signal/45 animate-pulse' : 'bg-line'}`} />
          <span className={`mt-1.5 block truncate text-[10.5px] ${i === at ? 'font-semibold text-ink' : 'text-faint'}`}>{i === 3 && miss ? 'Retreat' : s}</span>
        </span>
      ))}
    </div>
  );
}

export function outcome(r: Raid) {
  const pot = usdcOf(r.pot), back = usdcOf(r.for_backers ?? '0');
  return r.status === 'Closed' && pot > 0 && back > 0 ? back / pot : null;
}

export function RaidEmbedView({ r, className = '' }: { r: Raid; className?: string }) {
  const now = useNow();
  const crew = useBackers(r.id);
  const t = target(r);
  const ph = now ? phase(r, now) : null;
  const x = outcome(r);
  return (
    <Link href={`/raids/${r.id}`} className={`press block rounded-[22px] border border-line bg-panel p-4 transition hover:border-faint ${className}`}>
      <div className="flex items-center gap-3">
        <CoinAvatar symbol={t.symbol} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold tracking-[-0.02em]">${t.symbol} to {xLabel(r.target_x_bps)}</p>
          <p className="truncate text-[13px] text-mute">Raid #{r.id} · {ph?.label ?? ' '}</p>
        </div>
        <div className="text-right">
          <p className={`mono text-[15px] font-semibold ${r.status === 'Closed' ? (r.hit ? 'text-lime' : 'text-mute') : 'text-ink'}`}>{x ? `${x.toFixed(2)}x` : raidClock(r, now) || ' '}</p>
          <p className="text-[11.5px] text-faint">{x ? 'paid to crew' : r.status === 'Open' && now && now < r.opens_until_ms ? 'crew closes' : r.status === 'Open' ? 'buy in' : ''}</p>
        </div>
      </div>
      <Loop r={r} className="mt-4" />
      <div className="mt-3.5 flex items-center gap-4 text-[13px] text-mute">
        <span><b className="mono font-semibold text-ink">{usdcOf(r.pot).toFixed(0)}</b> tUSDC pot</span>
        <span className="flex items-center gap-1"><Users size={14} /><b className="mono font-semibold text-ink">{crew.data?.length ?? '–'}</b> crew</span>
      </div>
    </Link>
  );
}

export function RaidEmbed({ id, className = '' }: { id: number; className?: string }) {
  const raids = useRaids();
  const r = raids.data?.find((x) => x.id === id);
  if (!r) return raids.isLoading ? <div className={`shimmer h-[150px] rounded-[22px] ${className}`} /> : null;
  return <RaidEmbedView r={r} className={className} />;
}
