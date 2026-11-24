/* Publie les besoins en sprites de Foot Friends pour la banque (dépôt sprite-bank) : la liste des poses.
   À relancer quand une pose est ajoutée à src/data/poses.ts :
     npm run needs -- ../sprite-bank/games/foot-friends.json */
import { writeFileSync } from 'node:fs';
import { SPRITE_NEEDS } from '../src/data/poses';

const out = process.argv[2];
if (!out) throw new Error('Chemin du fichier à écrire attendu (ex. ../sprite-bank/games/foot-friends.json)');
writeFileSync(out, `${JSON.stringify(SPRITE_NEEDS, null, 2)}\n`);
console.log(`Besoins de Foot Friends : ${SPRITE_NEEDS.common.length} poses → ${out}`);
