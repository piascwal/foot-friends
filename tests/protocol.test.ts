/* Ce qui passe entre les deux appareils : aller-retour fidèle, et rien d'invalide n'est accepté. */
import { describe, expect, it } from 'vitest';
import { newMatch } from '../src/engine/match';
import { NO_INPUT } from '../src/engine/types';
import { decodeInput, decodeState, encodeInput, encodeState, readMsg } from '../src/net/protocol';
import { playing, press, run } from './harness';

describe('protocole réseau', () => {
  it('les commandes de l’invité tiennent dans un octet et reviennent à l’identique', () => {
    const input = { ...NO_INPUT, right: true, jump: true, punch: true };
    expect(encodeInput(input).byteLength).toBe(1);
    expect(decodeInput(encodeInput(input))).toEqual(input);
    expect(decodeInput(new ArrayBuffer(3))).toBeNull();
  });

  it('l’état du match arrive chez l’invité tel que l’hôte le voit', () => {
    const m = playing(newMatch());
    run(m, 0.2, () => [press({ right: true, kick: true }), NO_INPUT]);
    m.score = [2, 1];
    const got = decodeState(encodeState(m, [{ type: 'goal', side: 1 }]))!;
    expect(got.match.score).toEqual([2, 1]);
    expect(got.match.phase).toBe(m.phase);
    expect(got.match.ball.x).toBeCloseTo(m.ball.x);
    expect(got.match.players[0].x).toBeCloseTo(m.players[0].x);
    expect(got.match.players[0].strike?.kind).toBe(m.players[0].strike?.kind);
    expect(got.events).toEqual([{ type: 'goal', side: 1 }]);
  });

  it('un paquet d’état invalide est ignoré', () => {
    const bad = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).buffer as ArrayBuffer;
    expect(decodeState(bad({ hack: true }))).toBeNull();
    expect(decodeState(bad([9, 0, 0, 0, 0, 0, 0, 0, [0, 0, 0, 0, 0], [], [], []]))).toBeNull();
    expect(decodeState(new TextEncoder().encode('pas du json').buffer as ArrayBuffer)).toBeNull();
  });

  it('les messages de contrôle sont vérifiés champ par champ', () => {
    expect(readMsg({ t: 'pick', id: 'mat' })).toEqual({ t: 'pick', id: 'mat' });
    expect(readMsg({ t: 'pick', id: '../etc' })).toBeNull();
    expect(readMsg({ t: 'start', p: ['mat', 'lolo'], time: 90 })).toEqual({
      t: 'start',
      p: ['mat', 'lolo'],
      time: 90,
    });
    expect(readMsg({ t: 'start', p: ['mat'], time: 90 })).toBeNull();
    expect(readMsg({ t: 'hello', v: 1, name: 'x'.repeat(40) })).toBeNull();
    expect(readMsg({ t: 'inconnu' })).toBeNull();
  });
});
