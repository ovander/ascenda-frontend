// ESLint flat config (ESLint 10).
//
// Layers, from general to specific:
//   1. eslint-plugin-vue "essential": rules that catch real bugs in SFCs
//      (unused refs, invalid v-for keys, duplicate attributes, ...).
//   2. @vue/eslint-config-typescript "recommended": typescript-eslint's
//      recommended set wired for <script setup lang="ts"> blocks.
//   3. Per-directory globals: browser for the app, node for scripts, config
//      files and the Playwright suite.
//
// `npm run lint` must pass on every pull request (see .github/workflows/ci.yml);
// `npm run lint:fix` applies the auto-fixable part.
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default defineConfigWithVueTs(
  {
    name: 'app/files',
    files: ['**/*.{ts,mts,tsx,vue,js,mjs,cjs}'],
  },
  {
    name: 'app/ignores',
    ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'node_modules/**'],
  },

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  {
    name: 'app/rules',
    rules: {
      // `_`-prefixed names are the project's convention for intentionally
      // unused parameters and rest-destructuring leftovers.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // Backlog: ~320 explicit `any` in application code when the linter was
      // introduced. Reported as warnings so the count is visible on every run;
      // `npm run lint` caps them (--max-warnings in package.json): lower the cap
      // as the backlog shrinks, never raise it. Flip to 'error' at zero.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // API calls go through src/composables/useApi.ts (base URL, bearer token,
    // silent refresh). Types and helpers such as isAxiosError stay importable.
    name: 'app/api-boundary',
    files: ['src/**/*.{ts,vue}'],
    ignores: [
      'src/composables/useApi.ts',
      // Token exchange, refresh and logout run before or outside useApi.
      'src/stores/auth.ts',
      // Public sign-in forms on the landing page: no session yet.
      'src/features/landing/components/LandingLogin.vue',
      'src/features/landing/components/LandingSignup.vue',
      '**/*.{spec,test}.ts',
      'src/test/**',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'axios',
          importNames: ['default'],
          message: 'Call the API through useApi() (src/composables/useApi.ts).',
        }],
      }],
      'no-restricted-globals': ['error',
        { name: 'fetch', message: 'Call the API through useApi() (src/composables/useApi.ts).' },
        { name: 'XMLHttpRequest', message: 'Call the API through useApi() (src/composables/useApi.ts).' },
      ],
    },
  },
  {
    name: 'app/tests',
    files: ['**/*.{spec,test}.{ts,mts,tsx}', 'src/test/**', 'e2e/**'],
    rules: {
      // Test doubles and mocked API payloads are typed loosely on purpose.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    name: 'app/browser',
    files: ['src/**'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    name: 'app/node',
    files: ['e2e/**', 'scripts/**', '*.config.{js,mjs,ts,mts}'],
    languageOptions: { globals: { ...globals.node } },
  },
)
