import { describe, expect, it } from 'vitest';
import { BALL_R, GROUND } from '../src/engine/constants';
import { newMatch } from '../src/engine/match';
import { NO_INPUT } from '../src/engine/types';
import { playing, press, run } from './harness';

describe('frappes', () => {
  it('un tir envoie le ballon en l’air vers la cage adverse', () => {
    const m = playing(newMatch());
    const [p] = m.players;
    Object.assign(m.ball, { x: p.x + 34, y: GROUND - BALL_R, vx: 0, vy: 0 });
    run(m, 0.1, () => [press({ kick: true }), NO_INPUT]);
    expect(m.ball.vx).toBeGreaterThan(300);
    expect(m.ball.vy).toBeLessThan(0);
  });

  it('le joueur de droite frappe vers la gauche', () => {
    const m = playing(newMatch());
    const p = m.players[1];
    Object.assign(m.ball, { x: p.x - 34, y: GROUND - BALL_R, vx: 0, vy: 0 });
    run(m, 0.1, () => [NO_INPUT, press({ kick: true })]);
    expect(m.ball.vx).toBeLessThan(-300);
  });

  it('un coup de poing sonne l’adversaire collé devant', () => {
    const m = playing(newMatch());
    const [a, b] = m.players;
    b.x = a.x + 50;
    run(m, 0.15, () => [press({ punch: true }), NO_INPUT]);
    expect(b.stun).toBeGreaterThan(0);
  });

  it('un joueur sonné ne peut ni courir ni frapper', () => {
    const m = playing(newMatch());
    const [a] = m.players;
    a.stun = 1;
    const x = a.x;
    run(m, 0.3, () => [press({ right: true, kick: true }), NO_INPUT]);
    expect(a.strike).toBeNull();
    expect(a.x).toBeLessThan(x + 20);
  });

  it('une tête renvoie le ballon vers le haut', () => {
    const m = playing(newMatch());
    const [p] = m.players;
    Object.assign(m.ball, { x: p.x + 4, y: GROUND - 200, vx: 0, vy: 0 });
    run(m, 0.25, () => [press({ jump: true }), NO_INPUT]);
    expect(m.ball.vy).toBeLessThan(0);
  });
});

describe('têtes', () => {
  it('une tête en plein saut ne part pas comme un tir', async () => {
    const { ballOnPlayer } = await import('../src/engine/contact');
    const m = playing(newMatch());
    const [p] = m.players;
    p.vy = -980;
    Object.assign(m.ball, { x: p.x + 10, y: p.y - 140 + 5, vx: 0, vy: 200 });
    ballOnPlayer(m.ball, p, []);
    expect(Math.hypot(m.ball.vx, m.ball.vy)).toBeLessThanOrEqual(621);
    expect(m.ball.vy).toBeLessThan(0);
  });
});
