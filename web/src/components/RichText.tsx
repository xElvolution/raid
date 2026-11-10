import Link from 'next/link';
import { Fragment } from 'react';

const TOKEN = /(@[a-z0-9_]{2,20}|\$[A-Z]{2,6}\b|#[A-Za-z0-9_]{2,30}|https?:\/\/[^\s]+)/g;

/** Post body with @mentions, $tickers, #tags and links styled in the accent colour, like X and Farcaster. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>;
        const cls = 'text-[#9d86ff] hover:underline';
        if (p.startsWith('@')) return <Link key={i} href={`/u/${p.slice(1)}`} className={cls} onClick={(e) => e.stopPropagation()}>{p}</Link>;
        if (p.startsWith('http')) {
          let label = p; try { const u = new URL(p); label = u.host.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname.slice(0, 18) + (u.pathname.length > 18 ? '…' : '') : ''); } catch { /* keep raw */ }
          return <a key={i} href={p} target="_blank" rel="noreferrer noopener" className={cls} onClick={(e) => e.stopPropagation()}>{label}</a>;
        }
        return <Link key={i} href={`/explore?q=${encodeURIComponent(p)}`} className={cls}>{p}</Link>;
      })}
    </>
  );
}
