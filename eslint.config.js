import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const POCKETBASE_SDK_RESTRICTION = {
  group: ['pocketbase', 'pocketbase/*'],
  message: 'The PocketBase SDK is editor-only (src/editor/api). Use the fetch client in src/core/api instead.',
}

export default defineConfig([
  globalIgnores(['dist', 'dist-viewer', 'pocketbase/pb_data']),
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
        POCKETBASE_SDK_RESTRICTION,
      ] }],
    },
  },
  {
    files: ['src/scene/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@/editor/*', '@/viewer/*', '**/editor/**', '**/viewer/**'], message: 'scene is shared by editor and viewer; pass state in via props/context instead.' },
        POCKETBASE_SDK_RESTRICTION,
      ] }],
    },
  },
  {
    files: ['src/viewer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@/editor/*', '**/editor/**'], message: 'The read-only viewer must not import editor code.' },
        POCKETBASE_SDK_RESTRICTION,
      ] }],
    },
  },
  // The PocketBase SDK is editor-only and lives behind src/editor/api; everything else talks to src/core/api.
  // (Flat config: a later `no-restricted-imports` replaces an earlier one, so layer blocks list it themselves.)
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}', 'src/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [POCKETBASE_SDK_RESTRICTION] }],
    },
  },
  {
    files: ['src/editor/**/*.{ts,tsx}'],
    ignores: ['src/editor/api/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { ...POCKETBASE_SDK_RESTRICTION, message: 'Use the PocketBase SDK only inside src/editor/api.' },
      ] }],
    },
  },
])
