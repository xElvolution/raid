/**
 * The RAID mark: three rising bars that break through a horizontal sell line, the fourth (lime) bar is the hit.
 * It is built on a 4px grid so it stays crisp from a 16px favicon to a billboard.
 */
export function Mark({ size = 28, className = '', mono = false }: { size?: number; className?: string; mono?: boolean }) {
  const fg = mono ? 'currentColor' : 'var(--color-ink)';
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} className={className} aria-hidden>
      <rect x="0" y="19" width="6" height="9" fill={fg} />
      <rect x="7.33" y="13" width="6" height="15" fill={fg} />
      <rect x="14.66" y="7" width="6" height="21" fill={fg} />
      <rect x="22" y="0" width="6" height="28" fill={mono ? 'currentColor' : '#c6ff3d'} className={mono ? '' : 'mark-lime'} />
      <rect x="0" y="9" width="28" height="2.2" fill={mono ? 'currentColor' : '#c6ff3d'} className={mono ? '' : 'mark-lime'} />
    </svg>
  );
}

export function Wordmark({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark size={size} />
      <span className="wide-black" style={{ fontSize: size * 0.86 }}>RAID</span>
    </span>
  );
}
