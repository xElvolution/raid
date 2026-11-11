'use client';
import { Shell } from '@/components/Shell';
import { Composer, Feed, WhoToFollow } from '@/components/Social';
import { NETWORK } from '@/lib/raid';

export default function FeedPage() {
  return (
    <Shell title="Feed">
      <div className="space-y-3">
        <Composer />
        <WhoToFollow />
        <Feed emptyTitle="The feed is quiet" emptyBody="No one has posted yet. Call a raid or post a take to start it." />
        <p className="px-1 text-[11px] text-faint">Posts live in the RAID social API. Sign-in is a NEP-413 message signed by your NEAR wallet ({NETWORK}). No transaction, no gas.</p>
      </div>
    </Shell>
  );
}
