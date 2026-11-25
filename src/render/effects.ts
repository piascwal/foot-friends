/* Effets visuels déclenchés par les événements du match : poussière, étincelles,
   confettis et tremblement de l'écran après un but. */
import { W } from '../engine/constants';
import type { GameEvent } from '../engine/types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
}

export class Effects {
  private particles: Particle[] = [];
  shake = 0;
  /** Flash blanc d'un joueur touché (temps restant, par côté). */
  flash: [number, number] = [0, 0];

  private burst(x: number, y: number, n: number, colors: string[], speed: number, gravity = 600): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      const max = 0.35 + Math.random() * 0.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - speed * 0.3,
        life: max,
        max,
        size: 3 + Math.floor(Math.random() * 3),
        color: colors[i % colors.length]!,
        gravity,
      });
    }
  }

  /** Réagit aux événements d'une image du match. */
  onEvents(events: readonly GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'kick' || e.type === 'punch') this.burst(e.x, e.y, 8, ['#fff', '#ffe600'], 220);
      else if (e.type === 'bounce') this.burst(e.x, e.y + 12, 4, ['#cfe8c0', '#8fbf7f'], 80);
      else if (e.type === 'post') {
        this.burst(e.x, e.y, 10, ['#fff', '#b9b9c6'], 200);
        this.shake = Math.max(this.shake, 0.12);
      } else if (e.type === 'stun') this.flash[e.side] = 0.18;
      else if (e.type === 'goal') {
        const x = e.side === 0 ? W - 60 : 60;
        this.burst(x, 360, 60, ['#ff2e88', '#ffe600', '#00d9ff', '#7bff00', '#fff'], 520, 300);
        this.shake = 0.45;
      }
    }
  }

  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt);
    this.flash = [Math.max(0, this.flash[0] - dt), Math.max(0, this.flash[1] - dt)];
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  /** Décalage de l'écran pour le tremblement. */
  offset(): { x: number; y: number } {
    if (this.shake <= 0) return { x: 0, y: 0 };
    const k = this.shake * 18;
    return { x: (Math.random() - 0.5) * k, y: (Math.random() - 0.5) * k };
  }
}
