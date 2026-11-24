/* Les frappes : tir et frappe puissante, coup de poing léger et puissant, super tir. Chaque frappe a une zone devant le joueur, active pendant
   une courte fenêtre : le ballon qui s'y trouve part dans la direction du geste, et l'adversaire touché
   est sonné un instant. */
import { capSpeed } from './ball';
import { BALL_R, POWER_PER_TOUCH } from './constants';
import { canAct } from './player';
import { distanceToPlayer } from './geometry';
import { STRIKE_KINDS, type Ball, type GameEvent, type Input, type Player, type StrikeKind } from './types';

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

/** Réglages de chaque frappe, au sol puis en l'air. */
export const STRIKES: Record<StrikeKind, { ground: StrikeSpec; air: StrikeSpec }> = {
  kick: {
    // tir en cloche au sol, volée tendue en l'air
    ground: {
      duration: 0.3,
      from: 0.04,
      to: 0.17,
      zx: 34,
      zy: -26,
      r: 34,
      vx: 470,
      vy: -520,
      stun: 0.6,
      knock: 160,
    },
    air: {
      duration: 0.3,
      from: 0.03,
      to: 0.18,
      zx: 36,
      zy: -55,
      r: 38,
      vx: 700,
      vy: -140,
      stun: 0.6,
      knock: 180,
    },
  },
  kickHeavy: {
    // frappe tendue au ras du sol, reprise de volée plongeante : plus lente à armer, bien plus forte
    ground: {
      duration: 0.44,
      from: 0.12,
      to: 0.24,
      zx: 38,
      zy: -30,
      r: 38,
      vx: 840,
      vy: -260,
      stun: 1,
      knock: 300,
    },
    air: {
      duration: 0.4,
      from: 0.08,
      to: 0.22,
      zx: 38,
      zy: -55,
      r: 40,
      vx: 900,
      vy: 140,
      stun: 1,
      knock: 300,
    },
  },
  punch: {
    // poing tendu au sol, smash vers le bas en l'air
    ground: {
      duration: 0.24,
      from: 0.03,
      to: 0.13,
      zx: 36,
      zy: -100,
      r: 34,
      vx: 560,
      vy: -220,
      stun: 0.9,
      knock: 230,
    },
    air: {
      duration: 0.26,
      from: 0.03,
      to: 0.15,
      zx: 34,
      zy: -95,
      r: 38,
      vx: 520,
      vy: 420,
      stun: 0.9,
      knock: 230,
    },
  },
  punchHeavy: {
    // gros direct qui sonne longtemps, smash écrasant en l'air
    ground: {
      duration: 0.42,
      from: 0.1,
      to: 0.22,
      zx: 40,
      zy: -100,
      r: 36,
      vx: 760,
      vy: -320,
      stun: 1.4,
      knock: 380,
    },
    air: {
      duration: 0.42,
      from: 0.08,
      to: 0.2,
      zx: 36,
      zy: -90,
      r: 40,
      vx: 650,
      vy: 700,
      stun: 1.4,
      knock: 380,
    },
  },
  super: {
    ground: {
      duration: 0.42,
      from: 0.08,
      to: 0.24,
      zx: 36,
      zy: -48,
      r: 48,
      vx: 1150,
      vy: -70,
      stun: 1.5,
      knock: 420,
    },
    air: {
      duration: 0.42,
      from: 0.08,
      to: 0.24,
      zx: 36,
      zy: -60,
      r: 50,
      vx: 1150,
      vy: 40,
      stun: 1.5,
      knock: 420,
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

/** Commence un geste sur l'appui d'une touche (le super tir demande une jauge pleine). */
export function startStrike(p: Player, input: Input): void {
  if (!canAct(p) || p.strike) return;
  const kind = STRIKE_KINDS.find((k) => input[k] && !p.prev[k] && (k !== 'super' || p.power >= 1)) ?? null;
  if (!kind) return;
  if (kind === 'super') p.power = 0;
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
    ball.fire = s.kind === 'super' ? 1.4 : 0;
    ball.fireBy = s.kind === 'super' ? p.side : null;
    if (s.kind !== 'super') p.power = Math.min(1, p.power + POWER_PER_TOUCH);
    events.push({ type: s.kind, x: ball.x, y: ball.y });
  }
  if (!s.hitFoe && foe.stun <= 0 && distanceToPlayer(foe, zone.x, zone.y) < spec.r * 0.7) {
    s.hitFoe = true;
    stunPlayer(foe, spec.stun, p.facing * spec.knock, events);
    const heavy = s.kind === 'super' ? 'super' : s.kind.endsWith('Heavy') ? 'punchHeavy' : 'punch';
    events.push({ type: heavy, x: zone.x, y: zone.y });
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
