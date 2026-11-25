/* Commandes du joueur de cet appareil : clavier, manette et écran tactile (src/input/touch.ts).
   Trois actions seulement : courir (gauche, droite), sauter, frapper du pied ou du poing.
   Les touches sont lues par leur position (event.code) : les mêmes marchent en AZERTY et en QWERTY. */
import { NO_INPUT, type Input } from '../engine/types';
import { touchInput } from './touch';

type Action = keyof Input;

const KEYS: Record<Action, readonly string[]> = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp', 'Space'],
  kick: ['KeyJ', 'KeyX'],
  punch: ['KeyK', 'KeyC'],
};

const held = new Set<string>();
const GAME_KEYS = new Set(Object.values(KEYS).flat());

export function listenKeyboard(onPause: () => void): void {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (!e.repeat) onPause();
      return;
    }
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement;
    if (GAME_KEYS.has(e.code) && !typing) e.preventDefault();
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
}

/** Première manette : stick ou croix pour courir, A saute, B ou X tire, Y ou RB donne un coup de poing. */
function gamepad(): Input {
  const pad = navigator.getGamepads?.().find((p) => p);
  if (!pad) return NO_INPUT;
  const b = (i: number) => !!pad.buttons[i]?.pressed;
  const ax = pad.axes[0] ?? 0;
  return {
    left: b(14) || ax < -0.4,
    right: b(15) || ax > 0.4,
    jump: b(0) || b(12),
    kick: b(1) || b(2),
    punch: b(3) || b(5),
  };
}

/** Commandes tenues en ce moment. */
export function readInput(): Input {
  const pad = gamepad();
  const touch = touchInput();
  const out = { ...NO_INPUT };
  for (const action of Object.keys(NO_INPUT) as Action[])
    out[action] = KEYS[action].some((c) => held.has(c)) || pad[action] || touch[action];
  return out;
}
