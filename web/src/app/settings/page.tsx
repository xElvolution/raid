'use client';
/** Settings: account and wallets, profile, network, test funds (testnet), notifications, theme. */
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight, Droplets, ExternalLink, Globe, Sparkles, LogOut, Moon, Palette, Sun, User, Wallet } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Avatar } from '@/components/app/Avatar';
import { useSocialAuth } from '@/components/Social';
import { NETS, NET, setNet, type Net } from '@/lib/net';
import { posts, API, signOutSocial } from '@/lib/social';
import { useTheme, type ThemePref } from '@/lib/theme';
import { usePrefs, setPrefs } from '@/lib/prefs';
import { toast } from '@/lib/bus';
import { connect, disconnect, isTestAccount, useAccount } from '@/lib/wallet';
import { useBalances } from '@/components/app/Funds';
import { StepSheet, openClaim, readClaim, claimSheet } from '@/components/app/Flow';

function Section({ icon, title, sub, children, id }: { icon: ReactNode; title: string; sub?: string; children: ReactNode; id?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (id && location.hash === `#${id}`) { const t = setTimeout(() => setOpen(true), 0); return () => clearTimeout(t); } }, [id]);
  return (
    <>
      <button id={id} onClick={() => setOpen(true)} className="flex w-full items-center gap-3 border-b border-line py-3.5 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-raised text-ink">{icon}</span>
        <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-semibold">{title}</span>{sub && <span className="block truncate text-[12.5px] text-mute">{sub}</span>}</span>
        <ChevronRight size={17} className="text-faint" />
      </button>
      <StepSheet open={open} onClose={() => setOpen(false)} label={title} step={0} total={1}><div className="pt-2">{children}</div></StepSheet>
    </>
  );
}
function Row({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return <div className="flex items-center justify-between gap-3 py-1.5 text-[13.5px]"><span className="text-mute">{k}</span><span className={`min-w-0 truncate text-right ${mono ? 'mono text-[12px]' : ''}`}>{v}</span></div>;
}
function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-3 py-2 text-left">
      <span className="min-w-0 flex-1"><span className="block text-[14px]">{label}</span>{sub && <span className="block text-[12px] text-mute">{sub}</span>}</span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-signal' : 'bg-line'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} /></span>
    </button>
  );
}

const CLAIM = 'raid.faucet-claim';
export default function SettingsPage() {
  const acct = useAccount();
  const { sess, ensure, busy } = useSocialAuth();
  const { pref, setPref } = useTheme();
  const prefs = usePrefs();
  const bal = useBalances(acct);
  const [claim, setClaim] = useState<{ at: number; next_at: number; msg: string } | null>(null);
  useEffect(() => { const f = () => setClaim(readClaim(acct)); const t = setTimeout(f, 0); const off = claimSheet.on(() => setTimeout(f, 4000)); return () => { clearTimeout(t); off(); }; }, [acct]);
  const me = useQuery({ queryKey: ['me', sess?.handle], enabled: !!sess, queryFn: () => posts.profile(sess!.handle) });
  const [name, setName] = useState(''), [bio, setBio] = useState(''), [avatar, setAvatar] = useState<string | null>(null), [saving, setSaving] = useState(false);
  useEffect(() => { if (me.data) { const t = setTimeout(() => { setName(me.data!.display_name ?? ''); setBio(me.data!.bio ?? ''); setAvatar(me.data!.avatar_url); }, 0); return () => clearTimeout(t); } }, [me.data]);
  const file = useRef<HTMLInputElement>(null);

  async function save() {
    if (!(await ensure())) return;
    setSaving(true);
    try {
      let avatar_url = avatar ?? undefined;
      if (avatar && avatar.startsWith('data:')) avatar_url = API + (await posts.upload(avatar)).url;
      await posts.updateProfile({ display_name: name.trim() || undefined, bio: bio.trim(), ...(avatar_url ? { avatar_url } : {}) });
      toast({ title: 'Profile saved', tone: 'lime' }); void me.refetch();
    } catch (e) { toast({ title: 'Couldn’t save', body: (e as Error).message, tone: 'down' }); }
    finally { setSaving(false); }
  }
  const [now, setNow] = useState(0);
  useEffect(() => { const f = () => setNow(Date.now()); const t = setTimeout(f, 0); const i = setInterval(f, 60_000); return () => { clearTimeout(t); clearInterval(i); }; }, [claim]);
  const cooling = claim && now && claim.next_at > now;
  return (
    <Shell title="Settings" back="/feed">
      <section className="border-b border-line py-4">
        {acct ? (
          <>
            <div className="flex items-center gap-3"><Avatar id={acct} size={40} /><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold">{acct}</p><p className="text-[12px] text-mute">{isTestAccount() ? 'Browser account on testnet (key kept in this browser)' : 'NEAR wallet'} · {NET.label}</p></div></div>
            <Row k="NEAR" v={bal.data ? bal.data.near.toFixed(3) : '…'} mono />
            <Row k={NET.net === 'testnet' ? 'Test USDC' : 'USDC'} v={bal.data ? bal.data.usdc.toFixed(2) : '…'} mono />
            <Row k="Feed sign-in" v={sess ? `@${sess.handle}` : <button disabled={busy} onClick={() => void ensure()} className="font-semibold text-lime">{busy ? 'Check wallet…' : 'Sign in to post'}</button>} />
            <div className="mt-2 flex gap-2">
              <Link href={`/u/${acct}`} className="press flex h-10 flex-1 items-center justify-center rounded-full text-[13.5px] font-semibold hairline">View profile</Link>
              <button onClick={() => { signOutSocial(); void disconnect(); }} className="press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-[13.5px] font-semibold text-down hairline"><LogOut size={15} />Sign out</button>
            </div>
          </>
        ) : <button onClick={() => void connect()} className="press h-11 w-full rounded-full btn-signal text-[14px] font-semibold">Sign in</button>}
      </section>

      {NET.net === 'testnet' && (
        <Section id="funds" icon={<Droplets size={17} />} title="Get test funds" sub="Free test NEAR and USDC, once a day">
          <p className="text-[13px] leading-relaxed text-mute">Free test NEAR for fees and 500 test USDC to raid with, once a day. Test tokens have no value.</p>
          <button disabled={!!cooling} onClick={() => openClaim()} className="press mt-3 h-11 w-full rounded-full btn-signal text-[14px] font-semibold disabled:opacity-55">{!acct ? 'Sign in to claim' : cooling ? `Claimed · next in ${Math.ceil((claim!.next_at - now) / 3600_000)}h` : 'Claim test funds'}</button>
          {claim && <p className="mt-2 text-[12px] text-mute">Last claim {new Date(claim.at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}: {claim.msg}</p>}
        </Section>
      )}

      <Section icon={<User size={17} />} title="Edit profile" sub="Name, bio and picture">
        {!sess ? <p className="text-[13px] text-mute">{acct ? <button onClick={() => void ensure()} className="font-semibold text-lime">Sign in to the feed</button> : 'Sign in'} to edit your name, bio and picture.</p> : (
          <div className="grid gap-2.5">
            <div className="flex items-center gap-3">
              {avatar ? <img src={avatar} alt="" className="h-14 w-14 rounded-full object-cover" /> : <Avatar id={acct} size={56} />}
              <input ref={file} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setAvatar(String(r.result)); r.readAsDataURL(f); }} />
              <button onClick={() => file.current?.click()} className="press h-9 rounded-full px-4 text-[13px] font-semibold hairline">Change picture</button>
            </div>
            <label className="text-[12px] text-mute">Name<input value={name} onChange={(e) => setName(e.target.value.slice(0, 50))} className="mt-1 h-10 w-full rounded-[12px] bg-raised px-3 text-[14px] text-ink outline-none" /></label>
            <label className="text-[12px] text-mute">Bio<textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} rows={3} className="mt-1 w-full resize-none rounded-[12px] bg-raised px-3 py-2 text-[14px] text-ink outline-none" /></label>
            <button disabled={saving} onClick={() => void save()} className="press h-10 rounded-full bg-ink text-[13.5px] font-semibold text-bg disabled:opacity-60">{saving ? 'Saving…' : 'Save profile'}</button>
          </div>
        )}
      </Section>

      <Section icon={<Globe size={17} />} title="Network" sub={`${NET.label}${NET.live ? "" : " · browsing only"}`}>
        <div className="grid grid-cols-2 gap-2">
          {(['testnet', 'mainnet'] as Net[]).map((n) => (
            <button key={n} onClick={() => n !== NET.net && setNet(n)} className={`rounded-[14px] p-3 text-left ${NET.net === n ? 'bg-ink text-bg' : 'hairline'}`}>
              <span className="block text-[14px] font-semibold">{NETS[n].label}</span>
              <span className={`block text-[11.5px] ${NET.net === n ? 'opacity-70' : 'text-mute'}`}>{NETS[n].live ? 'Live' : 'Launching soon'}</span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Row k="Raid contract" v={NET.chest ?? 'not deployed yet'} mono />
          {NET.core && <Row k="Raid core (v2)" v={NET.core} mono />}
          <Row k="USDC" v={NET.usdc.length > 30 ? `${NET.usdc.slice(0, 10)}…${NET.usdc.slice(-6)}` : NET.usdc} mono />
          <Row k="Swaps" v={NET.intents} mono />
          <Row k="RPC" v={NET.rpc.replace('https://', '')} mono />
        </div>
        {!NET.live && <p className="mt-2 rounded-[12px] bg-raised px-3 py-2 text-[12.5px] text-mute">RAID isn’t live on mainnet yet. You can browse, post and watch prices; starting or joining raids is off until the mainnet contract launches. Switch to Testnet to raid now.</p>}
      </Section>

      <Section icon={<Bell size={17} />} title="Notifications" sub="New raids, targets hit, replies">
        <Toggle on={prefs.newRaids} onChange={(v) => setPrefs({ newRaids: v })} label="New raids" sub="When someone starts a raid" />
        <Toggle on={prefs.hits} onChange={(v) => setPrefs({ hits: v })} label="Targets hit" sub="When a raid sells at its target" />
        <Toggle on={prefs.replies} onChange={(v) => setPrefs({ replies: v })} label="Replies and mentions" />
        <Toggle on={prefs.push} onChange={async (v) => { if (v && typeof Notification !== 'undefined') { const p = await Notification.requestPermission(); if (p !== 'granted') return toast({ title: 'Notifications blocked', body: 'Allow them in your browser settings.', tone: 'down' }); } setPrefs({ push: v }); }} label="System notifications" sub="Alerts even when RAID is in the background" />
      </Section>

      <Section icon={<Palette size={17} />} title="Theme" sub={pref[0].toUpperCase() + pref.slice(1)}>
        <div className="grid grid-cols-3 gap-2">
          {([['light', 'Light', <Sun key="s" size={15} />], ['dark', 'Dark', <Moon key="m" size={15} />], ['system', 'System', <Palette key="p" size={15} />]] as [ThemePref, string, ReactNode][]).map(([k, l, i]) => (
            <button key={k} onClick={(e) => setPref(k, { x: e.clientX, y: e.clientY })} className={`flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-[13.5px] font-semibold ${pref === k ? 'bg-ink text-bg' : 'hairline'}`}>{i}{l}</button>
          ))}
        </div>
      </Section>

      <Link href="/how" className="flex items-center gap-3 border-b border-line py-3.5 text-[14.5px] font-semibold"><span className="grid h-9 w-9 place-items-center rounded-full bg-raised"><Sparkles size={17} /></span><span className="flex-1">How RAID works</span><ChevronRight size={17} className="text-faint" /></Link>
      <a href={`${NET.explorer}/address/${NET.chest ?? ''}`} target="_blank" rel="noreferrer" className="flex items-center justify-between py-4 text-[14px] font-semibold">Raid contract on the explorer<ExternalLink size={15} className="text-faint" /></a>
    </Shell>
  );
}
