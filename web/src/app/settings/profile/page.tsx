'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CutButton } from '@/components/bc';
import { Shell } from '@/components/Shell';
import { Skeleton } from '@/components/ui';
import { useSession } from '@/lib/session';

const BANNERS = ['stadium', 'arena', 'track', 'stage', 'city', 'rocket', 'cinema', 'coin', 'ring', 'rain'];

/* eslint-disable @next/next/no-img-element -- preset banner art */
export default function EditProfile() {
  const { api, me } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const p = useQuery({ queryKey: ['caller', me?.handle, true], queryFn: () => api.profile(me!.handle), enabled: !!me });
  const [f, setF] = useState({ display_name: '', bio: '', location: '', link: '' });
  const [cover, setCover] = useState<string | null>(null);
  useEffect(() => { const u = p.data?.user; if (u) setCover(u.cover_url); if (u) setF({ display_name: u.display_name, bio: u.bio ?? '', location: u.location ?? '', link: u.links?.[0] ?? '' }); }, [p.data]);
  const save = useMutation({
    mutationFn: () => api.updateProfile({ display_name: f.display_name.trim(), bio: f.bio.trim(), location: f.location.trim(), links: f.link.trim() ? [f.link.trim()] : [], ...(cover ? { cover_url: cover } : {}) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['caller'] }); router.push(`/u/${me!.handle}`); },
  });
  if (!me) return <Shell title="Edit card" back><p className="p-4 text-mute">Sign in to edit your card.</p></Shell>;
  if (p.isLoading) return <Shell title="Edit card" back><Skeleton className="m-4 h-60" /></Shell>;
  const field = (k: keyof typeof f, label: string, max: number, area = false) => (
    <label className="block">
      <span className="mn flex justify-between text-[11px] text-mute uppercase"><span>{label}</span><span>{f[k].length}/{max}</span></span>
      {area ? <textarea value={f[k]} maxLength={max} rows={3} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="mt-1 w-full resize-none bg-panel p-3 text-[15px] outline-none focus:ring-2 focus:ring-grape" />
        : <input value={f[k]} maxLength={max} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="mt-1 h-12 w-full bg-panel px-3 text-[15px] outline-none focus:ring-2 focus:ring-grape" />}
    </label>
  );
  return (
    <Shell title="Edit card" back>
      <div className="relative h-[130px] overflow-hidden bg-grape">{cover && <img src={cover} alt="" className="h-full w-full object-cover" />}<span className="mn absolute bottom-2 left-3 bg-[#000]/70 px-1.5 py-0.5 text-[11px] text-white">BANNER</span></div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-3">
        {BANNERS.map((b) => { const url = `${location.origin}/app/markets/${b}.jpg`; return (
          <button key={b} type="button" onClick={() => setCover(url)} aria-label={`Banner ${b}`} className={`h-12 w-20 shrink-0 overflow-hidden ${cover === url ? 'ring-2 ring-grape' : ''}`}><img src={`/app/markets/${b}.jpg`} alt="" className="h-full w-full object-cover" /></button>
        ); })}
      </div>
      <form className="space-y-4 p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {field('display_name', 'Name on card', 40)}
        {field('bio', 'Bio', 160, true)}
        {field('location', 'Location', 40)}
        {field('link', 'Link', 120)}
        {save.isError && <p className="text-[14px] text-coral">Could not save. Check the link starts with https:// and try again.</p>}
        <CutButton type="submit" size="lg" className="w-full" disabled={save.isPending || !f.display_name.trim()}>{save.isPending ? 'Saving…' : 'Save card'}</CutButton>
      </form>
    </Shell>
  );
}
