/* Affichage d'un personnage à partir de ses images (une image par pose), pieds posés en (x, y).
   Même cadrage que Fighting Friends : chaque image est ramenée à la hauteur prévue pour sa pose,
   puis corrigée par le réglage fait dans l'atelier de la banque (échelle, décalage). */
import { resolveSprite, type Character } from '../assets/characters';
import { POSE_BY_KEY, type PoseKey } from '../data/poses';

/** Hauteur de référence des réglages de l'atelier (personnage debout dans Fighting Friends). */
const REFERENCE_HEIGHT = 200;

export interface DrawOptions {
  /** Hauteur à l'écran d'un personnage debout. */
  height: number;
  alpha?: number;
  /** Silhouette blanche (flash d'impact). */
  flash?: boolean;
  /** Étirement vertical (rebond d'atterrissage, respiration). */
  sy?: number;
}

const flashes = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

function whiteSilhouette(img: HTMLImageElement): HTMLCanvasElement {
  let canvas = flashes.get(img);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    flashes.set(img, canvas);
  }
  return canvas;
}

/** @returns false si le personnage n'a aucune image utilisable */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  char: Character,
  pose: PoseKey,
  x: number,
  y: number,
  facing: number,
  opt: DrawOptions,
): boolean {
  const found = resolveSprite(char, pose);
  if (!found) return false;
  const { sprite } = found;
  const spec = POSE_BY_KEY[found.key];
  const iw = sprite.img.naturalWidth;
  const ih = sprite.img.naturalHeight;
  const reference = opt.height * char.size;
  const zoom = reference / REFERENCE_HEIGHT;
  const fit = spec.w ? (spec.w * reference) / iw : ((spec.h ?? 1) * reference) / ih;
  const k = fit * sprite.adj.s;
  const w = iw * k;
  const h = ih * k;

  ctx.save();
  if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
  ctx.translate(x, y);
  ctx.scale(facing, opt.sy ?? 1);
  ctx.translate(sprite.adj.dx * zoom, sprite.adj.dy * zoom);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(opt.flash ? whiteSilhouette(sprite.img) : sprite.img, -(spec.ax ?? 0.5) * w, -h, w, h);
  ctx.restore();
  return true;
}

/** Portrait carré : l'image « portrait » si elle existe, sinon le haut de la pose de repos. */
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  char: Character,
  x: number,
  y: number,
  size: number,
  facing = 1,
): void {
  const portrait = char.sprites.get('portrait');
  const idle = char.sprites.get('idle');
  ctx.save();
  ctx.translate(x + size / 2, y);
  ctx.scale(facing, 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (portrait) {
    const img = portrait.img;
    const s = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    ctx.drawImage(img, -(img.naturalWidth * s) / 2, 0, img.naturalWidth * s, img.naturalHeight * s);
  } else if (idle) {
    const img = idle.img;
    const crop = Math.min(img.naturalWidth, img.naturalHeight * 0.34);
    const left = Math.min(Math.max(img.naturalWidth * 0.56 - crop / 2, 0), img.naturalWidth - crop);
    ctx.drawImage(img, left, 0, crop, crop, -size / 2, 0, size, size);
  }
  ctx.restore();
}
