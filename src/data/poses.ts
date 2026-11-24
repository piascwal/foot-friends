/* Les images que Foot Friends demande à la banque de sprites, avec leur cadrage.
   Les cadrages (h, w, ax) sont ceux du catalogue de la banque : hauteur visée (1 = personnage debout),
   largeur visée pour une pose allongée, et position du centre du corps dans la largeur (0 = arrière).
   Une pose absente utilise la première image disponible de sa liste de repli `fb`. */

export type PoseKey =
  | 'idle'
  | 'portrait'
  | 'walk1'
  | 'walk2'
  | 'jump'
  | 'punch_light'
  | 'punch_heavy'
  | 'kick_light'
  | 'kick_heavy'
  | 'jump_punch'
  | 'jump_kick'
  | 'hit'
  | 'win';

export interface PoseSpec {
  key: PoseKey;
  /** À quoi sert l'image dans le jeu. */
  use: string;
  h?: number;
  w?: number;
  ax?: number;
  fb: readonly PoseKey[];
}

export const POSES: readonly PoseSpec[] = [
  { key: 'idle', use: 'en attente', h: 1, ax: 0.5, fb: [] },
  { key: 'portrait', use: 'sélection et tableau des scores', fb: ['idle'] },
  { key: 'walk1', use: 'course', h: 1, ax: 0.5, fb: ['idle'] },
  { key: 'walk2', use: 'course', h: 1, ax: 0.5, fb: ['walk1', 'idle'] },
  { key: 'jump', use: 'saut, tête', h: 0.9, ax: 0.5, fb: ['idle'] },
  { key: 'punch_light', use: 'coup de poing au sol', h: 1, ax: 0.36, fb: ['idle'] },
  { key: 'punch_heavy', use: 'coup de poing puissant', h: 0.97, ax: 0.34, fb: ['punch_light', 'idle'] },
  { key: 'kick_light', use: 'tir au sol', h: 1, ax: 0.34, fb: ['punch_light', 'idle'] },
  {
    key: 'kick_heavy',
    use: 'frappe puissante, super tir',
    h: 1.02,
    ax: 0.36,
    fb: ['kick_light', 'punch_light', 'idle'],
  },
  { key: 'jump_punch', use: 'smash en l’air', h: 0.86, ax: 0.42, fb: ['jump_kick', 'jump', 'idle'] },
  { key: 'jump_kick', use: 'volée en l’air', h: 0.86, ax: 0.4, fb: ['jump_punch', 'jump', 'idle'] },
  { key: 'hit', use: 'sonné', h: 0.98, ax: 0.5, fb: ['idle'] },
  { key: 'win', use: 'but marqué, victoire', h: 1.12, ax: 0.5, fb: ['idle'] },
];

export const POSE_BY_KEY = Object.fromEntries(POSES.map((p) => [p.key, p])) as Record<PoseKey, PoseSpec>;

/** Besoins du jeu publiés dans la banque (games/foot-friends.json) : mêmes poses pour tous. */
export const SPRITE_NEEDS = {
  game: 'foot-friends',
  label: 'Foot Friends',
  /** Poses demandées à tous les personnages. */
  common: POSES.map((p) => p.key),
} as const;
