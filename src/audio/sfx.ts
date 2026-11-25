/* Bruitages synthétisés (aucun fichier son) : frappes, rebonds, poteau, sifflet, but. */
import type { GameEvent } from '../engine/types';

let ctx: AudioContext | null = null;
let muted = false;

/** À appeler sur un geste du joueur : le navigateur n'autorise le son qu'après. */
export function unlockAudio(): void {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}

export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}

function tone(freq: number, duration: number, type: OscillatorType, volume: number, slide = 0): void {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

function noise(duration: number, volume: number, filter = 1200): void {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const lp = ctx.createBiquadFilter();
  lp.frequency.value = filter;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(lp).connect(gain).connect(ctx.destination);
  src.start(t);
}

export function playEvents(events: readonly GameEvent[]): void {
  for (const e of events) {
    switch (e.type) {
      case 'kick':
        tone(180, 0.12, 'square', 0.18, -120);
        break;
      case 'punch':
        noise(0.08, 0.35, 2500);
        tone(120, 0.08, 'square', 0.12, -60);
        break;
      case 'bounce':
        tone(110, 0.06, 'triangle', 0.12, -40);
        break;
      case 'post':
        tone(880, 0.25, 'square', 0.1, -300);
        break;
      case 'whistle':
        tone(2100, 0.18, 'square', 0.06);
        setTimeout(() => tone(2100, 0.3, 'square', 0.06), 220);
        break;
      case 'goal':
        noise(1.4, 0.35, 700);
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'square', 0.1), i * 110));
        break;
      default:
        break;
    }
  }
}
