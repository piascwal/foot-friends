# Foot Friends

Jeu de foot en un contre un, en 2D pixel art : deux cages, un ballon, et les personnages de
[Fighting Friends](https://github.com/piascwal/fighting-friends). On marque en tirant, en reprenant de la
tête ou de volée, et on se débarrasse de l'adversaire à coups de poing. Les frappes réussies remplissent la
jauge du **super tir** : un ballon de feu qui renverse le joueur qu'il percute.

Jouer : **https://piascwal.github.io/foot-friends/**

- **1 joueur** contre l'ordinateur (facile, normal, difficile) ou **2 joueurs** sur le même clavier.
- Matchs de 60, 90 ou 120 secondes ; en cas d'égalité, **but en or**.
- Clavier, manettes et écran tactile (à l'horizontale).

|                                | Joueur 1  | Joueur 2         |
| ------------------------------ | --------- | ---------------- |
| Courir                         | Q / D     | ← / →            |
| Sauter (tête)                  | Z         | ↑                |
| Tir (volée en l'air)           | F         | K (ou 1 du pavé) |
| Coup de poing (smash en l'air) | G         | L (ou 2)         |
| Super tir (jauge pleine)       | H         | M (ou 3)         |
| Pause                          | Échap / P |                  |

## Les sprites viennent de la banque

Les images des personnages ne sont **pas** dans ce dépôt : elles viennent de la banque de sprites
([sprite-bank](https://github.com/piascwal/sprite-bank)), comme pour Fighting Friends.

- `sprites.json` fixe la version : `v2` = la plus récente des `v2.x`, `v2.4` = cette version exacte.
- `npm run sprites` télécharge cette version de la banque et lance son script de copie : seules les poses
  demandées par le jeu sont copiées dans `public/assets/characters/` (non versionné).
- Les poses demandées sont dans `src/data/poses.ts` (garde, portrait, course, saut, tir, super tir, poing,
  volée, smash, sonné, victoire). Le jeu les publie dans la banque :
  `npm run needs -- ../sprite-bank/games/foot-friends.json`. L'atelier de la banque montre alors, pour chaque
  personnage, ce qui manque à Foot Friends.
- Une pose absente est remplacée par sa pose de repli (`fb`) ; seule la garde (`idle`) est obligatoire.
- Les réglages de l'atelier (échelle, décalage de chaque image) sont appliqués comme dans Fighting Friends.

Pour récupérer un nouveau personnage ou une image refaite : relancer la construction (onglet **Actions**,
**Run workflow**).

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
