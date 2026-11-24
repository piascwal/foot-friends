/* Les écrans par-dessus le terrain : titre, choix des personnages, pause, fin de match. */
import { ensureSprites, type Character } from '../assets/characters';
import { unlockAudio } from '../audio/sfx';
import { CPU_LEVELS, type CpuLevel } from '../engine/ai';
import { KEY_HELP } from '../input/controls';
import { drawPortrait } from '../render/sprite-draw';

export interface Settings {
  solo: boolean;
  level: CpuLevel;
  /** Durée d'un match (s). */
  time: number;
}

const TIMES = [60, 90, 120];
const LEVELS = Object.keys(CPU_LEVELS) as CpuLevel[];

const ui = () => document.getElementById('ui')!;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function button(label: string, onClick: () => void, className = 'btn'): HTMLButtonElement {
  return el('button', {
    className,
    textContent: label,
    onclick: () => {
      unlockAudio();
      onClick();
    },
  });
}

export function hideScreens(): void {
  ui().replaceChildren();
}

/** Écran plein (fond de pelouse) ou par-dessus le match (pause, fin). */
function show(children: Node[], overlay = false): void {
  ui().replaceChildren(el('div', { className: overlay ? 'screen overlay' : 'screen pitch' }, children));
}

function controls(): HTMLElement {
  const line = (who: string, keys: string) => el('div', {}, [el('b', {}, [who]), el('span', {}, [keys])]);
  return el('div', { className: 'controls' }, [
    line('Seul', KEY_HELP.solo),
    line('Joueur 1', KEY_HELP.p1),
    line('Joueur 2', KEY_HELP.p2),
    el('p', { className: 'hint' }, [
      'Manettes : stick, A/B pied/PIED, X/Y poing/POING, RB super. Tactile : joystick (haut = saut) et boutons en losange.',
    ]),
  ]);
}

export function showTitle(settings: Settings, onPlay: () => void, empty: boolean): void {
  const level = button(
    `Niveau : ${CPU_LEVELS[settings.level].label}`,
    () => {
      settings.level = LEVELS[(LEVELS.indexOf(settings.level) + 1) % LEVELS.length]!;
      level.textContent = `Niveau : ${CPU_LEVELS[settings.level].label}`;
    },
    'btn small cyan',
  );
  const time = button(
    `Durée : ${settings.time} s`,
    () => {
      settings.time = TIMES[(TIMES.indexOf(settings.time) + 1) % TIMES.length]!;
      time.textContent = `Durée : ${settings.time} s`;
    },
    'btn small cyan',
  );
  const start = (solo: boolean) => () => {
    settings.solo = solo;
    onPlay();
  };
  show([
    el('div', { className: 'logo' }, [
      el('span', { className: 'ball' }),
      el('h1', { className: 'title' }, ['FOOT', el('span', {}, ['FRIENDS'])]),
    ]),
    el('p', { className: 'tagline' }, ['1 contre 1 · tirs, têtes, volées… et coups de poing !']),
    empty
      ? el('p', { className: 'warn' }, [
          'Aucun personnage : lance « npm run sprites » pour copier ceux de la banque.',
        ])
      : el('div', { className: 'row' }, [
          button('1 joueur', start(true), 'btn big'),
          button('2 joueurs', start(false), 'btn big pink'),
        ]),
    el('div', { className: 'row' }, [level, time]),
    controls(),
  ]);
}

/** Choix des deux personnages, l'un après l'autre. */
export async function showSelect(
  roster: Character[],
  settings: Settings,
  onDone: (chars: [Character, Character]) => void,
  onBack: () => void,
): Promise<void> {
  await Promise.all(roster.map((c) => ensureSprites(c, ['portrait', 'idle'])));
  const picks: Character[] = [];
  const heading = el('h2');
  const grid = el('div', { className: 'grid' });
  const refresh = () => {
    const who = picks.length === 0 ? 'Joueur 1' : settings.solo ? "L'ordinateur" : 'Joueur 2';
    heading.textContent =
      picks.length && settings.solo ? `Choisis l'adversaire` : `${who} : choisis ton joueur`;
    heading.className = picks.length ? 'pick p2' : 'pick p1';
    grid.querySelectorAll('.card').forEach((card, i) => {
      card.classList.toggle('p1', picks[0] === roster[i]);
    });
  };
  const pick = (c: Character) => {
    picks.push(c);
    if (picks.length === 2) onDone([picks[0]!, picks[1]!]);
    else refresh();
  };
  for (const c of roster) {
    const canvas = el('canvas', { width: 96, height: 96 });
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 96, 96);
    drawPortrait(ctx, c, 0, 0, 96);
    const card = button('', () => pick(c), 'card');
    card.style.setProperty('--c', c.color);
    card.append(canvas, el('span', {}, [c.name]));
    grid.append(card);
  }
  const random = () => {
    const others = roster.filter((c) => c !== picks[0]);
    pick(others[Math.floor(Math.random() * others.length)] ?? roster[0]!);
  };
  show([
    heading,
    grid,
    el('div', { className: 'row' }, [
      button('Au hasard', random, 'btn small cyan'),
      button('Retour', onBack, 'btn small'),
    ]),
  ]);
  refresh();
}

export function showLoading(): void {
  show([el('h2', {}, ['Entrée des joueurs…'])]);
}

export function showPause(onResume: () => void, onQuit: () => void): void {
  show(
    [
      el('h2', {}, ['Pause']),
      el('div', { className: 'row' }, [
        button('Reprendre', onResume, 'btn big'),
        button('Quitter', onQuit, 'btn pink'),
      ]),
    ],
    true,
  );
}

export function showEnd(
  title: string,
  score: string,
  actions: { replay: () => void; change: () => void; menu: () => void },
): void {
  show(
    [
      el('p', { className: 'whistle' }, ['Coup de sifflet final']),
      el('h2', { className: 'winner' }, [title]),
      el('p', { className: 'score' }, [score]),
      el('div', { className: 'row' }, [
        button('Rejouer', actions.replay, 'btn big'),
        button('Changer de joueur', actions.change, 'btn small cyan'),
        button('Menu', actions.menu, 'btn small'),
      ]),
    ],
    true,
  );
}
