'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Avatar } from '@/components/ui';
import { useSession } from '@/lib/session';

/** Pick someone to message: search callers by name or handle. */
export default function NewMessage() {
  const { api, me } = useSession(); const [t, setT] = useState('');
  const q = useQuery({ queryKey: ['dm-search', t], queryFn: () => api.request<{ people: { handle: string; display_name: string; avatar_url: string | null; bio: string | null }[] }>('GET', 'v1/search', undefined, { q: t }), enabled: t.trim().length > 0 });
  return (
    <Shell title="New message" back="/messages" flush hideTabs>
      <div className="px-4 pb-3"><label className="flex h-11 items-center gap-2 border border-line bg-snow px-3"><Search size={16} className="text-mute" />
        <input autoFocus value={t} onChange={(e) => setT(e.target.value)} placeholder="Search people" className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-mute" /></label></div>
      {(q.data?.people ?? []).filter((p) => p.handle !== me?.handle).map((p) => (
        <Link key={p.handle} href={`/messages/${p.handle}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink/[.03]"><Avatar handle={p.handle} url={p.avatar_url} size={44} />
          <div className="min-w-0"><b className="block truncate">{p.display_name}</b><span className="text-[14px] text-mute">@{p.handle}</span></div></Link>
      ))}
      {t && q.data && q.data.people.length === 0 && <p className="px-4 py-8 text-center text-mute">No one matches “{t}”.</p>}
    </Shell>
  );
}
