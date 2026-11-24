/* Récupère les sprites des personnages dans la banque (dépôt sprite-bank) et les copie dans
   public/assets/characters/. Lancé avant chaque construction (npm run sprites, et dans la CI).

   sprites.json fixe la version : « v2 » = la plus récente des v2.x (les ajouts arrivent tout seuls),
   « v2.4 » = cette version exacte (pour figer le jeu). La copie est faite par le script de la banque
   (scripts/copy-for-game.mjs) : il ne copie que les images que ce jeu demande (games/foot-friends.json).
   Si la version téléchargée ne connaît pas encore ce jeu, on lui passe nos besoins (src/data/poses.ts).
   Le dossier copié n'est pas versionné ici. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SPRITE_NEEDS } from '../src/data/poses';

const ROOT = new URL('..', import.meta.url).pathname;
const TARGET = join(ROOT, 'public/assets/characters');
const config = JSON.parse(readFileSync(join(ROOT, 'sprites.json'), 'utf8')) as {
  repo: string;
  game: string;
  version: string;
};

const run = (command: string, ...args: string[]) =>
  execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

/** Le tag demandé : exact (v2.4) ou le plus récent d'une version majeure (v2). */
function resolveTag(wanted: string): string {
  const tags = run('git', 'ls-remote', '--tags', '--refs', config.repo)
    .split('\n')
    .map((line) => line.split('refs/tags/')[1])
    .filter((tag): tag is string => !!tag);
  if (tags.includes(wanted) && wanted.includes('.')) return wanted;
  const minors = tags
    .map((tag) => tag.match(new RegExp(`^${wanted.replace('.', '\\.')}\\.(\\d+)$`)))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => Number(m[1]));
  if (!minors.length) throw new Error(`Aucune version ${wanted} dans ${config.repo}`);
  return `${wanted}.${Math.max(...minors)}`;
}

const tag = resolveTag(config.version);
const work = mkdtempSync(join(tmpdir(), 'sprite-bank-'));
try {
  run(
    'git',
    '-c',
    'advice.detachedHead=false',
    'clone',
    '--quiet',
    '--depth',
    '1',
    '--branch',
    tag,
    config.repo,
    work,
  );
  const script = join(work, 'scripts/copy-for-game.mjs');
  let report: string;
  if (existsSync(join(work, 'games', `${config.game}.json`))) {
    report = run('node', script, config.game, TARGET).trim();
  } else {
    const bank = (await import(pathToFileURL(script).href)) as {
      copyForNeeds: (needs: unknown, dest: string) => { characters: number; copied: number };
    };
    const { characters, copied } = bank.copyForNeeds(SPRITE_NEEDS, TARGET);
    report = `${characters} personnages, ${copied} images copiées (besoins du jeu, pas encore publiés dans ${tag})`;
  }
  writeFileSync(join(TARGET, 'VERSION'), `${tag}\n`);
  console.log(`Sprites ${tag} → public/assets/characters/ : ${report}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
