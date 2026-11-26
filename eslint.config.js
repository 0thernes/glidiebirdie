import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'docs/assets/**', 'lean/.lake/**', 'paper/build/**', '_site/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'game.js', 'service-worker.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.serviceworker },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: [
      'tests/**/*.mjs',
      'tests/**/*.js',
      'tools/**/*.mjs',
      'scripts/**/*.mjs',
      'examples/**/*.mjs',
      'eslint.config.js',
      'playwright.config.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
