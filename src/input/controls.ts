/* Commandes des joueurs : clavier (deux joueurs sur le même clavier), manettes, boutons tactiles.
   Les touches sont lues par leur position (event.code) : Z/Q/D sur un clavier AZERTY = W/A/D en QWERTY. */
import { NO_INPUT, type Input } from '../engine/types';

type Action = keyof Input;

/** Touches de chaque joueur (codes physiques). */
export const KEYMAP: [Record<Action, string[]>, Record<Action, string[]>] = [
  {
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['KeyW'],
    kick: ['KeyF'],
    punch: ['KeyG'],
    super: ['KeyH'],
  },
  {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    jump: ['ArrowUp'],
    kick: ['KeyK', 'Numpad1'],
    punch: ['KeyL', 'Numpad2'],
    super: ['Semicolon', 'Numpad3'],
  },
];

const held = new Set<string>();
/** Boutons tactiles tenus (joueur 1). */
const touchHeld = new Set<Action>();

const GAME_KEYS = new Set(KEYMAP.flatMap((map) => Object.values(map).flat()));

export function listenKeyboard(onPause: () => void): void {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (!e.repeat) onPause();
      return;
    }
    if (GAME_KEYS.has(e.code) || e.code === 'Space') e.preventDefault();
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
}

/** Boutons tactiles : chaque élément [data-action] tient une commande du joueur 1. */
export function listenTouch(root: HTMLElement): void {
  const update = (e: TouchEvent) => {
    e.preventDefault();
    touchHeld.clear();
    for (const t of Array.from(e.touches)) {
      const el = document.elementFromPoint(t.clientX, t.clientY)?.closest<HTMLElement>('[data-action]');
      const action = el?.dataset.action as Action | undefined;
      if (action) touchHeld.add(action);
    }
    root.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
      el.classList.toggle('on', touchHeld.has(el.dataset.action as Action));
    });
  };
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const)
    root.addEventListener(type, update, { passive: false });
}

/** Manette n° `index` : croix ou stick, A saute, X tire, B poing, Y ou gâchette super. */
function gamepad(index: number): Input {
  const pad = navigator.getGamepads?.()[index];
  if (!pad) return NO_INPUT;
  const b = (i: number) => !!pad.buttons[i]?.pressed;
  const axis = pad.axes[0] ?? 0;
  return {
    left: b(14) || axis < -0.4,
    right: b(15) || axis > 0.4,
    jump: b(0) || b(12),
    kick: b(2),
    punch: b(1),
    super: b(3) || b(7) || b(5),
  };
}

const any = (codes: string[]) => codes.some((c) => held.has(c));

/**
 * Commandes d'un joueur. Seul contre l'ordinateur, le joueur 1 peut aussi utiliser les touches du
 * joueur 2 (flèches…), une manette ou les boutons tactiles.
 */
export function readInput(side: 0 | 1, solo: boolean): Input {
  const maps = solo ? KEYMAP : [KEYMAP[side]];
  const pad = gamepad(solo ? 0 : side);
  const out = { ...NO_INPUT };
  for (const action of Object.keys(NO_INPUT) as Action[]) {
    out[action] =
      maps.some((map) => any(map[action])) ||
      pad[action] ||
      (side === 0 && touchHeld.has(action)) ||
      (solo && action === 'jump' && held.has('Space'));
  }
  return out;
}
