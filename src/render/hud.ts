/* Tableau des scores : portraits, noms, score, temps restant, jauges de super tir. */
import type { Character } from '../assets/characters';
import { W } from '../engine/constants';
import type { Match } from '../engine/types';
import { drawPortrait } from './sprite-draw';

export interface HudInfo {
  chars: [Character, Character];
}

const FONT = '"Press Start 2P", monospace';

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = '#fff') {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = '#000';
  ctx.fillText(s, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

function side(ctx: CanvasRenderingContext2D, m: Match, char: Character, s: 0 | 1): void {
  const size = 54;
  const x = s === 0 ? 16 : W - 16 - size;
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 3, 11, size + 6, size + 6);
  ctx.fillStyle = char.color;
  ctx.fillRect(x - 2, 12, size + 4, size + 4);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, 14, size, size);
  ctx.clip();
  ctx.fillStyle = '#1b1f4b';
  ctx.fillRect(x, 14, size, size);
  drawPortrait(ctx, char, x, 14, size, s === 0 ? 1 : -1);
  ctx.restore();

  ctx.textAlign = s === 0 ? 'left' : 'right';
  const tx = s === 0 ? x + size + 12 : x - 12;
  text(ctx, char.name, tx, 30, 14);
  // jauge de super tir
  const p = m.players[s];
  const bw = 150;
  const bx = s === 0 ? tx : tx - bw;
  ctx.fillStyle = '#000';
  ctx.fillRect(bx - 2, 40, bw + 4, 14);
  ctx.fillStyle = '#2a2d3e';
  ctx.fillRect(bx, 42, bw, 10);
  const full = p.power >= 1;
  const glow = full && Math.floor(performance.now() / 150) % 2 === 0;
  ctx.fillStyle = full ? (glow ? '#fff' : '#ff6b35') : '#ffd166';
  const fill = bw * p.power;
  ctx.fillRect(s === 0 ? bx : bx + bw - fill, 42, fill, 10);
  if (full) text(ctx, 'SUPER !', tx, 68, 9, '#ff6b35');
}

export function drawHud(ctx: CanvasRenderingContext2D, m: Match, info: HudInfo): void {
  side(ctx, m, info.chars[0], 0);
  side(ctx, m, info.chars[1], 1);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(W / 2 - 80, 10, 160, 62);
  ctx.textAlign = 'center';
  text(ctx, `${m.score[0]} - ${m.score[1]}`, W / 2, 42, 24);
  const label = m.golden ? 'BUT EN OR' : `${Math.ceil(m.time)}`;
  text(ctx, label, W / 2, 64, 12, m.golden || m.time <= 10 ? '#ff6b35' : '#ffd166');
}
