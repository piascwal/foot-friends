/* Le ballon contre le corps d'un joueur : il rebondit sur lui (tête, torse, jambes), en prenant une
   partie de sa vitesse. */
import { BALL_BOUNCE, BALL_R, GROUND, PLAYER_R } from './constants';
import { closestOnPlayer } from './geometry';
import type { Ball, GameEvent, Player } from './types';

/** Rebond du ballon sur un joueur. */
const BODY_BOUNCE = 0.55;
/** Vitesse maximale d'un ballon renvoyé par le corps ou la tête (les tirs vont plus vite). */
const BODY_MAX_SPEED = 620;

export function ballOnPlayer(b: Ball, p: Player, _events: GameEvent[]): void {
  const c = closestOnPlayer(p, b.x, b.y);
  const dx = b.x - c.x;
  const dy = b.y - c.y;
  const d = Math.hypot(dx, dy);
  const min = PLAYER_R + BALL_R;
  if (d >= min) return;

  const nx = d > 0 ? dx / d : p.facing;
  const ny = d > 0 ? dy / d : 0;
  b.x = c.x + nx * min;
  b.y = c.y + ny * min;
  // le corps ne transmet qu'une partie de son élan (un saut lancé ne doit pas faire un tir)
  const rvx = b.vx - p.vx * 0.6;
  const rvy = b.vy - p.vy * 0.35;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    b.vx -= (1 + BODY_BOUNCE) * vn * nx;
    b.vy -= (1 + BODY_BOUNCE) * vn * ny;
    // tête : elle renvoie le ballon vers l'avant, un peu plus haut si le joueur saute
    if (ny < -0.5) b.vx += p.facing * (p.vy < 0 ? 120 : 60);
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > BODY_MAX_SPEED) {
      b.vx *= BODY_MAX_SPEED / speed;
      b.vy *= BODY_MAX_SPEED / speed;
    }
  }
  // coincé entre le joueur et la pelouse : le ballon ne s'enfonce pas, il rebondit
  if (b.y > GROUND - BALL_R) {
    b.y = GROUND - BALL_R;
    if (b.vy > 0) b.vy = -b.vy * BALL_BOUNCE;
  }
}
