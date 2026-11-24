import { describe, expect, it } from 'vitest';
import { goalLine, newBall, stepBall } from '../src/engine/ball';
import { BALL_R, GOAL_TOP, GOAL_W, GROUND, W } from '../src/engine/constants';
import type { GameEvent } from '../src/engine/types';

const fly = (ball: ReturnType<typeof newBall>, seconds: number) => {
  const events: GameEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 120) stepBall(ball, 1 / 120, events);
  return events;
};

describe('ballon', () => {
  it('tombe, rebondit de moins en moins haut, puis reste au sol', () => {
    const ball = newBall(W / 2, 100);
    const events = fly(ball, 6);
    expect(events.filter((e) => e.type === 'bounce').length).toBeGreaterThan(2);
    expect(ball.y).toBeCloseTo(GROUND - BALL_R, 0);
    expect(Math.abs(ball.vy)).toBeLessThan(1);
  });

  it('rebondit sur la barre transversale au lieu d’entrer dans la cage par le haut', () => {
    const ball = newBall(GOAL_W / 2, GOAL_TOP - 120);
    fly(ball, 0.35);
    expect(ball.y).toBeLessThan(GOAL_TOP - BALL_R);
    expect(goalLine(ball)).toBeNull();
  });

  it('but quand le ballon est entièrement entré sous la barre', () => {
    expect(goalLine({ ...newBall(GOAL_W - BALL_R - 1, GROUND - BALL_R) })).toBe(0);
    expect(goalLine({ ...newBall(W - GOAL_W + BALL_R + 1, GROUND - BALL_R) })).toBe(1);
    expect(goalLine({ ...newBall(GOAL_W, GROUND - BALL_R) })).toBeNull();
  });

  it('rebondit sur les murs', () => {
    const ball = newBall(W - 40, GROUND - BALL_R);
    ball.vx = 600;
    fly(ball, 0.2);
    expect(ball.vx).toBeLessThan(0);
  });
});
