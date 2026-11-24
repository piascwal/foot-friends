/* Le ballon contre le corps d'un joueur : il rebondit sur lui (tête, torse, jambes), en prenant une
   partie de sa vitesse. Un super tir renverse l'adversaire qu'il percute et continue sa course. */
import { capSpeed } from './ball';
import { BALL_R, PLAYER_R } from './constants';
import { closestOnPlayer } from './geometry';
import { stunPlayer } from './strikes';
import type { Ball, GameEvent, Player } from './types';

/** Rebond du ballon sur un joueur. */
const BODY_BOUNCE = 0.55;

export function ballOnPlayer(b: Ball, p: Player, events: GameEvent[]): void {
  const c = closestOnPlayer(p, b.x, b.y);
  const dx = b.x - c.x;
  const dy = b.y - c.y;
  const d = Math.hypot(dx, dy);
  const min = PLAYER_R + BALL_R;
  if (d >= min) return;

  if (b.fire > 0 && b.fireBy !== null && b.fireBy !== p.side) {
    // super tir adverse : le joueur est renversé, le ballon passe
    if (p.stun <= 0) {
      stunPlayer(p, 1.3, Math.sign(b.vx) * 380, events);
      b.vx *= 0.85;
    }
    return;
  }

  const nx = d > 0 ? dx / d : p.facing;
  const ny = d > 0 ? dy / d : 0;
  b.x = c.x + nx * min;
  b.y = c.y + ny * min;
  const rvx = b.vx - p.vx;
  const rvy = b.vy - p.vy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    b.vx -= (1 + BODY_BOUNCE) * vn * nx;
    b.vy -= (1 + BODY_BOUNCE) * vn * ny;
    // tête : le joueur qui saute renvoie le ballon plus haut et vers l'avant
    if (ny < -0.5 && p.vy < 0) {
      b.vy += p.vy * 0.4;
      b.vx += p.facing * 90;
    }
    capSpeed(b);
  }
}
