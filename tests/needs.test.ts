/* Les besoins publiés dans la banque correspondent aux poses que le jeu sait afficher. */
import { describe, expect, it } from 'vitest';
import { POSES, POSE_BY_KEY, SPRITE_NEEDS } from '../src/data/poses';
import sprites from '../sprites.json';

describe('besoins en sprites', () => {
  it('le jeu se déclare à la banque sous le nom de sprites.json', () => {
    expect(SPRITE_NEEDS.game).toBe(sprites.game);
    expect(SPRITE_NEEDS.common).toEqual(POSES.map((p) => p.key));
  });

  it('chaque pose a un cadrage, et ses replis sont des poses demandées', () => {
    for (const pose of POSES) {
      if (pose.key !== 'portrait') expect(pose.h ?? pose.w, pose.key).toBeGreaterThan(0);
      for (const fb of pose.fb) expect(POSE_BY_KEY[fb], `${pose.key} → ${fb}`).toBeDefined();
    }
  });

  it('la pose de repos, la seule obligatoire, n’a pas de repli', () => {
    expect(POSE_BY_KEY.idle.fb).toEqual([]);
  });
});
