'use client';
import { personByAccount, personByHandle } from '@/lib/people';
import { Identicon } from '../ui';

/** Round avatar. Community accounts get a two-tone gradient with initials; any other account a pixel identicon. */
export function Avatar({ id, handle, size = 40, ring = false, className = '' }: { id?: string | null; handle?: string; size?: number; ring?: boolean; className?: string }) {
  const p = personByHandle(handle) ?? personByAccount(id);
  const r = ring ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : '';
  if (p) {
    const ini = p.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return (
      <span className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${r} ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.36, letterSpacing: '-0.03em', background: `radial-gradient(120% 120% at 20% 10%, hsl(${p.hue} 85% 68%), hsl(${(p.hue + 40) % 360} 70% 38%))`, boxShadow: 'inset 0 1px 0 rgb(255 255 255 / .35), inset 0 -2px 6px rgb(0 0 0 / .2)' }} aria-hidden>{ini}</span>
    );
  }
  return <Identicon seed={id ?? handle ?? 'guest'} size={size} className={`!rounded-full ${r} ${className}`} />;
}

export function TestnetChip({ className = '' }: { className?: string }) {
  return <span title="A testnet account that really calls and backs raids on the NEAR testnet chest" className={`inline-flex h-[18px] shrink-0 items-center rounded-full bg-raised px-1.5 mono text-[9.5px] font-medium uppercase tracking-[.06em] text-mute ${className}`}>testnet</span>;
}
