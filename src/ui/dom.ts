/* Petits outils pour construire les écrans. */
import { unlockAudio } from '../audio/sfx';

const ui = () => document.getElementById('ui')!;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export function button(label: string, onClick: () => void, className = 'btn'): HTMLButtonElement {
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
export function show(children: Node[], overlay = false): void {
  ui().replaceChildren(el('div', { className: overlay ? 'screen overlay' : 'screen pitch' }, children));
}

/** Message bref en haut de l'écran (liaison perdue…). */
export function toast(text: string): void {
  const box = el('div', { className: 'toast', textContent: text });
  document.body.append(box);
  setTimeout(() => box.remove(), 3500);
}
