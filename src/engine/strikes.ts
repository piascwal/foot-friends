/* Les frappes : tir et coup de poing. Chaque frappe a une zone devant le joueur, active pendant
   une courte fenêtre : le ballon qui s'y trouve part dans la direction du geste, et l'adversaire touché
   est sonné un instant. */
import { capSpeed } from './ball';
import { BALL_R } from './constants';
import { canAct } from './player';
import { distanceToPlayer } from './geometry';
import type { Ball, GameEvent, Input, Player, StrikeKind } from './types';

interface StrikeSpec {
  /** Durée du geste, et fenêtre où il frappe. */
  duration: number;
  from: number;
  to: number;
  /** Centre de la zone de frappe (devant le joueur, depuis ses pieds) et rayon. */
  zx: number;
  zy: number;
  r: number;
  /** Vitesse donnée au ballon (vers l'avant, vers le bas). */
  vx: number;
  vy: number;
  /** Temps sonné de l'adversaire touché, et recul. */
  stun: number;
  knock: number;
}

/**
 * Réglages de chaque frappe, au sol puis en l'air. Comme dans les jeux de foot « grosses têtes », le tir
 * part en cloche (le ballon flotte, l'adversaire a le temps de sauter dessus) ; la volée en l'air est plus
 * tendue ; le coup de poing sonne l'adversaire.
 */
export const STRIKES: Record<StrikeKind, { ground: StrikeSpec; air: StrikeSpec }> = {
  kick: {
    ground: {
      duration: 0.3,
      from: 0.03,
      to: 0.18,
      zx: 34,
      zy: -30,
      r: 40,
      vx: 340,
      vy: -640,
      stun: 0.6,
      knock: 160,
    },
    air: {
      duration: 0.3,
      from: 0.03,
      to: 0.18,
      zx: 36,
      zy: -60,
      r: 42,
      vx: 480,
      vy: -200,
      stun: 0.6,
      knock: 180,
    },
  },
  punch: {
    ground: {
      duration: 0.26,
      from: 0.03,
      to: 0.14,
      zx: 38,
      zy: -105,
      r: 36,
      vx: 440,
      vy: -300,
      stun: 1,
      knock: 260,
    },
    air: {
      duration: 0.28,
      from: 0.03,
      to: 0.16,
      zx: 36,
      zy: -95,
      r: 40,
      vx: 420,
      vy: 340,
      stun: 1,
      knock: 260,
    },
  },
};

export const strikeSpec = (p: Player): StrikeSpec | null =>
  p.strike ? STRIKES[p.strike.kind][p.strike.air ? 'air' : 'ground'] : null;

/** Centre de la zone de frappe d'un joueur, pour un geste donné. */
export const strikeZone = (p: Player, spec: StrikeSpec): { x: number; y: number } => ({
  x: p.x + p.facing * spec.zx,
  y: p.y + spec.zy,
});

/** Commence un geste sur l'appui d'une touche. */
export function startStrike(p: Player, input: Input): void {
  if (!canAct(p) || p.strike) return;
  const pressed = (key: StrikeKind) => input[key] && !p.prev[key];
  const kind: StrikeKind | null = pressed('kick') ? 'kick' : pressed('punch') ? 'punch' : null;
  if (!kind) return;
  p.strike = { kind, t: 0, air: !p.onGround, hitBall: false, hitFoe: false };
}

/** Fait avancer le geste d'un joueur : frappe le ballon et l'adversaire pendant la fenêtre active. */
export function stepStrike(p: Player, foe: Player, ball: Ball, dt: number, events: GameEvent[]): void {
  const s = p.strike;
  const spec = strikeSpec(p);
  if (!s || !spec) return;
  s.t += dt;
  // un joueur sonné en plein geste le perd
  if (s.t >= spec.duration || !canAct(p)) {
    p.strike = null;
    return;
  }
  if (s.t < spec.from || s.t > spec.to) return;
  const zone = strikeZone(p, spec);
  if (!s.hitBall && Math.hypot(ball.x - zone.x, ball.y - zone.y) < spec.r + BALL_R) {
    s.hitBall = true;
    ball.vx = p.facing * spec.vx + p.vx * 0.3;
    ball.vy = spec.vy + Math.min(p.vy, 0) * 0.3;
    capSpeed(ball);
    events.push({ type: s.kind, x: ball.x, y: ball.y });
  }
  if (!s.hitFoe && foe.stun <= 0 && distanceToPlayer(foe, zone.x, zone.y) < spec.r * 0.7) {
    s.hitFoe = true;
    stunPlayer(foe, spec.stun, p.facing * spec.knock, events);
    events.push({ type: 'punch', x: zone.x, y: zone.y });
  }
}

export function stunPlayer(p: Player, time: number, knock: number, events: GameEvent[]): void {
  p.stun = time;
  p.strike = null;
  p.vx = knock;
  if (p.onGround) p.vy = -180;
  p.onGround = false;
  events.push({ type: 'stun', side: p.side });
}
