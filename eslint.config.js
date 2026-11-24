// Règles de qualité. Les couches décrites dans README.md sont vérifiées ici :
// un import interdit entre couches fait échouer `npm run lint`.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Les couches du projet et ce que chacune a le droit d'importer. */
const LAYERS = {
  data: [],
  engine: ['data'],
  assets: ['data'],
  audio: ['engine'],
  input: ['engine'],
  render: ['data', 'engine', 'assets'],
  ui: ['data', 'engine', 'assets', 'render', 'audio', 'input'],
};
const layerNames = Object.keys(LAYERS);

const boundaryRules = layerNames.map((layer) => {
  const forbidden = layerNames.filter((other) => other !== layer && !LAYERS[layer].includes(other));
  return {
    files: [`src/${layer}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: forbidden.map((other) => ({
            group: [`**/${other}/**`, `**/${other}`],
            message: `La couche « ${layer} » ne doit pas dépendre de « ${other} » (voir README.md).`,
          })),
        },
      ],
    },
  };
});

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public/assets'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 90, skipBlankLines: true, skipComments: true }],
      eqeqeq: 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  ...boundaryRules,
  {
    // le moteur tourne sans navigateur : c'est ce qui le rend testable
    files: ['src/engine/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'localStorage', 'navigator', 'performance', 'requestAnimationFrame'].map(
          (name) => ({ name, message: 'Le moteur et les données ne touchent pas au navigateur.' }),
        ),
      ],
    },
  },
  {
    files: ['scripts/**/*.ts', '*.config.ts', '*.config.js'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  { files: ['tests/**/*.ts'], rules: { 'max-lines-per-function': 'off' } },
  prettier,
);
