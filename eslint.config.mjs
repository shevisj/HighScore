import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'public/**',
      'docs/**',
      // generated barrel files (barrelsby)
      'src/home/index.ts',
      'src/scores/index.ts',
      // tooling / config files
      'jest.config.js',
      'processes.config.js',
      'scripts/**',
      'eslint.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // The Ts.ED + mongoose code legitimately uses `any` in a few spots
      // (loose request bodies, dynamic meta fields).
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
);
