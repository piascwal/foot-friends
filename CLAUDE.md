# Consignes pour les agents

- Lire `README.md` avant toute modification et respecter ses couches (`src/data` → `src/engine` → …).
- Toute modification se termine par `npm run check` (types + lint + tests) et `npm run format`.
- Une règle de jeu modifiée ou ajoutée s'accompagne d'un test dans `tests/`.
- Les sprites viennent de la banque (`sprite-bank`) : ne jamais les versionner ici. Une nouvelle pose
  s'ajoute à `src/data/poses.ts`, puis `npm run needs -- ../sprite-bank/games/foot-friends.json`.
- Commentaires et textes du jeu en français.
