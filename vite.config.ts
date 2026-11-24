import { defineConfig } from 'vitest/config';

// base relative : le jeu fonctionne aussi bien à la racine que sous /foot-friends/ (GitHub Pages)
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
