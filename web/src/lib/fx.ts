'use client';
import confetti from 'canvas-confetti';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const BRAND = ['#7c5cff', '#9d86ff', '#ffffff', '#22d3a6'];

/** Short vibration on supporting devices; no-op elsewhere. */
let lastTick = 0;
export const HAPTICS_KEY = 'called-haptics';
export function hapticsOn(): boolean { try { return localStorage.getItem(HAPTICS_KEY) !== 'off'; } catch { return true; } }
export function setHaptics(on: boolean): void { try { localStorage.setItem(HAPTICS_KEY, on ? 'on' : 'off'); } catch { /* private mode */ } if (on) haptic('tap'); }
export function haptic(pattern: 'tap' | 'tick' | 'success' | 'error' | 'heavy' | 'select' = 'tap'): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator) || !hapticsOn()) return;
  if (pattern === 'select') { navigator.vibrate([4, 30, 6]); return; }
  if (pattern === 'tick') { const n = performance.now(); if (n - lastTick < 45) return; lastTick = n; navigator.vibrate(3); return; }
  navigator.vibrate(pattern === 'tap' ? 8 : pattern === 'heavy' ? 18 : pattern === 'success' ? [12, 40, 24] : [40, 30, 40]);
}

export function celebrate(): void {
  haptic('success');
  if (reduced()) return;
  void confetti({ particleCount: 100, spread: 80, origin: { y: 0.65 }, colors: BRAND, scalar: 1.1 });
  setTimeout(() => void confetti({ particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: BRAND }), 140);
  setTimeout(() => void confetti({ particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: BRAND }), 280);
}

/** Gold coin burst from a point (e.g. the button that was pressed). */
export function coinBurst(x = 0.5, y = 0.6): void {
  haptic('heavy');
  if (reduced()) return;
  const coin = confetti.shapeFromText ? confetti.shapeFromText({ text: '●', scalar: 2 }) : undefined;
  void confetti({ particleCount: 28, spread: 70, startVelocity: 32, gravity: 1.1, origin: { x, y }, colors: ['#ffc83d', '#e5a500', '#fff5d6'], shapes: coin ? [coin, 'circle'] : ['circle'], scalar: 1.4, ticks: 120 });
}

/** Global XP pop-up bus. */
type XpListener = (amount: number, label?: string) => void;
const xpListeners = new Set<XpListener>();
export function onXp(fn: XpListener): () => void { xpListeners.add(fn); return () => xpListeners.delete(fn); }
export function popXp(amount: number, label?: string): void { for (const f of xpListeners) f(amount, label); }

/** Global celebration overlay bus (league promotion, streak milestones, wins). */
export interface Celebration { kind: 'promotion' | 'streak' | 'daily' | 'win'; title: string; body: string }
type CelebListener = (c: Celebration) => void;
const celebListeners = new Set<CelebListener>();
export function onCelebration(fn: CelebListener): () => void { celebListeners.add(fn); return () => celebListeners.delete(fn); }
export function showCelebration(c: Celebration): void { celebrate(); for (const f of celebListeners) f(c); }

/** Signature "Called it" win moment: stamp, aurora ring, and the amount won. */
export interface Win { amount?: number; question?: string; label?: string }
type WinListener = (w: Win) => void;
const winListeners = new Set<WinListener>();
export function onWin(fn: WinListener): () => void { winListeners.add(fn); return () => winListeners.delete(fn); }
export function calledIt(w: Win): void {
  haptic('success');
  if (!reduced()) {
    const C = ['#ffffff', '#22d3a6', '#0c0c0f', '#d9ceff'];
    setTimeout(() => void confetti({ particleCount: 110, spread: 110, startVelocity: 42, origin: { y: 0.45 }, colors: C, scalar: 1.1, ticks: 220, zIndex: 120 }), 380);
    setTimeout(() => void confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: C, zIndex: 120 }), 600);
    setTimeout(() => void confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: C, zIndex: 120 }), 760);
  }
  for (const f of winListeners) f(w);
}

/**
 * Tap-to-predict feedback: a hard-edged broadcast ring plus four cut shards that fly out from the tap point.
 * Pure DOM + WAAPI (no layout thrash), removed when finished; skipped entirely under reduced motion.
 */
export function tapBurst(x: number, y: number, color = '#7c5cff'): void {
  if (typeof document === 'undefined' || reduced()) return;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;z-index:110`;
  const ring = document.createElement('div');
  ring.style.cssText = `position:absolute;left:-22px;top:-22px;width:44px;height:44px;border:3px solid ${color};clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))`;
  host.appendChild(ring);
  ring.animate([{ transform: 'scale(.3) rotate(-8deg)', opacity: 1 }, { transform: 'scale(1.9) rotate(0)', opacity: 0 }], { duration: 460, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' });
  [0, 90, 180, 270].forEach((deg, i) => {
    const sh = document.createElement('div');
    sh.style.cssText = `position:absolute;left:-4px;top:-2px;width:8px;height:4px;background:${color}`;
    host.appendChild(sh);
    const a = ((deg + 45) * Math.PI) / 180, d = 34 + (i % 2) * 8;
    sh.animate([{ transform: `rotate(${deg + 45}deg) translate(0,0)`, opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) rotate(${deg + 45}deg) scaleX(.4)`, opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'forwards' });
  });
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 520);
}
