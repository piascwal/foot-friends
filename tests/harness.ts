/* Outils de test : faire tourner un match image par image. */
import { stepMatch } from '../src/engine/match';
import { NO_INPUT, type GameEvent, type Input, type Match } from '../src/engine/types';

export const DT = 1 / 120;

/** Avance le match de `seconds`, avec des commandes fixes ou calculées à chaque image. */
export function run(
  m: Match,
  seconds: number,
  inputs: (m: Match) => [Input, Input] = () => [NO_INPUT, NO_INPUT],
): GameEvent[] {
  const events: GameEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    stepMatch(m, inputs(m), DT);
    events.push(...m.events);
  }
  return events;
}

export const press = (keys: Partial<Input>): Input => ({ ...NO_INPUT, ...keys });

/** Match prêt à jouer (coup d'envoi passé). */
export function playing(m: Match): Match {
  run(m, 1.2);
  return m;
}
