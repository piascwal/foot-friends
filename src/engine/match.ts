/* Le match : coup d'envoi, jeu, buts, temps, but en or, fin. */
import { goalLine, newBall, stepBall } from './ball';
import { GOAL_PAUSE, KICKOFF_PAUSE, MATCH_TIME, W } from './constants';
import { ballOnPlayer } from './contact';
import { movePlayer, newPlayer, separatePlayers, steer } from './player';
import { startStrike, stepStrike } from './strikes';
import { NO_INPUT, type Input, type Match, type Side } from './types';

/** Hauteur où le ballon est tenu avant d'être lâché. */
const DROP_Y = 150;

export function newMatch(time = MATCH_TIME): Match {
  return {
    players: [newPlayer(0), newPlayer(1)],
    ball: newBall(W / 2, DROP_Y),
    score: [0, 0],
    time,
    phase: 'kickoff',
    phaseT: 0,
    golden: false,
    lastScorer: null,
    kickoffTo: Math.random() < 0.5 ? 0 : 1,
    events: [],
  };
}

/** Remet joueurs et ballon en place pour le coup d'envoi. */
function resetKickoff(m: Match): void {
  const power = m.players.map((p) => p.power);
  m.players = [newPlayer(0), newPlayer(1)];
  m.players[0].power = power[0]!;
  m.players[1].power = power[1]!;
  m.ball = newBall(W / 2, DROP_Y);
  m.phase = 'kickoff';
  m.phaseT = 0;
}

/** Vainqueur au score (null : égalité). */
export const leader = (m: Match): Side | null =>
  m.score[0] === m.score[1] ? null : m.score[0] > m.score[1] ? 0 : 1;

function finish(m: Match): void {
  m.phase = 'end';
  m.phaseT = 0;
  m.events.push({ type: 'whistle', x: W / 2, y: 0 }, { type: 'end', winner: leader(m) });
}

/** Physique d'une image de jeu : joueurs, frappes, ballon. */
function simulate(m: Match, inputs: readonly [Input, Input], dt: number, frozen: boolean): void {
  const [a, b] = m.players;
  for (const p of m.players) {
    const input = frozen ? NO_INPUT : inputs[p.side];
    steer(p, input);
    startStrike(p, input);
    p.prev = input;
  }
  for (const p of m.players) movePlayer(p, dt);
  separatePlayers(a, b);
  if (frozen) return;
  stepStrike(a, b, m.ball, dt, m.events);
  stepStrike(b, a, m.ball, dt, m.events);
  stepBall(m.ball, dt, m.events);
  ballOnPlayer(m.ball, a, m.events);
  ballOnPlayer(m.ball, b, m.events);
}

/** Avance le match de `dt` secondes (pas fixe conseillé : 1/120). */
export function stepMatch(m: Match, inputs: readonly [Input, Input], dt: number): void {
  m.events.length = 0;
  m.phaseT += dt;
  switch (m.phase) {
    case 'kickoff':
      simulate(m, inputs, dt, false);
      // le ballon reste tenu en l'air jusqu'au coup de sifflet
      m.ball.x = W / 2;
      m.ball.y = DROP_Y;
      m.ball.vx = m.ball.vy = 0;
      if (m.phaseT >= KICKOFF_PAUSE) {
        m.phase = 'play';
        m.phaseT = 0;
        m.ball.vx = m.kickoffTo === 0 ? -60 : 60;
        m.events.push({ type: 'whistle', x: W / 2, y: DROP_Y });
      }
      break;
    case 'play': {
      simulate(m, inputs, dt, false);
      const goal = goalLine(m.ball);
      if (goal !== null) {
        const scorer: Side = goal === 0 ? 1 : 0;
        m.score[scorer]++;
        m.lastScorer = scorer;
        m.kickoffTo = goal;
        m.phase = 'goal';
        m.phaseT = 0;
        m.events.push({ type: 'goal', side: scorer });
        break;
      }
      if (!m.golden) {
        m.time = Math.max(0, m.time - dt);
        if (m.time === 0) {
          if (leader(m) === null) m.golden = true;
          else finish(m);
        }
      }
      break;
    }
    case 'goal':
      simulate(m, inputs, dt, true);
      stepBall(m.ball, dt, []);
      if (m.phaseT >= GOAL_PAUSE) {
        if (m.golden || m.time === 0) finish(m);
        else resetKickoff(m);
      }
      break;
    case 'end':
      simulate(m, inputs, dt, true);
      break;
  }
}
