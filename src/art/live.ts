/* Live procedural renderer.
 * No SVG, no bitmaps: every frame is drawn from geometry, gradients and light.
 * Characters are rigged (breathing, walking, striking, flinching, dying) and
 * the whole scene reacts to combat events. */
import type { EnemyDef, EquipmentItem, MonsterKind, MonsterPalette, Region } from '../game/types';

type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
}

function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = clamp(((n >> 16) & 255) / 255 + amount) * 255;
  const g = clamp(((n >> 8) & 255) / 255 + amount) * 255;
  const b = clamp((n & 255) / 255 + amount) * 255;
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function bodyGradient(ctx: Ctx, x: number, y: number, r: number, main: string, dark: string): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.08, x, y, r);
  g.addColorStop(0, shade(main, 0.18));
  g.addColorStop(0.55, main);
  g.addColorStop(1, dark);
  return g;
}

/* ------------------------------------------------------------------ rig */

type Anim = 'idle' | 'strike' | 'hurt' | 'down' | 'spawn' | 'attack';

interface Rig {
  kind: MonsterKind;
  p: MonsterPalette;
  x: number; y: number; scale: number;
  facing: 1 | -1;
  anim: Anim; t: number;       // seconds since anim started
  hp: number;                  // 0..1
  flash: number;               // 0..1 white/red flash
  seed: number;
  boss: boolean;
  weapon: string;
  equipment?: (EquipmentItem | null)[];
  portrait?: boolean;
}

function newRig(kind: MonsterKind, p: MonsterPalette, boss: boolean): Rig {
  return { kind, p, x: 0, y: 0, scale: 1, facing: -1, anim: 'spawn', t: 0,
    hp: 1, flash: 0, seed: Math.random() * 100, boss, weapon: 'sword' };
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number;
  size: number; color: string; glow: boolean; gravity: number;
}

/* --------------------------------------------------------- character shapes */

function drawGroundShadow(ctx: Ctx, x: number, y: number, w: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 1, x, y, w);
  g.addColorStop(0, 'rgba(0,0,0,.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ellipse(ctx, x, y, w, w * 0.22); ctx.fill();
  ctx.restore();
}

function drawEyes(ctx: Ctx, x: number, y: number, size: number, color: string, blink: number, angry: boolean): void {
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = size * 3.5;
  ctx.fillStyle = color;
  for (const s of [-1, 1]) {
    const ex = x + s * size * 0.95;
    ctx.beginPath();
    if (angry) {
      ctx.moveTo(ex - size * 0.55, y - size * 0.45);
      ctx.lineTo(ex + size * 0.55, y - size * 0.1);
      ctx.lineTo(ex - size * 0.35, y + size * 0.55);
      ctx.closePath();
    } else {
      ellipse(ctx, ex, y, size * 0.42, size * 0.5 * (1 - blink * 0.9));
    }
    ctx.fill();
  }
  ctx.restore();
}

function drawBlade(ctx: Ctx, x: number, y: number, len: number, color: string, swing: number, kind: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5 + swing);
  ctx.fillStyle = '#4a3324';
  rr(ctx, -3, -2, 6, len * 0.26, 2); ctx.fill();
  ctx.fillStyle = shade(color, 0.1);
  rr(ctx, -6, -3, 12, 5, 2); ctx.fill();
  const g = ctx.createLinearGradient(-5, 0, 5, 0);
  g.addColorStop(0, shade(color, -0.22)); g.addColorStop(0.45, '#f4f7ff'); g.addColorStop(1, shade(color, -0.1));
  ctx.fillStyle = g;
  ctx.beginPath();
  if (kind === 'axe') {
    ctx.moveTo(-3, -len * 0.2); ctx.quadraticCurveTo(-len * 0.42, -len * 0.42, -len * 0.18, -len * 0.78);
    ctx.lineTo(2, -len * 0.86); ctx.lineTo(5, -len * 0.2);
  } else if (kind === 'club') {
    ctx.moveTo(-5, -len * 0.16); ctx.lineTo(-11, -len * 0.85);
    ctx.quadraticCurveTo(0, -len * 0.98, 11, -len * 0.85);
    ctx.lineTo(5, -len * 0.16);
  } else if (kind === 'spear' || kind === 'staff' || kind === 'scythe') {
    ctx.moveTo(-2.5, -len * 0.16); ctx.lineTo(-2.5, -len * 0.95);
    ctx.lineTo(2.5, -len * 0.95); ctx.lineTo(2.5, -len * 0.16);
  } else {
    ctx.moveTo(-5, -len * 0.16); ctx.lineTo(-4, -len * 0.82);
    ctx.lineTo(0, -len); ctx.lineTo(4, -len * 0.82);
    ctx.lineTo(5, -len * 0.16);
  }
  ctx.closePath(); ctx.fill();
  if (kind === 'staff' || kind === 'orb') {
    ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ellipse(ctx, 0, -len * 0.98, len * 0.12, len * 0.12); ctx.fill();
  }
  ctx.restore();
}

function drawWings(ctx: Ctx, x: number, y: number, size: number, color: string, flap: number): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(x + s * size * 0.4, y);
    ctx.rotate(s * (0.25 + flap * 0.35));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * size * 0.9, -size * 0.55, s * size * 1.5, -size * 0.15);
    ctx.quadraticCurveTo(s * size * 1.0, -size * 0.05, s * size * 1.25, size * 0.35);
    ctx.quadraticCurveTo(s * size * 0.7, size * 0.2, s * size * 0.65, size * 0.6);
    ctx.quadraticCurveTo(s * size * 0.3, size * 0.3, 0, size * 0.25);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** One rigged humanoid/creature. `u` = unit size (roughly half its height). */
function drawBiped(ctx: Ctx, r: Rig, u: number, time: number): void {
  const { p, kind } = r;
  const t = time + r.seed;
  const breathe = Math.sin(t * 2.1) * 0.035;
  const sway = Math.sin(t * 1.35) * 0.045;
  const step = Math.sin(t * 3.1) * (r.anim === 'attack' ? 0.28 : 0.09);
  const lunge = r.anim === 'attack' ? Math.sin(clamp(r.t / 0.42) * Math.PI) * u * 0.75
    : r.anim === 'strike' ? Math.sin(clamp(r.t / 0.32) * Math.PI) * u * 0.55 : 0;
  const flinch = r.anim === 'hurt' ? Math.sin(clamp(r.t / 0.3) * Math.PI) * u * 0.2 : 0;
  const blink = Math.max(0, Math.sin(t * 0.9) - 0.985) * 60;
  const ghost = kind === 'wraith';
  const dragon = kind === 'dragon';

  ctx.save();
  ctx.translate(r.x + r.facing * (lunge + flinch * 0.5), r.y);
  ctx.scale(r.facing, 1);
  ctx.rotate(sway * 0.3 + (r.anim === 'down' ? clamp(r.t / 0.6) * 1.2 : 0));
  if (r.anim === 'down') ctx.globalAlpha = 1 - clamp(r.t / 0.8);
  if (r.anim === 'spawn') ctx.globalAlpha = clamp(r.t / 0.5);

  const bodyY = -u * (ghost ? 1.15 : 1.05);
  const headY = -u * (ghost ? 2.05 : 2.0);
  const bodyR = u * (kind === 'orc' || kind === 'treant' || r.boss ? 0.78 : 0.66);

  /* Cape / cloak behind the body. */
  if (!r.portrait && (r.boss || kind === 'knight' || kind === 'cultist' || kind === 'bandit' || kind === 'demon')) {
    ctx.save();
    ctx.fillStyle = p.accent;
    ctx.globalAlpha *= 0.9;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.8, bodyY - bodyR * 0.5);
    ctx.quadraticCurveTo(-bodyR * (1.5 + Math.sin(t * 2) * 0.12), bodyY + u * 0.4,
      -bodyR * 1.1, u * 0.35 + Math.sin(t * 2.3) * u * 0.08);
    ctx.quadraticCurveTo(0, u * 0.18, bodyR * 1.1, u * 0.35 + Math.sin(t * 2.3 + 1) * u * 0.08);
    ctx.quadraticCurveTo(bodyR * 1.4, bodyY + u * 0.2, bodyR * 0.8, bodyY - bodyR * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* Wings. */
  if (dragon || r.boss && kind === 'demon') {
    drawWings(ctx, 0, bodyY - bodyR * 0.5, u * 0.95, shade(p.shade, -0.03), Math.sin(t * 3.4));
  }

  /* Legs. */
  if (!ghost) {
    ctx.fillStyle = shade(p.shade, -0.1);
    for (const s of [-1, 1]) {
      const sw = step * s * u * 0.35;
      ctx.save(); ctx.translate(s * bodyR * 0.42, -u * 0.55); ctx.rotate(sw / u);
      rr(ctx, -u * 0.15, -u * 0.02, u * 0.3, u * 0.62, u * 0.08); ctx.fill();
      ctx.fillStyle = shade(p.shade, -0.22);
      rr(ctx, -u * 0.2, u * 0.52, u * 0.42, u * 0.12, u * 0.05); ctx.fill();
      ctx.fillStyle = shade(p.shade, -0.1);
      ctx.restore();
    }
  }

  /* Torso. */
  ctx.save();
  ctx.translate(0, bodyY + breathe * u);
  ctx.fillStyle = bodyGradient(ctx, 0, 0, bodyR, p.main, p.shade);
  ellipse(ctx, 0, 0, bodyR, bodyR * (ghost ? 1.35 : 1.12)); ctx.fill();
  /* Armour plate / ribs. */
  ctx.strokeStyle = shade(p.shade, -0.18); ctx.lineWidth = Math.max(1, u * 0.045);
  if (kind === 'skeleton') {
    for (let i = -1; i <= 2; i++) {
      ctx.beginPath(); ctx.arc(0, i * bodyR * 0.28, bodyR * 0.72, 0.25, Math.PI - 0.25); ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.72, -bodyR * 0.1);
    ctx.quadraticCurveTo(0, bodyR * 0.22, bodyR * 0.72, -bodyR * 0.1);
    ctx.stroke();
  }
  ctx.fillStyle = shade(p.accent, -0.05);
  rr(ctx, -bodyR * 0.78, bodyR * 0.75, bodyR * 1.56, u * 0.12, u * 0.04); ctx.fill();
  ctx.restore();

  /* Tail. */
  if (dragon || kind === 'demon' || kind === 'goblin') {
    ctx.save();
    ctx.strokeStyle = p.shade; ctx.lineWidth = u * 0.14; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.6, bodyY + bodyR * 0.5);
    ctx.quadraticCurveTo(-u * 1.5, bodyY + u * (0.7 + Math.sin(t * 2) * 0.12),
      -u * 1.9, bodyY + u * (0.3 + Math.sin(t * 2.4) * 0.18));
    ctx.stroke(); ctx.restore();
  }

  /* Arms. */
  const armSwing = (r.anim === 'attack' || r.anim === 'strike')
    ? -Math.sin(clamp(r.t / 0.42) * Math.PI) * 1.5 : Math.sin(t * 3.1 + 1) * 0.12;
  ctx.strokeStyle = p.main; ctx.lineWidth = u * 0.19; ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * bodyR * 0.78, bodyY - bodyR * 0.25);
    ctx.rotate(s * 0.25 + (s > 0 ? armSwing : 0));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * u * 0.06, u * 0.55); ctx.stroke();
    ctx.restore();
  }

  /* Head. */
  const headR = u * (r.boss ? 0.52 : 0.46);
  ctx.save();
  ctx.translate(0, headY + breathe * u * 0.7);
  ctx.fillStyle = bodyGradient(ctx, 0, 0, headR, p.main, p.shade);
  ellipse(ctx, 0, 0, headR, headR * (dragon ? 1.15 : 1.02)); ctx.fill();

  /* Horns / ears / helmet / hood. */
  ctx.fillStyle = shade(p.accent, -0.12);
  if (kind === 'demon' || kind === 'dragon' || r.boss) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * headR * 0.55, -headR * 0.65);
      ctx.quadraticCurveTo(s * headR * 1.25, -headR * 1.15, s * headR * 1.05, -headR * 1.7);
      ctx.quadraticCurveTo(s * headR * 0.75, -headR * 1.05, s * headR * 0.2, -headR * 0.75);
      ctx.closePath(); ctx.fill();
    }
  } else if (kind === 'goblin' || kind === 'orc') {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * headR * 0.75, -headR * 0.2);
      ctx.lineTo(s * headR * 1.7, -headR * 0.75);
      ctx.lineTo(s * headR * 0.85, headR * 0.2); ctx.closePath(); ctx.fill();
    }
  } else if (kind === 'knight') {
    ctx.fillStyle = shade(p.accent, 0.12);
    ctx.beginPath(); ctx.arc(0, -headR * 0.1, headR * 1.05, Math.PI, TAU); ctx.fill();
    rr(ctx, -headR * 1.05, -headR * 0.15, headR * 2.1, headR * 0.35, headR * 0.12); ctx.fill();
    ctx.fillStyle = shade(p.accent, 0.3);
    rr(ctx, -headR * 0.11, -headR * 1.25, headR * 0.22, headR * 0.7, headR * 0.08); ctx.fill();
  } else if (kind === 'bandit' || kind === 'cultist' || kind === 'wraith') {
    ctx.beginPath();
    ctx.moveTo(-headR * 1.05, headR * 0.35);
    ctx.quadraticCurveTo(-headR * 1.1, -headR * 1.15, 0, -headR * 1.35);
    ctx.quadraticCurveTo(headR * 1.1, -headR * 1.15, headR * 1.05, headR * 0.35);
    ctx.closePath(); ctx.fill();
  } else if (kind === 'treant') {
    ctx.strokeStyle = '#4b5c34'; ctx.lineWidth = headR * 0.2;
    for (const s of [-1, 0, 1]) {
      ctx.beginPath(); ctx.moveTo(s * headR * 0.4, -headR * 0.8);
      ctx.lineTo(s * headR * 0.75, -headR * 1.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * headR * 0.7, -headR * 1.45);
      ctx.lineTo(s * headR * 1.2, -headR * 1.9); ctx.stroke();
    }
  }

  /* Face. */
  if (kind === 'skeleton') {
    ctx.fillStyle = '#2b2a2c';
    ellipse(ctx, -headR * 0.35, headR * 0.05, headR * 0.24, headR * 0.3); ctx.fill();
    ellipse(ctx, headR * 0.35, headR * 0.05, headR * 0.24, headR * 0.3); ctx.fill();
    ctx.fillStyle = '#d8d2b8';
    for (let i = -2; i <= 2; i++) { rr(ctx, i * headR * 0.19 - headR * 0.08, headR * 0.42, headR * 0.16, headR * 0.24, 2); ctx.fill(); }
    drawEyes(ctx, 0, headR * 0.02, headR * 0.2, p.eye, blink, true);
  } else if (dragon) {
    ctx.fillStyle = shade(p.main, -0.2);
    ctx.beginPath(); ctx.moveTo(0, -headR * 0.2); ctx.lineTo(headR * 1.5, headR * 0.45);
    ctx.lineTo(0, headR * 0.7); ctx.closePath(); ctx.fill();
    drawEyes(ctx, headR * 0.28, -headR * 0.18, headR * 0.19, p.eye, blink, true);
    /* Smoke puff. */
    ctx.fillStyle = 'rgba(255,150,80,.35)';
    const puff = Math.sin(t * 3) * 0.5 + 0.5;
    ellipse(ctx, headR * (1.6 + puff * 0.6), headR * (0.3 - puff * 0.5), headR * (0.25 + puff * 0.2), headR * 0.22); ctx.fill();
  } else {
    drawEyes(ctx, 0, headR * 0.02, headR * 0.2, p.eye, blink, kind !== 'knight');
    if (kind === 'orc' || kind === 'goblin' || kind === 'demon') {
      ctx.fillStyle = '#f5f0e2';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * headR * 0.1, headR * 0.45);
        ctx.lineTo(s * headR * 0.28, headR * 0.85); ctx.lineTo(s * headR * 0.36, headR * 0.42);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  /* Crown for bosses. */
  if (r.boss) {
    ctx.fillStyle = '#f3cf72'; ctx.shadowColor = '#ffcf5a'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-headR * 0.9, -headR * 0.85);
    ctx.lineTo(-headR * 0.62, -headR * 1.65); ctx.lineTo(-headR * 0.3, -headR * 1.1);
    ctx.lineTo(0, -headR * 1.85); ctx.lineTo(headR * 0.3, -headR * 1.1);
    ctx.lineTo(headR * 0.62, -headR * 1.65); ctx.lineTo(headR * 0.9, -headR * 0.85);
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.restore();

  /* Weapon in the leading hand. */
  if (!ghost) {
    const w = r.weapon || 'sword';
    ctx.save();
    ctx.translate(bodyR * 0.9, bodyY + u * 0.28);
    ctx.rotate(armSwing * 0.7);
    drawBlade(ctx, 0, 0, u * 1.45, p.accent, armSwing * 0.4, w);
    ctx.restore();
  } else {
    ctx.save();
    ctx.shadowColor = p.eye; ctx.shadowBlur = 18; ctx.fillStyle = p.eye;
    ellipse(ctx, bodyR * 1.05, bodyY + Math.sin(t * 2) * u * 0.12, u * 0.2, u * 0.2); ctx.fill();
    ctx.restore();
  }

  /* Shield on the hero. */
  if (!r.portrait && (r.facing === 1 || kind === 'knight')) {
    ctx.save();
    ctx.translate(-bodyR * 0.95, bodyY + u * 0.12);
    ctx.rotate(-0.18);
    ctx.fillStyle = shade(p.accent, 0.05);
    ctx.beginPath();
    ctx.moveTo(-u * 0.38, -u * 0.5); ctx.lineTo(u * 0.38, -u * 0.5);
    ctx.lineTo(u * 0.3, u * 0.35); ctx.lineTo(0, u * 0.68); ctx.lineTo(-u * 0.3, u * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e2bd6b'; ctx.lineWidth = u * 0.07; ctx.stroke();
    ctx.fillStyle = '#e2bd6b'; ellipse(ctx, 0, -u * 0.02, u * 0.11, u * 0.11); ctx.fill();
    ctx.restore();
  }

  /* Hit flash. */
  if (r.flash > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = r.flash * 0.55;
    ctx.fillStyle = r.anim === 'hurt' ? '#ff7a6a' : '#fff3c4';
    ellipse(ctx, 0, bodyY, bodyR * 1.35, u * 1.5); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/** Quadruped used for wolves and beasts. */
function drawQuadruped(ctx: Ctx, r: Rig, u: number, time: number): void {
  const { p, kind } = r;
  const t = time + r.seed;
  const breathe = Math.sin(t * 2.6) * 0.05;
  const lunge = r.anim === 'attack' ? Math.sin(clamp(r.t / 0.42) * Math.PI) * u * 1.1 : 0;
  const blink = Math.max(0, Math.sin(t * 1.1) - 0.985) * 60;

  ctx.save();
  ctx.translate(r.x + r.facing * lunge, r.y - u * 0.15);
  ctx.scale(r.facing, 1);
  if (r.anim === 'down') { ctx.rotate(clamp(r.t / 0.7) * 1.1); ctx.globalAlpha = 1 - clamp(r.t / 0.8); }
  if (r.anim === 'spawn') ctx.globalAlpha = clamp(r.t / 0.5);

  /* Tail. */
  ctx.strokeStyle = shade(p.shade, -0.05); ctx.lineWidth = u * 0.24; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-u * 0.95, -u * 0.85);
  ctx.quadraticCurveTo(-u * 1.7, -u * (1.1 + Math.sin(t * 4) * 0.15), -u * 1.8, -u * 1.7);
  ctx.stroke();

  /* Legs. */
  ctx.strokeStyle = shade(p.shade, -0.12); ctx.lineWidth = u * 0.23;
  for (const s of [-1, 1]) {
    for (const q of [0.55, -0.6]) {
      const sw = Math.sin(t * 5 + (s + q) * 2) * u * 0.13;
      ctx.beginPath();
      ctx.moveTo(q * u, -u * 0.65);
      ctx.lineTo(q * u + sw, -u * 0.05);
      ctx.stroke();
    }
  }

  /* Body. */
  ctx.fillStyle = bodyGradient(ctx, 0, -u * 0.9, u * 1.1, p.main, p.shade);
  ellipse(ctx, 0, -u * 0.9 + breathe * u, u * 1.12, u * 0.68); ctx.fill();
  /* Fur tufts. */
  ctx.fillStyle = shade(p.main, 0.12);
  for (let i = 0; i < 7; i++) {
    const bx = -u * 0.9 + i * u * 0.3;
    ctx.beginPath(); ctx.moveTo(bx - u * 0.12, -u * 1.45);
    ctx.lineTo(bx, -u * (1.65 + Math.sin(t * 3 + i) * 0.05));
    ctx.lineTo(bx + u * 0.12, -u * 1.45); ctx.closePath(); ctx.fill();
  }

  /* Head. */
  ctx.save();
  ctx.translate(u * 1.0, -u * 1.15 + breathe * u);
  ctx.fillStyle = bodyGradient(ctx, 0, 0, u * 0.55, p.main, p.shade);
  ellipse(ctx, 0, 0, u * 0.55, u * 0.48); ctx.fill();
  /* Snout. */
  ctx.beginPath();
  ctx.moveTo(u * 0.3, -u * 0.12); ctx.lineTo(u * 0.92, u * 0.08);
  ctx.lineTo(u * 0.3, u * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#20232b'; ellipse(ctx, u * 0.86, u * 0.05, u * 0.1, u * 0.08); ctx.fill();
  /* Ears. */
  ctx.fillStyle = shade(p.shade, -0.05);
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * u * 0.35 - u * 0.16, -u * 0.3);
    ctx.lineTo(s * u * 0.35, -u * (kind === 'yeti' ? 0.68 : 0.9));
    ctx.lineTo(s * u * 0.35 + u * 0.18, -u * 0.32); ctx.closePath(); ctx.fill();
  }
  drawEyes(ctx, u * 0.22, -u * 0.12, u * 0.12, p.eye, blink, true);
  /* Fangs. */
  ctx.fillStyle = '#f5f0e2';
  ctx.beginPath(); ctx.moveTo(u * 0.58, u * 0.2); ctx.lineTo(u * 0.68, u * 0.45);
  ctx.lineTo(u * 0.74, u * 0.2); ctx.closePath(); ctx.fill();
  ctx.restore();

  if (r.flash > 0.01) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = r.flash * 0.5;
    ctx.fillStyle = '#ff8a72'; ellipse(ctx, 0, -u, u * 1.4, u * 1.1); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/* ----------------------------------------------------------------- backdrop */

interface SceneColors { region: Region | null; }

function drawBackdrop(ctx: Ctx, w: number, h: number, time: number, scene: SceneColors): void {
  const r = scene.region;
  const skyTop = r ? r.sky[0] : '#2a3c60';
  const skyBottom = r ? r.sky[1] : '#78a7c4';
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.78);
  g.addColorStop(0, skyTop); g.addColorStop(1, skyBottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  /* Sun / moon with glow. */
  const orbX = w * 0.78, orbY = h * 0.17;
  const orbR = Math.min(w, h) * 0.075;
  const glow = ctx.createRadialGradient(orbX, orbY, orbR * 0.2, orbX, orbY, orbR * 5);
  glow.addColorStop(0, (r?.orb ?? '#fff3c4') + 'cc');
  glow.addColorStop(0.25, (r?.orb ?? '#fff3c4') + '44');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ellipse(ctx, orbX, orbY, orbR * 5, orbR * 5); ctx.fill();
  ctx.fillStyle = r?.orb ?? '#fff3c4';
  ellipse(ctx, orbX, orbY, orbR, orbR); ctx.fill();

  /* Clouds drifting slowly. */
  ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    const cx = ((i * w * 0.38 + time * (4 + i * 2)) % (w * 1.5)) - w * 0.2;
    const cy = h * (0.12 + i * 0.065);
    ellipse(ctx, cx, cy, w * 0.15, h * 0.018); ctx.fill();
    ellipse(ctx, cx + w * 0.07, cy - h * 0.012, w * 0.1, h * 0.016); ctx.fill();
  }
  ctx.restore();

  /* Three parallax mountain / tree layers. */
  const layers = [
    { c: r?.far ?? '#4f6a72', base: 0.60, amp: 0.10, speed: 3, n: 7 },
    { c: r?.mid ?? '#395a55', base: 0.69, amp: 0.09, speed: 6, n: 9 },
    { c: r?.near ?? '#274338', base: 0.79, amp: 0.06, speed: 10, n: 13 },
  ];
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    ctx.fillStyle = L.c;
    ctx.beginPath(); ctx.moveTo(0, h);
    const off = (time * L.speed) % (w / L.n);
    for (let i = 0; i <= L.n + 1; i++) {
      const x = i * (w / L.n) - off;
      const peak = h * (L.base - L.amp * (0.45 + 0.55 * Math.abs(Math.sin(i * 2.7 + li))));
      ctx.lineTo(x, peak);
      ctx.lineTo(x + w / L.n * 0.5, h * L.base);
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  }

  /* Ground plane. */
  const gg = ctx.createLinearGradient(0, h * 0.76, 0, h);
  gg.addColorStop(0, r?.ground[0] ?? '#3f6d48');
  gg.addColorStop(1, r?.ground[1] ?? '#1c3325');
  ctx.fillStyle = gg; ctx.fillRect(0, h * 0.76, w, h * 0.24);
  /* Horizon haze. */
  const haze = ctx.createLinearGradient(0, h * 0.72, 0, h * 0.86);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(0.5, 'rgba(255,255,255,.06)');
  haze.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = haze; ctx.fillRect(0, h * 0.72, w, h * 0.14);

  /* Vignette. */
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.2, w / 2, h * 0.5, h * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,6,12,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
}

/* ------------------------------------------------------------------- stage */

export interface LiveStage {
  canvas: HTMLCanvasElement;
  setEnemy(def: EnemyDef, boss: boolean): void;
  setRegion(region: Region): void;
  setEnemyHp(ratio: number): void;
  setHeroHp(ratio: number, alive: boolean): void;
  setEquipment(equipment: (EquipmentItem | null)[]): void;
  enemyAttack(): void;
  heroStrike(): void;
  enemyHit(): void;
  enemyDown(): void;
  heroHit(): void;
  heroDown(): void;
  heroRespawn(): void;
  setPaused(v: boolean): void;
  destroy(): void;
}

function heroPalette(equipment: (EquipmentItem | null)[]): MonsterPalette {
  const legend = equipment?.find((i) => i?.rarity === 'legendary');
  const epic = equipment?.find((i) => i?.rarity === 'epic');
  const accent = legend ? '#f3b64a' : epic ? '#c58bff' : '#4c6fa8';
  return { kind: 'knight', main: '#d9b48c', shade: '#a2764d',
    accent, eye: '#9fe4ff' };
}

export function createLiveStage(canvas: HTMLCanvasElement): LiveStage {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D unavailable');
  let w = 1, h = 1, dpr = 1;
  let time = 0, last = performance.now(), raf = 0, paused = false;
  let region: Region | null = null;
  const particles: Particle[] = [];
  let enemy: Rig = newRig('wolf', { kind: 'wolf', main: '#8d98a3', shade: '#5d6874', accent: '#6b7380', eye: '#ffd166' }, false);
  let hero: Rig = newRig('knight', heroPalette([]), false);
  hero.facing = 1; hero.anim = 'idle'; hero.t = 1;
  let enemyHpRatio = 1, heroHpRatio = 1, heroAlive = true;
  let shake = 0, dustTimer = 0;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);
  window.addEventListener('resize', resize);
  resize();

  function burst(x: number, y: number, n: number, color: string, force = 1): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = (30 + Math.random() * 130) * force;
      particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
        life: 0.4 + Math.random() * 0.7, max: 1.1,
        size: 1 + Math.random() * 3.5, color, glow: Math.random() > 0.4,
        gravity: 90 + Math.random() * 120,
      });
    }
    if (particles.length > 260) particles.splice(0, particles.length - 260);
  }

  function anim(r: Rig, name: Anim): void { r.anim = name; r.t = 0; }

  function drawHpBar(cx: number, cy: number, width: number, ratio: number, color: string, label: string, name: string): void {
    ctx!.save();
    ctx!.font = `600 ${Math.max(9, Math.min(12, w * 0.028))}px system-ui, sans-serif`;
    ctx!.textAlign = 'center';
    ctx!.fillStyle = 'rgba(0,0,0,.6)';
    const tw = ctx!.measureText(name).width + 16;
    ctx!.fillStyle = 'rgba(8,10,18,.72)';
    rr(ctx!, cx - tw / 2, cy - 20, tw, 16, 5); ctx!.fill();
    ctx!.fillStyle = '#e8dec6'; ctx!.fillText(name, cx, cy - 8);
    const bw = width, bh = 7, bx = cx - bw / 2, by = cy;
    ctx!.fillStyle = 'rgba(6,8,14,.85)'; rr(ctx!, bx - 2, by - 2, bw + 4, bh + 4, 5); ctx!.fill();
    ctx!.fillStyle = '#241a1c'; rr(ctx!, bx, by, bw, bh, 3); ctx!.fill();
    const g = ctx!.createLinearGradient(bx, by, bx + bw, by);
    g.addColorStop(0, shade(color, -0.15)); g.addColorStop(1, shade(color, 0.16));
    ctx!.fillStyle = g;
    rr(ctx!, bx, by, Math.max(0, bw * clamp(ratio)), bh, 3); ctx!.fill();
    ctx!.fillStyle = 'rgba(255,255,255,.25)';
    rr(ctx!, bx, by, Math.max(0, bw * clamp(ratio)), bh * 0.4, 2); ctx!.fill();
    if (label) { ctx!.fillStyle = 'rgba(255,255,255,.8)'; ctx!.font = '700 9px system-ui'; ctx!.fillText(label, cx, by + bh + 11); }
    ctx!.restore();
  }

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (paused || document.hidden || canvas.offsetParent === null) return;
    time += dt;

    enemy.t += dt; hero.t += dt;
    enemy.flash = Math.max(0, enemy.flash - dt * 3.2);
    hero.flash = Math.max(0, hero.flash - dt * 3.2);
    shake = Math.max(0, shake - dt * 22);
    if (enemy.anim !== 'idle' && enemy.t > (enemy.anim === 'down' ? 0.8 : enemy.anim === 'spawn' ? 0.5 : 0.45)) anim(enemy, 'idle');
    if (hero.anim !== 'idle' && hero.t > (hero.anim === 'down' ? 1.2 : 0.42)) anim(hero, 'idle');

    /* Ambient dust / embers. */
    dustTimer += dt;
    if (dustTimer > 0.09 && particles.length < 90) {
      dustTimer = 0;
      particles.push({
        x: Math.random() * w, y: h * (0.5 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 12, vy: -8 - Math.random() * 18,
        life: 2 + Math.random() * 2, max: 4, size: 0.7 + Math.random() * 1.8,
        color: region?.accent ?? '#d9c58a', glow: true, gravity: -4,
      });
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    ctx!.save();
    if (shake > 0.2) ctx!.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawBackdrop(ctx!, w, h, time, { region });

    const groundY = h * 0.83;
    const unit = Math.min(w * 0.115, h * 0.105);
    const ex = w * 0.70, hx = w * 0.28;
    drawGroundShadow(ctx!, ex, groundY + 4, unit * 1.5);
    drawGroundShadow(ctx!, hx, groundY + 4, unit * 1.4);

    enemy.x = ex; enemy.y = groundY; enemy.scale = unit;
    hero.x = hx; hero.y = groundY; hero.scale = unit;
    hero.hp = heroHpRatio;
    enemy.hp = enemyHpRatio;

    /* Respawn veil. */
    if (!heroAlive) {
      ctx!.save(); ctx!.globalAlpha = 0.32;
      ctx!.fillStyle = '#4a1020'; ctx!.fillRect(0, 0, w, h);
      ctx!.restore();
    }

    const monster = enemy.kind;
    const isQuad = monster === 'wolf' || monster === 'yeti';
    if (isQuad) drawQuadruped(ctx!, enemy, unit * (enemy.boss ? 1.2 : 1), time);
    else drawBiped(ctx!, enemy, unit * (enemy.boss ? 1.24 : 1), time);
    if (heroAlive) drawBiped(ctx!, hero, unit * 1.02, time);
    else {
      ctx!.save(); ctx!.globalAlpha = 0.35;
      hero.anim = 'down'; hero.t = 1;
      drawBiped(ctx!, hero, unit * 1.02, time);
      ctx!.restore();
    }

    /* Particles. */
    for (const p of particles) {
      ctx!.save();
      ctx!.globalAlpha = clamp(p.life / p.max) * 0.9;
      ctx!.fillStyle = p.color;
      if (p.glow) { ctx!.shadowColor = p.color; ctx!.shadowBlur = p.size * 4; }
      ellipse(ctx!, p.x, p.y, p.size, p.size); ctx!.fill();
      ctx!.restore();
    }

    /* Hit sparks around the enemy. */
    if (enemy.flash > 0.15) {
      ctx!.save(); ctx!.globalCompositeOperation = 'lighter';
      ctx!.globalAlpha = enemy.flash * 0.5;
      const gr = ctx!.createRadialGradient(ex, groundY - unit * 1.8, 0, ex, groundY - unit * 1.8, unit * 2.5);
      gr.addColorStop(0, '#fff0c0'); gr.addColorStop(1, 'rgba(255,200,100,0)');
      ctx!.fillStyle = gr; ellipse(ctx!, ex, groundY - unit * 1.8, unit * 2.5, unit * 2.5); ctx!.fill();
      ctx!.restore();
    }

    ctx!.restore();

    drawHpBar(ex, h * 0.155, Math.min(w * 0.34, 150), enemyHpRatio,
      enemy.boss ? '#e0576b' : '#d05a52', '', enemyName);
    drawHpBar(hx, h * 0.155, Math.min(w * 0.3, 130), heroHpRatio,
      '#5fbf88', '', 'Герой');
  }

  let enemyName = 'Враг';
  raf = requestAnimationFrame(frame);

  return {
    canvas,
    setEnemy(def, boss) {
      enemy = newRig(def.kind, def.palette, boss);
      enemy.weapon = def.art.weapon;
      enemy.facing = -1;
      enemyName = def.name;
      enemyHpRatio = 1;
      burst(w * 0.7, h * 0.6, 16, def.palette.accent, 0.8);
    },
    setRegion(r) { region = r; },
    setEnemyHp(v) { enemyHpRatio = clamp(v); },
    setHeroHp(v, alive) { heroHpRatio = clamp(v); heroAlive = alive; },
    setEquipment(eq) { hero.p = heroPalette(eq); hero.equipment = eq; },
    enemyAttack() {
      anim(enemy, 'attack');
      burst(w * 0.55, h * 0.58, 8, '#ff8b6b', 0.7);
    },
    heroStrike() {
      if (heroAlive) anim(hero, 'strike');
    },
    enemyHit() {
      enemy.flash = Math.max(enemy.flash, 0.45);
      if (enemy.anim === 'idle') anim(enemy, 'hurt');
      if (Math.random() > 0.7) burst(w * 0.7, h * 0.55, 3, '#ffd98a', 0.6);
    },
    enemyDown() {
      anim(enemy, 'down');
      burst(w * 0.7, h * 0.6, 26, enemy.p.accent, 1.4);
      shake = 7;
    },
    heroHit() {
      hero.flash = 0.9; anim(hero, 'hurt'); shake = Math.max(shake, 5);
      burst(w * 0.28, h * 0.55, 10, '#ff6b6b', 1);
    },
    heroDown() { heroAlive = false; anim(hero, 'down'); shake = 12; },
    heroRespawn() { heroAlive = true; anim(hero, 'spawn'); burst(w * 0.28, h * 0.6, 20, '#8be0ff', 1.2); },
    setPaused(v) { paused = v; last = performance.now(); },
    destroy() {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', resize);
    },
  };
}

/* --------------------------------------------------------------- mini portrait */

/** Small live portrait for the hero roster — same rig, no scenery. */
export function createLivePortrait(canvas: HTMLCanvasElement,
                                   kind: MonsterKind, p: MonsterPalette): { destroy(): void } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { destroy() {} };
  let raf = 0, w = 1, h = 1, t = 0, last = performance.now();
  const rig = newRig(kind, p, false);
  rig.anim = 'idle'; rig.t = 1; rig.facing = 1; rig.portrait = true;

  function size(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
  ro?.observe(canvas); size();

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden || canvas.offsetParent === null) return;
    t += dt;
    ctx!.clearRect(0, 0, w, h);
    const g = ctx!.createRadialGradient(w / 2, h * 0.4, 1, w / 2, h * 0.6, w * 0.8);
    g.addColorStop(0, 'rgba(80,95,130,.55)'); g.addColorStop(1, 'rgba(12,16,28,0)');
    ctx!.fillStyle = g; ctx!.fillRect(0, 0, w, h);
    drawGroundShadow(ctx!, w / 2, h * 0.93, w * 0.35);
    rig.x = w / 2; rig.y = h * 0.9;
    const u = Math.min(w, h) * 0.34;
    if (kind === 'wolf' || kind === 'yeti') drawQuadruped(ctx!, rig, u, t);
    else drawBiped(ctx!, rig, u, t);
  }
  raf = requestAnimationFrame(frame);
  return {
    destroy() { cancelAnimationFrame(raf); ro?.disconnect(); },
  };
}

/* ------------------------------------------------------------ animated crest */

/** Animated app logo: a living heraldic crest with rotating light and sparks. */
export function drawCrest(ctx: Ctx, size: number, time: number): void {
  const s = size / 64;
  ctx.save();
  ctx.scale(s, s);

  /* Rotating halo. */
  const halo = ctx.createRadialGradient(32, 30, 4, 32, 30, 31);
  halo.addColorStop(0, `rgba(255,214,120,${0.3 + Math.sin(time * 2) * 0.08})`);
  halo.addColorStop(1, 'rgba(255,190,80,0)');
  ctx.fillStyle = halo; ellipse(ctx, 32, 30, 31, 31); ctx.fill();

  ctx.save();
  ctx.translate(32, 30); ctx.rotate(Math.sin(time * 0.8) * 0.07); ctx.translate(-32, -30);

  /* Crossed swords behind the shield. */
  ctx.save(); ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (const dir of [-1, 1]) {
    ctx.save(); ctx.translate(32, 33); ctx.rotate(dir * 0.72);
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -25); ctx.stroke();
    ctx.fillStyle = '#e7edf7';
    ctx.beginPath(); ctx.moveTo(-2.2, -24); ctx.lineTo(0, -30); ctx.lineTo(2.2, -24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8b6a2f'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(4, 5); ctx.stroke();
    ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2.4;
    ctx.restore();
  }
  ctx.restore();

  /* Shield. */
  const shieldGrad = ctx.createLinearGradient(12, 12, 52, 56);
  shieldGrad.addColorStop(0, '#f0cf72'); shieldGrad.addColorStop(0.5, '#c99a3d');
  shieldGrad.addColorStop(1, '#7a5720');
  ctx.fillStyle = shieldGrad;
  ctx.beginPath();
  ctx.moveTo(32, 8); ctx.lineTo(54, 16); ctx.lineTo(54, 36);
  ctx.quadraticCurveTo(54, 49, 32, 58);
  ctx.quadraticCurveTo(10, 49, 10, 36);
  ctx.lineTo(10, 16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8d2f36';
  ctx.beginPath();
  ctx.moveTo(32, 12); ctx.lineTo(50, 19); ctx.lineTo(50, 36);
  ctx.quadraticCurveTo(50, 46, 32, 54);
  ctx.quadraticCurveTo(14, 46, 14, 36);
  ctx.lineTo(14, 19); ctx.closePath(); ctx.fill();

  /* Crown. */
  ctx.fillStyle = '#ffe9a8'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(20, 30); ctx.lineTo(19, 19); ctx.lineTo(25, 24);
  ctx.lineTo(32, 16); ctx.lineTo(39, 24); ctx.lineTo(45, 19);
  ctx.lineTo(44, 30); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#8d2f36';
  rr(ctx, 20, 28, 24, 4, 1); ctx.fill();

  /* Gem. */
  const gem = ctx.createRadialGradient(30, 37, 1, 32, 39, 6);
  gem.addColorStop(0, '#d6f6ff'); gem.addColorStop(0.4, '#5bc0eb'); gem.addColorStop(1, '#1d5a80');
  ctx.fillStyle = gem; ctx.shadowColor = '#5bc0eb'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(32, 33); ctx.lineTo(38, 39); ctx.lineTo(32, 46);
  ctx.lineTo(26, 39); ctx.closePath(); ctx.fill();
  ctx.restore();

  /* Orbiting sparks. */
  for (let i = 0; i < 4; i++) {
    const a = time * 0.9 + i * TAU / 4;
    const x = 32 + Math.cos(a) * 27, y = 30 + Math.sin(a) * 24;
    ctx.globalAlpha = 0.4 + 0.5 * Math.sin(time * 3 + i) ** 2;
    ctx.fillStyle = '#ffe9a8'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 6;
    ellipse(ctx, x, y, 1.3, 1.3); ctx.fill();
  }
  ctx.restore();
}

/** Mount the animated crest into a small canvas. */
export function mountCrest(canvas: HTMLCanvasElement): { destroy(): void } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { destroy() {} };
  let raf = 0, t = 0, last = performance.now(), w = 48, h = 48;
  function size(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, rect.width || 48); h = Math.max(1, rect.height || 48);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
  ro?.observe(canvas); size();
  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden || canvas.offsetParent === null) return;
    t += dt;
    ctx!.clearRect(0, 0, w, h);
    ctx!.save(); ctx!.translate((w - Math.min(w, h)) / 2, (h - Math.min(w, h)) / 2);
    drawCrest(ctx!, Math.min(w, h), t);
    ctx!.restore();
  }
  raf = requestAnimationFrame(frame);
  return { destroy() { cancelAnimationFrame(raf); ro?.disconnect(); } };
}
