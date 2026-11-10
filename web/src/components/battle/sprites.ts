/**
 * Subject sprites for the battle arena. Each draws one unit facing +x at the origin, sized by `s`.
 * Yes is green, No is red. Cartoon only: no gore, no real-world violence imagery.
 */
import type { Theme } from './engine';

type Ctx = CanvasRenderingContext2D;
export interface SpriteState { t: number; lunge: number; charging: boolean }
type Sprite = (ctx: Ctx, s: number, side: 0 | 1, st: SpriteState) => void;

const MAIN = ['#e0414f', '#22d3a6'], DARK = ['#8f2431', '#13906f'];
const SKIN = ['#c98d6b', '#8d5a3b'];

/** GTA-style crew member: fedora, sharp suit, cartoon blaster with a muzzle flash on attack. */
const gangster: Sprite = (ctx, s, side, st) => {
  const c = MAIN[side]!, d = DARK[side]!;
  ctx.fillStyle = '#111'; ctx.fillRect(-s * 0.3, s * 0.45, s * 0.22, s * 0.5); ctx.fillRect(s * 0.06, s * 0.45, s * 0.22, s * 0.5);
  ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(-s * 0.4, -s * 0.15, s * 0.8, s * 0.7, s * 0.16); ctx.fill();
  ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.15); ctx.lineTo(s * 0.12, -s * 0.15); ctx.lineTo(s * 0.02, s * 0.15); ctx.fill();
  ctx.fillStyle = '#111'; ctx.fillRect(-s * 0.02, -s * 0.12, s * 0.07, s * 0.3);
  ctx.fillStyle = SKIN[side]!; ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.27, 0, 7); ctx.fill();
  ctx.fillStyle = '#111'; ctx.fillRect(s * 0.02, -s * 0.46, s * 0.24, s * 0.08); // shades
  ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(0, -s * 0.6, s * 0.42, s * 0.08, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-s * 0.25, -s * 0.9, s * 0.5, s * 0.32, s * 0.08); ctx.fill();
  ctx.fillStyle = d; ctx.fillRect(-s * 0.25, -s * 0.68, s * 0.5, s * 0.07);
  const kick = st.lunge * s * 0.12;
  ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(s * 0.1 - kick, -s * 0.05, s * 0.5, s * 0.16, s * 0.08); ctx.fill();
  ctx.fillStyle = '#2b2b2b'; ctx.fillRect(s * 0.5 - kick, -s * 0.12, s * 0.42, s * 0.14); ctx.fillRect(s * 0.55 - kick, 0, s * 0.1, s * 0.16);
  if (st.lunge > 0.6) { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(s * 0.95, -s * 0.05); ctx.lineTo(s * 1.3, -s * 0.2); ctx.lineTo(s * 1.18, -s * 0.03); ctx.lineTo(s * 1.32, s * 0.1); ctx.closePath(); ctx.fill(); }
};

/** Open-wheel race car seen side-on, helmet in the cockpit, speed lines when charging. */
const racer: Sprite = (ctx, s, side, st) => {
  const c = MAIN[side]!, d = DARK[side]!;
  if (st.charging) { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const y = -s * 0.1 + i * s * 0.14; ctx.beginPath(); ctx.moveTo(-s * 1.3, y); ctx.lineTo(-s * (1.7 + (i % 2) * 0.4), y); ctx.stroke(); } }
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(-s * 1.0, -s * 0.05); ctx.lineTo(s * 0.6, -s * 0.1); ctx.lineTo(s * 1.25, s * 0.12); ctx.lineTo(s * 1.25, s * 0.25); ctx.lineTo(-s * 1.0, s * 0.25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = d; ctx.fillRect(-s * 1.15, -s * 0.45, s * 0.12, s * 0.5); ctx.fillRect(-s * 1.3, -s * 0.5, s * 0.42, s * 0.12); // rear wing
  ctx.fillRect(s * 1.0, s * 0.2, s * 0.4, s * 0.08); // front wing
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-s * 0.05, -s * 0.2, s * 0.17, 0, 7); ctx.fill();
  ctx.fillStyle = '#111'; ctx.fillRect(-s * 0.0, -s * 0.24, s * 0.16, s * 0.07);
  const spin = st.t * (st.charging ? 30 : 6);
  for (const wx of [-0.68, 0.72]) {
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(wx * s, s * 0.28, s * 0.27, 0, 7); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx * s + Math.cos(spin) * s * 0.18, s * 0.28 + Math.sin(spin) * s * 0.18); ctx.lineTo(wx * s - Math.cos(spin) * s * 0.18, s * 0.28 - Math.sin(spin) * s * 0.18); ctx.stroke();
  }
};

/** Boxer in trunks with oversized gloves; the lead glove fires out on attack. */
const boxer: Sprite = (ctx, s, side, st) => {
  const c = MAIN[side]!, d = DARK[side]!, skin = SKIN[side]!;
  const bounce = Math.sin(st.t * 8) * s * 0.04;
  ctx.fillStyle = skin; ctx.fillRect(-s * 0.25, s * 0.45, s * 0.16, s * 0.5); ctx.fillRect(s * 0.08, s * 0.45, s * 0.16, s * 0.5);
  ctx.fillStyle = '#fff'; ctx.fillRect(-s * 0.28, s * 0.85, s * 0.22, s * 0.1); ctx.fillRect(s * 0.05, s * 0.85, s * 0.22, s * 0.1);
  ctx.fillStyle = d; ctx.beginPath(); ctx.roundRect(-s * 0.32, s * 0.2, s * 0.64, s * 0.32, s * 0.08); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.roundRect(-s * 0.3, -s * 0.25 + bounce, s * 0.6, s * 0.5, s * 0.2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.02, -s * 0.48 + bounce, s * 0.24, 0, 7); ctx.fill();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(s * 0.02, -s * 0.52 + bounce, s * 0.26, Math.PI, 0); ctx.fill(); // headguard
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(s * 0.14, -s * 0.46 + bounce, s * 0.04, 0, 7); ctx.fill();
  const jab = Math.max(st.lunge, st.charging ? 0.8 : 0) * s * 0.7;
  ctx.fillStyle = skin; ctx.fillRect(s * 0.1, -s * 0.12 + bounce, s * 0.25 + jab, s * 0.12);
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(s * 0.4 + jab, -s * 0.07 + bounce, s * 0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.2, -s * 0.3 + bounce, s * 0.18, 0, 7); ctx.fill(); // guard glove
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(s * 0.46 + jab, -s * 0.14 + bounce, s * 0.05, 0, 7); ctx.fill();
};

/** Clapperboard crew with eyes: the clapper snaps shut on attack. */
const clapper: Sprite = (ctx, s, side, st) => {
  const c = MAIN[side]!;
  ctx.fillStyle = '#111'; ctx.fillRect(-s * 0.25, s * 0.4, s * 0.12, s * 0.5); ctx.fillRect(s * 0.13, s * 0.4, s * 0.12, s * 0.5);
  ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(-s * 0.55, -s * 0.25, s * 1.1, s * 0.75, s * 0.08); ctx.fill();
  const open = (1 - st.lunge) * 0.45 + Math.abs(Math.sin(st.t * 2)) * 0.08;
  ctx.save(); ctx.translate(-s * 0.55, -s * 0.25); ctx.rotate(-open);
  ctx.fillStyle = '#111'; ctx.fillRect(0, -s * 0.22, s * 1.1, s * 0.22);
  ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(s * (0.08 + i * 0.27), 0); ctx.lineTo(s * (0.22 + i * 0.27), -s * 0.22); ctx.lineTo(s * (0.32 + i * 0.27), -s * 0.22); ctx.lineTo(s * (0.18 + i * 0.27), 0); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 0.05, s * 0.05, s * 0.12, 0, 7); ctx.arc(s * 0.35, s * 0.05, s * 0.12, 0, 7); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(s * 0.1, s * 0.06, s * 0.06, 0, 7); ctx.arc(s * 0.4, s * 0.06, s * 0.06, 0, 7); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.arc(s * 0.22, s * 0.25, s * 0.1, 0.2, Math.PI - 0.2); ctx.stroke();
};

/** Yes flies rockets, No flies saucers. */
const spacecraft: Sprite = (ctx, s, side, st) => {
  const c = MAIN[side]!, d = DARK[side]!, hover = Math.sin(st.t * 3) * s * 0.08;
  ctx.translate(0, hover);
  if (side) {
    const fl = s * (0.35 + Math.random() * 0.25 + st.lunge * 0.4);
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(-s * 0.75, -s * 0.12); ctx.lineTo(-s * 0.75 - fl, 0); ctx.lineTo(-s * 0.75, s * 0.12); ctx.fill();
    ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(-s * 0.75, -s * 0.07); ctx.lineTo(-s * 0.75 - fl * 0.6, 0); ctx.lineTo(-s * 0.75, s * 0.07); ctx.fill();
    ctx.fillStyle = '#eef2f5'; ctx.beginPath(); ctx.moveTo(-s * 0.75, -s * 0.24); ctx.lineTo(s * 0.4, -s * 0.24); ctx.quadraticCurveTo(s * 0.95, 0, s * 0.4, s * 0.24); ctx.lineTo(-s * 0.75, s * 0.24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-s * 0.75, -s * 0.24); ctx.lineTo(-s * 0.95, -s * 0.55); ctx.lineTo(-s * 0.35, -s * 0.24); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.75, s * 0.24); ctx.lineTo(-s * 0.95, s * 0.55); ctx.lineTo(-s * 0.35, s * 0.24); ctx.fill();
    ctx.fillStyle = d; ctx.beginPath(); ctx.arc(s * 0.15, 0, s * 0.12, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(191,227,255,0.85)'; ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.34, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#7dff9a'; ctx.beginPath(); ctx.arc(0, -s * 0.2, s * 0.13, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-s * 0.05, -s * 0.22, s * 0.035, 0, 7); ctx.arc(s * 0.05, -s * 0.22, s * 0.035, 0, 7); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.85, s * 0.24, 0, 0, 7); ctx.fill();
    ctx.fillStyle = d; ctx.beginPath(); ctx.ellipse(0, s * 0.08, s * 0.55, s * 0.12, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = Math.sin(st.t * 6 + i) > 0 ? '#ffd166' : '#555'; ctx.beginPath(); ctx.arc(-s * 0.6 + i * s * 0.3, s * 0.02, s * 0.05, 0, 7); ctx.fill(); }
  }
};

export const SPRITES: Partial<Record<Theme, Sprite>> = { gta: gangster, f1: racer, boxing: boxer, movies: clapper, space: spacecraft };
