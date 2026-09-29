# CLAUDE.md — ascenda-frontend

Standing instructions for Claude Code in this repository. Read this file and `CONTRIBUTING.md`
before any change. The API lives in `ovander/ascenda-backend`; many changes touch both.

## Project in one paragraph

Ascenda is a financial-planning SaaS for startups and SMEs: multi-year business plans (P&L, cash
flow, balance sheet, WCR, break-even, cap table), scenario simulation and AI narration. This
repository is the web app: Vue 3 single-page application in TypeScript, Vite, Pinia, vue-router,
PrimeVue 4 and Tailwind CSS 4, with French (default) and English. Sign-in is the Socrate OAuth
2.1 authorization-code flow with PKCE, started here and exchanged by the backend.

## Sources of truth, in order

1. The code. Read it before proposing changes; do not describe code you have not opened.
2. The backend's router and handlers for API shapes: check the response the backend really
   sends (a unit test that mocks a shape the backend never returns hid a logout bug once).
3. `SOCRATE-COMPAT-REPORT.md` for the identity-provider contract.

## Hard rules

- **Layout.** A feature lives in `src/features/<domain>/` (`views/`, `components/`, `stores/`,
  `utils/`); shared pieces in `src/components`, `src/composables`, `src/stores`, `src/utils`.
- **API calls** go through `src/composables/useApi.ts` (base URL, bearer token, silent refresh).
  Do not call the API with raw `fetch`/`axios` elsewhere; the auth store and the public sign-in
  pages are the only exceptions.
- **Tokens** stay in memory (Pinia). Never put an access or refresh token in `localStorage`,
  `sessionStorage` or a URL. Refresh tokens rotate: always keep the newest one.
- **Access rules** are in the router's `accessGuard` (route `meta`); the backend enforces the
  same rules, so the UI never relaxes them on its own.
- **Strings.** Every user-visible string is an i18n key present in both `src/locales/en.json` and
  `src/locales/fr.json` (`scripts/check-i18n.mjs` checks it in CI). French is the default.
- **User content in HTML.** Print views build HTML strings: pass every user value through
  `src/utils/escapeHtml.ts`. Never `v-html` user content.
- **Never weaken a gate** to get green: no skipped tests, no `eslint-disable` or `@ts-expect-error`
  without a one-line reason, no removed required check.
- **Secrets** never enter the repository. `.env.production` holds public values only (they end up
  in the served JavaScript). Deploy SSH settings live in `~/.config/ascenda/deploy.env`.
- **Scope.** One change per PR; do not widen a PR with unrelated fixes.

## Local gate (the same checks as CI)

```bash
npm ci
npx vue-tsc -b                      # Typecheck
npm run lint                        # ESLint: no errors
npx vitest run                      # unit tests
node scripts/check-i18n.mjs         # every key in en.json and fr.json
npm audit --omit=dev --audit-level=high
npx vite build
npx playwright test                 # e2e, against the production build
```

Node 24 (`.nvmrc`). Both CI checks, "Typecheck, unit tests, audit, build" and "Playwright e2e",
are required on `main`.

## Tests

- Unit tests sit next to the code (`*.spec.ts`, Vitest with jsdom).
- End-to-end tests are in `e2e/` (Playwright, Chromium). They never reach a real backend or the
  identity provider: `e2e/fixtures.ts` mocks the API (`mockApiCalls`) and injects a signed-in
  user (`injectAuth`). Select elements with `data-test` attributes.
- A bug fix comes with a test that fails without it.

## Git workflow

- Branch from `main`: `feat/…`, `fix/…`, `chore/…`, `ci/…`, `docs/…`. Conventional Commits.
- Open a PR; never push to `main`, never force-push a shared branch, never merge with red CI.
  The owner merges; merged branches are deleted automatically.
- Each PR adds a line under `## [Unreleased]` in `CHANGELOG.md`, and says in its body what it
  changes, how it was tested, and whether it needs a backend release first.

## Releases and deploys (the owner runs them)

- A release is an annotated tag `vX.Y.Z` on `main`, with the `[Unreleased]` changelog section
  moved under the new version. Do not tag unless asked.
- `scripts/push.sh` builds with `.env.production`, uploads and deploys a tag;
  `scripts/version-guard.sh` refuses a dirty or untagged tree. Deploy after the backend when the
  API changed.
- `/landing` is also served as the static `public/landing.html` on a full page load; its API
  address is filled in at build time (`%VITE_API_BASE_URL%`, see `vite.config.ts`). Keep both
  landing pages in step.
