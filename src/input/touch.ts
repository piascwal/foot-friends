/* Commandes tactiles : joystick flottant à gauche (pousser vers le haut pour sauter), quatre boutons en
   losange à droite (poing / POING / pied / PIED) et le bouton du super tir au-dessus.
   Un doigt = un seul bouton (le plus proche) : pas besoin de viser juste. */
import { NO_INPUT, type Input } from '../engine/types';

type Button = 'punch' | 'punchHeavy' | 'kick' | 'kickHeavy' | 'super';
const BUTTONS: readonly Button[] = ['punch', 'punchHeavy', 'kick', 'kickHeavy', 'super'];

/** Part gauche de l'écran réservée au joystick. */
const STICK_ZONE = 0.45;
/** En dessous de cette fraction du rayon, le joystick est au neutre. */
const DEAD_ZONE = 0.28;
/** Un bouton réagit jusqu'à cette distance de son centre (en rayons). */
const BUTTON_REACH = 1.9;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

interface Geometry {
  button: number;
  stick: number;
  centers: Record<Button, [number, number]>;
  home: [number, number];
}

let layer: HTMLElement;
let stick: HTMLElement;
let knob: HTMLElement;
const buttons = {} as Record<Button, HTMLElement>;
let geo: Geometry | null = null;
let stickTouch: number | null = null;
let base: [number, number] = [0, 0];
const fingers = new Map<number, Button | null>();
const state = { x: 0, up: false, held: new Set<Button>() };

/** Commandes tenues sur l'écran tactile. */
export function touchInput(): Input {
  if (!geo) return NO_INPUT;
  return {
    left: state.x < 0,
    right: state.x > 0,
    jump: state.up,
    punch: state.held.has('punch'),
    punchHeavy: state.held.has('punchHeavy'),
    kick: state.held.has('kick'),
    kickHeavy: state.held.has('kickHeavy'),
    super: state.held.has('super'),
  };
}

/** Recalcule tailles et positions (rotation de l'écran, redimensionnement). */
export function layoutTouch(): void {
  if (!layer) return;
  const rect = layer.getBoundingClientRect();
  const r = clamp(rect.height * 0.075, 22, 38);
  const gap = r * 1.7;
  const marginX = Math.max(16, rect.width * 0.03);
  const marginY = Math.max(12, rect.height * 0.05);
  // centre du losange
  const cx = rect.width - marginX - r - gap;
  const cy = rect.height - marginY - r - gap;
  const centers: Geometry['centers'] = {
    punchHeavy: [cx, cy - gap],
    punch: [cx - gap, cy],
    kickHeavy: [cx + gap, cy],
    kick: [cx, cy + gap],
    super: [cx - gap * 1.25, cy - gap * 1.6],
  };
  for (const b of BUTTONS) {
    const size = b === 'super' ? r * 0.85 : r;
    const el = buttons[b];
    el.style.width = el.style.height = `${size * 2}px`;
    el.style.left = `${centers[b][0] - size}px`;
    el.style.top = `${centers[b][1] - size}px`;
    el.style.fontSize = `${size * 0.62}px`;
  }
  const s = clamp(rect.height * 0.16, 44, 76);
  stick.style.width = stick.style.height = `${s * 2}px`;
  knob.style.width = knob.style.height = `${s}px`;
  geo = { button: r, stick: s, centers, home: [marginX + s + 12, rect.height - marginY - s * 1.15] };
  if (stickTouch === null) placeStick(...geo.home);
}

function placeStick(x: number, y: number): void {
  base = [x, y];
  stick.style.left = `${x - geo!.stick}px`;
  stick.style.top = `${y - geo!.stick}px`;
  knob.style.transform = '';
}

function moveStick(px: number, py: number): void {
  const max = geo!.stick;
  let dx = px - base[0];
  let dy = py - base[1];
  const dist = Math.hypot(dx, dy);
  // si le pouce s'éloigne trop, la base le suit : inutile de regarder l'écran
  if (dist > max * 1.35) {
    const k = (dist - max * 1.35) / dist;
    base = [base[0] + dx * k, base[1] + dy * k];
    stick.style.left = `${base[0] - max}px`;
    stick.style.top = `${base[1] - max}px`;
    dx = px - base[0];
    dy = py - base[1];
  }
  const d = Math.hypot(dx, dy);
  const k = d > max ? max / d : 1;
  knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
  if (d < max * DEAD_ZONE) {
    state.x = 0;
    state.up = false;
    return;
  }
  // haut sur un large secteur (diagonales comprises) : on saute en courant
  const angle = Math.atan2(dy, dx);
  state.up = angle < -Math.PI / 8 && angle > (-7 * Math.PI) / 8;
  state.x = Math.abs(dx) > d * 0.38 ? Math.sign(dx) : 0;
}

function buttonAt(px: number, py: number): Button | null {
  let best: Button | null = null;
  let bestDist = geo!.button * BUTTON_REACH;
  for (const b of BUTTONS) {
    const d = Math.hypot(px - geo!.centers[b][0], py - geo!.centers[b][1]);
    if (d < bestDist) {
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

function releaseStick(): void {
  stickTouch = null;
  state.x = 0;
  state.up = false;
  stick.classList.remove('on');
  if (geo) placeStick(...geo.home);
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
        placeStick(px, py);
        stick.classList.add('on');
      }
    } else if (event.type === 'touchmove') {
      if (id === stickTouch) moveStick(px, py);
      else if (fingers.has(id)) fingers.set(id, buttonAt(px, py));
    } else {
      if (id === stickTouch) releaseStick();
      fingers.delete(id);
    }
  }
  refreshButtons();
}

/** Relâche tout (changement d'écran, pause). */
export function resetTouch(): void {
  fingers.clear();
  releaseStick();
  refreshButtons();
}

/** Branche les commandes tactiles ; elles s'affichent dès qu'un doigt touche l'écran. */
export function initTouch(): void {
  layer = document.getElementById('touch')!;
  stick = document.getElementById('stick')!;
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

/** Le bouton du super tir brille quand la jauge est pleine. */
export function setSuperReady(ready: boolean): void {
  buttons.super?.classList.toggle('ready', ready);
}
