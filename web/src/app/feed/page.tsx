'use client';
import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { Composer } from '@/components/Social';
import { RaidRadar } from '@/components/app/Radar';
import { Tabs } from '@/components/app/Tabs';
import { Timeline } from '@/components/app/Timeline';

type Tab = 'foryou' | 'live' | 'following';

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>('foryou');
  return (
    <Shell title="RAID">
      <div className="sticky top-14 z-30 -mx-4 bg-bg/85 px-4 backdrop-blur-xl md:top-16 md:mx-0 md:px-0"><Tabs id="feed" value={tab} onChange={setTab} items={[{ key: 'foryou', label: 'For you' }, { key: 'live', label: 'Live' }, { key: 'following', label: 'Following' }]} /></div>
      <RaidRadar className="border-b border-line" />
      <div className="hidden border-b border-line md:block"><Composer /></div>
      <Timeline mode={tab} />
    </Shell>
  );
}
