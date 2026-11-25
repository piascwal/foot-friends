# Foot Friends

Jeu de foot en un contre un, en 2D pixel art : deux cages, un gros ballon, et les personnages de
[Fighting Friends](https://github.com/piascwal/fighting-friends). On défend sa cage et on marque de la tête,
du pied ou d'une volée ; un coup de poing sonne l'adversaire un instant.

Jouer : **https://piascwal.github.io/foot-friends/**

- **Jouer** : contre l'ordinateur (facile, normal, difficile).
- **À deux · Wi-Fi** : chacun sur son téléphone, sur le même Wi-Fi (lan-kit, comme Fighting Friends). L'un
  crée la partie, l'autre la voit dans la liste et la rejoint ; aucune adresse à saisir.
- Matchs de 90 secondes ; en cas d'égalité, **but en or**. Plein écran automatique sur téléphone.

|                                | Tactile                 | Clavier        | Manette        |
| ------------------------------ | ----------------------- | -------------- | -------------- |
| Courir                         | glissière gauche-droite | Q / D ou ← / → | stick ou croix |
| Sauter (tête)                  | SAUT                    | Z, ↑ ou Espace | A              |
| Tir (volée en l'air)           | PIED                    | J ou X         | B ou X         |
| Coup de poing (smash en l'air) | POING                   | K ou C         | Y ou RB        |
| Pause                          | II                      | Échap          |                |

## Le jeu en réseau

L'appareil qui crée la partie (l'hôte) fait tourner le match ; l'autre (l'invité) lui envoie ses
commandes et affiche l'état reçu à chaque image. Sur un même Wi-Fi, le délai est imperceptible et les deux
écrans montrent exactement le même match. L'hôte décide de la suite en fin de match (rejouer, changer de
joueur). Pour tester sans deux appareils : deux onglets du même navigateur sur l'adresse du jeu suivie de
`?lan=test`.

## Réglages du jeu

Ce qui rend ce genre de jeu agréable, et comment c'est réglé (`src/engine/constants.ts`, `strikes.ts`) :
gros ballon qui flotte (gravité plus faible que celle des joueurs), sauts hauts et vifs, tirs en cloche
plutôt qu'en flèche, têtes qui renvoient sans faire un tir, cage à peine plus haute qu'un joueur, coup
d'envoi au centre sans que personne ne bouge avant le sifflet. Un test vérifie que deux ordinateurs de
niveau normal marquent moins de 10 buts par match (environ 5 en moyenne).

## Les sprites viennent de la banque

Les images des personnages ne sont **pas** dans ce dépôt : elles viennent de la banque de sprites
([sprite-bank](https://github.com/piascwal/sprite-bank)), comme pour Fighting Friends.

- `sprites.json` fixe la version : `v2` = la plus récente des `v2.x`, `v2.4` = cette version exacte.
- `npm run sprites` télécharge cette version de la banque et lance son script de copie : seules les poses
  demandées par le jeu sont copiées dans `public/assets/characters/` (non versionné).
- Les poses demandées sont dans `src/data/poses.ts` (garde, portrait, course, saut, tir, coup de poing, volée, smash,
  sonné, victoire). Le jeu les publie dans la banque :
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
- Le jeu dessine **par-dessus** : les cages (160 px de profondeur depuis chaque bord du terrain, barre à y = 594), les
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
src/input     clavier, manettes, commandes tactiles
src/net       jeu en réseau : mise en relation (lan-kit), liaison, protocole
src/audio     bruitages synthétisés
src/ui        écrans : menu, choix des joueurs, réseau, pause, fin
src/main.ts   boucle de jeu (solo, hôte, invité) ; src/lan-game.ts : déroulé d'une partie en réseau
tests/        règles du match, frappes, ordinateur, rythme des buts, protocole, besoins en sprites
```

Une couche n'importe que celles qui la précèdent (vérifié par `npm run lint`) ; le moteur ne touche pas au
navigateur, ce qui le rend testable.
