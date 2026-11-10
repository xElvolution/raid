/**
 * Battle arena engine. Pure canvas 2D, no deps. Yes (green, left) and No (red, right) hold territory
 * proportional to the odds; every trade launches an attack from its side, big trades shake the arena,
 * and each landed attack scores (goals for football, headbutts for bull vs bear, and so on).
 */
import type { BattleTheme as Theme } from '@called/sdk';
export type { Theme };
export { themeFor } from '@called/sdk';
export const SCORE_WORD: Record<Theme, string> = { football: 'GOAL', crypto: 'CHARGE', gta: 'BUSTED', f1: 'OVERTAKE', boxing: 'POW', movies: 'CUT!', space: 'ZAP', music: 'ENCORE', tech: 'DIRECT HIT', weather: 'STRIKE', arena: 'HIT' };

import { SPRITES } from './sprites';

const G = '#1fd17a', R = '#ff4b5c';
const SIDE = [R, G]; // index by outcome: 0 = No, 1 = Yes

interface Unit { side: 0 | 1; hx: number; hy: number; x: number; y: number; ph: number; s: number; img?: HTMLImageElement; hit: number; lunge: number; charge?: Shot }
interface Shot { side: 0 | 1; x: number; y: number; tx: number; ty: number; t: number; dur: number; big: boolean; scores?: boolean; u?: Unit }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; c: string; r: number }
interface Boom { x: number; y: number; t: number; big: boolean }
interface Car { side: 0 | 1; y: number; t: number }
const SCALE: Partial<Record<Theme, number>> = { football: 1.25, music: 1.15, tech: 1.15, weather: 1.15, crypto: 1.45, f1: 1.35, boxing: 1.65, gta: 1.5, space: 1.2, movies: 1.3 };
const CHARGERS: Theme[] = ['crypto', 'f1', 'boxing'];
interface Pop { text: string; side: 0 | 1; t: number }

export interface BattleOpts { theme: Theme; mini?: boolean; backdrop?: boolean; onScore?: (score: [number, number], side: 0 | 1) => void; sound?: () => boolean }

export class Arena {
  private ctx: CanvasRenderingContext2D;
  private w = 0; private h = 0; private dpr = 1;
  private p = 0.5; private front = 0.5; private push = 0;
  private units: Unit[] = []; private shots: Shot[] = []; private sparks: Spark[] = []; private pops: Pop[] = []; private booms: Boom[] = []; private cars: Car[] = [];
  private shake = 0; private flash = 0; private flashSide: 0 | 1 = 1;
  score: [number, number] = [0, 0];
  private ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  private raf = 0; private last = 0; private running = false; private t = 0;
  private audio?: AudioContext;
  /** Light/dark: strokes and arena floor follow the app theme (html[data-theme]). */
  private light = false;
  private get ink() { return this.light ? '0,0,0' : '255,255,255'; }
  private onTheme = () => { this.light = document.documentElement.dataset.theme === 'light'; };

  constructor(private canvas: HTMLCanvasElement, private o: BattleOpts) {
    this.onTheme(); window.addEventListener('called-theme', this.onTheme);
    this.ctx = canvas.getContext('2d')!;
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr);
    this.layout();
  }

  setOdds(p: number): void { this.p = Math.min(0.97, Math.max(0.03, p)); this.layout(); }

  /** Trader avatars become soldiers on their side. */
  setAvatars(list: { side: 0 | 1; url: string }[]): void {
    for (const a of list.slice(0, 10)) {
      const u = this.units.find((x) => x.side === a.side && !x.img);
      if (!u) continue;
      const img = new Image(); img.src = a.url; u.img = img;
    }
  }

  private layout(): void {
    const per = this.o.mini ? 3 : 9;
    if (this.units.length !== per * 2) {
      this.units = [];
      for (const side of [1, 0] as const) for (let i = 0; i < per; i++) this.units.push({ side, hx: 0, hy: 0, x: -1, y: -1, ph: Math.random() * 6.28, s: 0.85 + Math.random() * 0.3, hit: 0, lunge: 0 });
    }
    const ground = this.o.theme === 'football' ? 0.12 : 0.22;
    for (const side of [1, 0] as const) {
      const us = this.units.filter((u) => u.side === side);
      if (this.o.mini) { // three big units: one at the front, two behind
        const fx = Math.min(0.66, Math.max(0.34, this.front));
        const slots = [[0.3, 0.6], [0.72, 0.38], [0.72, 0.8]] as const;
        us.forEach((u, i) => {
          const [depth, y] = slots[i]!;
          u.hx = Math.min(0.86, Math.max(0.14, side ? fx * (1 - depth) - 0.02 : fx + (1 - fx) * depth + 0.02)); u.hy = y;
          if (u.x < 0) { u.x = u.hx; u.y = u.hy; }
        });
        continue;
      }
      us.forEach((u, i) => {
        const col = i % 3, row = Math.floor(i / 3), rows = Math.ceil(us.length / 3);
        const depth = (col + 0.6) / 3.4; // 0 near the front, 1 at the back
        const fx = Math.min(0.68, Math.max(0.32, this.front));
        u.hx = side ? fx * (1 - depth) - 0.03 : fx + (1 - fx) * depth + 0.03;
        u.hy = ground + (1 - ground * 2) * ((row + 0.5) / rows) + (col % 2 ? 0.04 : -0.04);
        if (u.x < 0) { u.x = u.hx; u.y = u.hy; }
      });
    }
  }

  /** A trade on `side`. Amount in dollars; above ~$50 is a heavy hit. */
  attack(side: 0 | 1, amount: number): void {
    const big = amount >= 50;
    const attackers = this.units.filter((u) => u.side === side).sort(() => Math.random() - 0.5).slice(0, big ? 4 : 1 + Math.floor(Math.random() * 2));
    attackers.forEach((a, i) => {
      a.lunge = 1;
      this.shots.push({ side, x: a.x, y: a.y, tx: this.front + (side ? 0.06 : -0.06), ty: a.y + (Math.random() - 0.5) * 0.2, t: 0, dur: (CHARGERS.includes(this.o.theme) ? (this.o.theme === 'f1' ? 0.5 : 0.75) : big ? 0.45 : 0.6) + i * 0.06, big, scores: i === 0, u: CHARGERS.includes(this.o.theme) ? a : undefined });
      if (CHARGERS.includes(this.o.theme)) a.charge = this.shots[this.shots.length - 1];
    });
    if (this.o.theme === 'gta' && big) this.cars.push({ side, y: 0.3 + Math.random() * 0.45, t: 0 });
    if (this.o.theme === 'football') { this.ball.vx = (side ? 1 : -1) * (big ? 1.6 : 0.9); this.ball.vy = (Math.random() - 0.5) * 0.8; }
    this.tone(side ? 520 : 330, 0.05, 'triangle', 0.04);
  }

  private land(s: Shot): void {
    this.push += (s.side ? 1 : -1) * (s.big ? 0.05 : 0.02);
    const n = s.big ? 34 : 12;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (s.big ? 0.9 : 0.5) * (0.4 + Math.random());
      this.sparks.push({ x: s.tx, y: s.ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: SIDE[s.side]!, r: s.big ? 2.6 : 1.8 });
    }
    for (const u of this.units) if (u.side !== s.side && Math.abs(u.x - s.tx) < 0.22 && Math.abs(u.y - s.ty) < 0.3) { u.hit = 1; if (CHARGERS.includes(this.o.theme)) u.x += s.side ? 0.07 : -0.07; }
    if (s.big ? ['gta', 'space', 'arena'].includes(this.o.theme) : this.o.theme === 'gta' && Math.random() < 0.35) this.booms.push({ x: s.tx, y: s.ty, t: 0, big: s.big });
    if (s.u) { s.u.lunge = 1; }
    if (s.big) { this.shake = 1; this.flash = 1; this.flashSide = s.side; }
    if (s.scores) {
      this.score[s.side]++;
      if (this.o.mini) this.pops.push({ text: SCORE_WORD[this.o.theme], side: s.side, t: 0 });
      this.o.onScore?.([...this.score] as [number, number], s.side);
    }
    this.tone(s.big ? 90 : 140, s.big ? 0.25 : 0.12, 'sine', s.big ? 0.22 : 0.1);
    if (this.o.theme === 'football' || s.big) this.cheer();
  }

  start(): void { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); }
  stop(): void { this.running = false; cancelAnimationFrame(this.raf); }
  destroy(): void { window.removeEventListener('called-theme', this.onTheme); this.stop(); void this.audio?.close(); }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    this.update(dt); this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.push *= Math.pow(0.25, dt);
    const target = Math.min(0.92, Math.max(0.08, this.p + this.push));
    this.front += (target - this.front) * Math.min(1, dt * 3);
    this.layout();
    for (const u of this.units) {
      const k = Math.min(1, dt * 4);
      const lx = u.lunge * (u.side ? 0.06 : -0.06);
      if (u.charge && u.charge.t < 1) {
        const c = u.charge, e = c.t * c.t;
        u.x = c.x + (c.tx - c.x) * e; u.y = c.y + (c.ty - c.y) * e;
      } else { if (u.charge) u.charge = undefined; u.x += (u.hx + lx - u.x) * k; u.y += (u.hy - u.y) * k; }
      u.lunge = Math.max(0, u.lunge - dt * 2.2); u.hit = Math.max(0, u.hit - dt * 2.5);
    }
    for (const s of this.shots) s.t += dt / s.dur;
    for (const s of this.shots.filter((x) => x.t >= 1)) this.land(s);
    this.shots = this.shots.filter((x) => x.t < 1);
    for (const p of this.sparks) { p.x += p.vx * dt * 0.25; p.y += p.vy * dt * 0.4; p.vy += dt * 0.8; p.life -= dt * 1.6; }
    this.sparks = this.sparks.filter((p) => p.life > 0);
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 1.2);
    for (const b of this.booms) b.t += dt * (b.big ? 1.1 : 1.8);
    this.booms = this.booms.filter((b) => b.t < 1);
    for (const c of this.cars) { c.t += dt / 0.9; if (c.t >= 1) { this.booms.push({ x: this.front, y: c.y, t: 0, big: true }); this.shake = 1; this.flash = 1; this.flashSide = c.side; this.tone(70, 0.4, 'sawtooth', 0.15); } }
    this.cars = this.cars.filter((c) => c.t < 1);
    this.shake = Math.max(0, this.shake - dt * 2.5); this.flash = Math.max(0, this.flash - dt * 3);
    if (this.o.theme === 'football') {
      const b = this.ball;
      b.vx += (this.front - b.x) * dt * 2; b.vx *= Math.pow(0.4, dt); b.vy *= Math.pow(0.4, dt);
      b.x += b.vx * dt * 0.4; b.y += b.vy * dt * 0.4; b.y += (0.5 - b.y) * dt * 0.6;
    }
  }

  private draw(): void {
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = (Math.random() - 0.5) * this.shake * 10, sy = (Math.random() - 0.5) * this.shake * 8;
    ctx.save(); ctx.translate(sx, sy);
    ctx.clearRect(-12, -12, w + 24, h + 24); ctx.fillStyle = this.light ? (this.o.backdrop ? 'rgba(243,242,238,0.8)' : '#ecebe6') : (this.o.backdrop ? 'rgba(10,10,12,0.8)' : '#0b0b0d'); ctx.fillRect(-12, -12, w + 24, h + 24);
    const fx = this.front * w;
    // territories
    ctx.fillStyle = 'rgba(31,209,122,0.10)'; ctx.fillRect(-12, -12, fx + 12, h + 24);
    ctx.fillStyle = 'rgba(255,75,92,0.10)'; ctx.fillRect(fx, -12, w - fx + 12, h + 24);
    this.backdrop(fx);
    // frontline
    ctx.strokeStyle = `rgba(${this.ink},0.75)`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -this.t * 30;
    ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx, h); ctx.stroke(); ctx.setLineDash([]);
    // shots
    for (const s of this.shots) {
      if (s.u) continue;
      const e = s.t * s.t * (3 - 2 * s.t);
      const x = (s.x + (s.tx - s.x) * e) * w, y = (s.y + (s.ty - s.y) * e) * h - Math.sin(s.t * Math.PI) * h * 0.12;
      const th = this.o.theme;
      if (th === 'gta' || th === 'space') { // tracer / laser: straight, no arc
        const lx = (s.x + (s.tx - s.x) * e) * w, ly = (s.y + (s.ty - s.y) * e) * h, len = th === 'space' ? 26 : 12;
        ctx.strokeStyle = th === 'gta' ? '#ffd166' : SIDE[s.side]!; ctx.lineWidth = th === 'space' ? 3 : 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - (s.side ? len : -len), ly); ctx.stroke(); continue;
      }
      if (th === 'movies') { ctx.fillStyle = '#fff4d6'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 2.1) * 3, y + Math.sin(k * 2.1) * 3, 2.6, 0, 7); ctx.fill(); } continue; }
      ctx.fillStyle = SIDE[s.side]!;
      ctx.beginPath(); ctx.arc(x, y, s.big ? 5 : 3.2, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(x - (s.side ? 7 : -7), y, s.big ? 4 : 2.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    // units, back to front
    for (const u of [...this.units].sort((a, b) => a.y - b.y)) this.unit(u);
    for (const c of this.cars) {
      const from = c.side ? -0.1 : 1.1, x = (from + (this.front - from) * c.t * c.t) * w;
      this.sedan(x, c.y * h, (this.o.mini ? 1.25 : 1.15) * 15, c.side ? 1 : -1, SIDE[c.side]!);
    }
    for (const b of this.booms) {
      const r = (b.big ? 46 : 22) * (this.o.mini ? 0.9 : 1) * Math.sqrt(b.t), a = 1 - b.t;
      ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(b.x * w - r * 0.3, b.y * h - r * 0.4, r * 0.9, 0, 7); ctx.fill();
      ctx.globalAlpha = a; ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.arc(b.x * w, b.y * h, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(b.x * w, b.y * h, r * 0.62, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x * w, b.y * h, r * 0.28 * (1 - b.t), 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (this.o.theme === 'football') { const b = this.ball; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x * w, b.y * h, this.o.mini ? 3.5 : 5, 0, 7); ctx.fill(); }
    for (const p of this.sparks) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const p of this.pops) {
      const a = p.t < 0.15 ? p.t / 0.15 : 1 - (p.t - 0.15) / 1.05;
      const sc = 1 + Math.max(0, 0.15 - p.t) * 4;
      ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = SIDE[p.side]!;
      ctx.font = `800 ${this.o.mini ? 14 : 22 * sc}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(p.text, p.side ? fx * 0.5 : fx + (w - fx) * 0.5, h * 0.34 - p.t * 14);
    }
    ctx.globalAlpha = 1;
    if (this.flash > 0) { ctx.fillStyle = this.flashSide ? `rgba(31,209,122,${this.flash * 0.25})` : `rgba(255,75,92,${this.flash * 0.25})`; ctx.fillRect(-12, -12, w + 24, h + 24); }
    ctx.restore();
  }

  private backdrop(fx: number): void {
    const { ctx, w, h } = this;
    ctx.strokeStyle = `rgba(${this.ink},0.06)`; ctx.lineWidth = 1;
    switch (this.o.theme) {
      case 'football':
        ctx.strokeRect(6, 6, w - 12, h - 12);
        ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.18, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w / 2, 6); ctx.lineTo(w / 2, h - 6); ctx.stroke();
        ctx.strokeRect(6, h * 0.3, w * 0.08, h * 0.4); ctx.strokeRect(w - 6 - w * 0.08, h * 0.3, w * 0.08, h * 0.4);
        break;
      case 'crypto':
        for (let x = 0; x < w; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let i = 0; i < 18; i++) {
          const x = (i + 0.5) * (w / 18), up = Math.sin(i * 1.7 + this.t * 0.3) > 0, bh = 6 + Math.abs(Math.sin(i * 2.3)) * h * 0.12;
          ctx.fillStyle = up ? 'rgba(31,209,122,0.12)' : 'rgba(255,75,92,0.12)'; ctx.fillRect(x - 3, h * 0.82 - bh, 6, bh);
        }
        break;
      case 'music':
        for (let i = 0; i < 4; i++) {
          const x = (i + 0.5) * (w / 4), sw = Math.sin(this.t * 0.8 + i) * w * 0.12;
          ctx.fillStyle = x < fx ? 'rgba(31,209,122,0.07)' : 'rgba(255,75,92,0.07)';
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sw - 30, h); ctx.lineTo(x + sw + 30, h); ctx.closePath(); ctx.fill();
        }
        break;
      case 'tech':
        for (let x = 0; x < w; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        break;
      case 'weather': {
        ctx.fillStyle = 'rgba(31,209,122,0.16)'; ctx.beginPath(); ctx.arc(fx * 0.3, h * 0.25, h * 0.14, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,75,92,0.12)';
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(fx + (w - fx) * (0.3 + i * 0.22), h * 0.2, w * 0.07, h * 0.07, 0, 0, 7); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,75,92,0.25)';
        for (let i = 0; i < 14; i++) { const x = fx + ((i * 37 + this.t * 60) % Math.max(1, w - fx)), y = (h * 0.3 + (i * 53 + this.t * 140) % (h * 0.7)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 8); ctx.stroke(); }
        break;
      }
      case 'gta': { // skyline, palms and neon street
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        for (let i = 0; i < 12; i++) { const bw = w / 12, bh = h * (0.18 + ((i * 37) % 23) / 60); ctx.fillRect(i * bw, h * 0.62 - bh, bw - 3, bh); }
        ctx.fillStyle = 'rgba(255,209,102,0.22)';
        for (let i = 0; i < 40; i++) { const x = ((i * 53) % 100) / 100 * w, y = h * (0.3 + ((i * 29) % 30) / 100); ctx.fillRect(x, y, 2, 3); }
        ctx.strokeStyle = 'rgba(255,90,200,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, h * 0.62); ctx.lineTo(w, h * 0.62); ctx.stroke();
        ctx.strokeStyle = `rgba(${this.ink},0.12)`; ctx.setLineDash([14, 12]); ctx.lineDashOffset = -this.t * 40; ctx.beginPath(); ctx.moveTo(0, h * 0.82); ctx.lineTo(w, h * 0.82); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        for (const px of [0.08, 0.92]) { const x = px * w; ctx.fillRect(x - 2, h * 0.3, 4, h * 0.32); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(k * 1.26) * 12, h * 0.3 + Math.sin(k * 1.26) * 4, 14, 4, k * 1.26, 0, 7); ctx.fill(); } }
        break;
      }
      case 'f1': { // track with kerbs and a moving grid
        const kerb = (y: number) => { for (let x = -((this.t * 120) % 24); x < w; x += 24) { ctx.fillStyle = 'rgba(255,75,92,0.35)'; ctx.fillRect(x, y, 12, 6); ctx.fillStyle = `rgba(${this.ink},0.3)`; ctx.fillRect(x + 12, y, 12, 6); } };
        kerb(4); kerb(h - 10);
        ctx.strokeStyle = `rgba(${this.ink},0.1)`; ctx.setLineDash([18, 16]); ctx.lineDashOffset = this.t * 120;
        for (const y of [0.37, 0.63]) { ctx.beginPath(); ctx.moveTo(0, h * y); ctx.lineTo(w, h * y); ctx.stroke(); }
        ctx.setLineDash([]);
        const cs = 6; for (let r = 0; r < Math.ceil(h / cs); r++) for (let c = 0; c < 2; c++) { ctx.fillStyle = (r + c) % 2 ? `rgba(${this.ink},0.35)` : 'rgba(0,0,0,0.35)'; ctx.fillRect(fx - cs + c * cs, r * cs, cs, cs); }
        break;
      }
      case 'boxing': { // ring ropes and corner posts
        ctx.fillStyle = `rgba(${this.ink},0.05)`; ctx.fillRect(0, h * 0.78, w, h * 0.22);
        for (const [i, y] of [0.3, 0.45, 0.6].entries()) { ctx.strokeStyle = ['rgba(255,75,92,0.5)', `rgba(${this.ink},0.4)`, 'rgba(31,209,122,0.5)'][i]!; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, h * y); ctx.quadraticCurveTo(w / 2, h * y + 6, w - 10, h * y); ctx.stroke(); }
        ctx.fillStyle = 'rgba(31,209,122,0.6)'; ctx.fillRect(4, h * 0.24, 7, h * 0.56); ctx.fillStyle = 'rgba(255,75,92,0.6)'; ctx.fillRect(w - 11, h * 0.24, 7, h * 0.56);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(${this.ink},0.05)`; ctx.beginPath(); ctx.moveTo(w * (0.2 + i * 0.2), 0); ctx.lineTo(w * (0.12 + i * 0.2), h); ctx.lineTo(w * (0.28 + i * 0.2), h); ctx.closePath(); ctx.fill(); }
        break;
      }
      case 'movies': { // film strip edges and projector beam
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, w, 14); ctx.fillRect(0, h - 14, w, 14);
        ctx.fillStyle = `rgba(${this.ink},0.35)`;
        for (let x = -((this.t * 30) % 18); x < w; x += 18) { ctx.fillRect(x, 4, 8, 6); ctx.fillRect(x, h - 10, 8, 6); }
        ctx.fillStyle = 'rgba(255,244,214,0.06)'; ctx.beginPath(); ctx.moveTo(fx, 14); ctx.lineTo(fx - w * 0.25, h - 14); ctx.lineTo(fx + w * 0.25, h - 14); ctx.closePath(); ctx.fill();
        break;
      }
      case 'space': { // twinkling stars and a planet
        for (let i = 0; i < 50; i++) { const x = ((i * 71) % 100) / 100 * w, y = ((i * 37) % 100) / 100 * h; ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(this.t * 1.5 + i)); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1.6, 1.6); }
        ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(124,92,255,0.18)'; ctx.beginPath(); ctx.arc(w * 0.5, h * 1.25, h * 0.6, 0, 7); ctx.fill();
        break;
      }
      default:
        ctx.beginPath(); ctx.moveTo(0, h * 0.86); ctx.lineTo(w, h * 0.86); ctx.stroke();
    }
  }

  private unit(u: Unit): void {
    const { ctx, w, h } = this;
    const m = this.o.mini ? 1.4 : 1;
    const x = u.x * w + (u.hit ? (Math.random() - 0.5) * 4 : 0), bob = Math.sin(this.t * 3 + u.ph) * 2 * m;
    const y = u.y * h + bob, s = 15 * u.s * m * (SCALE[this.o.theme] ?? 1);
    const c = SIDE[u.side]!, face = u.side ? 1 : -1;
    ctx.save(); ctx.translate(x, y);
    if (u.hit) ctx.globalAlpha = 0.6 + 0.4 * (1 - u.hit);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, s * 1.05, s * 0.8, s * 0.22, 0, 0, 7); ctx.fill();
    if (this.o.theme === 'crypto') { this.beast(u, s, face); ctx.restore(); return; }
    const sp = SPRITES[this.o.theme];
    if (sp) { ctx.save(); ctx.scale(face, 1); sp(ctx, s, u.side, { t: this.t + u.ph, lunge: u.lunge, charging: !!u.charge }); ctx.restore(); this.badge(u, s, face); ctx.restore(); return; }
    if (u.img?.complete && u.img.naturalWidth) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, s * 0.95, 0, 7); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, 7); ctx.clip(); ctx.drawImage(u.img, -s * 0.8, -s * 0.8, s * 1.6, s * 1.6); ctx.restore();
      ctx.restore(); return;
    }
    ctx.fillStyle = c; ctx.strokeStyle = c;
    switch (this.o.theme) {
      case 'football':
        ctx.beginPath(); ctx.roundRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.95, s * 0.25); ctx.fill();
        ctx.fillStyle = '#e9d2bf'; ctx.beginPath(); ctx.arc(0, -s * 0.45, s * 0.32, 0, 7); ctx.fill();
        ctx.fillStyle = '#0c0c0f'; ctx.font = `700 ${s * 0.5}px Inter`; ctx.textAlign = 'center'; ctx.fillText(String((Math.round(u.ph * 3) % 11) + 1), 0, s * 0.5);
        break;
      case 'music':
        ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.32, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-s * 0.4, 0, s * 0.8, s * 0.85, s * 0.3); ctx.fill();
        ctx.lineWidth = s * 0.1; ctx.lineCap = 'round'; const wave = Math.sin(this.t * 6 + u.ph) * s * 0.25;
        ctx.beginPath(); ctx.moveTo(face * s * 0.3, s * 0.1); ctx.lineTo(face * s * 0.55 + wave, -s * 0.9); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(face * s * 0.55 + wave, -s * 0.95, s * 0.14, 0, 7); ctx.fill();
        break;
      case 'tech':
        ctx.beginPath(); ctx.roundRect(-s * 0.5, -s * 0.6, s, s * 0.7, s * 0.15); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-s * 0.4, s * 0.15, s * 0.8, s * 0.75, s * 0.12); ctx.fill();
        ctx.fillStyle = '#0c0c0f'; ctx.fillRect(-s * 0.32, -s * 0.38, s * 0.64, s * 0.16);
        ctx.fillStyle = '#fff'; ctx.fillRect(face * s * 0.1 - s * 0.08, -s * 0.36, s * 0.16, s * 0.12);
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -s * 0.6); ctx.lineTo(0, -s * 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -s * 0.95, s * 0.09, 0, 7); ctx.fill();
        break;
      case 'weather':
        if (u.side) { ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, 7); ctx.fill(); ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * 0.785 + this.t; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.65, Math.sin(a) * s * 0.65); ctx.lineTo(Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.9); ctx.stroke(); } }
        else { ctx.beginPath(); ctx.arc(-s * 0.35, 0, s * 0.38, 0, 7); ctx.arc(s * 0.1, -s * 0.2, s * 0.48, 0, 7); ctx.arc(s * 0.5, s * 0.05, s * 0.34, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.lineTo(-s * 0.15, s * 0.7); ctx.lineTo(s * 0.05, s * 0.65); ctx.lineTo(-s * 0.08, s * 1); ctx.lineTo(s * 0.22, s * 0.55); ctx.lineTo(s * 0.02, s * 0.6); ctx.fill(); }
        break;
      default: // stylised arcade tank
        ctx.beginPath(); ctx.roundRect(-s * 0.8, 0, s * 1.6, s * 0.6, s * 0.25); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-s * 0.45, -s * 0.35, s * 0.9, s * 0.42, s * 0.18); ctx.fill();
        ctx.lineWidth = s * 0.18; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(face * s * 0.3, -s * 0.15); ctx.lineTo(face * (s * 1.05 + u.lunge * s * 0.3), -s * 0.22); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * s * 0.32, s * 0.45, s * 0.1, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }

  /** Side-view bull (Yes) or bear (No). Mirrored by `face`; legs gallop while charging; rider badge shows the trader avatar. */
  private beast(u: Unit, s: number, face: number): void {
    const { ctx } = this;
    const bull = u.side === 1, charging = !!u.charge;
    const main = bull ? '#22d3a6' : '#d93a4a', dark = bull ? '#13906f' : '#8f2431', light = bull ? '#8ff0d4' : '#f7a3a9';
    const gal = Math.sin(this.t * (charging ? 22 : 4) + u.ph) * (charging ? 0.32 : 0.06);
    ctx.scale(face, 1); // draw facing +x
    if (charging) ctx.rotate(bull ? 0.08 : -0.04);
    // legs (far pair darker, near pair main)
    const leg = (x: number, ph: number, col: string, w: number) => {
      ctx.save(); ctx.translate(x * s, s * 0.32); ctx.rotate(gal * ph); ctx.fillStyle = col;
      ctx.beginPath(); ctx.roundRect(-w * s / 2, 0, w * s, s * 0.62, w * s / 2); ctx.fill();
      ctx.fillStyle = '#0c0c0f'; ctx.fillRect(-w * s / 2, s * 0.52, w * s, s * 0.1);
      if (!bull) { ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) ctx.fillRect(-w * s / 2 + i * w * s * 0.36 + w * s * 0.1, s * 0.6, s * 0.035, s * 0.07); }
      ctx.restore();
    };
    const lw = bull ? 0.2 : 0.26;
    leg(-0.5, -1, dark, lw); leg(0.42, 1, dark, lw);
    // tail
    ctx.strokeStyle = dark; ctx.lineWidth = s * 0.08; ctx.lineCap = 'round';
    if (bull) { ctx.beginPath(); ctx.moveTo(-s * 0.8, -s * 0.05); ctx.quadraticCurveTo(-s * 1.15, s * 0.1 + gal * s, -s * 1.05, s * 0.45); ctx.stroke(); ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(-s * 1.05, s * 0.5, s * 0.08, s * 0.13, 0, 0, 7); ctx.fill(); }
    // body
    ctx.fillStyle = main;
    ctx.beginPath(); ctx.ellipse(0, s * 0.08, s * 0.88, s * (bull ? 0.46 : 0.52), 0, 0, 7); ctx.fill();
    if (bull) { ctx.beginPath(); ctx.ellipse(s * 0.38, -s * 0.18, s * 0.46, s * 0.4, -0.3, 0, 7); ctx.fill(); } // shoulder hump
    else { ctx.beginPath(); ctx.ellipse(s * 0.2, -s * 0.22, s * 0.5, s * 0.38, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-s * 0.85, -s * 0.05, s * 0.1, s * 0.1, 0, 0, 7); ctx.fill();
      for (let i = 0; i < 6; i++) { const a = Math.PI * (1.15 + i * 0.13); ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.84, s * 0.05 + Math.sin(a) * s * 0.5); ctx.lineTo(Math.cos(a) * s * 0.98, s * 0.0 + Math.sin(a) * s * 0.62); ctx.lineTo(Math.cos(a + 0.12) * s * 0.84, s * 0.05 + Math.sin(a + 0.12) * s * 0.5); ctx.fill(); } }
    leg(-0.32, 1, main, lw); leg(0.6, -1, main, lw);
    // head
    const hx = s * (bull ? 0.98 : 0.92), hy = bull ? (charging ? s * 0.12 : -s * 0.05) : -s * 0.32;
    ctx.save(); ctx.translate(hx, hy);
    if (bull) {
      ctx.fillStyle = main; ctx.beginPath(); ctx.roundRect(-s * 0.28, -s * 0.28, s * 0.56, s * 0.52, s * 0.18); ctx.fill();
      ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(s * 0.24, s * 0.1, s * 0.2, s * 0.17, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#0c0c0f'; ctx.beginPath(); ctx.arc(s * 0.32, s * 0.06, s * 0.035, 0, 7); ctx.arc(s * 0.32, s * 0.15, s * 0.035, 0, 7); ctx.fill();
      // horns: big cream curves sweeping forward and up
      ctx.strokeStyle = '#f4ead2'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.24); ctx.quadraticCurveTo(s * 0.05, -s * 0.62, s * 0.42, -s * 0.66); ctx.stroke();
      ctx.lineWidth = s * 0.09; ctx.strokeStyle = '#cfc3a6';
      ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.24); ctx.quadraticCurveTo(-s * 0.2, -s * 0.58, s * 0.12, -s * 0.66); ctx.stroke();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.12, s * 0.12, s * 0.07, -0.4, 0, 7); ctx.fill(); // ear
      ctx.fillStyle = '#0c0c0f'; ctx.beginPath(); ctx.arc(s * 0.02, -s * 0.06, s * 0.055, 0, 7); ctx.fill();
      if (charging) { ctx.fillStyle = `rgba(${this.ink},0.55)`; for (let i = 0; i < 3; i++) { const k = (this.t * 3 + i / 3) % 1; ctx.beginPath(); ctx.arc(s * (0.5 + k * 0.4), s * (0.15 + k * 0.1), s * 0.06 * (1 - k) + 1, 0, 7); ctx.fill(); } }
    } else {
      // bear head: big round skull, large round ears on top, protruding muzzle with a big black nose
      ctx.fillStyle = main; ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-s * 0.26, -s * 0.36, s * 0.17, 0, 7); ctx.arc(s * 0.14, -s * 0.42, s * 0.17, 0, 7); ctx.fill();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(-s * 0.26, -s * 0.36, s * 0.09, 0, 7); ctx.arc(s * 0.14, -s * 0.42, s * 0.09, 0, 7); ctx.fill();
      ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(s * 0.15, -s * 0.08); ctx.quadraticCurveTo(s * 0.62, -s * 0.06, s * 0.6, s * 0.12); ctx.quadraticCurveTo(s * 0.5, s * 0.26, s * 0.12, s * 0.22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0c0c0f'; ctx.beginPath(); ctx.ellipse(s * 0.56, -s * 0.02, s * 0.09, s * 0.07, 0, 0, 7); ctx.fill();
      ctx.lineWidth = s * 0.04; ctx.strokeStyle = '#0c0c0f'; ctx.beginPath(); ctx.moveTo(s * 0.5, s * 0.14); ctx.lineTo(s * 0.3, s * 0.16); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.1, -s * 0.12, s * 0.06, 0, 7); ctx.fill();
      ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(s * 0.0, -s * 0.24); ctx.lineTo(s * 0.18, -s * 0.18); ctx.stroke(); // angry brow
      if (charging || u.lunge > 0.2) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(s * 0.32, s * 0.17); ctx.lineTo(s * 0.36, s * 0.3); ctx.lineTo(s * 0.41, s * 0.17); ctx.fill(); }
    }
    ctx.restore();
    if (!bull && (charging || u.lunge > 0.2)) { // raised claw swipe
      ctx.save(); ctx.translate(s * 0.75, s * 0.05); ctx.rotate(-0.9 - gal); ctx.fillStyle = main;
      ctx.beginPath(); ctx.roundRect(-s * 0.12, -s * 0.6, s * 0.24, s * 0.62, s * 0.12); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.04; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.07, -s * 0.6); ctx.lineTo(i * s * 0.07 + s * 0.04, -s * 0.74); ctx.stroke(); }
      ctx.restore();
    }
    if (charging) { ctx.fillStyle = 'rgba(200,190,170,0.35)'; for (let i = 0; i < 4; i++) { const k = (this.t * 4 + i / 4) % 1; ctx.beginPath(); ctx.arc(-s * (0.8 + k * 0.9), s * 0.9 - k * s * 0.3, s * 0.12 * (1 - k) + 1, 0, 7); ctx.fill(); } }
    // rider badge (trader avatar)
    if (u.img?.complete && u.img.naturalWidth && !this.o.mini) {
      const bx = -s * 0.1, by = -s * 0.62, r = s * 0.3;
      ctx.scale(face, 1);
      ctx.fillStyle = '#0c0c0f'; ctx.beginPath(); ctx.arc(bx * face, by, r + 2, 0, 7); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(bx * face, by, r, 0, 7); ctx.clip(); ctx.drawImage(u.img, bx * face - r, by - r, r * 2, r * 2); ctx.restore();
    }
  }

  private badge(u: Unit, s: number, face: number): void {
    if (!u.img?.complete || !u.img.naturalWidth || this.o.mini) return;
    const { ctx } = this, r = s * 0.26, bx = -face * s * 0.55, by = -s * 0.85;
    ctx.fillStyle = '#0c0c0f'; ctx.beginPath(); ctx.arc(bx, by, r + 2, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.clip(); ctx.drawImage(u.img, bx - r, by - r, r * 2, r * 2); ctx.restore();
  }

  /** Cartoon getaway sedan for GTA big trades. */
  private sedan(x: number, y: number, s: number, face: number, c: string): void {
    const { ctx } = this;
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, s * 0.62, s * 1.6, s * 0.18, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(-s * 1.5, -s * 0.05, s * 3, s * 0.6, s * 0.2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-s * 0.8, -s * 0.5, s * 1.5, s * 0.55, s * 0.2); ctx.fill();
    ctx.fillStyle = '#bfe3ff'; ctx.fillRect(-s * 0.65, -s * 0.4, s * 0.55, s * 0.36); ctx.fillRect(0, -s * 0.4, s * 0.55, s * 0.36);
    ctx.fillStyle = '#111'; for (const wx of [-0.9, 0.9]) { ctx.beginPath(); ctx.arc(wx * s, s * 0.55, s * 0.28, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ffd166'; ctx.fillRect(s * 1.38, s * 0.05, s * 0.12, s * 0.16);
    ctx.strokeStyle = `rgba(${this.ink},0.35)`; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * (1.8 + i * 0.3), s * (0.05 + i * 0.18)); ctx.lineTo(-s * (2.4 + i * 0.3), s * (0.05 + i * 0.18)); ctx.stroke(); }
    ctx.restore();
  }

  private ac(): AudioContext | null {
    if (!this.o.sound?.()) return null;
    try { this.audio ??= new AudioContext(); return this.audio; } catch { return null; }
  }
  private tone(f: number, d: number, type: OscillatorType, vol: number): void {
    const a = this.ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f;
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f * 0.5), a.currentTime + d);
    g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + d);
  }
  private cheer(): void {
    const a = this.ac(); if (!a) return;
    const len = a.sampleRate * 0.6, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI) * 0.5;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'bandpass'; f.frequency.value = 1200; g.gain.value = 0.08; src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start();
  }
}

