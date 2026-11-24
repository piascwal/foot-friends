/* Le stade en pixel art : ciel, tribunes et public, panneaux, pelouse rayée. Dessiné une fois en basse
   résolution (un pixel = 3 pixels monde), puis agrandi sans lissage. */
import { BAR_H, GOAL_TOP, GOAL_W, GROUND, H, W } from '../engine/constants';

const PX = 3;
const LW = W / PX;
const LH = H / PX;
const CROWD = ['#ff2e88', '#ffe600', '#00d9ff', '#7bff00', '#ff7a00', '#ffffff', '#b84dff', '#ff3b3b'];
const SKIN = ['#f1c27d', '#c68642', '#8d5524', '#ffdbac'];
/** Haut et bas des tribunes, des panneaux, de la pelouse (pixels basse résolution). */
const STANDS = { top: 44, bottom: 120 };
const BOARDS = { top: 120, h: 10 };
const GRASS_TOP = 130;
const BOARD_COLORS = ['#ff2e88', '#ffe600', '#00d9ff', '#7bff00'];
const BOARD_TEXT = ['FOOT FRIENDS', 'BUT !', 'GOAL !', 'ALLEZ !'];

/** Couleurs du terrain hors image (au-dessus : ciel ; en dessous : pelouse). */
export const SKY_TOP = '#1aa7ff';
export const TURF_BOTTOM = '#168a35';

/** Petit générateur reproductible : le public est le même à chaque partie. */
function rand(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function drawSky(ctx: CanvasRenderingContext2D, r: () => number): void {
  const bands = [SKY_TOP, '#33b5ff', '#52c3ff', '#74d1ff', '#97dfff'];
  const band = Math.ceil(STANDS.top / bands.length);
  bands.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * band, LW, band);
  });
  // nuages en pixels
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(r() * LW);
    const y = 6 + Math.floor(r() * 22);
    ctx.fillRect(x, y, 18, 4);
    ctx.fillRect(x + 4, y - 3, 10, 3);
  }
}

/** Une tribune par bloc de 40 pixels, chacune aux couleurs de ses supporters. */
const SECTIONS = ['#ff2e88', '#ffe600', '#00d9ff', '#ff7a00', '#7bff00', '#ffffff', '#b84dff', '#ff3b3b'];

function drawStands(ctx: CanvasRenderingContext2D, r: () => number): void {
  const { top, bottom } = STANDS;
  // toit et structure
  ctx.fillStyle = '#16204a';
  ctx.fillRect(0, top - 4, LW, 4);
  ctx.fillStyle = '#ffe600';
  ctx.fillRect(0, top - 1, LW, 1);
  ctx.fillStyle = '#26357a';
  ctx.fillRect(0, top, LW, bottom - top);
  for (let y = top + 2; y < bottom - 3; y += 5) {
    // gradin
    ctx.fillStyle = '#1d2a66';
    ctx.fillRect(0, y + 4, LW, 1);
    for (let x = 1 + ((y / 5) % 2) * 2; x < LW - 1; x += 4) {
      if (r() < 0.08) continue;
      const section = SECTIONS[Math.floor(x / 40) % SECTIONS.length]!;
      // la plupart portent les couleurs de leur tribune
      ctx.fillStyle = r() < 0.78 ? section : CROWD[Math.floor(r() * CROWD.length)]!;
      ctx.fillRect(x, y + 2, 3, 2);
      ctx.fillStyle = SKIN[Math.floor(r() * SKIN.length)]!;
      ctx.fillRect(x + 1, y, 1, 2);
    }
  }
  // séparations entre tribunes
  ctx.fillStyle = '#16204a';
  for (let x = 40; x < LW; x += 40) ctx.fillRect(x - 1, top, 2, bottom - top);
}

function drawBoards(ctx: CanvasRenderingContext2D): void {
  for (let x = 0, i = 0; x < LW; x += 40, i++) {
    ctx.fillStyle = BOARD_COLORS[i % BOARD_COLORS.length]!;
    ctx.fillRect(x, BOARDS.top, 40, BOARDS.h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, BOARDS.top, 40, 1);
  }
  ctx.fillStyle = '#0b1030';
  ctx.fillRect(0, BOARDS.top + BOARDS.h, LW, 1);
}

function drawGrass(ctx: CanvasRenderingContext2D, r: () => number): void {
  for (let x = 0; x < LW; x += 20) {
    ctx.fillStyle = (x / 20) % 2 ? '#2fcf4f' : '#3fe05e';
    ctx.fillRect(x, GRASS_TOP + 1, 20, LH - GRASS_TOP);
  }
  ctx.fillStyle = 'rgba(0,80,20,0.25)';
  for (let i = 0; i < 300; i++)
    ctx.fillRect(Math.floor(r() * LW), GRASS_TOP + 2 + Math.floor(r() * (LH - GRASS_TOP)), 1, 1);
  const ground = Math.round(GROUND / PX);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, ground, LW, 1);
  ctx.fillStyle = TURF_BOTTOM;
  ctx.fillRect(0, ground + 1, LW, LH - ground - 1);
  ctx.fillStyle = '#127a2d';
  for (let x = 0; x < LW; x += 4) ctx.fillRect(x + ((x / 4) % 2), ground + 3 + ((x / 4) % 3), 2, 1);
}

/** Textes des panneaux publicitaires, en pleine résolution. */
function drawBoardText(ctx: CanvasRenderingContext2D): void {
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const y = (BOARDS.top + BOARDS.h / 2) * PX + 1;
  for (let x = 0, i = 0; x < LW; x += 40, i++) {
    const dark = BOARD_COLORS[i % BOARD_COLORS.length] !== '#ff2e88';
    ctx.fillStyle = dark ? '#0b1030' : '#ffffff';
    ctx.fillText(BOARD_TEXT[i % BOARD_TEXT.length]!, (x + 20) * PX, y);
  }
  ctx.textBaseline = 'alphabetic';
}

let cached: HTMLCanvasElement | null = null;

/**
 * Image du stade (960 × 540), faite une seule fois : pixel art agrandi sans lissage, puis les textes.
 * Sans marquage au sol : elle se répète sur les côtés des écrans très larges.
 */
export function stadium(): HTMLCanvasElement {
  if (cached) return cached;
  const low = document.createElement('canvas');
  low.width = LW;
  low.height = LH;
  const lctx = low.getContext('2d')!;
  const r = rand(42);
  drawSky(lctx, r);
  drawStands(lctx, r);
  drawBoards(lctx);
  drawGrass(lctx, r);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, W, H);
  drawBoardText(ctx);
  return (cached = canvas);
}

/** Marquage du terrain : ligne médiane et rond central (une seule fois, au centre). */
export function drawMarkings(ctx: CanvasRenderingContext2D): void {
  const top = (GRASS_TOP + 4) * PX;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W / 2 - 2, top, 4, GROUND - top);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(W / 2, GROUND - 24, 92, 24, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillRect(W / 2 - 5, GROUND - 27, 10, 6);
}

/**
 * Fond sur toute la zone visible (écran plus large ou plus haut que le terrain) : le stade se répète sur
 * les côtés, assombri hors du terrain ; le ciel continue au-dessus, la pelouse en dessous.
 */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  view: { x0: number; x1: number; y0: number; y1: number },
): void {
  ctx.fillStyle = SKY_TOP;
  ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, -view.y0 + 1);
  ctx.fillStyle = TURF_BOTTOM;
  ctx.fillRect(view.x0, H - 1, view.x1 - view.x0, view.y1 - H + 1);
  const img = stadium();
  for (let x = Math.floor(view.x0 / W) * W; x < view.x1; x += W) ctx.drawImage(img, x, 0, W, H);
  ctx.fillStyle = 'rgba(8,12,40,0.28)';
  if (view.x0 < 0) ctx.fillRect(view.x0, view.y0, -view.x0, view.y1 - view.y0);
  if (view.x1 > W) ctx.fillRect(W, view.y0, view.x1 - W, view.y1 - view.y0);
  drawMarkings(ctx);
}

/** Filet et poteau arrière d'une cage (dessinés derrière les joueurs). */
export function drawGoalBack(ctx: CanvasRenderingContext2D, side: 0 | 1): void {
  const x0 = side === 0 ? 0 : W - GOAL_W;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(x0, GOAL_TOP, GOAL_W, GROUND - GOAL_TOP);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
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
