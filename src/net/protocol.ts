/* Ce qui passe entre les deux appareils d'un match en réseau. L'hôte (celui qui a créé la partie) fait
   tourner le match ; l'invité lui envoie ses commandes et affiche l'état reçu. Sur un même Wi-Fi, le
   délai est imperceptible, et les deux écrans montrent toujours exactement le même match.

   Tout ce qui arrive du réseau est vérifié champ par champ : un message invalide est ignoré. */
import { newBall } from '../engine/ball';
import { newPlayer } from '../engine/player';
import {
  NO_INPUT,
  type GameEvent,
  type Input,
  type Match,
  type Phase,
  type Player,
  type Side,
} from '../engine/types';

/** Version du protocole : deux versions différentes refusent de jouer ensemble. */
export const PROTOCOL = 1;

/** Messages fiables (canal ctrl). */
export type NetMsg =
  | { t: 'hello'; v: number; name: string }
  /** Joueur choisi (identifiant du personnage). */
  | { t: 'pick'; id: string }
  /** L'hôte lance le match : personnages [hôte, invité] et durée. */
  | { t: 'start'; p: [string, string]; time: number }
  /** Retour au choix des joueurs. */
  | { t: 'reselect' }
  | { t: 'bye' };

const isText = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
const isNum = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isId = (v: unknown): v is string => isText(v, 40) && /^[a-z0-9-]+$/.test(v);

/** Lit un message reçu ; null s'il est invalide. */
export function readMsg(o: unknown): NetMsg | null {
  if (!o || typeof o !== 'object') return null;
  const m = o as Record<string, unknown>;
  switch (m.t) {
    case 'hello':
      return isNum(m.v, 0, 1000) && isText(m.name, 14) ? { t: 'hello', v: m.v, name: m.name } : null;
    case 'pick':
      return isId(m.id) ? { t: 'pick', id: m.id } : null;
    case 'start':
      return Array.isArray(m.p) && m.p.length === 2 && m.p.every(isId) && isNum(m.time, 10, 600)
        ? { t: 'start', p: [m.p[0], m.p[1]], time: m.time }
        : null;
    case 'reselect':
    case 'bye':
      return { t: m.t };
    default:
      return null;
  }
}

/* ---------- commandes de l'invité : un octet ---------- */

const INPUT_KEYS = Object.keys(NO_INPUT) as (keyof Input)[];

export function encodeInput(input: Input): ArrayBuffer {
  const bits = INPUT_KEYS.reduce((n, key, i) => (input[key] ? n | (1 << i) : n), 0);
  return new Uint8Array([bits]).buffer;
}

export function decodeInput(data: ArrayBuffer): Input | null {
  if (data.byteLength !== 1) return null;
  const bits = new Uint8Array(data)[0]!;
  return Object.fromEntries(INPUT_KEYS.map((key, i) => [key, !!(bits & (1 << i))])) as unknown as Input;
}

/* ---------- état du match envoyé par l'hôte ---------- */

const PHASES: readonly Phase[] = ['kickoff', 'play', 'goal', 'end'];
const STRIKES = ['kick', 'punch'] as const;

/** Ce que l'invité doit savoir d'un joueur pour l'afficher. */
const playerRow = (p: Player): number[] => [
  p.x,
  p.y,
  p.vx,
  p.vy,
  p.facing,
  p.onGround ? 1 : 0,
  p.strike ? STRIKES.indexOf(p.strike.kind) : -1,
  p.strike?.air ? 1 : 0,
  p.strike?.t ?? 0,
  p.stun,
  p.stride,
];

/** Événements transmis : ceux qui font un son ou un effet. */
function eventRow(e: GameEvent): (string | number)[] {
  if (e.type === 'goal' || e.type === 'stun') return [e.type, e.side];
  if (e.type === 'end') return [e.type, e.winner ?? -1];
  return [e.type, Math.round(e.x), Math.round(e.y)];
}

/** Paquet d'état : le match, et les événements depuis le dernier paquet. */
export function encodeState(m: Match, events: readonly GameEvent[]): ArrayBuffer {
  const b = m.ball;
  const state = [
    PHASES.indexOf(m.phase),
    m.phaseT,
    m.time,
    m.score[0],
    m.score[1],
    m.golden ? 1 : 0,
    m.lastScorer ?? -1,
    m.kickoffTo,
    [b.x, b.y, b.vx, b.vy, b.spin],
    playerRow(m.players[0]),
    playerRow(m.players[1]),
    events.slice(-20).map(eventRow),
  ];
  return new TextEncoder().encode(JSON.stringify(state)).buffer as ArrayBuffer;
}

const nums = (v: unknown, n: number): v is number[] =>
  Array.isArray(v) && v.length === n && v.every((x) => isNum(x, -1e6, 1e6));

function readPlayer(row: number[], side: Side): Player {
  const p = newPlayer(side);
  const [x, y, vx, vy, facing, onGround, strike, air, t, stun, stride] = row as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  Object.assign(p, { x, y, vx, vy, facing: facing < 0 ? -1 : 1, onGround: onGround === 1, stun, stride });
  const kind = STRIKES[strike];
  p.strike = kind ? { kind, air: air === 1, t, hitBall: true, hitFoe: true } : null;
  return p;
}

function readEvent(row: unknown): GameEvent | null {
  if (!Array.isArray(row) || typeof row[0] !== 'string') return null;
  const [type, a, b] = row as [string, number, number];
  if (!isNum(a, -1e5, 1e5)) return null;
  if (type === 'goal' || type === 'stun') return a === 0 || a === 1 ? { type, side: a } : null;
  if (type === 'end') return { type, winner: a === 0 || a === 1 ? a : null };
  if (!isNum(b, -1e5, 1e5)) return null;
  if (['kick', 'punch', 'bounce', 'post', 'whistle'].includes(type))
    return { type: type as 'kick', x: a, y: b };
  return null;
}

/** Lit un paquet d'état ; null s'il est invalide. */
export function decodeState(data: ArrayBuffer): { match: Match; events: GameEvent[] } | null {
  let s: unknown;
  try {
    s = JSON.parse(new TextDecoder().decode(data));
  } catch {
    return null;
  }
  if (!Array.isArray(s) || s.length !== 12) return null;
  const [phase, phaseT, time, s0, s1, golden, last, kickoffTo, ball, p0, p1, events] = s as unknown[];
  if (!isNum(phase, 0, 3) || !Number.isInteger(phase) || !isNum(phaseT, 0, 1e4) || !isNum(time, 0, 1e4))
    return null;
  if (!isNum(s0, 0, 999) || !isNum(s1, 0, 999) || !isNum(last, -1, 1) || !isNum(kickoffTo, 0, 1)) return null;
  if (!nums(ball, 5) || !nums(p0, 11) || !nums(p1, 11) || !Array.isArray(events)) return null;
  const b = newBall(ball[0]!, ball[1]!);
  [b.vx, b.vy, b.spin] = [ball[2]!, ball[3]!, ball[4]!];
  const match: Match = {
    players: [readPlayer(p0, 0), readPlayer(p1, 1)],
    ball: b,
    score: [s0, s1],
    time,
    phase: PHASES[phase]!,
    phaseT,
    golden: golden === 1,
    lastScorer: last === 0 || last === 1 ? last : null,
    kickoffTo: kickoffTo === 1 ? 1 : 0,
    events: [],
  };
  return { match, events: events.map(readEvent).filter((e): e is GameEvent => !!e) };
}
