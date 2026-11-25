/* Le ballon : gravité, rebonds sur le sol, les murs, le plafond et les barres transversales. */
import {
  BALL_BOUNCE,
  BALL_MAX_SPEED,
  BALL_R,
  BALL_ROLL,
  BAR_H,
  GOAL_TOP,
  GOAL_W,
  BALL_GRAVITY,
  GROUND,
  W,
} from './constants';
import type { Ball, GameEvent } from './types';

/** Barres transversales : rectangles [x0, x1] × [y0, y1]. */
export const BARS = [
  { x0: 0, x1: GOAL_W, y0: GOAL_TOP - BAR_H, y1: GOAL_TOP },
  { x0: W - GOAL_W, x1: W, y0: GOAL_TOP - BAR_H, y1: GOAL_TOP },
] as const;

export function newBall(x: number, y: number): Ball {
  return { x, y, vx: 0, vy: 0, spin: 0, mouth: null };
}

/** Limite la vitesse du ballon (il reste rattrapable). */
export function capSpeed(b: Ball): void {
  const speed = Math.hypot(b.vx, b.vy);
  if (speed > BALL_MAX_SPEED) {
    b.vx *= BALL_MAX_SPEED / speed;
    b.vy *= BALL_MAX_SPEED / speed;
  }
}

/** Rebond du ballon sur un rectangle ; true s'il l'a touché. */
function bounceOnRect(b: Ball, r: { x0: number; x1: number; y0: number; y1: number }): boolean {
  const cx = Math.min(Math.max(b.x, r.x0), r.x1);
  const cy = Math.min(Math.max(b.y, r.y0), r.y1);
  const dx = b.x - cx;
  const dy = b.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= BALL_R) return false;
  // centre du ballon dans la barre (très rare) : on le sort par le haut ou le bas
  const nx = d > 0 ? dx / d : 0;
  const ny = d > 0 ? dy / d : b.y < (r.y0 + r.y1) / 2 ? -1 : 1;
  b.x = cx + nx * BALL_R;
  b.y = cy + ny * BALL_R;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + BALL_BOUNCE) * vn * nx;
    b.vy -= (1 + BALL_BOUNCE) * vn * ny;
  }
  return true;
}

/** Avance le ballon de `dt` secondes. */
export function stepBall(b: Ball, dt: number, events: GameEvent[]): void {
  b.vy += BALL_GRAVITY * dt;
  b.vx *= 1 - 0.15 * dt; // freinage de l'air
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.spin += (b.vx / BALL_R) * dt;

  if (b.y > GROUND - BALL_R) {
    b.y = GROUND - BALL_R;
    if (b.vy > 120) events.push({ type: 'bounce', x: b.x, y: b.y });
    b.vy = b.vy > 60 ? -b.vy * BALL_BOUNCE : 0;
    b.vx *= Math.pow(BALL_ROLL, dt * (b.vy === 0 ? 1 : 6));
  }
  if (b.y < BALL_R) {
    b.y = BALL_R;
    b.vy = Math.abs(b.vy) * BALL_BOUNCE;
  }
  if (b.x < BALL_R || b.x > W - BALL_R) {
    b.x = b.x < BALL_R ? BALL_R : W - BALL_R;
    b.vx = -b.vx * BALL_BOUNCE;
  }
  for (const bar of BARS) {
    if (bounceOnRect(b, bar)) {
      if (Math.abs(b.vx) + Math.abs(b.vy) > 150) events.push({ type: 'post', x: b.x, y: b.y });
    }
  }
}

/**
 * Suit le passage de la ligne de but : le ballon ne compte que s'il est entré dans la cage par devant,
 * sous la barre. S'il s'y retrouve autrement (poussé à travers la barre, coincé contre le bord du
 * terrain), il est remis sur la barre. `prevX` : position du ballon avant cette image.
 */
export function trackMouth(b: Ball, prevX: number): void {
  const left = b.x < GOAL_W;
  const right = b.x > W - GOAL_W;
  if (!left && !right) {
    b.mouth = null;
    return;
  }
  const side = left ? 0 : 1;
  const line = left ? GOAL_W : W - GOAL_W;
  const crossed = left ? prevX >= line : prevX <= line;
  if (b.mouth === side) return;
  if (crossed && b.y > GOAL_TOP) {
    b.mouth = side;
    return;
  }
  // dans la zone de la cage sans être passé sous la barre : il est au-dessus (normal) ou il a traversé
  if (b.y + BALL_R > GOAL_TOP - BAR_H) {
    b.y = GOAL_TOP - BAR_H - BALL_R;
    b.vy = -Math.abs(b.vy) * BALL_BOUNCE;
  }
}

/** Le ballon est entièrement entré dans une cage par devant, sous la barre : 0 = gauche, 1 = droite. */
export function goalLine(b: Ball): 0 | 1 | null {
  if (b.y - BALL_R * 0.5 < GOAL_TOP) return null;
  if (b.mouth === 0 && b.x + BALL_R < GOAL_W) return 0;
  if (b.mouth === 1 && b.x - BALL_R > W - GOAL_W) return 1;
  return null;
}

/**
 * Ballon dans les filets après un but : le filet l'amortit et le garde dans la cage (sinon il ressort
 * aussitôt et on ne voit pas le but). `side` : cage où il est entré (0 = gauche).
 */
export function catchInNet(b: Ball, side: 0 | 1, dt: number): void {
  const inner = side === 0 ? BALL_R : W - GOAL_W + BALL_R;
  const outer = side === 0 ? GOAL_W - BALL_R : W - BALL_R;
  if (b.x < inner || b.x > outer) {
    b.x = Math.min(Math.max(b.x, inner), outer);
    b.vx *= -0.15;
  }
  // le filet freine fort
  b.vx *= Math.pow(0.04, dt);
  if (b.y < GOAL_TOP + BALL_R) {
    b.y = GOAL_TOP + BALL_R;
    b.vy = Math.abs(b.vy) * 0.2;
  }
  if (b.y >= GROUND - BALL_R - 1) b.vy *= 0.4;
}
