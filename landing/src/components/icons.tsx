/** Called icon set: rounded 24px glyphs, `filled` for active states. No emoji anywhere in the chrome. */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number; filled?: boolean };
const base = (size: number, rest: SVGProps<SVGSVGElement>) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...rest });

export const IconHome = ({ size = 24, filled, ...r }: P) => <svg {...base(size, r)}><path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z" fill={filled ? 'currentColor' : 'none'} /></svg>;
export const IconMarkets = ({ size = 24, filled, ...r }: P) => <svg {...base(size, r)}><rect x="3.5" y="12" width="4" height="8.5" rx="1.5" fill={filled ? 'currentColor' : 'none'} /><rect x="10" y="7" width="4" height="13.5" rx="1.5" fill={filled ? 'currentColor' : 'none'} /><rect x="16.5" y="3.5" width="4" height="17" rx="1.5" fill={filled ? 'currentColor' : 'none'} /></svg>;
export const IconPlus = ({ size = 24, ...r }: P) => <svg {...base(size, { strokeWidth: 3, ...r })}><path d="M12 5v14M5 12h14" /></svg>;
export const IconGlobe = ({ size = 24, filled, ...r }: P) => <svg {...base(size, r)}><circle cx="12" cy="12" r="8.5" fill={filled ? 'currentColor' : 'none'} /><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5s1.1-5.9 3.6-8.5z" stroke={filled ? '#fff' : 'currentColor'} /></svg>;
export const IconTrophy = ({ size = 24, filled, ...r }: P) => <svg {...base(size, r)}><path d="M7 4h10v5a5 5 0 0 1-10 0z" fill={filled ? 'currentColor' : 'none'} /><path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10.5M17 6h2.5v1.5a3 3 0 0 1-3 3M12 14v3.5M8.5 20.5h7M9.5 17.5h5" /></svg>;
export const IconBell = ({ size = 24, filled, ...r }: P) => <svg {...base(size, r)}><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" fill={filled ? 'currentColor' : 'none'} /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></svg>;
export const IconUser = ({ size = 24, filled, ...r }: P) => <svg {...base(size, r)}><circle cx="12" cy="8" r="4" fill={filled ? 'currentColor' : 'none'} /><path d="M4.5 20.5c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6z" fill={filled ? 'currentColor' : 'none'} /></svg>;
export const IconCards = ({ size = 24, filled, ...r }: P) => <svg {...base(size, r)}><rect x="7" y="3.5" width="12" height="16" rx="2.5" transform="rotate(8 13 11.5)" /><rect x="4.5" y="4.5" width="12" height="16" rx="2.5" fill={filled ? 'currentColor' : '#fff'} /></svg>;
export const IconClock = ({ size = 24, ...r }: P) => <svg {...base(size, r)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
export const IconCheck = ({ size = 24, ...r }: P) => <svg {...base(size, { strokeWidth: 3.2, ...r })}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const IconX = ({ size = 24, ...r }: P) => <svg {...base(size, { strokeWidth: 3.2, ...r })}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const IconBolt = ({ size = 24, ...r }: P) => <svg {...base(size, r)}><path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" fill="currentColor" /></svg>;
export const IconShield = ({ size = 24, ...r }: P) => <svg {...base(size, r)}><path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>;
export const IconSpark = ({ size = 24, ...r }: P) => <svg {...base(size, r)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;

/** Animated-ready flame glyph used by the streak counter. */
export const Flame = ({ size = 24, lit = true }: { size?: number; lit?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2.5c1 3.5 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.5 1.2-4 2.5-5 .2 1.6.9 2.6 2 3-.6-3.4.2-6.4 1-9z" fill={lit ? '#ff8a3d' : '#d9d3e6'} />
    <path d="M12 12.5c.6 1.5 2.5 2.4 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.3.9-2.4 2.5-4.6z" fill={lit ? '#ffc83d' : '#ece8f5'} />
  </svg>
);
export const Gem = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M7 3.5h10l4 5.5-9 11.5L3 9z" fill="#3da9ff" /><path d="M3 9h18M7 3.5 12 20.5 17 3.5M9.5 9 12 3.5 14.5 9" stroke="#1f8be0" strokeWidth="1.2" fill="none" strokeLinejoin="round" /><path d="M7 3.5h4.5L9.5 9H3z" fill="#7cc6ff" />
  </svg>
);
export const Coin = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9.5" fill="#ffc83d" /><circle cx="12" cy="12" r="6.5" fill="none" stroke="#e5a500" strokeWidth="2" /><path d="M12 8.5v7" stroke="#e5a500" strokeWidth="2.4" strokeLinecap="round" /></svg>
);
