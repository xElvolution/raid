import { useId } from 'react';
/**
 * The RAID brand: the dotted-ring arrow mark and the wordmark.
 */
const DOTS: [number, number][] = [[50.0,15.0],[57.34,15.83],[64.32,18.27],[70.58,22.2],[75.8,27.42],[79.73,33.68],[82.17,40.66],[83.0,48.0],[82.17,55.34],[79.73,62.32],[75.8,68.58],[70.58,73.8],[64.32,77.73],[35.68,77.73],[29.42,73.8],[24.2,68.58],[20.27,62.32],[17.83,55.34],[17.0,48.0],[17.83,40.66],[20.27,33.68],[24.2,27.42],[29.42,22.2],[35.68,18.27],[42.66,15.83]];
const ARROW = 'M50 25.4 L65.5 51 L53.6 42.6 L59 84.6 L50 71 L41 84.6 L46.4 42.6 L34.5 51 Z';
/** RAID mark: a ring of dots (the crew) around an arrow going up (the raid). Orange gradient; `mono` uses currentColor. */
export function Mark({ size = 28, className = '', mono = false }: { size?: number; className?: string; mono?: boolean; light?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="14 12 72 77" width={size} height={size} className={className} aria-hidden>
      <defs><linearGradient id={`rg${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7a1a" /><stop offset="1" stopColor="#ff3d0a" /></linearGradient></defs>
      <g fill={mono ? 'currentColor' : `url(#rg${id})`}>{DOTS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.55" />)}<path d={ARROW} /></g>
    </svg>
  );
}

export function Wordmark({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark size={size} />
      <span className="font-semibold tracking-[-0.06em]" style={{ fontSize: size * 0.95, lineHeight: 1 }}>raid</span>
    </span>
  );
}
