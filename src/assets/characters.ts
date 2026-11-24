/* Personnages du jeu : ceux de la banque de sprites, copiés dans public/assets/characters/ par
   npm run sprites (liste dans index.json). On lit d'abord les fiches, puis les images à la demande :
   les portraits pour la sélection, toutes les poses des deux joueurs avant le match. */
import { POSES, POSE_BY_KEY, type PoseKey } from '../data/poses';

/** Réglage d'une image (character.json) : échelle et décalage en pixels monde (à la taille de combat). */
export interface SpriteAdjust {
  s: number;
  dx: number;
  dy: number;
}

export interface SpriteImage {
  img: HTMLImageElement;
  adj: SpriteAdjust;
}

export interface Character {
  id: string;
  name: string;
  color: string;
  /** Taille relative (1 = standard). */
  size: number;
  quote: string;
  files: Partial<Record<PoseKey, string>>;
  adjust: Partial<Record<PoseKey, Partial<SpriteAdjust>>>;
  sprites: Map<PoseKey, SpriteImage>;
}

/** Contenu d'un character.json de la banque (champs lus par le jeu). */
interface CharacterFile {
  id?: string;
  name?: string;
  color?: string;
  size?: number;
  quote?: string;
  files?: Partial<Record<string, string>>;
  adjust?: Partial<Record<string, Partial<SpriteAdjust>>>;
}

const DIR = 'assets/characters/';
const POSE_KEYS = new Set<string>(POSES.map((p) => p.key));

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Ne garde que les poses connues du jeu. */
const poses = <T>(table: Partial<Record<string, T>> | undefined): Partial<Record<PoseKey, T>> =>
  Object.fromEntries(Object.entries(table ?? {}).filter(([key]) => POSE_KEYS.has(key)));

/** Lit la liste des personnages et leurs fiches. Vide si les sprites n'ont pas été copiés. */
export async function loadRoster(): Promise<Character[]> {
  const ids = (await fetchJson<string[]>(`${DIR}index.json`)) ?? [];
  const files = await Promise.all(ids.map((id) => fetchJson<CharacterFile>(`${DIR}${id}/character.json`)));
  return ids.flatMap((id, i) => {
    const file = files[i];
    if (!file?.files?.idle) return [];
    return [
      {
        id,
        name: file.name ?? id.toUpperCase(),
        color: file.color ?? '#ffcc00',
        size: file.size ?? 1,
        quote: file.quote ?? '',
        files: poses(file.files),
        adjust: poses(file.adjust),
        sprites: new Map(),
      },
    ];
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image illisible : ${src}`));
    img.src = src;
  });
}

/** Charge (une seule fois) des images d'un personnage ; une image absente sera remplacée par un repli. */
export async function ensureSprites(char: Character, keys: readonly PoseKey[] = POSES.map((p) => p.key)) {
  await Promise.all(
    keys.map(async (key) => {
      const name = char.files[key];
      if (!name || char.sprites.has(key)) return;
      try {
        const img = await loadImage(`${DIR}${char.id}/${name}`);
        char.sprites.set(key, { img, adj: { s: 1, dx: 0, dy: 0, ...char.adjust[key] } });
      } catch {
        // image absente : le personnage utilisera une pose de repli
      }
    }),
  );
}

/** L'image à afficher pour une pose : la sienne, sinon la première de ses replis. */
export function resolveSprite(char: Character, key: PoseKey): { sprite: SpriteImage; key: PoseKey } | null {
  for (const candidate of [key, ...POSE_BY_KEY[key].fb, 'idle' as const]) {
    const sprite = char.sprites.get(candidate);
    if (sprite) return { sprite, key: candidate };
  }
  return null;
}
