import { describe, expect, it } from 'vitest';
import { cpuInput, newBrain, seeded } from '../src/engine/ai';
import { BALL_R, GOAL_W, GROUND } from '../src/engine/constants';
import { newMatch } from '../src/engine/match';
import { NO_INPUT, type Match } from '../src/engine/types';
import { DT, playing, run } from './harness';

/** Met le ballon dans la cage de gauche. */
const intoLeftGoal = (m: Match) => Object.assign(m.ball, { x: GOAL_W / 2, y: GROUND - BALL_R, vx: 0, vy: 0 });

describe('match', () => {
  it('le ballon reste tenu en l’air jusqu’au coup d’envoi', () => {
    const m = newMatch();
    run(m, 0.5);
    expect(m.phase).toBe('kickoff');
    expect(m.ball.vy).toBe(0);
    run(m, 0.8);
    expect(m.phase).toBe('play');
  });

  it('un but dans la cage de gauche compte pour le joueur de droite, puis nouveau coup d’envoi', () => {
    const m = playing(newMatch());
    intoLeftGoal(m);
    m.ball.vx = -500;
    const events = run(m, DT * 2);
    expect(m.score).toEqual([0, 1]);
    expect(events).toContainEqual({ type: 'goal', side: 1 });
    run(m, 2);
    expect(m.ball.x).toBeLessThan(GOAL_W);
    run(m, 0.3);
    expect(m.phase).toBe('kickoff');
    expect(m.kickoffTo).toBe(0);
  });

  it('le temps écoulé termine le match ; égalité : but en or', () => {
    const m = playing(newMatch(1));
    run(m, 1.1);
    expect(m.golden).toBe(true);
    expect(m.phase).toBe('play');
    intoLeftGoal(m);
    run(m, 2.5);
    expect(m.phase).toBe('end');
    expect(m.score).toEqual([0, 1]);
  });

  it('fin du temps avec un vainqueur', () => {
    const m = playing(newMatch(2));
    m.score = [2, 1];
    const events = run(m, 2.1);
    expect(m.phase).toBe('end');
    expect(events).toContainEqual({ type: 'end', winner: 0 });
  });

  for (const level of ['easy', 'normal', 'hard'] as const) {
    it(`l'ordinateur (${level}) gagne contre un joueur immobile`, () => {
      const m = newMatch(90);
      m.kickoffTo = 0;
      const brain = newBrain(level, seeded(7));
      run(m, 90, (mm) => [NO_INPUT, cpuInput(mm, 1, brain, DT)]);
      expect(m.score[1]).toBeGreaterThan(m.score[0]);
    });
  }

  it('deux ordinateurs jouent un match entier sans sortir du terrain', () => {
    const m = newMatch(60);
    const brains = [newBrain('hard', seeded(1)), newBrain('normal', seeded(2))] as const;
    for (let t = 0; t < 200 && m.phase !== 'end'; t += DT) {
      run(m, DT, (mm) => [cpuInput(mm, 0, brains[0], DT), cpuInput(mm, 1, brains[1], DT)]);
      expect(Number.isFinite(m.ball.x) && Number.isFinite(m.ball.y)).toBe(true);
      expect(m.ball.y).toBeLessThanOrEqual(GROUND);
    }
    expect(m.phase).toBe('end');
  });
});

describe('rythme du jeu', () => {
  it('personne ne bouge avant le coup de sifflet', () => {
    const m = newMatch();
    const x = m.players[0].x;
    run(m, 0.8, () => [{ ...NO_INPUT, right: true, jump: true }, NO_INPUT]);
    expect(m.players[0].x).toBe(x);
    expect(m.players[0].y).toBe(GROUND);
  });

  it('après un but, le ballon reste dans les filets', () => {
    const m = playing(newMatch());
    Object.assign(m.ball, { x: GOAL_W / 2, y: GROUND - BALL_R, vx: -900, vy: -300 });
    run(m, 2);
    expect(m.phase).toBe('goal');
    expect(m.ball.x).toBeLessThan(GOAL_W);
  });

  it('deux ordinateurs de niveau normal marquent peu : moins de 10 buts par match', () => {
    let total = 0;
    for (const seed of [1, 2, 3]) {
      const m = newMatch(90);
      const brains = [newBrain('normal', seeded(seed)), newBrain('normal', seeded(seed + 50))] as const;
      for (let t = 0; t < 200 && m.phase !== 'end'; t += DT)
        run(m, DT, (mm) => [cpuInput(mm, 0, brains[0], DT), cpuInput(mm, 1, brains[1], DT)]);
      total += m.score[0] + m.score[1];
    }
    expect(total / 3).toBeLessThan(10);
  });
});
