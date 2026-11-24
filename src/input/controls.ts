/* Commandes des joueurs : clavier, manettes et commandes tactiles (src/input/touch.ts).
   Les touches sont lues par leur position (event.code) : les mêmes marchent en AZERTY et en QWERTY.
   Disposition reprise de Fighting Friends : poings sur la rangée du haut, pieds sur celle du bas. */
import { NO_INPUT, type Input } from '../engine/types';
import { touchInput } from './touch';

type Action = keyof Input;
type KeyMap = Record<Action, readonly string[]>;

/** Un seul joueur : ZQSD ou flèches, coups sur U I J K, super tir sur L ou Espace. */
const SOLO: KeyMap = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp'],
  punch: ['KeyU'],
  punchHeavy: ['KeyI'],
  kick: ['KeyJ'],
  kickHeavy: ['KeyK'],
  super: ['KeyL', 'Space'],
};

/** Deux joueurs sur le même clavier. */
const DUO: readonly [KeyMap, KeyMap] = [
  {
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['KeyW'],
    punch: ['KeyF'],
    punchHeavy: ['KeyG'],
    kick: ['KeyV'],
    kickHeavy: ['KeyB'],
    super: ['KeyH'],
  },
  {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    jump: ['ArrowUp'],
    punch: ['KeyO', 'Numpad4'],
    punchHeavy: ['KeyP', 'Numpad5'],
    kick: ['KeyL', 'Numpad1'],
    kickHeavy: ['Semicolon', 'Numpad2'],
    super: ['Quote', 'Numpad3'],
  },
];

const held = new Set<string>();
const GAME_KEYS = new Set([SOLO, ...DUO].flatMap((map) => Object.values(map).flat()));

export function listenKeyboard(onPause: () => void): void {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (!e.repeat) onPause();
      return;
    }
    if (GAME_KEYS.has(e.code) && !(e.target instanceof HTMLButtonElement)) e.preventDefault();
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
}

/**
 * Manette n° `index`, boutons en losange comme l'écran tactile : X poing, Y POING, A pied, B PIED ;
 * stick ou croix pour courir, haut ou LB pour sauter, RB ou gâchette pour le super tir.
 */
function gamepad(index: number): Input {
  const pad = navigator.getGamepads?.()[index];
  if (!pad) return NO_INPUT;
  const b = (i: number) => !!pad.buttons[i]?.pressed;
  const [ax = 0, ay = 0] = pad.axes;
  return {
    left: b(14) || ax < -0.4,
    right: b(15) || ax > 0.4,
    jump: b(12) || b(4) || ay < -0.6,
    kick: b(0),
    kickHeavy: b(1),
    punch: b(2),
    punchHeavy: b(3),
    super: b(5) || b(7),
  };
}

const any = (codes: readonly string[]) => codes.some((c) => held.has(c));

/** Commandes d'un joueur. Seul contre l'ordinateur, le joueur 1 a aussi l'écran tactile. */
export function readInput(side: 0 | 1, solo: boolean): Input {
  const map = solo ? SOLO : DUO[side];
  const pad = gamepad(solo ? 0 : side);
  const touch = side === 0 ? touchInput() : NO_INPUT;
  const out = { ...NO_INPUT };
  for (const action of Object.keys(NO_INPUT) as Action[]) {
    out[action] = any(map[action]) || pad[action] || touch[action];
  }
  return out;
}

/** Libellés des touches pour l'écran titre. */
export const KEY_HELP = {
  solo: 'ZQSD ou flèches · U/I poing/POING · J/K pied/PIED · L ou Espace super tir',
  p1: 'ZQD · F/G poing/POING · V/B pied/PIED · H super',
  p2: 'Flèches · O/P poing/POING · L/M pied/PIED · Ù super',
};
