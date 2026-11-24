/* Les écrans par-dessus le terrain : titre, choix des personnages, pause, fin de match. */
import { ensureSprites, type Character } from '../assets/characters';
import { unlockAudio } from '../audio/sfx';
import { CPU_LEVELS, type CpuLevel } from '../engine/ai';
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

function show(...children: Node[]): void {
  ui().replaceChildren(el('div', { className: 'screen' }, children));
}

const CONTROLS = `
  <div class="controls">
    <div><b>Joueur 1</b><br>Q / D : courir · Z : sauter<br>F : tir · G : poing · H : super tir</div>
    <div><b>Joueur 2</b><br>← / → : courir · ↑ : sauter<br>K : tir · L : poing · M : super tir</div>
  </div>
  <p class="hint">Seul contre l'ordinateur : les deux jeux de touches marchent. Manettes et écran tactile aussi.</p>`;

export function showTitle(settings: Settings, onPlay: () => void, empty: boolean): void {
  const level = button(
    `Niveau : ${CPU_LEVELS[settings.level].label}`,
    () => {
      settings.level = LEVELS[(LEVELS.indexOf(settings.level) + 1) % LEVELS.length]!;
      level.textContent = `Niveau : ${CPU_LEVELS[settings.level].label}`;
    },
    'btn small',
  );
  const time = button(
    `Durée : ${settings.time} s`,
    () => {
      settings.time = TIMES[(TIMES.indexOf(settings.time) + 1) % TIMES.length]!;
      time.textContent = `Durée : ${settings.time} s`;
    },
    'btn small',
  );
  const help = el('div');
  help.innerHTML = CONTROLS;
  const start = (solo: boolean) => () => {
    settings.solo = solo;
    onPlay();
  };
  show(
    el('h1', { className: 'title' }, ['FOOT', el('br'), el('span', {}, ['FRIENDS'])]),
    el('p', { className: 'tagline' }, ['Un contre un, deux cages : tirs, têtes et coups de poing.']),
    empty
      ? el('p', { className: 'warn' }, [
          'Aucun personnage : lance « npm run sprites » pour copier ceux de la banque.',
        ])
      : el('div', { className: 'row' }, [button('1 joueur', start(true)), button('2 joueurs', start(false))]),
    el('div', { className: 'row' }, [level, time]),
    help,
  );
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
    heading.textContent = `${who} : choisis ton personnage`;
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
    ctx.fillStyle = '#1b1f4b';
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
  show(
    heading,
    grid,
    el('div', { className: 'row' }, [
      button('Au hasard', random, 'btn small'),
      button('Retour', onBack, 'btn small'),
    ]),
  );
  refresh();
}

export function showLoading(): void {
  show(el('h2', {}, ['Chargement…']));
}

export function showPause(onResume: () => void, onQuit: () => void): void {
  show(
    el('h2', {}, ['Pause']),
    el('div', { className: 'row' }, [button('Reprendre', onResume), button('Quitter', onQuit)]),
  );
}

export function showEnd(
  title: string,
  score: string,
  actions: { replay: () => void; change: () => void; menu: () => void },
): void {
  show(
    el('h2', { className: 'winner' }, [title]),
    el('p', { className: 'score' }, [score]),
    el('div', { className: 'row' }, [
      button('Rejouer', actions.replay),
      button('Changer de perso', actions.change, 'btn small'),
      button('Menu', actions.menu, 'btn small'),
    ]),
  );
}
