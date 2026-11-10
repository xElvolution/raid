'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type Resolved = 'light' | 'dark';
const KEY = 'called.theme';

/** Inline, render-blocking script for <head>: sets data-theme before first paint so there is no flash. */
export const themeBootScript = `(function(){try{var p=localStorage.getItem('${KEY}')||'system';var d=p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):p;document.documentElement.dataset.theme=d;document.querySelector('meta[name=theme-color]')?.setAttribute('content',d==='light'?'#f3f2ee':'#000000')}catch(e){}})()`;

const resolve = (p: ThemePref): Resolved => (p === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : p);

function apply(d: Resolved) {
  document.documentElement.dataset.theme = d;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', d === 'light' ? '#f3f2ee' : '#000000');
  window.dispatchEvent(new CustomEvent('called-theme', { detail: d }));
}

/**
 * Signature switch: a circular reveal of the new theme growing from the tap point (View Transitions).
 * Falls back to an instant swap without the API or with reduced motion. No flash: the old frame is a snapshot.
 */
function switchWithReveal(d: Resolved, origin?: { x: number; y: number }) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };
  if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply(d);
  const x = origin?.x ?? innerWidth - 40, y = origin?.y ?? 30;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.documentElement.classList.add('theme-vt');
  const t = doc.startViewTransition(() => apply(d));
  void t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 560, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
  void t.finished.finally(() => document.documentElement.classList.remove('theme-vt'));
}

const Ctx = createContext<{ pref: ThemePref; theme: Resolved; setPref: (p: ThemePref, origin?: { x: number; y: number }) => void; toggle: (origin?: { x: number; y: number }) => void }>({
  pref: 'system', theme: 'dark', setPref: () => {}, toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [theme, setTheme] = useState<Resolved>('dark');
  useEffect(() => {
    const p = (localStorage.getItem(KEY) as ThemePref) || 'system';
    // Re-assert the saved theme: if React ever re-renders <html> from scratch it drops the boot script's data-theme.
    const d = resolve(p); if (document.documentElement.dataset.theme !== d) apply(d);
    setPrefState(p); setTheme(d);
    const mq = matchMedia('(prefers-color-scheme: light)');
    const onSys = () => { if ((localStorage.getItem(KEY) || 'system') === 'system') { const d = resolve('system'); setTheme(d); switchWithReveal(d); } };
    mq.addEventListener('change', onSys);
    return () => mq.removeEventListener('change', onSys);
  }, []);
  const setPref = useCallback((p: ThemePref, origin?: { x: number; y: number }) => {
    localStorage.setItem(KEY, p); setPrefState(p);
    const d = resolve(p);
    if (d !== document.documentElement.dataset.theme) switchWithReveal(d, origin);
    setTheme(d);
  }, []);
  const toggle = useCallback((origin?: { x: number; y: number }) => setPref(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', origin), [setPref]);
  return <Ctx.Provider value={{ pref, theme, setPref, toggle }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);
