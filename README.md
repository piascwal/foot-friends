# Foot Friends

Jeu de foot en un contre un, en 2D pixel art : deux cages, un ballon, et les personnages de
[Fighting Friends](https://github.com/piascwal/fighting-friends). On marque en tirant, en reprenant de la
tête ou de volée, et on se débarrasse de l'adversaire à coups de poing. Les frappes réussies remplissent la
jauge du **super tir** : un ballon de feu qui renverse le joueur qu'il percute.

Jouer : **https://piascwal.github.io/foot-friends/**

- **1 joueur** contre l'ordinateur (facile, normal, difficile) ou **2 joueurs** sur le même clavier.
- Matchs de 60, 90 ou 120 secondes ; en cas d'égalité, **but en or**.
- Clavier, manettes et écran tactile (à l'horizontale).

|                          | Seul           | Joueur 1 (à deux) | Joueur 2 (à deux)     |
| ------------------------ | -------------- | ----------------- | --------------------- |
| Courir                   | Q / D ou ← / → | Q / D             | ← / →                 |
| Sauter (tête)            | Z ou ↑         | Z                 | ↑                     |
| Poing / POING            | U / I          | F / G             | O / P (4 / 5 du pavé) |
| Pied / PIED              | J / K          | V / B             | L / M (1 / 2)         |
| Super tir (jauge pleine) | L ou Espace    | H                 | Ù (3)                 |
| Pause                    | Échap          |                   |                       |

- **Tactile** : joystick à gauche (vers le haut pour sauter), boutons en losange à droite comme dans
  Fighting Friends (poing, POING, pied, PIED) et bouton du super tir, qui s'allume quand la jauge est pleine.
- **Manettes** : stick ou croix, A/B pied/PIED, X/Y poing/POING, RB super tir.
- **Plein écran** : bouton ⛶ (automatique sur téléphone au lancement d'une partie) ; sur iPhone, « Ajouter à
  l'écran d'accueil » ouvre le jeu en plein écran. Le stade remplit tout l'écran, quelle que soit sa forme.

Les coups puissants (POING, PIED) sont plus lents à armer mais partent plus fort et sonnent plus longtemps.

## Les sprites viennent de la banque

Les images des personnages ne sont **pas** dans ce dépôt : elles viennent de la banque de sprites
([sprite-bank](https://github.com/piascwal/sprite-bank)), comme pour Fighting Friends.

- `sprites.json` fixe la version : `v2` = la plus récente des `v2.x`, `v2.4` = cette version exacte.
- `npm run sprites` télécharge cette version de la banque et lance son script de copie : seules les poses
  demandées par le jeu sont copiées dans `public/assets/characters/` (non versionné).
- Les poses demandées sont dans `src/data/poses.ts` (garde, portrait, course, saut, pied et poing légers et puissants,
  volée, smash, sonné, victoire). Le jeu les publie dans la banque :
  `npm run needs -- ../sprite-bank/games/foot-friends.json`. L'atelier de la banque montre alors, pour chaque
  personnage, ce qui manque à Foot Friends.
- Une pose absente est remplacée par sa pose de repli (`fb`) ; seule la garde (`idle`) est obligatoire.
- Les réglages de l'atelier (échelle, décalage de chaque image) sont appliqués comme dans Fighting Friends.

Pour récupérer un nouveau personnage ou une image refaite : relancer la construction (onglet **Actions**,
**Run workflow**).

## Le fond du stade

Le fond peut être une image fournie : `public/assets/background/stadium.webp` (ou `.png`, `.jpg`). Sans
image, le jeu dessine son propre stade. Le gabarit `docs/gabarit-fond.png` montre les zones à respecter :

- **Format conseillé : 2560 × 1080** (21:9). La partie centrale **1920 × 1080** (16:9) est le terrain,
  toujours visible en entier ; les 320 pixels de chaque côté ne se voient que sur les écrans très allongés
  (téléphones). Une image 1920 × 1080 marche aussi : ses bords sont alors étirés sur ces écrans.
- **Ligne du sol à y = 940** (87 % de la hauteur) : les pieds des joueurs s'y posent. La pelouse continue
  en dessous.
- Le jeu dessine **par-dessus** : les cages (à 124 px de chaque bord du terrain, barre à y = 584), les
  joueurs, le ballon, le tableau des scores (en haut, y < 185) et, sur téléphone, le joystick et les boutons.
  L'image ne doit donc contenir ni cage, ni joueur, ni ballon.
- Au niveau des joueurs (y 600 à 940), éviter le texte et les forts contrastes : ils doivent bien ressortir.
- Sur un écran plus haut que 16:9 (tablette), le haut et le bas de l'image sont prolongés par leur couleur.

## Développer

```bash
npm install
npm run sprites    # copie les sprites de la banque
npm run dev        # http://localhost:5173
npm run check      # types + lint + tests
```

Chaque `push` sur `main` vérifie le jeu puis le publie sur GitHub Pages (`.github/workflows/pages.yml`).

## Organisation

```
src/data      poses demandées à la banque (cadrage, replis), besoins publiés
src/engine    le match, sans navigateur : physique du ballon et des joueurs, frappes, règles, ordinateur
src/assets    lecture des personnages copiés de la banque
src/render    dessin : stade, cages, sprites, effets, tableau des scores
src/input     clavier, manettes, boutons tactiles
src/audio     bruitages synthétisés
src/ui        écrans : titre, choix des personnages, pause, fin
tests/        règles du match, frappes, ordinateur, besoins en sprites
```

Une couche n'importe que celles qui la précèdent (vérifié par `npm run lint`) ; le moteur ne touche pas au
navigateur, ce qui le rend testable.
