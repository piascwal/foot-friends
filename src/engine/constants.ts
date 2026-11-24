/* Dimensions du terrain (pixels monde) et réglages physiques. */

/** Terrain : 960 × 540, l'origine en haut à gauche, y vers le bas. */
export const W = 960;
export const H = 540;
/** Hauteur du sol (pieds des joueurs). */
export const GROUND = 470;

/** Profondeur d'une cage (depuis le bord de l'écran). */
export const GOAL_W = 62;
/** Dessous de la barre transversale. */
export const GOAL_TOP = 300;
/** Épaisseur de la barre. */
export const BAR_H = 8;

export const GRAVITY = 1500;

export const BALL_R = 15;
/** Rebond du ballon sur le sol, les murs, la barre. */
export const BALL_BOUNCE = 0.68;
/** Frottement au sol (par seconde, part de vitesse gardée). */
export const BALL_ROLL = 0.4;
export const BALL_MAX_SPEED = 1300;

/** Joueur : un « bâton » arrondi des pieds à la tête. */
export const PLAYER_R = 22;
/** Hauteur du joueur debout. */
export const PLAYER_H = 140;
export const RUN_SPEED = 310;
export const JUMP_SPEED = 660;

/** Durée d'un match (secondes de jeu). */
export const MATCH_TIME = 90;
/** Pause après un but, avant le coup d'envoi. */
export const GOAL_PAUSE = 2.2;
/** Le ballon est tenu en l'air avant d'être lâché. */
export const KICKOFF_PAUSE = 1.1;
/** Charge de la jauge de super tir à chaque frappe réussie. */
export const POWER_PER_TOUCH = 0.17;
