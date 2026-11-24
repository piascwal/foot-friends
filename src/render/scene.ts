/* Dessin d'une image du match : stade, cages, joueurs, ballon, effets, tableau des scores. */
import type { Background } from '../assets/background';
import type { Character } from '../assets/characters';
import type { PoseKey } from '../data/poses';
import { BALL_R, GROUND, H, PLAYER_H, PLAYER_R, W } from '../engine/constants';
import type { Match, Player } from '../engine/types';
import type { Effects } from './effects';
import { drawHud, type HudInfo, type View } from './hud';
import { ballSprite, drawBackdrop, drawGoalBack, drawGoalFront } from './pitch';
import { drawSprite } from './sprite-draw';

/** Hauteur à l'écran d'un personnage debout. */
const SPRITE_HEIGHT = PLAYER_H * 1.08;

/** La pose d'un joueur, d'après ce qu'il fait. */
export function poseOf(m: Match, p: Player): PoseKey {
  if (m.phase === 'goal' && m.phaseT > 0.25) return m.lastScorer === p.side ? 'win' : 'hit';
  if (m.phase === 'end') {
    const winner = m.score[0] === m.score[1] ? null : m.score[0] > m.score[1] ? 0 : 1;
    return winner === p.side ? 'win' : winner === null ? 'idle' : 'hit';
  }
  if (p.stun > 0) return 'hit';
  if (p.strike) {
    const { kind, air } = p.strike;
    if (kind === 'kick') return air ? 'jump_kick' : 'kick_light';
    if (kind === 'punch') return air ? 'jump_punch' : 'punch_light';
    if (kind === 'punchHeavy') return air ? 'jump_punch' : 'punch_heavy';
    return air ? 'jump_kick' : 'kick_heavy';
  }
  if (!p.onGround) return 'jump';
  if (Math.abs(p.vx) > 10) return Math.floor(p.stride / 46) % 2 ? 'walk2' : 'walk1';
  return 'idle';
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  m: Match,
  p: Player,
  char: Character,
  fx: Effects,
  label: string,
): void {
  // ombre au sol
  const lift = Math.min(1, (GROUND - p.y) / 300);
  ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - lift * 0.6)})`;
  ctx.beginPath();
  ctx.ellipse(p.x, GROUND + 2, 30 * (1 - lift * 0.4), 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const pose = poseOf(m, p);
  const breathe = pose === 'idle' ? 1 + Math.sin(performance.now() / 260 + p.side) * 0.012 : 1;
  const blink = p.stun > 0 && Math.floor(p.stun * 14) % 2 === 0;
  const drawn = drawSprite(ctx, char, pose, p.x, p.y, p.facing, {
    height: SPRITE_HEIGHT,
    flash: fx.flash[p.side] > 0,
    alpha: blink ? 0.6 : 1,
    sy: breathe,
  });
  if (!drawn) {
    ctx.fillStyle = char.color;
    ctx.fillRect(p.x - PLAYER_R, p.y - PLAYER_H, PLAYER_R * 2, PLAYER_H);
  }
  // repère au-dessus de la tête : étiquette à la couleur du personnage
  const top = p.y - SPRITE_HEIGHT * char.size - 14;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  const w = ctx.measureText(label).width + 10;
  ctx.fillStyle = '#000';
  ctx.fillRect(p.x - w / 2 - 2, top - 18, w + 4, 18);
  ctx.beginPath();
  ctx.moveTo(p.x - 7, top);
  ctx.lineTo(p.x + 7, top);
  ctx.lineTo(p.x, top + 8);
  ctx.fill();
  ctx.fillStyle = char.color;
  ctx.fillRect(p.x - w / 2, top - 16, w, 14);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.strokeText(label, p.x, top - 4);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, p.x, top - 4);
}

function drawBall(ctx: CanvasRenderingContext2D, m: Match): void {
  const b = m.ball;
  const lift = Math.min(1, (GROUND - b.y) / 300);
  ctx.fillStyle = `rgba(0,0,0,${0.25 * (1 - lift * 0.7)})`;
  ctx.beginPath();
  ctx.ellipse(b.x, GROUND + 2, BALL_R * (1 - lift * 0.5), 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.spin);
  ctx.imageSmoothingEnabled = false;
  if (b.fire > 0) {
    ctx.fillStyle = 'rgba(255,120,40,0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, BALL_R + 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.drawImage(ballSprite(), -BALL_R, -BALL_R, BALL_R * 2, BALL_R * 2);
  ctx.restore();
}

/** Texte centré au milieu de l'écran (BUT !, coup d'envoi…). */
function banner(ctx: CanvasRenderingContext2D, text: string, sub = '', color = '#ffe600'): void {
  const y = H * 0.4;
  const pulse = 1 + Math.sin(performance.now() / 90) * 0.04;
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.scale(pulse, pulse);
  ctx.textAlign = 'center';
  ctx.font = '56px "Press Start 2P", monospace';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#000';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ff2e88';
  ctx.fillText(text, 4, 4);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  if (sub) {
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    const w = ctx.measureText(sub).width + 28;
    ctx.fillStyle = '#000';
    ctx.fillRect(W / 2 - w / 2 - 3, y + 26, w + 6, 34);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(W / 2 - w / 2, y + 29, w, 28);
    ctx.fillStyle = '#fff';
    ctx.fillText(sub, W / 2, y + 51);
  }
}

export interface SceneInfo extends HudInfo {
  labels: [string, string];
  /** Zone visible en coordonnées du terrain. */
  view: View;
  /** Fond fourni en image (sinon, stade dessiné). */
  background: Background | null;
}

export function drawScene(ctx: CanvasRenderingContext2D, m: Match, fx: Effects, info: SceneInfo): void {
  const shake = fx.offset();
  ctx.save();
  ctx.translate(shake.x, shake.y);
  ctx.imageSmoothingEnabled = false;
  drawBackdrop(ctx, info.view, info.background);
  drawGoalBack(ctx, 0);
  drawGoalBack(ctx, 1);
  for (const p of m.players) drawPlayer(ctx, m, p, info.chars[p.side], fx, info.labels[p.side]);
  drawBall(ctx, m);
  drawGoalFront(ctx, 0);
  drawGoalFront(ctx, 1);
  fx.draw(ctx);
  ctx.restore();

  drawHud(ctx, m, info, info.view);
  if (m.phase === 'goal') banner(ctx, 'BUT !', `${info.chars[m.lastScorer ?? 0].name} marque`);
  else if (m.phase === 'kickoff' && m.phaseT < 1)
    banner(ctx, m.golden ? 'BUT EN OR' : 'PRÊTS ?', '', '#ffffff');
  else if (m.phase === 'play' && m.golden && m.phaseT < 1.2)
    banner(ctx, 'BUT EN OR', 'le prochain but gagne');
}
