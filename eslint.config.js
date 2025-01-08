import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import astroPlugin from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  eslint.configs.recommended,
  ...astroPlugin.configs.recommended,
  ...astroPlugin.configs['jsx-a11y-recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        Headers: 'readonly',
        App: 'readonly',
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.astro'],
    plugins: {
      astro: astroPlugin,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      parser: astroPlugin.parser,
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
        sourceType: 'module',
      },
    },
    rules: {
      ...astroPlugin.configs.recommended.rules,
      ...astroPlugin.configs['jsx-a11y-recommended'].rules,
    },
  },
];
