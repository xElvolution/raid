'use client';
import type { DraftRow, MarketCategory } from '@called/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, ChevronRight, Flame, Sparkles, Wand2, Zap } from 'lucide-react';
import { Battle } from '@/components/battle/Battle';
import { Bug, CutButton, Scoreboard, SectionTitle } from '@/components/bc';
import { CATS, THEMES, guessCategory, isPolitical, parseDate, quality, sourceFor, toQuestion, type ThemeKey } from '@/components/create/draft';
import { EXAMPLES, PROMPTS, TOPICS } from '@/components/create/studio-data';
import { Shell } from '@/components/Shell';
import { Avatar, LinkButton } from '@/components/ui';
import { haptic } from '@/lib/fx';
import { useLive } from '@/lib/live-hooks';
import { useSession } from '@/lib/session';

const DATES: { k: string; label: string; days: number }[] = [
  { k: 'auto', label: 'From take', days: 0 }, { k: '1', label: 'Tonight', days: 0.5 }, { k: '7', label: '1 week', days: 7 },
  { k: '30', label: '1 month', days: 30 }, { k: '90', label: '3 months', days: 90 }, { k: 'eoy', label: 'End of year', days: -1 },
];
const STAKES = [0, 5, 10, 25, 50, 100];
const pct = (n: number) => `${Math.round(n * 100)}`;
const dfmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function Meter({ label, v }: { label: string; v: number }) {
  const tone = v >= 0.75 ? 'bg-mint' : v >= 0.45 ? 'bg-[#ffb547]' : 'bg-coral';
  return (
    <div className="min-w-0 flex-1">
      <div className="mn flex justify-between text-[10px] uppercase tracking-[.1em] text-mute"><span>{label}</span><span className="text-ink">{pct(v)}</span></div>
      <div className="mt-1 h-[6px] bg-snow"><motion.div className={`h-full ${tone}`} initial={false} animate={{ width: `${Math.max(4, v * 100)}%` }} transition={{ type: 'spring', stiffness: 200, damping: 26 }} /></div>
    </div>
  );
}

type Opening = { outcome: number; amount: number; status: 'pending' | 'placed' | 'failed'; error: string | null };
const OPEN_ERR: Record<string, string> = { insufficient_balance: 'Not enough play balance', market_closed: 'Market already closed', busy_retry: 'Market busy' };

function DraftCard({ d }: { d: DraftRow & { opening?: Opening | null; market_id?: string | null } }) {
  const { api } = useSession(); const qc = useQueryClient();
  const ok = d.status === 'ready' && d.draft;
  const o = d.opening;
  const retry = useMutation({
    mutationFn: () => api.request<Opening>('POST', `v1/posts/${d.post_id}/opening/retry`),
    onSuccess: () => haptic('success'), onError: () => haptic('error'),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['drafts'] }),
  });
  return (
    <div className="cuts w-[270px] shrink-0 border border-line bg-panel p-3">
      <div className="flex items-center justify-between"><Bug tone={ok ? 'mint' : 'coral'}>{ok ? (d.market_id ? 'Live' : 'Live-ready') : d.status === 'rejected' ? 'Needs work' : 'Failed'}</Bug>
        <span className="mn text-[10px] uppercase text-mute">{new Date(d.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></div>
      <p className="mt-2 line-clamp-3 min-h-[60px] text-[15px] font-bold leading-snug">{d.draft?.question ?? 'Add a date and a clear outcome to make this callable.'}</p>
      {d.draft && <>
        <Scoreboard p={0.5} size="sm" className="mt-2" />
        <div className="mn mt-2 flex justify-between text-[10px] uppercase text-mute"><span>Closes {dfmt(new Date(d.draft.closeMs))}</span><span>Clarity {pct(d.draft.clarity)}</span></div>
      </>}
      {o && (
        <div className={`mn mt-2 flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] uppercase ${o.status === 'failed' ? 'bg-coral/15 text-coral' : o.status === 'placed' ? 'bg-mint/15 text-mint' : 'bg-snow text-mute'}`}>
          <span className="truncate">Opening {o.outcome ? 'YES' : 'NO'} ${o.amount} · {o.status === 'placed' ? 'Placed' : o.status === 'pending' ? 'Waiting for market' : (OPEN_ERR[o.error ?? ''] ?? 'Didn’t go through')}</span>
          {o.status === 'failed' && <button disabled={retry.isPending} onClick={() => retry.mutate()} className="shrink-0 font-bold underline">{retry.isPending ? '…' : 'Retry'}</button>}
        </div>
      )}
      <Link href={d.market_id ? `/markets/${d.market_id}` : `/posts/${d.post_id}`} className="mt-2 flex items-center gap-1 text-[13px] font-bold text-grape">{d.market_id ? 'Open market' : 'Open post'} <ChevronRight size={14} /></Link>
    </div>
  );
}

export default function Create() {
  const { api, me } = useSession(); const router = useRouter(); const qc = useQueryClient();
  const [take, setTake] = useState('');
  const [cat, setCat] = useState<MarketCategory | null>(null);
  const [theme, setTheme] = useState<ThemeKey>('auto');
  const [dateK, setDateK] = useState('auto');
  const [stake, setStake] = useState(10);
  const [side, setSide] = useState<0 | 1>(1);
  const [launching, setLaunching] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const [now] = useState(() => Date.now());
  const failed = useRef(false);
  const drafts = useQuery({ queryKey: ['drafts'], queryFn: () => api.drafts(), enabled: !!me });
  const trending = useQuery({ queryKey: ['trending'], queryFn: () => api.request<{ topics: { tag: string; posts: number }[] }>('GET', 'v1/trending') });
  useLive(me ? (`notifications:${me.id}` as never) : null, (e) => { if (e.type === 'notification' && /^(draft_|opening_)/.test(e.data.kind)) void drafts.refetch(); });

  // Local draft (instant) + debounced server AI preview (authoritative when it answers).
  const close = useMemo(() => {
    const d = DATES.find((x) => x.k === dateK)!;
    if (d.k === 'auto') return parseDate(take, new Date(now));
    if (d.days === -1) return new Date(new Date(now).getFullYear(), 11, 31, 23, 59);
    return new Date(now + d.days * 864e5);
  }, [take, dateK, now]);
  const category = cat ?? guessCategory(take);
  const local = useMemo(() => toQuestion(take, close), [take, close]);
  const q = useMemo(() => quality(take, close), [take, close]);
  const political = isPolitical(take);
  const [ai, setAi] = useState<{ text: string; question?: string; rules?: string; status: string } | null>(null);
  useEffect(() => {
    if (!me || take.trim().length < 12 || political) return;
    const t = take; const id = setTimeout(() => {
      api.request<{ status: string; draft: { question: string; rules: string } | null }>('POST', 'v1/drafts/preview', { text: t })
        .then((r) => setAi({ text: t, status: r.status, question: r.draft?.question, rules: r.draft?.rules })).catch(() => setAi({ text: t, status: 'offline' }));
    }, 900);
    return () => clearTimeout(id);
  }, [take, me, api, political]);
  const aiFresh = ai && ai.text === take;
  const question = (aiFresh && ai.question) || local;
  const th = THEMES.find((x) => x.key === theme)!;
  const p = 0.5 + (side ? 1 : -1) * Math.min(0.2, stake / 500);
  const ready = take.trim().length >= 8 && !political && q.score >= 55;

  const publish = useMutation({
    mutationFn: () => api.request<{ id: string }>('POST', 'v1/posts', { body: take.trim(), makeMarket: true, ...(stake > 0 ? { opening: { outcome: side, amount: stake } } : {}) }),
    onError: () => { failed.current = true; setLaunching(false); haptic('error'); },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['feed'] }); void qc.invalidateQueries({ queryKey: ['drafts'] }); },
  });
  const launch = () => {
    if (!ready) return;
    failed.current = false; haptic('heavy'); setLaunching(true); publish.mutate();
    setTimeout(() => haptic('success'), 650);
    setTimeout(() => { if (!failed.current) router.push('/social'); }, 1350);
  };
  const start = (t: string) => { setTake(t); haptic('tap'); requestAnimationFrame(() => { ta.current?.focus(); ta.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); };
  const applyFix = (s?: string) => { if (!s) { ta.current?.focus(); return; } setTake((t) => t.replace(/[.!?\s]+$/, '') + s); haptic('tap'); };

  if (!me) return (
    <Shell title="Call it">
      <div className="relative overflow-hidden py-12 text-center">
        <div className="absolute inset-0 -skew-x-12 bg-grape/15" aria-hidden />
        <h2 className="cd relative text-[56px] leading-[.9]">Got a take?<br /><span className="text-grape">Call it.</span></h2>
        <p className="relative mx-auto mt-4 max-w-xs text-mute">Write it like a post. The AI turns it into a fair market with clear rules, a deadline and a source.</p>
        <div className="relative mt-6"><LinkButton href="/signin">Sign in to call it</LinkButton></div>
      </div>
    </Shell>
  );

  const topics = [...(trending.data?.topics ?? []).map((t) => `#${t.tag}`), ...TOPICS].filter((v, i, a) => a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i).slice(0, 10);
  return (
    <Shell title={<h1 className="cd pt-0.5 text-[30px]">Call it<span className="text-grape">▶</span></h1>} flush>
      {/* Trending */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
        <Bug tone="black" className="shrink-0"><Flame size={11} />Trending</Bug>
        {topics.map((t) => <button key={t} onClick={() => start(`${t.slice(1)} `)} className="press mn h-7 shrink-0 border border-line px-2.5 text-[12px] font-bold">{t}</button>)}
      </div>

      {/* Composer */}
      <div className="border-y-2 border-ink/80 px-4 pb-3 pt-4">
        <div className="flex items-center gap-2"><Avatar handle={me.handle} url={null} size={28} /><span className="mn text-[11px] uppercase tracking-[.1em] text-mute">Your take</span>
          <span className={`mn ml-auto text-[11px] ${take.length > 260 ? 'text-coral' : 'text-mute'}`}>{take.length}/280</span></div>
        <textarea ref={ta} value={take} maxLength={280} onChange={(e) => setTake(e.target.value)} rows={3} placeholder="BTC closes above $120k by Dec 31"
          className="cd mt-2 w-full resize-none bg-transparent text-[34px] leading-[1.02] tracking-[.005em] outline-none placeholder:text-ink/20" />
        {political && <div className="mt-1 flex items-center gap-2 bg-coral/15 px-3 py-2 text-[13px] font-semibold text-coral"><AlertTriangle size={15} />Political markets aren’t allowed on Called. Try sport, crypto, culture or tech.</div>}
      </div>

      {/* Hot takes */}
      {!take && <>
        <SectionTitle aside="TAP TO START">Hot takes</SectionTitle>
        <div className="grid grid-cols-2 gap-2 px-4">
          {PROMPTS.map((pr, i) => (
            <motion.button key={pr.take} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => start(pr.take)}
              className="cuts press relative min-h-[96px] overflow-hidden bg-panel p-3 text-left">
              <span className="mn text-[10px] font-bold uppercase tracking-[.12em] text-grape">{pr.tag}</span>
              <span className="mt-1 block text-[14px] font-semibold leading-snug">{pr.take}</span>
            </motion.button>
          ))}
        </div>
      </>}

      {/* Live AI preview */}
      <AnimatePresence>
        {take.trim().length > 3 && (
          <motion.div key="pv" initial={{ opacity: 0, y: 12 }} animate={launching ? { y: -900, scale: 0.6, rotate: -4, opacity: 0 } : { opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={launching ? { duration: 0.75, ease: [0.6, 0, 0.2, 1], delay: 0.35 } : { type: 'spring', stiffness: 260, damping: 26 }} className="px-4 pt-4">
            <div className="mb-2 flex items-center gap-2"><Bug><Sparkles size={11} />AI preview</Bug>
              <span className="mn text-[10px] uppercase text-mute">{aiFresh ? (ai.status === 'ready' ? 'Drafted by AI' : ai.status === 'offline' ? 'Instant draft' : 'Needs a sharper take') : 'Live'}</span></div>
            <div className="cuts overflow-hidden border border-line bg-panel">
              <Battle marketId="studio-preview" p={p} category={category} question={`${th.hint} ${question}`} height={168} simulate />
              <div className="p-3">
                <div className="mn flex items-center gap-2 text-[10px] uppercase tracking-[.1em] text-mute"><span className="text-grape">{CATS.find((c) => c.key === category)?.label}</span>·<span>{th.key === 'auto' ? 'Auto theme' : th.label}</span></div>
                <motion.p key={question} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="mt-1 text-[19px] font-extrabold leading-snug">{question || '…'}</motion.p>
                <div className="mn mt-3 grid grid-cols-2 gap-2 text-[11px] uppercase">
                  <div className="bg-snow px-2 py-1.5"><span className="text-mute">Resolves</span><div className="text-ink">{close ? dfmt(close) : '— add a date'}</div></div>
                  <div className="bg-snow px-2 py-1.5"><span className="text-mute">Source</span><div className="truncate text-ink">{sourceFor(category)}</div></div>
                </div>
                {aiFresh && ai.rules && <details className="mt-2 text-[13px]"><summary className="cursor-pointer font-bold text-grape">Rules</summary><p className="mt-1 whitespace-pre-wrap text-mute">{ai.rules}</p></details>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {take.trim().length > 3 && <>
        {/* Quality */}
        <SectionTitle aside={<span className={q.score >= 75 ? 'text-mint' : q.score >= 55 ? 'text-[#ffb547]' : 'text-coral'}>{q.score}/100</span>}>Market quality</SectionTitle>
        <div className="px-4">
          <div className="flex gap-3"><Meter label="Clear" v={q.clear} /><Meter label="Verifiable" v={q.verifiable} /><Meter label="Dated" v={q.dated} /></div>
          {q.fixes.length > 0 ? <div className="mt-3 space-y-1.5">{q.fixes.map((f) => (
            <button key={f.id} onClick={() => applyFix(f.apply)} className="press flex w-full items-center gap-2 border border-line px-3 py-2 text-left text-[13px]">
              <Wand2 size={15} className="shrink-0 text-grape" /><span className="flex-1">{f.label}</span>{f.apply && <span className="mn text-[10px] font-bold uppercase text-grape">Fix</span>}
            </button>))}</div>
            : <div className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-mint"><Check size={15} />Clear, verifiable and dated. Ready to call.</div>}
        </div>

        {/* Settings */}
        <SectionTitle>Category</SectionTitle>
        <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">{CATS.map((c) => (
          <button key={c.key} onClick={() => setCat(c.key)} className={`press h-9 shrink-0 px-3 text-[12px] font-bold uppercase tracking-[.08em] ${category === c.key ? 'bg-ink text-bg' : 'bg-snow'}`}>{c.label}</button>))}</div>
        <SectionTitle aside="BATTLE">Theme</SectionTitle>
        <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">{THEMES.map((t) => (
          <button key={t.key} onClick={() => { setTheme(t.key); if (t.key !== 'auto') setCat(t.cat); }} className={`cuts press h-9 shrink-0 px-3 text-[12px] font-bold uppercase tracking-[.08em] ${theme === t.key ? 'bg-grape text-white' : 'bg-snow'}`}>{t.label}</button>))}</div>
        <SectionTitle aside={close ? dfmt(close).toUpperCase() : 'NONE'}>Resolve by</SectionTitle>
        <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">{DATES.map((d) => (
          <button key={d.k} onClick={() => setDateK(d.k)} className={`press flex h-9 shrink-0 items-center gap-1 px-3 text-[12px] font-bold uppercase tracking-[.08em] ${dateK === d.k ? 'bg-ink text-bg' : 'bg-snow'}`}>{d.k === 'auto' && <CalendarClock size={13} />}{d.label}</button>))}</div>
        <SectionTitle aside="PLAY MONEY">Opening call</SectionTitle>
        <div className="px-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setSide(1); haptic('tap'); }} className={`cuts cd h-14 text-[26px] ${side ? 'bg-mint text-[#000]' : 'bg-snow text-mute'}`}>Yes</button>
            <button onClick={() => { setSide(0); haptic('tap'); }} className={`cuts cd h-14 text-[26px] ${!side ? 'bg-coral text-[#000]' : 'bg-snow text-mute'}`}>No</button>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto [scrollbar-width:none]">{STAKES.map((s) => (
            <button key={s} onClick={() => setStake(s)} className={`mn press h-9 min-w-[56px] shrink-0 px-2 text-[13px] font-bold ${stake === s ? 'bg-ink text-bg' : 'bg-snow'}`}>{s ? `$${s}` : 'None'}</button>))}</div>
        </div>
      </>}

      {/* Drafts */}
      <SectionTitle aside={drafts.data ? `${drafts.data.items.length}` : ''}>Your drafts</SectionTitle>
      {drafts.data?.items.length
        ? <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">{drafts.data.items.map((d) => <DraftCard key={d.id} d={d} />)}</div>
        : <div className="mx-4 flex items-center gap-3 border border-dashed border-line p-4 text-[14px] text-mute"><Zap size={18} className="text-grape" />Your called markets show up here while the AI drafts them.</div>}

      {/* Examples */}
      <SectionTitle aside="SWIPE">Called on Called</SectionTitle>
      <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none]">
        {EXAMPLES.map((e) => (
          <button key={e.q} onClick={() => start(e.q.replace(/^Will /, '').replace(/\?$/, ''))} className="cuts w-[250px] shrink-0 snap-start border border-line bg-panel p-3 text-left">
            <div className="mn flex justify-between text-[10px] uppercase text-mute"><span className="text-grape">{CATS.find((c) => c.key === e.cat)?.label}</span><span>{e.vol} vol</span></div>
            <p className="mt-1.5 line-clamp-2 min-h-[44px] text-[15px] font-bold leading-snug">{e.q}</p>
            <Scoreboard p={e.p} size="sm" className="mt-2" />
            <div className="mn mt-2 flex justify-between text-[10px] uppercase text-mute"><span>@{e.by}</span><span>Closes {e.close}</span></div>
          </button>
        ))}
      </div>
      <div className="h-24" />

      {/* Launch bar */}
      <div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/95 px-4 py-2.5 backdrop-blur-xl md:bottom-0 md:left-auto md:right-auto md:mx-auto md:w-[600px]">
        <CutButton size="lg" className="w-full" disabled={!ready || launching} onClick={launch}>
          {political ? 'Not allowed' : !take.trim() ? 'Write a take' : q.score < 55 ? 'Sharpen your take' : <>Call it <span className="mn text-[14px]">· {side ? 'YES' : 'NO'}{stake ? ` $${stake}` : ''}</span> ▶</>}
        </CutButton>
        {publish.isError && <p className="mt-1 text-center text-[12px] text-coral">Couldn’t launch. Try again.</p>}
      </div>

      {/* Launch moment */}
      <AnimatePresence>
        {launching && (
          <div aria-hidden className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
            <motion.div className="absolute inset-y-[-10%] -left-[20%] w-[140%] bg-grape" style={{ skewX: -14 }} initial={{ x: '-130%' }} animate={{ x: ['-130%', '0%', '0%', '130%'] }} transition={{ duration: 1.3, times: [0, 0.3, 0.7, 1], ease: 'easeInOut' }} />
            <motion.div className="absolute inset-0 grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 1.3, times: [0, 0.3, 0.7, 1] }}>
              <div className="text-center text-white"><div className="cd text-[72px] leading-none">CALLED!</div><div className="mn mt-2 text-[12px] uppercase tracking-[.2em]">Going live in the feed</div></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Shell>
  );
}
