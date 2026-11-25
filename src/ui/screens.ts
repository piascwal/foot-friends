/* Les écrans par-dessus le terrain : titre, choix des joueurs, pause, fin de match. */
import { ensureSprites, type Character } from '../assets/characters';
import { CPU_LEVELS, type CpuLevel } from '../engine/ai';
import { drawPortrait } from '../render/sprite-draw';
import { button, el, show } from './dom';

export interface Settings {
  level: CpuLevel;
  /** Durée d'un match (s). */
  time: number;
}

const LEVELS = Object.keys(CPU_LEVELS) as CpuLevel[];

/** Menu principal : le logo, deux boutons, le niveau de l'ordinateur. Rien à faire défiler. */
export function showTitle(
  settings: Settings,
  actions: { solo: () => void; lan: () => void },
  empty: boolean,
): void {
  const levels = el(
    'div',
    { className: 'chips' },
    LEVELS.map((level) => {
      const chip = button(
        CPU_LEVELS[level].label,
        () => {
          settings.level = level;
          levels.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === chip));
        },
        `chip${settings.level === level ? ' on' : ''}`,
      );
      return chip;
    }),
  );
  show([
    el('div', { className: 'logo' }, [
      el('span', { className: 'ball' }),
      el('h1', { className: 'title' }, ['FOOT', el('span', {}, ['FRIENDS'])]),
    ]),
    empty
      ? el('p', { className: 'warn' }, ['Aucun personnage : lance « npm run sprites ».'])
      : el('div', { className: 'row' }, [
          button('Jouer', actions.solo, 'btn big'),
          button('À deux · Wi-Fi', actions.lan, 'btn big pink'),
        ]),
    el('div', { className: 'level' }, [el('span', {}, ['Ordinateur']), levels]),
  ]);
}

/**
 * Choix des joueurs, l'un après l'autre : un titre par choix (solo : le sien puis l'adversaire ;
 * en réseau : le sien seulement).
 */
export async function showSelect(
  roster: Character[],
  headings: readonly string[],
  onDone: (picks: Character[]) => void,
  onBack: () => void,
): Promise<void> {
  await Promise.all(roster.map((c) => ensureSprites(c, ['portrait', 'idle'])));
  const picks: Character[] = [];
  const heading = el('h2');
  const grid = el('div', { className: 'grid' });
  const refresh = () => {
    heading.textContent = headings[picks.length] ?? '';
    heading.className = picks.length ? 'pick p2' : 'pick p1';
    grid.querySelectorAll('.card').forEach((card, i) => card.classList.toggle('p1', picks[0] === roster[i]));
  };
  const pick = (c: Character) => {
    picks.push(c);
    if (picks.length === headings.length) onDone(picks);
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

/** Écran d'attente (chargement, adversaire qui choisit…), avec un bouton pour abandonner. */
export function showWaiting(text: string, onCancel?: () => void): void {
  show([
    el('div', { className: 'spinner' }),
    el('h2', {}, [text]),
    ...(onCancel ? [button('Annuler', onCancel, 'btn small')] : []),
  ]);
}

export function showPause(text: string, actions: { resume: () => void; quit: () => void }): void {
  show(
    [
      el('h2', {}, [text]),
      el('div', { className: 'row' }, [
        button('Reprendre', actions.resume, 'btn big'),
        button('Quitter', actions.quit, 'btn pink'),
      ]),
    ],
    true,
  );
}

/** Fin de match. Sans `replay` (invité en réseau), on attend la décision de l'hôte. */
export function showEnd(
  title: string,
  score: string,
  actions: { replay?: () => void; change?: () => void; menu: () => void; waiting?: string },
): void {
  show(
    [
      el('p', { className: 'whistle' }, ['Coup de sifflet final']),
      el('h2', { className: 'winner' }, [title]),
      el('p', { className: 'score' }, [score]),
      ...(actions.waiting ? [el('p', { className: 'whistle' }, [actions.waiting])] : []),
      el('div', { className: 'row' }, [
        ...(actions.replay ? [button('Rejouer', actions.replay, 'btn big')] : []),
        ...(actions.change ? [button('Changer de joueur', actions.change, 'btn small cyan')] : []),
        button('Menu', actions.menu, 'btn small'),
      ]),
    ],
    true,
  );
}
