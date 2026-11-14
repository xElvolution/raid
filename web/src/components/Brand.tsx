/**
 * The RAID mark: three rounded bars climbing toward a flare-orange sell line; the last bar breaks through it.
 * Built on a 4px grid so it stays crisp from a 16px favicon to a billboard.
 */
export function Mark({ size = 28, className = '', mono = false, light = false }: { size?: number; className?: string; mono?: boolean; light?: boolean }) {
  const fg = mono ? 'currentColor' : light ? '#f2f1ec' : 'var(--color-ink)';
  const sig = mono ? 'currentColor' : 'var(--color-signal)';
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} className={className} aria-hidden>
      <rect x="1" y="17" width="5.5" height="10" rx="2.75" fill={fg} opacity=".38" />
      <rect x="8.25" y="12" width="5.5" height="15" rx="2.75" fill={fg} opacity=".66" />
      <rect x="15.5" y="7" width="5.5" height="20" rx="2.75" fill={fg} />
      <rect x="22.5" y="1" width="5" height="26" rx="2.5" fill={sig} />
      <rect x="0" y="9" width="28" height="2" rx="1" fill={sig} />
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
