/* Assemblage du jeu : personnages de la banque, écrans, boucle de jeu à pas fixe.
   Trois façons de jouer un match :
   - solo : contre l'ordinateur, simulé ici ;
   - hôte (réseau) : simulé ici, avec les commandes reçues de l'invité ; l'état part chez l'invité ;
   - invité (réseau) : on envoie ses commandes et on affiche l'état reçu de l'hôte (voir lan-game.ts). */
import { loadBackground, type Background } from './assets/background';
import { ensureSprites, loadRoster, type Character } from './assets/characters';
import { playEvents } from './audio/sfx';
import { cpuInput, newBrain, type CpuBrain } from './engine/ai';
import { H, W } from './engine/constants';
import { newMatch, stepMatch } from './engine/match';
import { NO_INPUT, type GameEvent, type Input, type Match } from './engine/types';
import { listenKeyboard, readInput } from './input/controls';
import { initTouch, layoutTouch, resetTouch } from './input/touch';
import { closeLan, openLan, type LanContext, type NetSession } from './lan-game';
import { decodeInput, decodeState, encodeInput, encodeState } from './net/protocol';
import { Effects } from './render/effects';
import { drawScene } from './render/scene';
import { hideScreens } from './ui/dom';
import { enterFullscreen } from './ui/fullscreen';
import { showEnd, showPause, showSelect, showTitle, showWaiting, type Settings } from './ui/screens';
import './style.css';

const STEP = 1 / 120;
const canvas = document.getElementById('cv') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const settings: Settings = { level: 'normal', time: 90 };
let roster: Character[] = [];
let background: Background | null = null;
let chars: [Character, Character] | null = null;
let match: Match | null = null;
let brain: CpuBrain | null = null;
/** Partie en réseau en cours (null : solo). */
let net: NetSession | null = null;
/** Commandes de l'invité, reçues par l'hôte. */
let remoteInput: Input = NO_INPUT;
/** Événements du match pas encore envoyés à l'invité. */
let unsent: GameEvent[] = [];
let fx = new Effects();
let paused = false;
let endShown = false;

/**
 * Le canvas remplit tout l'écran. Le terrain (960 × 540) y tient en entier, à la plus grande échelle
 * possible ; le reste de l'écran montre le stade qui continue (voir drawBackdrop).
 */
function resize(): { scale: number; ox: number; oy: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  const scale = Math.min(canvas.width / W, canvas.height / H);
  // écran plus haut que le terrain (tablette) : un peu de ciel au-dessus, plus de pelouse en dessous
  const oy = (canvas.height - H * scale) * 0.35;
  return { scale, ox: (canvas.width - W * scale) / 2, oy };
}

/** Noms affichés au-dessus des joueurs. */
function labels(): [string, string] {
  if (!net) return ['MOI', 'CPU'];
  return net.role === 'host' ? ['MOI', net.names[1]] : [net.names[0], 'MOI'];
}

function render(): void {
  const { scale, ox, oy } = resize();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1aa7ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!match || !chars) return;
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  const view = {
    x0: -ox / scale,
    x1: (canvas.width - ox) / scale,
    y0: -oy / scale,
    y1: (canvas.height - oy) / scale,
  };
  drawScene(ctx, match, fx, { chars, labels: labels(), view, background });
}

function stopMatch(): void {
  match = null;
  paused = false;
  document.body.classList.remove('playing');
  resetTouch();
}

function title(): void {
  stopMatch();
  net = null;
  closeLan();
  showTitle(settings, { solo: soloSelect, lan: () => void openLan(lanContext) }, roster.length === 0);
}

/** Sur téléphone, le jeu passe en plein écran dès qu'on choisit un mode (il faut un geste du joueur). */
function goFullscreen(): void {
  if (matchMedia('(pointer: coarse)').matches) void enterFullscreen();
}

function soloSelect(): void {
  goFullscreen();
  stopMatch();
  void showSelect(
    roster,
    ['Choisis ton joueur', "Choisis l'adversaire"],
    (p) => void start([p[0]!, p[1]!]),
    title,
  );
}

/** Lance un match ; `session` : partie en réseau (sinon, contre l'ordinateur). */
async function start(picked: [Character, Character], session: NetSession | null = null): Promise<void> {
  showWaiting('Entrée des joueurs…');
  await Promise.all(picked.map((c) => ensureSprites(c)));
  chars = picked;
  net = session;
  match = newMatch(settings.time);
  brain = session ? null : newBrain(settings.level);
  remoteInput = NO_INPUT;
  unsent = [];
  fx = new Effects();
  paused = false;
  endShown = false;
  if (session) listenNet(session);
  document.body.classList.add('playing');
  layoutTouch();
  hideScreens();
}

/** Canal de jeu : l'hôte reçoit les commandes, l'invité reçoit l'état du match. */
function listenNet(session: NetSession): void {
  session.link.onGame = (data) => {
    if (session.role === 'host') {
      remoteInput = decodeInput(data) ?? remoteInput;
      return;
    }
    const state = decodeState(data);
    if (!state || !match) return;
    match = state.match;
    fx.onEvents(state.events);
    playEvents(state.events);
  };
}

function togglePause(): void {
  if (!match || match.phase === 'end') return;
  // en réseau, le match continue : on propose seulement de quitter
  paused = !paused;
  resetTouch();
  if (!paused) hideScreens();
  else
    showPause(net ? 'Quitter le match ?' : 'Pause', {
      resume: togglePause,
      quit: title,
    });
}

function endScreen(m: Match, c: [Character, Character]): void {
  const [a, b] = m.score;
  const winner = a === b ? null : a > b ? 0 : 1;
  const mine = net?.role === 'guest' ? 1 : 0;
  const text = winner === null ? 'Match nul' : winner === mine ? 'Victoire !' : 'Défaite…';
  const score = `${c[0].name} ${a} - ${b} ${c[1].name}`;
  if (!net) showEnd(text, score, { replay: () => void start(c), change: soloSelect, menu: title });
  else if (net.role === 'host')
    showEnd(text, score, { replay: net.replay, change: net.reselect, menu: title });
  else showEnd(text, score, { menu: title, waiting: `${net.names[0]} choisit la suite…` });
}

/** Une image de simulation (solo et hôte). */
function simulate(m: Match): void {
  const mine = readInput();
  const other = brain ? cpuInput(m, 1, brain, STEP) : remoteInput;
  stepMatch(m, [mine, other], STEP);
  fx.onEvents(m.events);
  playEvents(m.events);
  if (net) unsent.push(...m.events);
}

let acc = 0;
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const m = match;
  if (m && chars) {
    if (net?.role === 'guest') net.link.sendGame(encodeInput(paused ? NO_INPUT : readInput()));
    else if (!paused || net) {
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        simulate(m);
      }
      if (net) {
        net.link.sendGame(encodeState(m, unsent));
        unsent = [];
      }
    }
    fx.update(dt);
    if (match && match.phase === 'end' && match.phaseT > 2 && !endShown) {
      endShown = true;
      endScreen(match, chars);
    }
  }
  render();
  requestAnimationFrame(frame);
}

/** Ce que la partie en réseau demande au jeu. */
const lanContext: LanContext = {
  roster: () => roster,
  time: () => settings.time,
  start: (picked: [Character, Character], session: NetSession) => void start(picked, session),
  stop: stopMatch,
  title,
  fullscreen: goFullscreen,
};

async function boot(): Promise<void> {
  listenKeyboard(togglePause);
  initTouch();
  document.getElementById('pauseBtn')!.addEventListener('click', togglePause);
  await document.fonts.load('16px "Press Start 2P"').catch(() => undefined);
  [roster, background] = await Promise.all([loadRoster(), loadBackground()]);
  title();
  requestAnimationFrame(frame);
}

void boot();
