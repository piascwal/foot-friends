import { describe, expect, it } from 'vitest';
import { BALL_R, GROUND } from '../src/engine/constants';
import { newMatch } from '../src/engine/match';
import { NO_INPUT, type Input } from '../src/engine/types';
import { DT, playing, press, run } from './harness';

describe('frappes', () => {
  it('un tir envoie le ballon en l’air vers la cage adverse', () => {
    const m = playing(newMatch());
    const [p] = m.players;
    Object.assign(m.ball, { x: p.x + 34, y: GROUND - BALL_R, vx: 0, vy: 0 });
    run(m, 0.1, () => [press({ kick: true }), NO_INPUT]);
    expect(m.ball.vx).toBeGreaterThan(300);
    expect(m.ball.vy).toBeLessThan(0);
    expect(p.power).toBeGreaterThan(0);
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

  it('le super tir demande une jauge pleine, la vide, et part en ballon de feu', () => {
    const m = playing(newMatch());
    const [p] = m.players;
    const place = () => Object.assign(m.ball, { x: p.x + 36, y: GROUND - 48, vx: 0, vy: 0 });
    place();
    run(m, 0.3, () => [press({ super: true }), NO_INPUT]);
    expect(m.ball.fire).toBe(0);
    run(m, 0.05);
    p.power = 1;
    place();
    run(m, 0.3, () => [press({ super: true }), NO_INPUT]);
    expect(p.power).toBe(0);
    expect(m.ball.vx).toBeGreaterThan(900);
    expect(m.ball.fireBy).toBe(0);
  });

  it('le ballon de feu renverse l’adversaire qu’il percute', () => {
    const m = playing(newMatch());
    const b = m.players[1];
    Object.assign(m.ball, { x: b.x - 80, y: GROUND - 60, vx: 1100, vy: 0, fire: 1, fireBy: 0 });
    run(m, 0.1);
    expect(b.stun).toBeGreaterThan(0);
    expect(m.ball.x).toBeGreaterThan(b.x);
  });

  it('une tête renvoie le ballon vers le haut', () => {
    const m = playing(newMatch());
    const [p] = m.players;
    Object.assign(m.ball, { x: p.x + 4, y: GROUND - 200, vx: 0, vy: 0 });
    run(m, 0.25, () => [press({ jump: true }), NO_INPUT]);
    expect(m.ball.vy).toBeLessThan(0);
  });
});

describe('frappes puissantes', () => {
  it('la frappe puissante du pied part plus vite que le tir', () => {
    const shot = (keys: Partial<Input>) => {
      const m = playing(newMatch());
      const [p] = m.players;
      Object.assign(m.ball, { x: p.x + 36, y: GROUND - BALL_R - 10, vx: 0, vy: 0 });
      run(m, 0.3, () => [press(keys), NO_INPUT]);
      return Math.hypot(m.ball.vx, m.ball.vy);
    };
    expect(shot({ kickHeavy: true })).toBeGreaterThan(shot({ kick: true }) * 1.2);
  });

  it('le coup de poing puissant sonne plus longtemps que le léger', () => {
    const stun = (keys: Partial<Input>) => {
      const m = playing(newMatch());
      const [a, b] = m.players;
      b.x = a.x + 50;
      let longest = 0;
      for (let i = 0; i < 40; i++) {
        run(m, DT, () => [press(keys), NO_INPUT]);
        longest = Math.max(longest, b.stun);
      }
      return longest;
    };
    expect(stun({ punchHeavy: true })).toBeGreaterThan(stun({ punch: true }));
  });

  it('une frappe puissante charge aussi la jauge de super tir', () => {
    const m = playing(newMatch());
    const [p] = m.players;
    Object.assign(m.ball, { x: p.x + 36, y: GROUND - BALL_R - 10, vx: 0, vy: 0 });
    run(m, 0.3, () => [press({ kickHeavy: true }), NO_INPUT]);
    expect(p.power).toBeGreaterThan(0);
  });
});
