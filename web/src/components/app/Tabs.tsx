'use client';
import { motion } from 'motion/react';

/** X-style tab strip: equal-width labels with a sliding signal underline. */
export function Tabs<T extends string>({ value, onChange, items, id }: { value: T; onChange: (v: T) => void; items: { key: T; label: string; count?: number }[]; id: string }) {
  return (
    <div role="tablist" className="flex border-b border-line">
      {items.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={`relative flex-1 py-3.5 text-[15px] transition-colors ${value === t.key ? 'font-semibold text-ink' : 'font-medium text-mute hover:text-ink'}`}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 mono text-[12px] text-faint">{t.count}</span>}
          {value === t.key && <motion.span layoutId={`tab-${id}`} className="absolute bottom-0 left-1/2 h-[3px] w-12 -translate-x-1/2 rounded-full bg-signal" transition={{ type: 'spring', stiffness: 480, damping: 36 }} />}
        </button>
      ))}
    </div>
  );
}
