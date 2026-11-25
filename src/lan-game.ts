/* Déroulé d'une partie à deux sur le même Wi-Fi : trouver l'autre (lan-kit), choisir chacun son
   joueur, jouer, rejouer. L'hôte (celui qui a créé la partie) fait tourner le match et décide de la
   suite ; l'invité suit (voir main.ts pour le match lui-même). */
import type { Character } from './assets/characters';
import type { Link } from './net/link';
import { openLobby, type FoundGame, type Lobby } from './net/lobby';
import { PROTOCOL, readMsg } from './net/protocol';
import { hideScreens, toast } from './ui/dom';
import { showLobby } from './ui/lan-screens';
import { showSelect, showWaiting } from './ui/screens';

/** Ce que la partie en réseau demande au jeu (fourni par main.ts). */
export interface LanContext {
  roster(): Character[];
  time(): number;
  start(picked: [Character, Character], session: NetSession): void;
  stop(): void;
  title(): void;
  fullscreen(): void;
}

/** Partie en réseau, vue du match. */
export interface NetSession {
  role: 'host' | 'guest';
  link: Link;
  /** Noms [hôte, invité]. */
  names: [string, string];
  /** Hôte, en fin de match : rejouer avec les mêmes joueurs, ou revenir au choix des joueurs. */
  replay(): void;
  reselect(): void;
  /** Quitte la partie (prévient l'autre). */
  quit(): void;
}

/** Partie en cours, s'il y en a une : la quitter ferme la liaison. */
let current: { quit(): void } | null = null;

/** Ferme la recherche ou la partie en réseau en cours (retour au menu). */
export function closeLan(): void {
  const c = current;
  current = null;
  c?.quit();
}

export async function openLan(ctx: LanContext): Promise<void> {
  ctx.fullscreen();
  showWaiting('Recherche sur le Wi-Fi…', ctx.title);
  let lobby: Lobby;
  try {
    lobby = await openLobby();
  } catch {
    toast('Réseau indisponible : vérifie le Wi-Fi.');
    ctx.title();
    return;
  }
  current = { quit: () => lobby.close() };
  const back = () => {
    closeLan();
    ctx.title();
  };
  const lobbyScreen = () =>
    showLobby(lobby, {
      host: (name) => {
        showWaiting('En attente d’un adversaire…', () => {
          lobby.close();
          void openLan(ctx);
        });
        lobby.host(name, (link) => connected(ctx, link, 'host', name));
      },
      join: (game: FoundGame, name) => {
        showWaiting(`Connexion à ${game.name}…`);
        lobby
          .join(game, name)
          .then((link) => {
            lobby.close();
            connected(ctx, link, 'guest', name);
          })
          .catch(() => {
            toast('Impossible de rejoindre cette partie.');
            lobbyScreen();
          });
      },
      back,
    });
  lobbyScreen();
}

/** Les deux appareils sont reliés : présentations, choix des joueurs, matchs. */
function connected(ctx: LanContext, link: Link, role: 'host' | 'guest', myName: string): void {
  let theirName = '…';
  let mine: string | null = null;
  let theirs: string | null = null;
  /** Qui a mis fin à la partie : moi, l'autre, ou personne (liaison perdue). */
  let ended: 'me' | 'them' | null = null;
  const byId = (id: string) => ctx.roster().find((c) => c.id === id);
  const hello = { t: 'hello', v: PROTOCOL, name: myName.slice(0, 14) };

  const quit = () => {
    ended = 'me';
    link.sendCtrl({ t: 'bye' });
    link.close();
  };
  current = { quit };

  const names = (): [string, string] => (role === 'host' ? [myName, theirName] : [theirName, myName]);
  const session = (): NetSession => ({
    role,
    link,
    names: names(),
    replay: () => launch(),
    reselect: () => {
      link.sendCtrl({ t: 'reselect' });
      select();
    },
    quit,
  });

  /** L'hôte lance le match dès que les deux ont choisi (personnages inconnus ici : retour au choix). */
  const launch = () => {
    if (role !== 'host' || !mine || !theirs) return;
    const a = byId(mine);
    const b = byId(theirs);
    if (!a || !b) return select();
    link.sendCtrl({ t: 'start', p: [a.id, b.id], time: ctx.time() });
    ctx.start([a, b], session());
  };

  const select = () => {
    ctx.stop();
    mine = theirs = null;
    void showSelect(
      ctx.roster(),
      ['Choisis ton joueur'],
      ([c]) => {
        mine = c!.id;
        link.sendCtrl({ t: 'pick', id: mine });
        showWaiting(`${theirName} choisit son joueur…`);
        launch();
      },
      () => {
        closeLan();
        ctx.title();
      },
    );
  };

  link.onCtrl = (raw) => {
    const msg = readMsg(raw);
    if (!msg) return;
    if (msg.t === 'hello') {
      if (msg.v !== PROTOCOL) {
        toast('L’autre appareil n’a pas la même version du jeu : rechargez la page.');
        quit();
        return;
      }
      // première présentation reçue : on répond, au cas où la nôtre serait partie trop tôt
      if (theirName === '…') link.sendCtrl(hello);
      theirName = msg.name;
    } else if (msg.t === 'pick') {
      theirs = msg.id;
      launch();
    } else if (msg.t === 'start' && role === 'guest') {
      const a = byId(msg.p[0]);
      const b = byId(msg.p[1]);
      if (a && b) {
        hideScreens();
        ctx.start([a, b], session());
      }
    } else if (msg.t === 'reselect') select();
    else if (msg.t === 'bye') {
      ended = 'them';
      link.close();
    }
  };
  link.onClose = () => {
    if (current?.quit === quit) current = null;
    if (ended === 'me') return;
    toast(ended === 'them' ? `${theirName} a quitté la partie.` : `Liaison perdue avec ${theirName}.`);
    ctx.title();
  };
  link.sendCtrl(hello);
  select();
}
