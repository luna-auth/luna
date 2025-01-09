import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import astroPlugin from 'eslint-plugin-astro';

// Define shared globals that should be available in all files
const sharedGlobals = {
  console: 'readonly',
  process: 'readonly',
  crypto: 'readonly',
  TextEncoder: 'readonly',
  Headers: 'readonly',
  App: 'readonly',
  Response: 'readonly',
  Request: 'readonly',
  FormData: 'readonly',
  fetch: 'readonly',
  URLPattern: 'readonly',
  URL: 'readonly',
};

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: sharedGlobals,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    // TypeScript files configuration
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: sharedGlobals,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Astro config using the recommended setup
  {
    files: ['**/*.astro'],
    ...astroPlugin.configs.recommended,
    ...astroPlugin.configs['jsx-a11y-recommended'],
    languageOptions: {
      globals: sharedGlobals,
    },
  },
];