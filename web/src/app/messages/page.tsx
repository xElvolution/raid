'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BadgeCheck, MailPlus, MessageSquare, Search } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Avatar, Empty, LinkButton } from '@/components/ui';
import { ago } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useSocialApi } from '@/lib/social';

export default function Inbox() {
  const { me } = useSession(); const s = useSocialApi();
  const q = useQuery({ queryKey: ['dms'], queryFn: () => s.dms(), enabled: !!me, refetchInterval: 10_000 });
  const [f, setF] = useState('');
  const rows = useMemo(() => (q.data?.items ?? []).filter((r) => !f || `${r.display_name} ${r.handle}`.toLowerCase().includes(f.toLowerCase())), [q.data, f]);
  const unread = (q.data?.items ?? []).reduce((a, r) => a + r.unread, 0);
  return (
    <Shell title={<h1 className="cd pt-0.5 text-[30px]">Messages{unread > 0 && <span className="bug ml-2 bg-grape align-middle text-white">{unread} new</span>}</h1>} flush
      actions={me ? <Link href="/messages/new" aria-label="New message" className="press"><MailPlus size={22} /></Link> : undefined}>
      {!me ? <Empty icon={MessageSquare} title="Sign in to message callers" body="Talk strategy, share calls and settle debates in private." action={<LinkButton href="/signin">Sign in</LinkButton>} /> : <>
        <div className="sticky top-[58px] z-10 bg-bg/90 px-4 pb-3 backdrop-blur-xl">
          <label className="flex h-10 items-center gap-2 border border-line bg-snow px-3"><Search size={16} className="text-mute" />
            <input value={f} onChange={(e) => setF(e.target.value)} placeholder="Search direct messages" className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-mute" /></label>
        </div>
        {q.isLoading ? [0, 1, 2, 3, 4].map((i) => <div key={i} className="flex gap-3 px-4 py-3"><span className="h-12 w-12 rounded-full shimmer" /><div className="flex-1 space-y-2 pt-1.5"><div className="h-3.5 w-1/3 shimmer" /><div className="h-3.5 w-2/3 shimmer" /></div></div>)
          : rows.length === 0 ? <Empty icon={MessageSquare} title={f ? 'No matches' : 'Your inbox is empty'} body={f ? undefined : 'Open a caller’s profile and tap the message button to start.'} action={f ? undefined : <LinkButton href="/leaderboard">Find callers</LinkButton>} />
          : rows.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
              <Link href={`/messages/${r.handle}`} className={`relative flex items-center gap-3 px-4 py-3 hover:bg-ink/[.03] ${r.unread ? 'shadow-[inset_3px_0_0_#7c5cff]' : ''}`}>
                <Avatar handle={r.handle} url={r.avatar_url} size={50} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[15px]"><b className="truncate">{r.display_name}</b>{r.verified && <BadgeCheck size={15} className="shrink-0 text-grape" />}<span className="truncate text-mute">@{r.handle}</span><span className="ml-auto shrink-0 text-[13px] text-mute">{ago(r.last_at)}</span></div>
                  <div className={`truncate text-[14px] ${r.unread ? 'font-semibold text-ink' : 'text-mute'}`}>{r.last_from_me && 'You: '}{r.last_body ?? 'Say hi'}</div>
                </div>
                {r.unread > 0 && <span className="mn grid h-5 min-w-5 place-items-center bg-grape px-1 text-[11px] font-bold text-white">{r.unread}</span>}
              </Link>
            </motion.div>
          ))}
      </>}
    </Shell>
  );
}
