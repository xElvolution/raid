import type { MarketCategory } from '@called/sdk';

const GLYPH: Record<string, string> = {
  sports: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4 3.3 2.4-1.3 3.9h-4l-1.3-3.9L12 7Z',
  crypto: 'M9 6h4.5a3 3 0 0 1 0 6H9Zm0 6h5.2a3 3 0 0 1 0 6H9ZM9 4v16M12 4v2M12 18v2',
  culture: 'M5 5h14v9a7 7 0 0 1-14 0V5Zm4 5h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0',
  tech: 'M8 8h8v8H8zM10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3',
  music: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm10-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  weather: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z',
  other: 'M5 17l5-5 3 3 6-6M14 9h5v5',
};

/** Square market tile: real image when we have one, otherwise a tinted category glyph. */
export function MarketTile({ category, image, size = 44, className = '' }: { category?: MarketCategory | string | null; image?: string | null; size?: number; className?: string }) {
  const c = category && GLYPH[category] ? category : 'other';
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" width={size} height={size} className={`shrink-0 rounded-xl object-cover bg-panel ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <span className={`shrink-0 grid place-items-center rounded-xl bg-snow border border-line ${className}`} style={{ width: size, height: size }} aria-hidden>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={GLYPH[c]} /></svg>
    </span>
  );
}
