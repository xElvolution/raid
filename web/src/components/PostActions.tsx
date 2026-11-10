'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { haptic } from '@/lib/fx';
import { IconHeart, IconReply, IconRepost, IconShare } from './icons';

type I = typeof IconHeart;
function Act({ Icon, label, on, color, onClick, count }: { Icon: I; label: string; on?: boolean; color?: string; onClick?: () => void; count?: number }) {
  return (
    <motion.button aria-label={label} aria-pressed={on} whileTap={{ scale: 0.85 }} onClick={(e) => { e.preventDefault(); haptic('tap'); onClick?.(); }}
      className="group flex items-center gap-1 text-mute text-[13px] tabular-nums min-w-[48px]" style={on && color ? { color } : undefined}>
      <span className="relative grid place-items-center h-8 w-8 -ml-2 rounded-full group-hover:bg-ink/[.06] transition-colors">
        <motion.span key={String(on)} initial={on ? { scale: 0.5 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 700, damping: 14 }} className="grid place-items-center">
          <Icon size={18} filled={on && label === 'Like'} />
        </motion.span>
        <AnimatePresence>{on && label === 'Like' && <motion.span initial={{ scale: 0.4, opacity: 0.7 }} animate={{ scale: 1.6, opacity: 0 }} exit={{ opacity: 0 }} className="absolute inset-1 rounded-full border" style={{ borderColor: color }} />}</AnimatePresence>
      </span>
      <span className="min-w-[1ch]">{count ? count : ''}</span>
    </motion.button>
  );
}

/** Reply, repost, like, share. Grey until active, the way X and Farcaster do it. */
export function PostActions({ id, handle, replies = 0 }: { id: string; handle: string; replies?: number }) {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const share = () => {
    const url = `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/u/${handle}#p${id}`;
    if (navigator.share) void navigator.share({ url }).catch(() => undefined); else void navigator.clipboard?.writeText(url);
  };
  return (
    <div className="mt-2 -mb-1 flex items-center justify-between max-w-[320px]">
      <Act Icon={IconReply} label="Reply" count={replies} />
      <Act Icon={IconRepost} label="Repost" on={reposted} color="var(--color-mint)" onClick={() => setReposted((v) => !v)} count={reposted ? 1 : 0} />
      <Act Icon={IconHeart} label="Like" on={liked} color="#f91880" onClick={() => setLiked((v) => !v)} count={liked ? 1 : 0} />
      <Act Icon={IconShare} label="Share" onClick={share} />
    </div>
  );
}
