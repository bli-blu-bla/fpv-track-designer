import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-viewer']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Dependency direction: core <- scene <- viewer / editor. The viewer bundle must never pull in editor code.
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@/editor/*', '@/scene/*', '@/viewer/*', '@/components/*', '**/editor/**', '**/scene/**', '**/viewer/**'], message: 'core is framework-free domain logic; it must not import app layers.' },
        { group: ['react', 'react-dom', 'react-dom/*', '@react-three/*'], message: 'core must not depend on React.' },
      ] }],
    },
  },
  {
    files: ['src/scene/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@/editor/*', '@/viewer/*', '**/editor/**', '**/viewer/**'], message: 'scene is shared by editor and viewer; pass state in via props/context instead.' },
      ] }],
    },
  },
  {
    files: ['src/viewer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@/editor/*', '**/editor/**'], message: 'The read-only viewer must not import editor code.' },
      ] }],
    },
  },
])
