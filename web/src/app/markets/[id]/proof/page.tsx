'use client';
import type { Resolution } from '@called/sdk';
import { useQuery } from '@tanstack/react-query';
import { Check, ExternalLink, FileCheck2, Loader2, ShieldCheck, X } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { Empty, LinkButton, Skeleton } from '@/components/ui';
import { config } from '@/lib/config';
import { type CheckState, type ProofChecks, verifyResolution } from '@/lib/proof';
import { useSession } from '@/lib/session';

const short = (s: string, n = 10) => (s.length > n * 2 + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

function Step({ i, state, title, body }: { i: number; state: CheckState; title: string; body: string }) {
  const tone = state === 'ok' ? 'bg-mint text-[#0c0c0f]' : state === 'fail' ? 'bg-coral text-[#0c0c0f]' : 'bg-ink/[.06] text-mute';
  return (
    <motion.li initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }} className="flex gap-3 py-3.5 border-b border-line last:border-0">
      <motion.span key={state} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 18 }}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${tone}`}>
        {state === 'ok' ? <Check size={16} strokeWidth={3} /> : state === 'fail' ? <X size={16} strokeWidth={3} /> : state === 'pending' ? <Loader2 size={15} className="animate-spin" /> : <span className="text-[12px]">–</span>}
      </motion.span>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[13px] text-mute break-all">{body}</div>
      </div>
    </motion.li>
  );
}

function Verdict({ r }: { r: Resolution }) {
  let v: { reasoning?: string; sources?: string[]; confidence?: number } = {};
  try { v = r.response_json ? JSON.parse(r.response_json) : {}; } catch { /* malformed: shown raw below */ }
  return (
    <section className="px-4 py-5 border-b border-line">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-mute">AI judge verdict</p>
      {v.reasoning && <p className="mt-2 text-[15px] leading-[1.5]">{v.reasoning}</p>}
      {v.confidence !== undefined && <p className="mt-2 text-[13px] text-mute">Confidence {(v.confidence * 100).toFixed(0)}% · {r.model ?? 'model unknown'}</p>}
      {!!v.sources?.length && (
        <ul className="mt-3 space-y-1.5">
          {v.sources.map((s) => (
            <li key={s}><a href={s} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-[14px] text-[#9d86ff] hover:underline break-all">{s.replace(/^https?:\/\//, '')}<ExternalLink size={13} /></a></li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ProofPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useSession();
  const q = useQuery({ queryKey: ['market', id], queryFn: () => api.market(id) });
  const r = q.data?.resolution ?? null;
  const [checks, setChecks] = useState<ProofChecks>({ request: 'pending', response: 'pending', signature: 'pending' });
  useEffect(() => {
    if (!r) return;
    let live = true;
    // Stagger the reveal so each check visibly lands; the work itself is instant.
    void verifyResolution(r).then((c) => {
      (['request', 'response', 'signature'] as const).forEach((k, i) => setTimeout(() => live && setChecks((p) => ({ ...p, [k]: c[k], detail: c.detail })), 450 + i * 420));
    });
    return () => { live = false; };
  }, [r]);

  if (q.isLoading) return <Shell title="Settlement proof" flush><div className="p-4 space-y-3"><Skeleton className="h-40" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></Shell>;
  if (q.isError || !q.data) return <Shell title="Settlement proof"><Empty title="Couldn't load this market" body="Check your connection and try again." action={<LinkButton href="/explore">Explore markets</LinkButton>} /></Shell>;
  const m = q.data.market;
  if (!r) return <Shell title="Settlement proof"><Empty title="Not settled yet" body="The proof appears here as soon as the AI judge signs a verdict and it lands on NEAR." action={<LinkButton href={`/markets/${id}`}>Back to market</LinkButton>} /></Shell>;

  const yes = r.outcome === 'YES', all = checks.request === 'ok' && checks.response === 'ok' && checks.signature === 'ok';
  const anyFail = [checks.request, checks.response, checks.signature].includes('fail');
  const explorer = r.receipt_id && !r.demo ? `https://${config.networkId === 'mainnet' ? '' : 'testnet.'}nearblocks.io/txns/${r.receipt_id}` : null;
  const [model, reqHash, resHash] = (() => { const p = r.signed_text.split(':'); return [p.slice(0, -2).join(':'), p.at(-2) ?? '', p.at(-1) ?? '']; })();

  return (
    <Shell title="Settlement proof" flush>
      <section className="px-4 pt-5 pb-6 border-b border-line">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-mute">Settled {new Date(r.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        <Link href={`/markets/${id}`} className="mt-2 block text-[20px] font-semibold leading-snug hover:underline">{m.question}</Link>
        <div className="mt-5 flex items-center gap-4">
          <motion.div initial={{ scale: 2.2, rotate: -16, opacity: 0 }} animate={{ scale: 1, rotate: -6, opacity: 1 }} transition={{ type: 'spring', stiffness: 460, damping: 20, delay: 0.1 }}
            className={`rounded-xl border-[3px] px-4 py-1 text-[30px] font-black tracking-[0.1em] ${yes ? 'border-mint text-mint' : 'border-coral text-coral'}`}>{r.outcome}</motion.div>
          <div className="text-[14px] text-mute leading-snug">
            {all ? <span className="inline-flex items-center gap-1.5 text-ink font-semibold"><ShieldCheck size={17} className="text-mint" />Verified in your browser</span>
              : anyFail ? <span className="inline-flex items-center gap-1.5 text-coral font-semibold"><X size={17} />Verification failed</span>
              : 'Verifying…'}
            <div>No trust in Called needed: the hashes and signature are checked on this device.</div>
          </div>
        </div>
        {r.demo && <p className="mt-4 rounded-xl bg-ink/[.04] px-3 py-2 text-[12px] text-mute">Preview demo: this verdict is signed by a demo key, not the NEAR AI TEE. Real markets are signed inside the TEE and the receipt links to NEAR.</p>}
      </section>
      <ol className="px-4">
        <Step i={0} state={checks.request} title="Prompt matches the signed hash" body={`sha256(request) = ${short(reqHash)}`} />
        <Step i={1} state={checks.response} title="Verdict matches the signed hash" body={`sha256(response) = ${short(resHash)}`} />
        <Step i={2} state={checks.signature} title="Signed by the judge's key" body={`${r.signing_algo ?? 'ecdsa'} · ${short(r.signer, 8)}${checks.detail ? ` · ${checks.detail}` : ''}`} />
      </ol>
      <Verdict r={r} />
      <section className="px-4 py-5 space-y-3 text-[13px]">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-mute">Raw evidence</p>
        <Row k="Model" v={r.model ?? model} />
        <Row k="Signed text" v={r.signed_text} mono />
        {r.signature && <Row k="Signature" v={r.signature} mono />}
        <Row k="Receipt" v={r.receipt_id ?? '—'} mono href={explorer} />
        {r.request_json && <details className="rounded-xl border border-line p-3"><summary className="cursor-pointer text-[14px] font-medium"><FileCheck2 size={14} className="inline mr-1.5" />Full prompt</summary><pre className="mt-2 whitespace-pre-wrap break-all text-[12px] text-mute">{r.request_json}</pre></details>}
      </section>
    </Shell>
  );
}

function Row({ k, v, mono, href }: { k: string; v: string; mono?: boolean; href?: string | null }) {
  const body = <span className={`break-all ${mono ? 'font-mono text-[12px]' : ''}`}>{v}</span>;
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3">
      <span className="text-mute">{k}</span>
      {href ? <a href={href} target="_blank" rel="noreferrer noopener" className="text-[#9d86ff] hover:underline inline-flex gap-1">{body}<ExternalLink size={12} className="shrink-0 mt-0.5" /></a> : body}
    </div>
  );
}
