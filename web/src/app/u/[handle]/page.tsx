'use client';
/* eslint-disable @next/next/no-img-element -- market art */
import type { SocialPost } from '@called/sdk';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BadgeCheck, CalendarDays, ChevronLeft, Copy, Link2, MapPin, MessageSquare, Settings } from 'lucide-react';
import { Bug } from '@/components/bc';
import { RichText } from '@/components/RichText';
import { divisionFor } from '@/lib/gamification';
import { CallerCard, money } from '@/components/caller/CallerCard';
import { BattleRecord, CallRecord } from '@/components/caller/Record';
import { Territory } from '@/components/caller/Territory';
import { PostCard } from '@/components/PostCard';
import { Shell } from '@/components/Shell';
import { Avatar, Empty, Skeleton } from '@/components/ui';
import { celebrate, haptic } from '@/lib/fx';
import { motion as m2 } from 'motion/react';
import { useSession } from '@/lib/session';
import { TLink as Link } from '@/lib/transition';

const TABS = [['posts', 'Posts'], ['replies', 'Replies'], ['calls', 'Calls'], ['history', 'History'], ['created', 'Created'], ['likes', 'Likes'], ['media', 'Media']] as const;
type Tab = (typeof TABS)[number][0];

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { api, me } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const p = useQuery({ queryKey: ['caller', handle, !!me], queryFn: () => api.profile(handle) });
  const [tab, setTab] = useState<Tab>('posts');
  const [card, setCard] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { const on = () => setCollapsed(window.scrollY > 120); on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }, []);
  const [dir, setDir] = useState(1);
  const follow = useMutation({
    mutationFn: (on: boolean) => (on ? api.follow(handle) : api.unfollow(handle)),
    onSuccess: (_d, on) => { if (on) celebrate(); void qc.invalidateQueries({ queryKey: ['caller', handle] }); },
  });
  const copy = useMutation({
    mutationFn: (on: boolean) => (on ? api.copy(handle) : api.uncopy(handle)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['caller', handle] }),
  });
  if (p.isLoading) return <Shell title="Caller" back><div className="space-y-3 p-4"><Skeleton className="mx-auto aspect-[5/7] max-w-[360px]" /><Skeleton className="h-12" /></div></Shell>;
  if (!p.data) return <Shell title="Caller" back><Empty title="No caller by that name" body="Check the handle and try again." /></Shell>;
  const d = p.data, u = d.user, mine = me?.handle === u.handle, tier = divisionFor(u.xp).current;
  const pick = (t: Tab) => { const a = TABS.findIndex((x) => x[0] === tab), b = TABS.findIndex((x) => x[0] === t); setDir(b > a ? 1 : -1); setTab(t); haptic('tap'); };
  const joined = new Date(u.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return (
    <Shell bare flush>
      <CompactBar name={u.display_name} posts={u.posts} show={collapsed} onBack={() => router.back()} />
      {/* Banner: full width, editable; avatar overlaps its bottom-left edge. */}
      <div className="relative h-[140px] w-full overflow-hidden bg-grape md:h-[180px]">
        {u.cover_url ? <img src={u.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="halftone h-full w-full opacity-30" />}
        <button onClick={() => router.back()} aria-label="Back" className="press absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-[#000]/60 text-white"><ChevronLeft size={22} /></button>
      </div>
      <section className="px-4">
        <div className="flex items-start justify-between">
          <div className="relative z-10 -mt-[42px] rounded-full ring-4 ring-bg"><Avatar handle={u.handle} url={u.avatar_url} size={84} /></div>
          <div className="flex gap-1.5 pt-3">
            {mine ? (<>
              <IconBtn label="Settings" onClick={() => router.push('/settings')}><Settings size={18} /></IconBtn>
              <button onClick={() => router.push('/settings/profile')} className="press h-9 rounded-full border border-line px-4 text-[14px] font-bold">Edit profile</button>
            </>) : (<>
              <IconBtn label="Message" disabled={!me} onClick={() => router.push(`/messages/${u.handle}`)}><MessageSquare size={18} /></IconBtn>
              <IconBtn label={u.am_copying ? 'Stop copying calls' : 'Copy calls'} on={u.am_copying} disabled={!me || copy.isPending} onClick={() => copy.mutate(!u.am_copying)}><Copy size={17} /></IconBtn>
              <button disabled={!me || follow.isPending} onClick={() => follow.mutate(!u.am_following)}
                className={`press h-9 rounded-full px-4 text-[14px] font-bold ${u.am_following ? 'border border-line' : 'bg-ink text-bg'}`}>{u.am_following ? 'Following' : u.follows_me ? 'Follow back' : 'Follow'}</button>
            </>)}
          </div>
        </div>
        <div className="mt-2.5">
          <h1 className="flex items-center gap-1.5 text-[21px] font-extrabold leading-tight">{u.display_name}{u.verified && <BadgeCheck size={19} className="text-grape" />}
            <span className="ml-1 bug" style={{ background: tier.color, color: '#000' }}>{tier.name}</span></h1>
          <p className="text-[15px] text-mute">@{u.handle}{u.follows_me && <span className="ml-2 bg-snow px-1.5 py-0.5 text-[11px]">Follows you</span>}</p>
        </div>
        {u.bio && <p className="mt-2.5 text-[15px] leading-[1.4]"><RichText text={u.bio} /></p>}
        <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[14px] text-mute">
          {u.location && <span className="flex items-center gap-1"><MapPin size={15} />{u.location}</span>}
          {(u.links ?? []).slice(0, 1).map((l) => <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-grape"><Link2 size={15} />{l.replace(/^https?:\/\//, '')}</a>)}
          <span className="flex items-center gap-1"><CalendarDays size={15} />Joined {joined}</span>
        </div>
        <div className="mt-2.5 flex gap-4 text-[14px]">
          <Link href={`/u/${u.handle}/connections?list=following`}><b className="font-bold">{u.following}</b> <span className="text-mute">Following</span></Link>
          <Link href={`/u/${u.handle}/connections?list=followers`}><b className="font-bold">{u.followers}</b> <span className="text-mute">Followers</span></Link>
          {u.copiers > 0 && <span><b className="font-bold">{u.copiers}</b> <span className="text-mute">Copying</span></span>}
        </div>
        {d.mutuals.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-[13px] text-mute">
            <span className="flex -space-x-1.5">{d.mutuals.map((m) => <span key={m.handle} className="rounded-full ring-2 ring-bg"><Avatar handle={m.handle} url={m.avatar_url} size={20} /></span>)}</span>
            Followed by {d.mutuals.map((m) => m.display_name).slice(0, 2).join(', ')}{d.mutuals.length > 2 ? ' and others you follow' : ''}
          </div>
        )}
        {u.am_copying && <p className="mn mt-2 text-[11px] text-mint">COPYING NEW TRADES · MAX $25 EACH</p>}
      </section>

      <div className="mt-4 grid grid-cols-4 border-y border-line">
        {[['Hit rate', d.stats.winRate === null ? '—' : `${Math.round(d.stats.winRate * 100)}%`], ['Called', String(d.stats.called)], ['Streak', `${u.streak}D`], ['Rank', d.stats.rank ? `#${d.stats.rank}` : '—']].map(([k, v]) => (
          <div key={k} className="border-r border-line py-2.5 text-center last:border-0"><div className="cd text-[26px] leading-none">{v}</div><div className="mn mt-1 text-[10px] text-mute uppercase">{k}</div></div>
        ))}
      </div>
      <Territory handle={u.handle} pnl={d.stats.pnl} />
      <CallRecord record={d.record} />
      <BattleRecord battle={d.battle} />
      <section className="px-4 pt-6"><button onClick={() => setCard(true)} className="press cuts flex h-12 w-full items-center justify-between bg-grape px-4 text-white"><span className="cd text-[22px]">View caller card</span><span className="mn text-[11px]">FLIP · SHARE ▶</span></button></section>
      <AnimatePresence>{card && (
        <motion.div className="fixed inset-0 z-[70] flex flex-col justify-center bg-bg/95 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget) setCard(false); }}>
          <CallerCard p={d} />
          <button onClick={() => setCard(false)} className="mn mx-auto mt-3 text-[12px] text-mute">CLOSE</button>
        </motion.div>
      )}</AnimatePresence>

      {d.pinned && (
        <section className="pt-6">
          <div className="flex items-center gap-2 px-4"><h2 className="cd text-[22px]">Pinned call</h2><Bug tone="grape">Pinned</Bug></div>
          <PostCard item={d.pinned} />
        </section>
      )}

      <nav className="no-scrollbar sticky top-[52px] z-20 mt-6 flex overflow-x-auto border-b border-line bg-bg">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => pick(k)} className={`relative h-11 shrink-0 px-3.5 cd text-[18px] tracking-[.04em] ${tab === k ? 'text-ink' : 'text-mute'}`}>
            {l}{tab === k && <motion.i layoutId="ptab" className="absolute inset-x-2 bottom-0 h-[3px] bg-grape" />}
          </button>
        ))}
      </nav>
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div key={tab} custom={dir} initial={{ x: dir * 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir * -40, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}>
          {tab === 'calls' ? <OpenCalls handle={u.handle} /> : tab === 'history' ? <History handle={u.handle} /> : tab === 'created' ? <Created handle={u.handle} /> : <Posts handle={u.handle} tab={tab} />}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

function Posts({ handle, tab }: { handle: string; tab: 'posts' | 'replies' | 'likes' | 'media' }) {
  const { api } = useSession();
  const q = useInfiniteQuery({
    queryKey: ['uposts', handle, tab], queryFn: ({ pageParam }) => api.userPosts(handle, tab, pageParam),
    initialPageParam: undefined as string | undefined, getNextPageParam: (x) => x.next ?? undefined,
  });
  const items: SocialPost[] = q.data?.pages.flatMap((x) => x.items) ?? [];
  if (q.isLoading) return <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (!items.length) return <Empty title={{ posts: 'No posts yet', replies: 'No replies yet', likes: 'No likes yet', media: 'No media yet' }[tab]} />;
  if (tab === 'media') return (
    <div className="grid grid-cols-3 gap-[2px]">{items.filter((i) => i.media_url).map((i) => <Link key={i.id} href={`/posts/${i.id}`} className="aspect-square overflow-hidden bg-snow"><img src={i.media_url!} alt="" className="h-full w-full object-cover" loading="lazy" /></Link>)}</div>
  );
  return <>{items.map((it) => <PostCard key={it.id} item={it} />)}{q.hasNextPage && <button onClick={() => void q.fetchNextPage()} className="mn w-full py-4 text-[12px] text-mute">LOAD MORE</button>}</>;
}

function OpenCalls({ handle }: { handle: string }) {
  const { api } = useSession();
  const q = useQuery({ queryKey: ['ucalls', handle], queryFn: () => api.userCalls(handle), refetchInterval: 15_000 });
  if (q.isLoading) return <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!q.data?.items.length) return <Empty title="No open calls" body="Live positions show here with their running P&L." />;
  return <>{q.data.items.map((c) => (
    <Link key={c.market_id + c.outcome} href={`/markets/${c.market_id}`} className="flex items-center gap-3 border-b border-line px-4 py-3">
      <span className={`cd grid h-10 w-12 shrink-0 place-items-center text-[18px] text-[#000] ${c.outcome ? 'bg-mint' : 'bg-coral'}`}>{c.outcome ? 'YES' : 'NO'}</span>
      <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-semibold">{c.question}</div><div className="mn text-[11px] text-mute">{c.shares.toFixed(1)} SH · AVG {Math.round(c.avg * 100)}¢ → {Math.round(c.price * 100)}¢</div></div>
      <div className="text-right"><div className={`cd text-[24px] leading-none ${c.pnl >= 0 ? 'text-mint' : 'text-coral'}`}>{money(c.pnl, true)}</div><div className={`mn text-[11px] ${c.pnl >= 0 ? 'text-mint' : 'text-coral'}`}>{(c.pnlPct * 100).toFixed(0)}%</div></div>
    </Link>
  ))}</>;
}

function History({ handle }: { handle: string }) {
  const { api } = useSession();
  const q = useQuery({ queryKey: ['uhist', handle], queryFn: () => api.userHistory(handle) });
  if (q.isLoading) return <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!q.data?.items.length) return <Empty title="No settled calls yet" body="When a market resolves, the result lands here." />;
  return <>{q.data.items.map((c, i) => (
    <Link key={c.market_id + i} href={`/markets/${c.market_id}/proof`} className="relative flex items-center gap-3 overflow-hidden border-b border-line px-4 py-3">
      <span className={`h-10 w-1.5 shrink-0 ${c.won ? 'bg-mint' : 'bg-coral'}`} />
      <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-semibold">{c.question}</div><div className="mn text-[11px] text-mute">CALLED {c.outcome ? 'YES' : 'NO'} · RESOLVED {c.result} · {c.kind === 'call' ? 'FREE CALL' : `STAKE ${money(c.cost)}`}</div></div>
      {c.won ? <span className="cd -rotate-6 border-2 border-mint px-1.5 text-[18px] text-mint">Called it</span> : <span className="cd border-2 border-coral/60 px-1.5 text-[18px] text-coral/80">Missed</span>}
      {c.kind !== 'call' && <span className={`cd w-14 text-right text-[20px] ${c.pnl >= 0 ? 'text-mint' : 'text-coral'}`}>{money(c.pnl, true)}</span>}
    </Link>
  ))}</>;
}

function Created({ handle }: { handle: string }) {
  const { api } = useSession();
  const q = useQuery({ queryKey: ['ucreated', handle], queryFn: () => api.userCreated(handle) });
  if (q.isLoading) return <div className="space-y-2 p-4">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!q.data?.items.length) return <Empty title="No markets created" body="Turn any post into a market with Call it." />;
  return <>{q.data.items.map((m) => (
    <Link key={m.id} href={`/markets/${m.id}`} className="flex items-center gap-3 border-b border-line px-4 py-3">
      {m.image_url ? <img src={m.image_url} alt="" className="h-11 w-11 shrink-0 object-cover" /> : <span className="h-11 w-11 shrink-0 bg-snow" />}
      <div className="min-w-0 flex-1"><div className="line-clamp-2 text-[15px] font-semibold">{m.question}</div><div className="mn text-[11px] text-mute uppercase">{m.status}{m.outcome ? ` · ${m.outcome}` : ''}</div></div>
      <span className="cd text-[24px] text-mint">{Math.round(Number(m.price_yes) * 100)}%</span>
    </Link>
  ))}</>;
}

/** X-style collapse: once the banner scrolls away, a compact bar with the name slides in. */
function CompactBar({ name, posts, show, onBack }: { name: string; posts: number; show: boolean; onBack: () => void }) {
  return (
    <m2.header initial={false} animate={{ y: show ? 0 : -64, opacity: show ? 1 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className="sticky top-0 z-30 -mb-[52px] flex h-[52px] items-center gap-3 border-b border-line bg-bg/90 px-3 backdrop-blur-xl" aria-hidden={!show}>
      <button onClick={onBack} aria-label="Back" className="press grid h-9 w-9 place-items-center"><ChevronLeft size={22} /></button>
      <div className="min-w-0"><div className="truncate text-[17px] font-extrabold leading-tight">{name}</div><div className="text-[12px] text-mute">{posts} posts</div></div>
    </m2.header>
  );
}

function IconBtn({ children, label, on, ...rest }: { children: ReactNode; label: string; on?: boolean } & React.ComponentProps<'button'>) {
  return <button aria-label={label} title={label} className={`press grid h-9 w-9 place-items-center rounded-full border ${on ? 'border-mint bg-mint text-[#000]' : 'border-line'} disabled:opacity-40`} {...rest}>{children}</button>;
}
