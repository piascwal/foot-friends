/* Les joueurs : course, saut, collisions avec le sol, les murs, les cages et l'autre joueur. */
import {
  BAR_H,
  GOAL_TOP,
  GOAL_W,
  GRAVITY,
  GROUND,
  JUMP_SPEED,
  PLAYER_H,
  PLAYER_R,
  RUN_SPEED,
  W,
} from './constants';
import { NO_INPUT, type Input, type Player, type Side } from './types';

/** Position de départ : à un tiers du terrain, devant sa cage. */
export const startX = (side: Side): number => (side === 0 ? W * 0.27 : W * 0.73);

export function newPlayer(side: Side): Player {
  return {
    side,
    x: startX(side),
    y: GROUND,
    vx: 0,
    vy: 0,
    facing: side === 0 ? 1 : -1,
    onGround: true,
    strike: null,
    stun: 0,
    stride: 0,
    prev: NO_INPUT,
  };
}

/** Le joueur peut-il agir (ni sonné) ? */
export const canAct = (p: Player): boolean => p.stun <= 0;

/** Course et saut d'après les commandes. */
export function steer(p: Player, input: Input): void {
  if (!canAct(p)) {
    if (p.onGround) p.vx *= 0.85;
    return;
  }
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  // un geste au sol ralentit le joueur
  const slow = p.strike && !p.strike.air ? 0.45 : 1;
  p.vx = dir * RUN_SPEED * slow;
  if (input.jump && !p.prev.jump && p.onGround) {
    p.vy = -JUMP_SPEED;
    p.onGround = false;
  }
}

/** Atterrissage sur une barre transversale, et tête qui cogne dessous. */
function collideBars(p: Player, prevY: number): void {
  const inLeft = p.x < GOAL_W + PLAYER_R * 0.6;
  const inRight = p.x > W - GOAL_W - PLAYER_R * 0.6;
  if (!inLeft && !inRight) return;
  const barTop = GOAL_TOP - BAR_H;
  if (p.vy >= 0 && prevY <= barTop + 0.5 && p.y >= barTop) {
    p.y = barTop;
    p.vy = 0;
    p.onGround = true;
  } else if (prevY > GOAL_TOP && p.y - PLAYER_H < GOAL_TOP) {
    // sous la barre : on ne peut pas sauter à travers
    p.y = GOAL_TOP + PLAYER_H;
    p.vy = Math.max(p.vy, 0);
  }
}

/** Avance un joueur de `dt` secondes. */
export function movePlayer(p: Player, dt: number): void {
  const prevY = p.y;
  p.vy += GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.onGround = false;
  if (p.y >= GROUND) {
    p.y = GROUND;
    p.vy = 0;
    p.onGround = true;
  }
  collideBars(p, prevY);
  p.x = Math.min(Math.max(p.x, PLAYER_R), W - PLAYER_R);
  if (p.onGround && Math.abs(p.vx) > 10) p.stride += Math.abs(p.vx) * dt;
  if (p.stun > 0) p.stun = Math.max(0, p.stun - dt);
}

/** Les deux joueurs ne se traversent pas ; l'un peut retomber sur la tête de l'autre. */
export function separatePlayers(a: Player, b: Player): void {
  const dx = b.x - a.x;
  const overlapX = PLAYER_R * 2 - Math.abs(dx);
  if (overlapX <= 0) return;
  const [upper, lower] = a.y < b.y ? [a, b] : [b, a];
  const headTop = lower.y - PLAYER_H;
  if (upper.y - headTop < 0) return; // l'un est entièrement au-dessus de l'autre
  if (upper.vy >= 0 && upper.y - headTop < 14) {
    upper.y = headTop;
    upper.vy = 0;
    upper.onGround = true;
    return;
  }
  const push = (overlapX / 2) * (dx >= 0 ? 1 : -1);
  a.x -= push;
  b.x += push;
}
