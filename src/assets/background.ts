/* Fond du stade fourni en image : public/assets/background/stadium.webp (ou .png, .jpg).
   S'il n'y en a pas, le stade est dessiné par le jeu (src/render/pitch.ts). Voir README.md
   (« Le fond du stade ») pour le cadrage attendu et docs/gabarit-fond.png. */

export interface Background {
  img: HTMLImageElement;
  /** Couleur moyenne du haut et du bas de l'image : elle prolonge le fond sur les écrans plus hauts. */
  top: string;
  bottom: string;
}

const DIR = 'assets/background/';
const NAMES = ['stadium.webp', 'stadium.png', 'stadium.jpg'];

function load(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Couleur moyenne d'une rangée de pixels de l'image. */
function rowColor(img: HTMLImageElement, y: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, y, img.naturalWidth, 1, 0, 0, img.naturalWidth, 1);
  const data = ctx.getImageData(0, 0, img.naturalWidth, 1).data;
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c]! += data[i + c]!;
  const n = data.length / 4;
  return `rgb(${sum.map((v) => Math.round(v / n)).join(',')})`;
}

/** Cherche l'image de fond ; null si aucune n'est fournie. */
export async function loadBackground(): Promise<Background | null> {
  for (const name of NAMES) {
    const img = await load(DIR + name);
    if (img) return { img, top: rowColor(img, 0), bottom: rowColor(img, img.naturalHeight - 1) };
  }
  return null;
}
