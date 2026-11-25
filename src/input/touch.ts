/* Commandes tactiles : à gauche, une glissière gauche-droite (on pose le pouce n'importe où dans la
   moitié gauche et on glisse) ; à droite, trois boutons : SAUT, PIED, POING.
   Un doigt = un seul bouton (le plus proche) : pas besoin de viser juste. */
import { NO_INPUT, type Input } from '../engine/types';

type Button = 'jump' | 'kick' | 'punch';
const BUTTONS: readonly Button[] = ['jump', 'kick', 'punch'];

/** Part gauche de l'écran réservée à la glissière. */
const STICK_ZONE = 0.45;
/** En dessous de cette fraction de la course, la glissière est au neutre. */
const DEAD_ZONE = 0.22;
/** Un bouton réagit jusqu'à cette distance de son centre (en rayons). */
const BUTTON_REACH = 1.8;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

interface Geometry {
  /** Rayon de chaque bouton. */
  radius: Record<Button, number>;
  centers: Record<Button, [number, number]>;
  /** Demi-course de la glissière. */
  travel: number;
  home: [number, number];
}

let layer: HTMLElement;
let slider: HTMLElement;
let knob: HTMLElement;
const buttons = {} as Record<Button, HTMLElement>;
let geo: Geometry | null = null;
let stickTouch: number | null = null;
let base = 0;
const fingers = new Map<number, Button | null>();
const state = { x: 0, held: new Set<Button>() };

/** Commandes tenues sur l'écran tactile. */
export function touchInput(): Input {
  if (!geo) return NO_INPUT;
  return {
    left: state.x < 0,
    right: state.x > 0,
    jump: state.held.has('jump'),
    kick: state.held.has('kick'),
    punch: state.held.has('punch'),
  };
}

/** Recalcule tailles et positions (rotation de l'écran, redimensionnement, début de partie). */
export function layoutTouch(): void {
  if (!layer) return;
  const rect = layer.getBoundingClientRect();
  if (!rect.width) return;
  const r = clamp(rect.height * 0.085, 26, 44);
  const marginX = Math.max(18, rect.width * 0.03);
  const marginY = Math.max(14, rect.height * 0.05);
  // saut : le gros bouton, sous le pouce ; pied et poing au-dessus, en arc
  const jx = rect.width - marginX - r * 1.3;
  const jy = rect.height - marginY - r * 1.3;
  const centers: Geometry['centers'] = {
    jump: [jx, jy],
    kick: [jx - r * 2.7, jy - r * 0.4],
    punch: [jx - r * 0.7, jy - r * 2.6],
  };
  const radius: Geometry['radius'] = { jump: r * 1.3, kick: r, punch: r };
  for (const b of BUTTONS) {
    const el = buttons[b];
    el.style.width = el.style.height = `${radius[b] * 2}px`;
    el.style.left = `${centers[b][0] - radius[b]}px`;
    el.style.top = `${centers[b][1] - radius[b]}px`;
    el.style.fontSize = `${radius[b] * 0.36}px`;
  }
  const travel = clamp(rect.width * 0.09, 50, 90);
  const knobSize = clamp(rect.height * 0.15, 44, 70);
  slider.style.width = `${travel * 2 + knobSize}px`;
  slider.style.height = `${knobSize + 12}px`;
  knob.style.width = knob.style.height = `${knobSize}px`;
  geo = {
    radius,
    centers,
    travel,
    home: [marginX + travel + knobSize / 2 + 6, rect.height - marginY - knobSize / 2 - 6],
  };
  if (stickTouch === null) placeSlider(...geo.home);
}

function placeSlider(x: number, y: number): void {
  base = x;
  slider.style.left = `${x - slider.offsetWidth / 2}px`;
  slider.style.top = `${y - slider.offsetHeight / 2}px`;
  knob.style.transform = '';
}

function moveSlider(px: number): void {
  const max = geo!.travel;
  let dx = px - base;
  // si le pouce dépasse la course, la glissière le suit : inutile de regarder l'écran
  if (Math.abs(dx) > max * 1.3) {
    base += dx - Math.sign(dx) * max * 1.3;
    slider.style.left = `${base - slider.offsetWidth / 2}px`;
    dx = px - base;
  }
  const shown = clamp(dx, -max, max);
  knob.style.transform = `translateX(${shown}px)`;
  state.x = Math.abs(dx) < max * DEAD_ZONE ? 0 : Math.sign(dx);
}

function buttonAt(px: number, py: number): Button | null {
  let best: Button | null = null;
  let bestDist = Infinity;
  for (const b of BUTTONS) {
    const d = Math.hypot(px - geo!.centers[b][0], py - geo!.centers[b][1]) / geo!.radius[b];
    if (d < BUTTON_REACH && d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

function refreshButtons(): void {
  const now = new Set<Button>();
  for (const b of fingers.values()) if (b) now.add(b);
  for (const b of BUTTONS) {
    if (now.has(b) && !state.held.has(b)) navigator.vibrate?.(8);
    buttons[b].classList.toggle('on', now.has(b));
  }
  state.held = now;
}

function releaseSlider(): void {
  stickTouch = null;
  state.x = 0;
  slider.classList.remove('on');
  if (geo) placeSlider(...geo.home);
}

function onTouch(event: TouchEvent): void {
  event.preventDefault();
  if (!geo) return;
  const rect = layer.getBoundingClientRect();
  for (const touch of Array.from(event.changedTouches)) {
    const px = touch.clientX - rect.left;
    const py = touch.clientY - rect.top;
    const id = touch.identifier;
    if (event.type === 'touchstart') {
      if (px >= rect.width * STICK_ZONE) fingers.set(id, buttonAt(px, py));
      else if (stickTouch === null) {
        stickTouch = id;
        placeSlider(px, py);
        slider.classList.add('on');
      }
    } else if (event.type === 'touchmove') {
      if (id === stickTouch) moveSlider(px);
      else if (fingers.has(id)) fingers.set(id, buttonAt(px, py));
    } else {
      if (id === stickTouch) releaseSlider();
      fingers.delete(id);
    }
  }
  refreshButtons();
}

/** Relâche tout (changement d'écran, pause). */
export function resetTouch(): void {
  if (!layer) return;
  fingers.clear();
  releaseSlider();
  refreshButtons();
}

/** Branche les commandes tactiles ; elles s'affichent dès qu'un doigt touche l'écran. */
export function initTouch(): void {
  layer = document.getElementById('touch')!;
  slider = document.getElementById('slider')!;
  knob = document.getElementById('knob')!;
  for (const b of BUTTONS) buttons[b] = layer.querySelector<HTMLElement>(`[data-b="${b}"]`)!;
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const)
    layer.addEventListener(type, onTouch, { passive: false });
  const markSeen = () => {
    document.body.classList.add('touch');
    layoutTouch();
  };
  window.addEventListener('touchstart', markSeen, { once: true, passive: true });
  if (matchMedia('(pointer: coarse)').matches) markSeen();
  window.addEventListener('resize', layoutTouch);
}
