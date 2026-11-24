/* État du match : tout ce que le moteur fait évoluer, sans rien du navigateur. */

/** 0 = joueur de gauche (défend la cage de gauche), 1 = joueur de droite. */
export type Side = 0 | 1;

/** Commandes d'un joueur pour une image (touches tenues). */
export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
  /** Tir (pied léger) et frappe puissante (pied lourd). */
  kick: boolean;
  kickHeavy: boolean;
  /** Coup de poing léger et puissant. */
  punch: boolean;
  punchHeavy: boolean;
  super: boolean;
}

export const NO_INPUT: Input = {
  left: false,
  right: false,
  jump: false,
  kick: false,
  kickHeavy: false,
  punch: false,
  punchHeavy: false,
  super: false,
};

export type StrikeKind = 'kick' | 'kickHeavy' | 'punch' | 'punchHeavy' | 'super';

/** Les frappes qui se déclenchent sur l'appui d'une touche, de la plus forte à la plus faible. */
export const STRIKE_KINDS: readonly StrikeKind[] = ['super', 'kickHeavy', 'punchHeavy', 'kick', 'punch'];

export interface Strike {
  kind: StrikeKind;
  /** Temps écoulé depuis le début du geste. */
  t: number;
  /** Geste fait en l'air (volée, smash) ou au sol. */
  air: boolean;
  hitBall: boolean;
  hitFoe: boolean;
}

export interface Player {
  side: Side;
  /** Pieds du joueur. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Regarde vers la cage adverse : 1 = vers la droite. */
  facing: 1 | -1;
  onGround: boolean;
  strike: Strike | null;
  /** Temps restant sonné (ne peut plus bouger ni frapper). */
  stun: number;
  /** Jauge de super tir, de 0 à 1. */
  power: number;
  /** Distance parcourue en courant (anime la course). */
  stride: number;
  /** Commandes de l'image précédente (pour ne réagir qu'à l'appui). */
  prev: Input;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation affichée (radians). */
  spin: number;
  /** Super tir en cours : temps restant et tireur. */
  fire: number;
  fireBy: Side | null;
}

export type Phase = 'kickoff' | 'play' | 'goal' | 'end';

/** Ce qui s'est passé pendant une image : sons, effets. */
export type GameEvent =
  | { type: StrikeKind | 'bounce' | 'post' | 'whistle'; x: number; y: number }
  | { type: 'goal'; side: Side }
  | { type: 'stun'; side: Side }
  | { type: 'end'; winner: Side | null };

export interface Match {
  players: [Player, Player];
  ball: Ball;
  score: [number, number];
  /** Temps de jeu restant (secondes). */
  time: number;
  phase: Phase;
  /** Temps passé dans la phase en cours. */
  phaseT: number;
  /** Égalité à la fin du temps : le prochain but gagne. */
  golden: boolean;
  /** Dernier buteur (pour la célébration). */
  lastScorer: Side | null;
  /** Joueur qui engage : le ballon part vers lui (celui qui vient d'encaisser). */
  kickoffTo: Side;
  events: GameEvent[];
}
