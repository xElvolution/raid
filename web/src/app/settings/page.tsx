'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { HAPTICS_KEY, hapticsOn, setHaptics } from '@/lib/fx';
import { LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { CutButton } from '@/components/bc';
import { Shell } from '@/components/Shell';
import { useSession } from '@/lib/session';
import { useTheme, type ThemePref } from '@/lib/theme';
import { TLink as Link } from '@/lib/transition';

const MODES: [ThemePref, string, LucideIcon][] = [['system', 'System', Monitor], ['dark', 'Night game', Moon], ['light', 'Matchday', Sun]];

export default function SettingsPage() {
  const { me, signOut } = useSession();
  const { pref, setPref } = useTheme();
  const router = useRouter();
  return (
    <Shell title="Settings" back>
      <section className="px-4 pt-4">
        <h2 className="cd text-[22px]">Appearance</h2>
        <p className="mt-0.5 text-[14px] text-mute">System follows your device. Night game is the black broadcast; Matchday is the bright daytime look.</p>
        <div className="mt-3 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Theme">
          {MODES.map(([k, l, I]) => (
            <button key={k} role="radio" aria-checked={pref === k} onClick={(e) => setPref(k, { x: e.clientX, y: e.clientY })}
              className={`press relative cut-tr flex h-[88px] flex-col items-start justify-between p-2.5 ${pref === k ? 'bg-grape text-white' : 'bg-panel'}`}>
              <I size={20} strokeWidth={2} />
              <span className="cd text-[19px]">{l}</span>
              {pref === k && <motion.i layoutId="tsel" className="absolute right-2 top-2 h-2 w-2 bg-white" />}
            </button>
          ))}
        </div>
      </section>
      <HapticsRow />
      {me && (
        <section className="px-4 pt-7">
          <h2 className="cd text-[22px]">Account</h2>
          <div className="mt-2 divide-y divide-line border-y border-line">
            <Row href={`/u/${me.handle}`} k="Caller card" v={`@${me.handle}`} />
            <Row href="/settings/profile" k="Edit card" v="Name, bio, links" />
            <Row href="/portfolio" k="Wallet" v={me.near_account ?? 'NEAR testnet'} />
          </div>
          <CutButton tone="snow" size="md" className="mt-6 w-full text-coral" onClick={() => { signOut(); router.push('/'); }}><LogOut size={18} />Sign out</CutButton>
        </section>
      )}
      <p className="mn px-4 pt-8 pb-10 text-[11px] text-mute">CALLED · PLAY MONEY ON TESTNET</p>
    </Shell>
  );
}

function Row({ href, k, v }: { href: string; k: string; v: string }) {
  return <Link href={href} className="flex h-12 items-center justify-between"><span className="text-[15px] font-semibold">{k}</span><span className="mn truncate pl-4 text-[12px] text-mute">{v}</span></Link>;
}

const hapticSubs = new Set<() => void>();
function HapticsRow() {
  const on = useSyncExternalStore(
    (cb) => { hapticSubs.add(cb); const st = (e: StorageEvent) => { if (e.key === HAPTICS_KEY) cb(); }; addEventListener('storage', st); return () => { hapticSubs.delete(cb); removeEventListener('storage', st); }; },
    hapticsOn, () => true,
  );
  const flip = () => { setHaptics(!on); hapticSubs.forEach((f) => f()); };
  return (
    <section className="px-4 pt-7">
      <h2 className="cd text-[22px]">Feel</h2>
      <button role="switch" aria-checked={on} onClick={flip} className="press mt-2 flex w-full items-center justify-between border-y border-line py-3 text-left">
        <span><span className="block text-[15px] font-semibold">Haptics</span><span className="block text-[13px] text-mute">Taps, fills and wins buzz on supported phones. Motion follows your device&apos;s reduce-motion setting.</span></span>
        <span className={`cuts relative h-7 w-12 shrink-0 ${on ? 'bg-grape' : 'bg-snow'}`}>
          <motion.i layout transition={{ type: 'spring', stiffness: 700, damping: 30 }} className={`absolute top-1 h-5 w-5 bg-white ${on ? 'right-1' : 'left-1'}`} />
        </span>
      </button>
    </section>
  );
}
