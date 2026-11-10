'use client';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { celebrate, haptic, popXp } from '@/lib/fx';
import { useSession } from '@/lib/session';
import { IconSpark } from './icons';
import { Avatar } from './ui';

export function Composer({ defaultMarket = false, onPosted }: { defaultMarket?: boolean; onPosted?: (id: string, makeMarket: boolean) => void }) {
  const { api, me } = useSession();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [makeMarket, setMakeMarket] = useState(defaultMarket);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [focus, setFocus] = useState(false);
  if (!me) return null;
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api.post({ body: body.trim(), makeMarket });
      setBody('');
      celebrate();
      popXp(5, 'Posted');
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
      onPosted?.(r.id, makeMarket);
    } catch (e) {
      haptic('error');
      setErr((e as Error).message.includes('429') ? 'Slow down a little!' : 'Could not post. Try again.');
    } finally { setBusy(false); }
  };
  return (
    <motion.div layout className="py-3 px-4 flex gap-3">
      <Avatar handle={me.handle} url={me.avatar_url} size={40} />
      <div className="flex-1">
        <label htmlFor="compose" className="sr-only">Your call</label>
        <motion.textarea id="compose" value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          animate={{ height: focus || body ? 96 : 44 }} placeholder="What's your call?" className="w-full resize-none outline-none bg-transparent text-[17px] placeholder:text-mute pt-2" />
        <AnimatePresence>
          {(focus || body) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-between gap-2 pt-2 border-t border-line overflow-hidden">
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { haptic('tap'); setMakeMarket(!makeMarket); }} aria-pressed={makeMarket}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-medium border transition-colors ${makeMarket ? 'bg-grape-light border-grape/40 text-grape' : 'border-line text-mute'}`}>
                <IconSpark size={16} /> Make it a market
              </button>
              <button disabled={busy || body.trim().length === 0} onMouseDown={(e) => e.preventDefault()} onClick={() => void submit()} className="h-8 px-4 rounded-full bg-grape text-white text-[14px] font-semibold disabled:opacity-40">{busy ? 'Posting…' : 'Post'}</button>
            </motion.div>
          )}
        </AnimatePresence>
        {err && <p className="text-coral text-sm mt-2" role="alert">{err}</p>}
      </div>
    </motion.div>
  );
}
