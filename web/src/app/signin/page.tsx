'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { SignedMessage } from '@called/sdk';
import { Mark } from '@/components/Brand';
import { MarketTile } from '@/components/CategoryIcon';
import { BRAND } from '@/lib/brand';
import { haptic } from '@/lib/fx';
import { useSession } from '@/lib/session';
import { readRedirectSignIn, startSignIn } from '@/lib/wallet';
import { config } from '@/lib/config';
import { useLogin, usePrivy } from '@privy-io/react-auth';

/** Privy login (email, Google, Apple, SMS). Exchanges the Privy access token for a Called session. */
function PrivyButton({ handle, busy, onBusy, onDone, onError }: { handle: string; busy: boolean; onBusy: (b: boolean) => void; onDone: (r: { token: string; created?: boolean }) => void; onError: (m: string) => void }) {
  const { api } = useSession();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const exchange = async () => {
    try {
      const t = await getAccessToken();
      if (!t) throw new Error('no_token');
      onDone(await api.privySignIn(t, handle || undefined));
    } catch (e) {
      onError((e as Error).message.includes('handle_taken') ? 'That handle is taken. Try another.' : 'Sign-in failed. Please try again.');
    }
  };
  const { login } = useLogin({ onComplete: () => void exchange(), onError: () => { onBusy(false); } });
  return (
    <motion.button whileTap={{ scale: 0.97 }} disabled={busy || !ready}
      onClick={() => { onBusy(true); haptic('tap'); if (authenticated) void exchange(); else login(); }}
      className="mt-8 h-[52px] rounded-full text-[16px] font-semibold text-white bg-grape hover:brightness-110 disabled:opacity-60">
      {busy ? 'Signing in…' : 'Continue with email or Google'}
    </motion.button>
  );
}

function LivePreview() {
  const { api } = useSession();
  const q = useQuery({ queryKey: ['markets', 'called', 'signin'], queryFn: () => api.markets({ venue: 'called', sort: 'volume' }) });
  return (
    <div className="space-y-2.5">
      {(q.data?.items ?? []).slice(0, 4).map((m, i) => {
        const p = Math.round(Number(m.price_yes) * 100);
        return (
          <motion.div key={m.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 260, damping: 26 }}
            className="flex items-center gap-3 rounded-2xl border border-ink/[.07] bg-ink/[.03] backdrop-blur p-3">
            <MarketTile category={m.category} image={m.image_url} size={40} />
            <span className="flex-1 min-w-0 text-[14px] font-medium line-clamp-2">{m.question}</span>
            <span className="text-[16px] font-semibold tabular-nums">{p}%</span>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function SignIn() {
  const { api, setToken, me } = useSession();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'near' | 'demo' | 'privy' | null>(null);
  const [handle, setHandle] = useState('');
  const done = useRef(false);

  const finish = async (s: SignedMessage) => {
    try {
      const r = await api.signIn(s, handle || undefined);
      done.current = true;
      setToken(r.token);
      haptic('success');
      router.push(r.created ? '/welcome' : '/');
    } catch (e) {
      haptic('error');
      setErr((e as Error).message.includes('handle_taken') ? 'That handle is taken. Try another.' : 'Sign-in failed. Please try again.');
    } finally { setBusy(null); }
  };
  const demo = async () => {
    setErr(null); setBusy('demo'); haptic('tap');
    try {
      const r = await api.demoSignIn();
      done.current = true;
      setToken(r.token);
      router.push('/welcome?demo=1');
    } catch {
      haptic('error'); setErr('Demo is not available right now.'); setBusy(null);
    }
  };

  useEffect(() => {
    const s = readRedirectSignIn();
    if (s) void Promise.resolve(s).then(finish);
    else if (config.demo && new URLSearchParams(location.search).get('demo') === '1') void Promise.resolve().then(demo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (me && !done.current) router.replace('/'); }, [me, router]);

  return (
    <main className="min-h-dvh grid md:grid-cols-2 bg-bg">
      <aside className="hidden md:flex relative overflow-hidden flex-col justify-between p-12 border-r border-line">
        <div className="relative flex items-center gap-2.5"><Mark size={32} /><span className="text-[20px] font-semibold tracking-[-0.03em]">{BRAND.name}</span></div>
        <div className="relative max-w-[440px]">
          <h2 className="text-[44px] leading-[1.02] font-semibold tracking-[-0.04em]">The market for<br />what happens next.</h2>
          <p className="mt-4 text-[16px] text-mute">Live odds on sports, crypto and culture. Settled by a verifiable AI judge.</p>
          <div className="mt-10"><LivePreview /></div>
        </div>
        <p className="relative text-[12px] text-mute">© {new Date().getFullYear()} {BRAND.name}</p>
      </aside>
      <section className="flex flex-col justify-center px-6 py-12 max-w-[400px] w-full mx-auto">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}><Mark size={52} /></motion.div>
        <h1 className="mt-8 text-[32px] leading-[1.08] font-semibold tracking-[-0.035em]">Sign in to {BRAND.name}</h1>
        <p className="mt-2 text-[15px] text-mute">{config.privyAppId ? 'Email, Google or Apple. No seed phrase, no wallet needed.' : 'Use your NEAR account. No password, no seed phrase to type.'}</p>

        {config.privyAppId && (
          <PrivyButton handle={handle} busy={busy === 'privy'} onBusy={(b) => setBusy(b ? 'privy' : null)}
            onDone={(r) => { done.current = true; setToken(r.token); haptic('success'); router.push(r.created ? '/welcome' : '/'); }}
            onError={(m) => { haptic('error'); setErr(m); setBusy(null); }} />
        )}
        {config.demo && (<>
          <motion.button whileTap={{ scale: 0.97 }} disabled={!!busy} onClick={() => void demo()}
            className="mt-8 h-[52px] rounded-full text-[16px] font-semibold text-white bg-grape hover:brightness-110 disabled:opacity-60">
            {busy === 'demo' ? 'Opening demo…' : 'Try demo'}
          </motion.button>
          <p className="mt-2 text-center text-[12px] text-mute">One tap. Funded play account with live positions.</p>
        </>)}
        {!config.privyAppId && !config.demo && !config.nearSignIn && <p className="mt-8 text-[14px] text-coral">Sign-in is not configured yet.</p>}

        {config.nearSignIn && (config.privyAppId || config.demo) && <div className="my-7 flex items-center gap-3 text-[12px] text-mute"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>}

        <label className={`block ${config.privyAppId && !config.nearSignIn ? 'mt-6' : ''}`}>
          <span className="text-[13px] text-mute">Handle for new accounts</span>
          <div className="mt-1.5 flex items-center h-12 rounded-xl border border-line bg-panel px-4 focus-within:border-grape transition-colors">
            <span className="text-mute">@</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))} placeholder="yourname"
              className="ml-0.5 flex-1 bg-transparent text-[15px] outline-none" />
          </div>
        </label>
        {config.nearSignIn && <motion.button whileTap={{ scale: 0.97 }} disabled={!!busy}
          onClick={() => { setErr(null); setBusy('near'); void startSignIn(api, finish).catch(() => { setBusy(null); setErr('Could not open the wallet.'); }); }}
          className="mt-3 h-[52px] cuts bg-grape text-white text-[16px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path d="M17.4 3.6 13.6 9.2a.4.4 0 0 0 .6.5l3.7-3.2a.15.15 0 0 1 .25.11v10.1a.15.15 0 0 1-.27.1L6.7 3.98A1.9 1.9 0 0 0 5.2 3.3h-.4A1.9 1.9 0 0 0 2.9 5.2v13.6a1.9 1.9 0 0 0 3.5 1l3.8-5.6a.4.4 0 0 0-.6-.5l-3.7 3.2a.15.15 0 0 1-.25-.11V6.6a.15.15 0 0 1 .27-.1l11.1 13.5a1.9 1.9 0 0 0 1.5.7h.4a1.9 1.9 0 0 0 1.9-1.9V5.2a1.9 1.9 0 0 0-3.5-1Z" fill="currentColor" /></svg>
          {busy === 'near' ? 'Waiting for wallet…' : 'Continue with NEAR'}
        </motion.button>}
        {err && <p role="alert" className="mt-4 text-[14px] text-coral">{err}</p>}
        <p className="mt-8 text-[12px] text-mute">By continuing you agree to the terms. Real-money features depend on your region.</p>
      </section>
    </main>
  );
}
