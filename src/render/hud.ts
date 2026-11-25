/* Tableau des scores façon stade : portraits encadrés de la couleur du joueur, nom sur bandeau,
   score au centre et chrono à affichage lumineux. */
import type { Character } from '../assets/characters';
import { W } from '../engine/constants';
import type { Match } from '../engine/types';
import { drawPortrait } from './sprite-draw';

export interface HudInfo {
  chars: [Character, Character];
}

/** Zone visible en coordonnées du terrain (plus large que le terrain sur un écran allongé). */
export interface View {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const FONT = '"Press Start 2P", monospace';

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = '#fff') {
  ctx.font = `${size}px ${FONT}`;
  ctx.lineWidth = Math.max(3, size / 4);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** Bloc avec bordure noire épaisse et ombre portée (style pixel). */
function block(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x + 4, y + 4, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function side(ctx: CanvasRenderingContext2D, _m: Match, char: Character, s: 0 | 1, view: View): void {
  const size = 58;
  const left = s === 0;
  const x = left ? view.x0 + 16 : view.x1 - 16 - size;
  block(ctx, x - 3, 11, size + 6, size + 6, char.color);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, 14, size, size);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, 14, size, size);
  drawPortrait(ctx, char, x, 14, size, left ? 1 : -1);
  ctx.restore();

  // bandeau du nom à la couleur du joueur
  const bw = 170;
  const bx = left ? x + size + 12 : x - 12 - bw;
  block(ctx, bx, 14, bw, 24, char.color);
  ctx.textAlign = left ? 'left' : 'right';
  text(ctx, char.name, left ? bx + 8 : bx + bw - 8, 33, 14);
}

export function drawHud(ctx: CanvasRenderingContext2D, m: Match, info: HudInfo, view: View): void {
  side(ctx, m, info.chars[0], 0, view);
  side(ctx, m, info.chars[1], 1, view);
  // tableau d'affichage
  const w = 176;
  const x = W / 2 - w / 2;
  block(ctx, x, 12, w, 44, '#0b1030');
  ctx.fillStyle = '#ffe600';
  ctx.fillRect(x, 12, w, 3);
  for (const s of [0, 1] as const) {
    ctx.fillStyle = info.chars[s].color;
    ctx.fillRect(s === 0 ? x + 8 : x + w - 22, 24, 14, 24);
  }
  ctx.textAlign = 'center';
  text(ctx, `${m.score[0]}-${m.score[1]}`, W / 2, 49, 26);
  // chrono lumineux
  const urgent = m.golden || m.time <= 10;
  block(ctx, W / 2 - 52, 64, 104, 22, urgent ? '#ff2e88' : '#000');
  const t = Math.ceil(m.time);
  const label = m.golden ? 'BUT EN OR' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  text(ctx, label, W / 2, 82, m.golden ? 10 : 14, urgent ? '#fff' : '#ffe600');
}
