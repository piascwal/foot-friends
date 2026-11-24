/* Petits calculs de géométrie : le joueur est un segment vertical arrondi (une « gélule »). */
import { PLAYER_H, PLAYER_R } from './constants';
import type { Player } from './types';

/** Haut et bas du segment central de la gélule d'un joueur. */
export function capsule(p: Player): { top: number; bottom: number } {
  return { top: p.y - PLAYER_H + PLAYER_R, bottom: p.y - PLAYER_R };
}

/** Point de la gélule le plus proche de (x, y). */
export function closestOnPlayer(p: Player, _x: number, y: number): { x: number; y: number } {
  const { top, bottom } = capsule(p);
  return { x: p.x, y: Math.min(Math.max(y, top), bottom) };
}

/** Distance d'un point au bord de la gélule (négative à l'intérieur). */
export function distanceToPlayer(p: Player, x: number, y: number): number {
  const c = closestOnPlayer(p, x, y);
  return Math.hypot(x - c.x, y - c.y) - PLAYER_R;
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
