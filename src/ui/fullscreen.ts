/* Plein écran : API Fullscreen (avec verrouillage à l'horizontale sur téléphone quand c'est permis).
   Sur iPhone, où elle n'existe pas, « Ajouter à l'écran d'accueil » ouvre le jeu en plein écran
   (voir public/manifest.webmanifest). */

type Doc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
type Elem = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

const doc = document as Doc;
const root = document.documentElement as Elem;

export const fullscreenSupported = (): boolean => !!(root.requestFullscreen || root.webkitRequestFullscreen);
export const isFullscreen = (): boolean => !!(doc.fullscreenElement || doc.webkitFullscreenElement);

export async function enterFullscreen(): Promise<void> {
  if (isFullscreen() || !fullscreenSupported()) return;
  try {
    if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
    else await root.webkitRequestFullscreen?.();
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientation.lock?.('landscape').catch(() => undefined);
  } catch {
    // refusé par le navigateur : le jeu reste dans la page
  }
}

export async function toggleFullscreen(): Promise<void> {
  if (!isFullscreen()) return enterFullscreen();
  try {
    if (doc.exitFullscreen) await doc.exitFullscreen();
    else await doc.webkitExitFullscreen?.();
  } catch {
    // déjà sorti
  }
}
