/* Le stade en pixel art : ciel, tribunes et public, panneaux, pelouse rayée. Dessiné une fois en basse
   résolution (un pixel = 3 pixels monde), puis agrandi sans lissage. */
import { BAR_H, GOAL_TOP, GOAL_W, GROUND, H, W } from '../engine/constants';

const PX = 3;
const LW = W / PX;
const LH = H / PX;
const CROWD = ['#e84a5f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#ffffff', '#c77dff', '#ff9f1c'];

/** Petit générateur reproductible : le public est le même à chaque partie. */
function rand(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function drawSky(ctx: CanvasRenderingContext2D): void {
  const bands = ['#1b1f4b', '#232a63', '#2c387a', '#364891', '#4059a8'];
  const band = Math.ceil(70 / bands.length);
  bands.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * band, LW, band);
  });
  // projecteurs
  for (const x of [118, LW - 118]) {
    ctx.fillStyle = '#555c7a';
    ctx.fillRect(x - 1, 8, 2, 40);
    ctx.fillStyle = '#fff6c9';
    ctx.fillRect(x - 6, 4, 12, 5);
    ctx.fillStyle = 'rgba(255,246,201,0.08)';
    ctx.beginPath();
    ctx.moveTo(x - 6, 9);
    ctx.lineTo(x + 6, 9);
    ctx.lineTo(x + 50 * Math.sign(LW / 2 - x), 120);
    ctx.lineTo(x - 10 * Math.sign(LW / 2 - x), 120);
    ctx.fill();
  }
}

function drawStands(ctx: CanvasRenderingContext2D, r: () => number): void {
  const top = 46;
  const bottom = 122;
  ctx.fillStyle = '#2a2d3e';
  ctx.fillRect(0, top, LW, bottom - top);
  for (let y = top + 2; y < bottom - 4; y += 4) {
    ctx.fillStyle = y % 8 === 2 ? '#34384d' : '#30344a';
    ctx.fillRect(0, y + 2, LW, 2);
    for (let x = (y / 4) % 3; x < LW; x += 3) {
      if (r() < 0.3) continue;
      ctx.fillStyle = CROWD[Math.floor(r() * CROWD.length)]!;
      ctx.fillRect(x, y + 1, 2, 2);
      ctx.fillStyle = '#f1c27d';
      ctx.fillRect(x, y, 2, 1);
    }
  }
  // le public reste dans l'ombre : les joueurs ressortent mieux
  const shade = ctx.createLinearGradient(0, top, 0, bottom);
  shade.addColorStop(0, 'rgba(11,13,31,0.6)');
  shade.addColorStop(1, 'rgba(11,13,31,0.25)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, top, LW, bottom - top);
}

function drawBoards(ctx: CanvasRenderingContext2D): void {
  const y = 122;
  const colors = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'];
  for (let x = 0, i = 0; x < LW; x += 40, i++) {
    ctx.fillStyle = colors[i % colors.length]!;
    ctx.fillRect(x, y, 40, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(x + 6, y + 3, 28, 3);
  }
  ctx.fillStyle = '#111';
  ctx.fillRect(0, y + 9, LW, 1);
}

function drawGrass(ctx: CanvasRenderingContext2D, r: () => number): void {
  const top = 132;
  for (let x = 0; x < LW; x += 20) {
    ctx.fillStyle = (x / 20) % 2 ? '#3fa34d' : '#4bb35a';
    ctx.fillRect(x, top, 20, LH - top);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 260; i++) ctx.fillRect(Math.floor(r() * LW), top + Math.floor(r() * (LH - top)), 1, 1);
  // ligne de fond, rond central (en perspective)
  const ground = Math.round(GROUND / PX);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(0, ground, LW, 1);
  ctx.fillRect(LW / 2, top + 4, 1, LH - top - 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(LW / 2 + 0.5, ground - 8, 30, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#2f7d3a';
  ctx.fillRect(0, ground + 1, LW, LH - ground - 1);
  ctx.fillStyle = '#286b31';
  for (let x = 0; x < LW; x += 4) ctx.fillRect(x + ((x / 4) % 2), ground + 3 + ((x / 4) % 3), 2, 1);
}

let cached: HTMLCanvasElement | null = null;

/** Image du stade, faite une seule fois. */
export function stadium(): HTMLCanvasElement {
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = LW;
  canvas.height = LH;
  const ctx = canvas.getContext('2d')!;
  const r = rand(42);
  drawSky(ctx);
  drawStands(ctx, r);
  drawBoards(ctx);
  drawGrass(ctx, r);
  return (cached = canvas);
}

/** Filet et poteau arrière d'une cage (dessinés derrière les joueurs). */
export function drawGoalBack(ctx: CanvasRenderingContext2D, side: 0 | 1): void {
  const x0 = side === 0 ? 0 : W - GOAL_W;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x0, GOAL_TOP, GOAL_W, GROUND - GOAL_TOP);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = x0; x <= x0 + GOAL_W; x += 12) {
    ctx.moveTo(x, GOAL_TOP);
    ctx.lineTo(x, GROUND);
  }
  for (let y = GOAL_TOP; y <= GROUND; y += 12) {
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + GOAL_W, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Barre transversale et poteau avant (dessinés devant les joueurs). */
export function drawGoalFront(ctx: CanvasRenderingContext2D, side: 0 | 1): void {
  const x0 = side === 0 ? 0 : W - GOAL_W;
  const post = side === 0 ? GOAL_W - 6 : W - GOAL_W;
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(x0, GOAL_TOP - BAR_H, GOAL_W, BAR_H);
  ctx.fillRect(post, GOAL_TOP - BAR_H, 6, GROUND - GOAL_TOP + BAR_H);
  ctx.fillStyle = '#b9b9c6';
  ctx.fillRect(x0, GOAL_TOP - 2, GOAL_W, 2);
  ctx.fillRect(post + 4, GOAL_TOP, 2, GROUND - GOAL_TOP);
}

const BALL_PIXELS = [
  '....######....',
  '..##wwwwww##..',
  '.#wwwwbbwwww#.',
  '.#wwwbbbbwww#.',
  '#wwwwwbbwwwww#',
  '#wbbwwwwwwbbw#',
  '#bbbwwwwwwbbb#',
  '#wbwwwwwwwwbw#',
  '#wwwwwbbwwwww#',
  '#wwwwbbbbwwww#',
  '.#wwwbbbbwww#.',
  '.#wwwwwwwwww#.',
  '..##wwwwww##..',
  '....######....',
];

let ballCanvas: HTMLCanvasElement | null = null;

/** Le ballon en pixel art (14 × 14). */
export function ballSprite(): HTMLCanvasElement {
  if (ballCanvas) return ballCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = BALL_PIXELS.length;
  const ctx = canvas.getContext('2d')!;
  const colors: Record<string, string> = { '#': '#1a1a24', w: '#ffffff', b: '#2b2b38' };
  BALL_PIXELS.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '.') return;
      ctx.fillStyle = colors[c]!;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  return (ballCanvas = canvas);
}
