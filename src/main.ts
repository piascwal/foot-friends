/* Assemblage du jeu : personnages de la banque, écrans, boucle de jeu à pas fixe. */
import { ensureSprites, loadRoster, type Character } from './assets/characters';
import { playEvents } from './audio/sfx';
import { cpuInput, newBrain, type CpuBrain } from './engine/ai';
import { H, W } from './engine/constants';
import { newMatch, stepMatch } from './engine/match';
import type { Match } from './engine/types';
import { listenKeyboard, readInput } from './input/controls';
import { initTouch, layoutTouch, resetTouch, setSuperReady } from './input/touch';
import { Effects } from './render/effects';
import { drawScene } from './render/scene';
import { enterFullscreen, fullscreenSupported, toggleFullscreen } from './ui/fullscreen';
import {
  hideScreens,
  showEnd,
  showLoading,
  showPause,
  showSelect,
  showTitle,
  type Settings,
} from './ui/screens';
import './style.css';

const STEP = 1 / 120;
const canvas = document.getElementById('cv') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const settings: Settings = { solo: true, level: 'normal', time: 90 };
let roster: Character[] = [];
let chars: [Character, Character] | null = null;
let match: Match | null = null;
let brain: CpuBrain | null = null;
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
  // écran plus haut que le terrain (tablette) : un peu de ciel au-dessus, plus de pelouse en dessous,
  // où se placent les commandes tactiles
  const oy = (canvas.height - H * scale) * 0.35;
  return { scale, ox: (canvas.width - W * scale) / 2, oy };
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
  drawScene(ctx, match, fx, {
    chars,
    labels: settings.solo ? ['J1', 'CPU'] : ['J1', 'J2'],
    view,
  });
}

function title(): void {
  match = null;
  document.body.classList.remove('playing');
  showTitle(settings, select, roster.length === 0);
  resetTouch();
}

function select(): void {
  match = null;
  // sur téléphone, le jeu passe en plein écran dès qu'on choisit un mode (geste du joueur)
  if (matchMedia('(pointer: coarse)').matches) void enterFullscreen();
  void showSelect(roster, settings, (picked) => void start(picked), title);
}

async function start(picked: [Character, Character]): Promise<void> {
  showLoading();
  await Promise.all(picked.map((c) => ensureSprites(c)));
  chars = picked;
  match = newMatch(settings.time);
  brain = settings.solo ? newBrain(settings.level) : null;
  fx = new Effects();
  paused = false;
  endShown = false;
  document.body.classList.add('playing');
  // les commandes tactiles viennent d'apparaître : on place joystick et boutons
  layoutTouch();
  hideScreens();
}

function togglePause(): void {
  if (!match || match.phase === 'end') return;
  paused = !paused;
  resetTouch();
  if (paused) showPause(togglePause, title);
  else hideScreens();
}

function endScreen(m: Match, c: [Character, Character]): void {
  const [a, b] = m.score;
  const winner = a === b ? null : a > b ? c[0] : c[1];
  const who = winner === c[1] && settings.solo ? `L'ordinateur (${winner.name})` : winner?.name;
  showEnd(winner ? `Victoire de ${who} !` : 'Match nul', `${c[0].name} ${a} - ${b} ${c[1].name}`, {
    replay: () => void start(c),
    change: select,
    menu: title,
  });
}

let acc = 0;
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (match && chars && !paused) {
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      const p1 = readInput(0, settings.solo);
      const p2 = brain ? cpuInput(match, 1, brain, STEP) : readInput(1, false);
      stepMatch(match, [p1, p2], STEP);
      fx.onEvents(match.events);
      playEvents(match.events);
    }
    setSuperReady(match.players[0].power >= 1);
    fx.trail(match.ball);
    fx.update(dt);
    if (match.phase === 'end' && match.phaseT > 2 && !endShown) {
      endShown = true;
      endScreen(match, chars);
    }
  }
  render();
  requestAnimationFrame(frame);
}

async function boot(): Promise<void> {
  listenKeyboard(togglePause);
  initTouch();
  document.getElementById('pauseBtn')!.addEventListener('click', togglePause);
  const fsBtn = document.getElementById('fsBtn')!;
  if (fullscreenSupported()) fsBtn.addEventListener('click', () => void toggleFullscreen());
  else fsBtn.remove();
  await document.fonts.load('16px "Press Start 2P"').catch(() => undefined);
  roster = await loadRoster();
  title();
  requestAnimationFrame(frame);
}

void boot();
