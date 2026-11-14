'use client';
/** Stories: 24 h posts from the people you see, as a row of rings, and a full-screen viewer with progress bars and swipe. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { posts, mediaSrc, type StoryGroup } from '@/lib/social';
import { ago } from '@/lib/market';
import { personByHandle } from '@/lib/people';
import { Avatar } from './Avatar';
import { TokenChip } from './Post';
import { openComposer, STORY_BG } from './Composer';

const SEEN = 'raid.stories-seen';
export function StoriesRow({ className = '' }: { className?: string }) {
  const q = useQuery({ queryKey: ['stories'], queryFn: posts.stories, refetchInterval: 60_000 });
  const [open, setOpen] = useState<number | null>(null);
  const [seen, setSeen] = useState<Record<string, string>>({});
  useEffect(() => { const t = setTimeout(() => { try { setSeen(JSON.parse(localStorage.getItem(SEEN) ?? '{}')); } catch { /* none */ } }, 0); return () => clearTimeout(t); }, []);
  const groups = q.data?.items ?? [];
  const markSeen = (g: StoryGroup) => { const n = { ...seen, [g.handle]: g.latest }; setSeen(n); localStorage.setItem(SEEN, JSON.stringify(n)); };
  return (
    <>
      <div className={`-mx-4 flex gap-3 overflow-x-auto px-4 py-2.5 no-scrollbar md:mx-0 md:px-0 ${className}`}>
        <button onClick={() => openComposer({ story: true })} className="flex w-[58px] shrink-0 flex-col items-center gap-1">
          <span className="grid h-[54px] w-[54px] place-items-center rounded-full border-2 border-dashed border-faint text-mute"><Plus size={20} /></span>
          <span className="text-[11px] text-mute">Your story</span>
        </button>
        {q.isLoading && [0, 1, 2, 3, 4].map((i) => <span key={i} className="shimmer h-[54px] w-[54px] shrink-0 !rounded-full" />)}
        {groups.map((g, i) => {
          const unseen = seen[g.handle] !== g.latest;
          return (
            <button key={g.handle} onClick={() => { setOpen(i); markSeen(g); }} className="flex w-[58px] shrink-0 flex-col items-center gap-1">
              <span className={`rounded-full p-[2px] ${unseen ? 'bg-[conic-gradient(#ff5a1f,#ffb020,#ff5a1f)]' : 'bg-line'}`}><span className="block rounded-full bg-bg p-[2px]"><Avatar id={g.near_account} handle={g.handle} size={46} /></span></span>
              <span className="w-full truncate text-center text-[11px]">{personByHandle(g.handle)?.name.split(' ')[0] ?? g.handle}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence>{open !== null && groups[open] && <Viewer groups={groups} start={open} onClose={() => setOpen(null)} onSeen={markSeen} />}</AnimatePresence>
    </>
  );
}

const DUR = 5000;
function Viewer({ groups, start, onClose, onSeen }: { groups: StoryGroup[]; start: number; onClose: () => void; onSeen: (g: StoryGroup) => void }) {
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(0);
  const [t0, setT0] = useState(0);
  const [now, setNow] = useState(0);
  const g = groups[gi]!, s = g.items[si]!;
  const next = () => { if (si < g.items.length - 1) setSi(si + 1); else if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); onSeen(groups[gi + 1]!); } else onClose(); };
  const prev = () => { if (si > 0) setSi(si - 1); else if (gi > 0) { setGi(gi - 1); setSi(0); } };
  useEffect(() => { const t = setTimeout(() => { setT0(Date.now()); setNow(Date.now()); }, 0); return () => clearTimeout(t); }, [gi, si]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 50); return () => clearInterval(t); }, []);
  const p = t0 ? Math.min(1, (now - t0) / DUR) : 0;
  useEffect(() => { if (p >= 1) { const t = setTimeout(next, 0); return () => clearTimeout(t); } });
  const img = mediaSrc(s.media_url);
  const person = personByHandle(g.handle);
  return (
    <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`Story from ${g.handle}`}>
      <motion.div key={`${gi}-${si}`} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, i) => { if (i.offset.x < -60) { if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); } else onClose(); } else if (i.offset.x > 60) { if (gi > 0) { setGi(gi - 1); setSi(0); } } else if (i.offset.y > 90) onClose(); }}
        initial={{ opacity: 0.6, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative h-full w-full max-w-[480px] overflow-hidden text-white md:h-[92dvh] md:rounded-[22px]" style={{ background: img ? '#000' : STORY_BG[s.bg] ?? STORY_BG[0] }}>
        {img && <><img src={img} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" /><img src={img} alt="" className="absolute inset-0 h-full w-full object-contain" /></>}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-3 top-[max(10px,env(safe-area-inset-top))] flex gap-1">
          {g.items.map((_, i) => <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"><span className="block h-full bg-white" style={{ width: `${(i < si ? 1 : i === si ? p : 0) * 100}%` }} /></span>)}
        </div>
        <div className="absolute inset-x-3 top-[calc(max(10px,env(safe-area-inset-top))+12px)] flex items-center gap-2">
          <Link href={`/u/${person?.handle ?? g.handle}`} className="flex items-center gap-2"><Avatar id={g.near_account} handle={g.handle} size={30} /><span className="text-[13.5px] font-semibold">{person?.name ?? g.display_name}</span></Link>
          <span className="text-[12px] text-white/70">{ago(new Date(s.created_at).getTime(), now || new Date(s.created_at).getTime())}</span>
          <button onClick={onClose} aria-label="Close" className="ml-auto grid h-9 w-9 place-items-center rounded-full"><X size={20} /></button>
        </div>
        <button aria-label="Previous" onClick={prev} className="absolute inset-y-0 left-0 w-1/3" />
        <button aria-label="Next" onClick={next} className="absolute inset-y-0 right-0 w-2/3" />
        <div className="pointer-events-none absolute inset-x-5 bottom-[max(28px,env(safe-area-inset-bottom))] text-center">
          {s.body && <p className={`text-[20px] font-semibold leading-snug [text-shadow:0_1px_10px_rgb(0_0_0/.45)] ${img ? '' : 'mb-[30vh]'}`}>{s.body}</p>}
          {s.coin && <div className="pointer-events-auto mt-3 inline-block rounded-full bg-white/95 p-0.5 text-ink"><TokenChip symbol={s.coin} /></div>}
        </div>
      </motion.div>
    </motion.div>
  );
}
