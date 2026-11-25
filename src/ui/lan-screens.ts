/* Écrans du jeu à deux sur le même Wi-Fi : son nom, créer une partie ou rejoindre celle d'un ami. */
import type { FoundGame, Lobby } from '../net/lobby';
import { button, el, show } from './dom';

const NAME_KEY = 'foot-friends-name';

/** Dernier nom saisi sur cet appareil (simple confort : rien n'est grave s'il se perd). */
export function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // stockage indisponible (navigation privée) : on redemandera le nom
  }
}

export function showLobby(
  lobby: Lobby,
  actions: { host: (name: string) => void; join: (game: FoundGame, name: string) => void; back: () => void },
): void {
  const input = el('input', {
    className: 'name',
    value: savedName(),
    placeholder: 'Ton nom',
    maxLength: 14,
    autocomplete: 'off',
  });
  const name = () => {
    const value = input.value.trim().toUpperCase() || 'JOUEUR';
    saveName(value);
    return value;
  };
  const list = el('div', { className: 'games' });
  const refresh = () => {
    list.replaceChildren(
      ...(lobby.games.length
        ? lobby.games.map((g) => button(`Rejoindre ${g.name}`, () => actions.join(g, name()), 'btn cyan'))
        : [el('p', { className: 'hint' }, ['Aucune partie pour l’instant sur ce Wi-Fi…'])]),
    );
  };
  lobby.onGames = refresh;
  refresh();
  show([
    el('h2', { className: 'pick p1' }, ['À deux sur le même Wi-Fi']),
    el('div', { className: 'row' }, [
      input,
      button('Créer une partie', () => actions.host(name()), 'btn big'),
    ]),
    list,
    button('Retour', actions.back, 'btn small'),
  ]);
}
