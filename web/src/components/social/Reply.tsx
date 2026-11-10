'use client';
import { useMutation } from '@tanstack/react-query';
import { forwardRef, useState } from 'react';
import { useSession } from '@/lib/session';
import { useSocialApi } from '@/lib/social';
import { haptic } from '@/lib/fx';
import { Avatar } from '../ui';

/** Inline composer for replies, quotes and channel posts. */
export const InlineComposer = forwardRef<HTMLTextAreaElement, { placeholder: string; cta: string; replyTo?: string; quoteOf?: string; channel?: string; onDone?: () => void; children?: React.ReactNode }>(
  function InlineComposer({ placeholder, cta, replyTo, quoteOf, channel, onDone, children }, ref) {
    const { me } = useSession(); const s = useSocialApi();
    const [body, setBody] = useState('');
    const m = useMutation({ mutationFn: () => s.publish({ body: body.trim(), replyTo, quoteOf, channel }), onSuccess: () => { haptic('success'); setBody(''); onDone?.(); } });
    if (!me) return null;
    const left = 3000 - body.length;
    return (
      <div className="flex gap-3 border-b border-line px-4 py-3">
        <Avatar handle={me.handle} url={null} size={40} />
        <div className="min-w-0 flex-1">
          <textarea ref={ref} value={body} onChange={(e) => setBody(e.target.value)} rows={body.length > 80 ? 4 : 2} maxLength={3000} placeholder={placeholder}
            className="w-full resize-none bg-transparent pt-2 text-[17px] leading-snug outline-none placeholder:text-mute" />
          {children}
          <div className="mt-2 flex items-center justify-end gap-3">
            {m.isError && <span className="text-[13px] text-coral">Couldn&apos;t post. Try again.</span>}
            {body.length > 2700 && <span className={`mn text-[12px] ${left < 0 ? 'text-coral' : 'text-mute'}`}>{left}</span>}
            <button disabled={!body.trim() || m.isPending} onClick={() => m.mutate()} className="cuts cd press h-9 bg-grape px-4 text-[18px] tracking-[.04em] text-white disabled:opacity-40">{m.isPending ? 'Posting…' : cta}</button>
          </div>
        </div>
      </div>
    );
  });
