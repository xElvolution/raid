'use client';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/Shell';
import { Empty, LinkButton, Skeleton } from '@/components/ui';
import { IconBell, IconCheck, IconSpark, IconUser } from '@/components/icons';
import { motion } from 'motion/react';

const ICON: Record<string, { I: typeof IconBell; bg: string; fg: string }> = {
  follow: { I: IconUser, bg: 'bg-sky-light', fg: 'text-sky-dark' },
  draft_ready: { I: IconSpark, bg: 'bg-grape-light', fg: 'text-grape' },
  draft_rejected: { I: IconBell, bg: 'bg-coral-light', fg: 'text-coral-dark' },
  resolved: { I: IconCheck, bg: 'bg-mint-light', fg: 'text-mint-dark' },
};
import { ago } from '@/lib/format';
import { useLive } from '@/lib/live-hooks';
import { useSession } from '@/lib/session';


const TEXT: Record<string, (p: Record<string, unknown>) => string> = {
  follow: () => 'Someone new is following your calls',
  draft_ready: (p) => `Your market is ready: ${String(p.question ?? '')}`,
  draft_rejected: (p) => (p.reason === 'policy' ? String(p.message ?? "Called doesn't host markets on politics, elections or world conflicts, so this one stays a post.") : "We couldn't turn that post into a fair market"),
  resolved: () => 'A market you hold has resolved',
};

export default function Notifications() {
  const { api, me } = useSession();
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.notifications(), enabled: !!me });
  useLive(me ? `notifications:${me.id}` : null, () => void q.refetch());
  if (!me) return <Shell title="Alerts"><Empty title="Sign in for alerts" action={<LinkButton href="/signin">Sign in</LinkButton>} /></Shell>;
  return (
    <Shell title="Alerts">
      {q.isLoading ? <Skeleton className="h-40" /> : (q.data?.items.length ?? 0) === 0 ? <Empty title="All caught up" /> : (
        <ul className="divide-y-2 divide-line">
          {q.data?.items.map((n) => (
            <motion.li key={n.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="py-3 flex items-center gap-3">
              {(() => { const c = ICON[n.kind] ?? { I: IconBell, bg: 'bg-snow', fg: 'text-mute' }; return <span className={`h-12 w-12 rounded-2xl grid place-items-center ${c.bg} ${c.fg}`} aria-hidden><c.I size={24} /></span>; })()}
              <p className="flex-1 font-bold">{(TEXT[n.kind] ?? (() => n.kind))(n.payload)}</p>
              <span className="text-xs text-mute">{ago(n.created_at)}</span>
            </motion.li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
