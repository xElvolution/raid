/** Called icon set: Lucide, one stroke weight (1.75). `filled` = active state (heavier stroke, filled where the glyph allows). */
import type { SVGProps } from 'react';
import {
  Bell, BarChart3, Plus, Compass, Trophy, User, Layers, Clock, Check, X, Zap, ShieldCheck, Sparkles, Search, Users, Wallet,
  MessageCircle, Repeat2, Heart, Share, Bookmark, MoreHorizontal, ArrowUpRight, Copy, ArrowLeft, Settings, Home as HomeIco, type LucideIcon,
} from 'lucide-react';

type P = SVGProps<SVGSVGElement> & { size?: number; filled?: boolean };
const base = (size: number, rest: SVGProps<SVGSVGElement>) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...rest });
export const STROKE = 1.75;

function wrap(I: LucideIcon, fillable = false) {
  const C = ({ size = 24, filled, ...r }: P) => (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <I size={size} strokeWidth={filled ? 2.25 : STROKE} fill={filled && fillable ? 'currentColor' : 'none'} aria-hidden {...(r as any)} />
  );
  return C;
}

export const IconHome = wrap(HomeIco, true);
export const IconMarkets = wrap(BarChart3);
export const IconPlus = wrap(Plus);
export const IconGlobe = wrap(Compass);
export const IconTrophy = wrap(Trophy);
export const IconBell = wrap(Bell, true);
export const IconUser = wrap(User, true);
export const IconCards = wrap(Layers);
export const IconClock = wrap(Clock);
export const IconCheck = wrap(Check);
export const IconX = wrap(X);
export const IconBolt = wrap(Zap, true);
export const IconShield = wrap(ShieldCheck);
export const IconSpark = wrap(Sparkles);
export const IconSearch = wrap(Search);
export const IconUsers = wrap(Users);
export const IconWallet = wrap(Wallet);
export const IconReply = wrap(MessageCircle);
export const IconRepost = wrap(Repeat2);
export const IconHeart = wrap(Heart, true);
export const IconShare = wrap(Share);
export const IconBookmark = wrap(Bookmark, true);
export const IconMore = wrap(MoreHorizontal);
export const IconExternal = wrap(ArrowUpRight);
export const IconCopy = wrap(Copy);
export const IconBack = wrap(ArrowLeft);
export const IconSettings = wrap(Settings);

export const Flame = ({ size = 24, lit = true }: { size?: number; lit?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2.5c1 3.5 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.5 1.2-4 2.5-5 .2 1.6.9 2.6 2 3-.6-3.4.2-6.4 1-9z" fill={lit ? '#ff8a3d' : '#23252c'} />
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
