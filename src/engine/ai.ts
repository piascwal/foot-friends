/* L'ordinateur : il se place derrière le ballon (côté de sa cage), saute pour les ballons hauts et frappe
   quand le ballon passe dans sa zone. Le niveau règle son temps de réaction et ses ratés. */
import { BALL_R, GROUND, PLAYER_H, W } from './constants';
import { clamp } from './geometry';
import { STRIKES, strikeZone } from './strikes';
import { NO_INPUT, type Input, type Match, type Player, type Side, type StrikeKind } from './types';

export type CpuLevel = 'easy' | 'normal' | 'hard';

interface LevelSpec {
  /** Temps entre deux décisions (s). */
  react: number;
  /** Anticipation de la course du ballon (s). */
  lookahead: number;
  /** Chance de laisser passer une occasion de frapper. */
  miss: number;
}

export const CPU_LEVELS: Record<CpuLevel, LevelSpec & { label: string }> = {
  easy: { label: 'Facile', react: 0.24, lookahead: 0.1, miss: 0.45 },
  normal: { label: 'Normal', react: 0.12, lookahead: 0.22, miss: 0.18 },
  hard: { label: 'Difficile', react: 0.05, lookahead: 0.3, miss: 0.04 },
};

export interface CpuBrain {
  level: CpuLevel;
  wait: number;
  last: Input;
  rng: () => number;
}

/** Générateur pseudo-aléatoire reproductible (pour les tests). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const newBrain = (level: CpuLevel, rng: () => number = Math.random): CpuBrain => ({
  level,
  wait: 0,
  last: NO_INPUT,
  rng,
});

/** Le ballon est-il dans la zone d'une frappe de ce joueur ? */
function inZone(p: Player, kind: StrikeKind, bx: number, by: number): boolean {
  const spec = STRIKES[kind][p.onGround ? 'ground' : 'air'];
  const zone = strikeZone(p, spec);
  return Math.hypot(bx - zone.x, by - zone.y) < spec.r + BALL_R;
}

/**
 * Où courir. Ballon proche ou dangereux : on se place derrière lui (côté de sa propre cage) pour le
 * frapper vers l'avant. Sinon on reste en défense, entre le ballon et sa cage.
 */
function chase(me: Player, bx: number, bvx: number): { target: number; behind: boolean } {
  const dir = me.facing;
  const ownGoal = dir === 1 ? 0 : W;
  const fromGoal = Math.abs(bx - ownGoal);
  const behind = (bx - me.x) * dir < -6;
  const towardMe = bvx * dir < -150;
  const slow = Math.abs(bvx) < 160;
  const attack = fromGoal < 330 || slow || (Math.abs(bx - me.x) < 170 && !towardMe);
  const target = attack ? bx - dir * (behind ? 70 : 24) : ownGoal + dir * Math.min(fromGoal * 0.5, 320);
  return { target: clamp(target, 30, W - 30), behind };
}

/** Choix des frappes : super tir dès que possible, sinon le geste dont la zone contient le ballon. */
function strikes(me: Player, foe: Player, bx: number, by: number, rng: () => number): Partial<Input> {
  if (me.strike) return {};
  if (me.power >= 1 && inZone(me, 'super', bx, by)) return { super: true };
  // un coup sur trois environ est une frappe puissante
  const heavy = rng() < 0.35;
  if (inZone(me, 'kick', bx, by)) return heavy ? { kickHeavy: true } : { kick: true };
  if (inZone(me, 'punch', bx, by)) return heavy ? { punchHeavy: true } : { punch: true };
  // adversaire collé devant soi : un coup de poing pour le sonner
  if (Math.abs(foe.x - me.x) < 60 && (foe.x - me.x) * me.facing > 0 && rng() < 0.3)
    return rng() < 0.4 ? { punchHeavy: true } : { punch: true };
  return {};
}

/** Commandes de l'ordinateur pour cette image. */
export function cpuInput(m: Match, side: Side, brain: CpuBrain, dt: number): Input {
  brain.wait -= dt;
  if (brain.wait > 0) return brain.last;
  const spec = CPU_LEVELS[brain.level];
  brain.wait = spec.react;
  const me = m.players[side];
  const foe = m.players[side === 0 ? 1 : 0];
  const b = m.ball;
  const bx = b.x + b.vx * spec.lookahead;
  const by = b.y + b.vy * spec.lookahead;
  const { target, behind } = chase(me, bx, b.vx);

  const input: Input = { ...NO_INPUT };
  input.left = target < me.x - 6;
  input.right = target > me.x + 6;
  // ballon haut au-dessus de soi : on saute pour le reprendre de la tête ou en volée
  const high = by < me.y - PLAYER_H * 0.95 && by > me.y - PLAYER_H * 2.3;
  if (me.onGround && Math.abs(bx - me.x) < 70 && high && b.vy > -250) input.jump = true;
  // ballon au sol entre soi et sa cage : on saute par-dessus pour repasser derrière
  if (behind && me.onGround && Math.abs(b.x - me.x) < 90 && b.y > GROUND - 70) input.jump = true;

  if (brain.rng() >= spec.miss) Object.assign(input, strikes(me, foe, b.x, b.y, brain.rng));
  // relâcher les touches de frappe entre deux décisions, pour que le prochain appui compte
  brain.last = { ...input, kick: false, kickHeavy: false, punch: false, punchHeavy: false, super: false };
  return input;
}
