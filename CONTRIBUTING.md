# Contributing to the Ascenda frontend

Thank you for your interest. Ascenda is two repositories: this Vue web app and the Go API,
[`ovander/ascenda-backend`](https://github.com/ovander/ascenda-backend). Contributions are
accepted under the project's licence, [AGPL-3.0](LICENSE).

## Development setup

Requirements: Node 24 (`.nvmrc`), and a running backend for anything past the landing page.

```bash
git clone https://github.com/ovander/ascenda-frontend && cd ascenda-frontend
npm ci
# Point the app at your backend and identity provider: VITE_API_BASE_URL,
# VITE_SOCRATE_BASE_URL, VITE_SOCRATE_CLIENT_ID, VITE_SOCRATE_REDIRECT_URI
# (see README.md → Getting Started and .env.production for the names).
npm run dev
```

## Project layout

- `src/features/<domain>/` — one folder per business area (`views/`, `components/`, `stores/`,
  `utils/`).
- `src/components`, `src/composables`, `src/stores`, `src/utils` — shared pieces. API calls go
  through `src/composables/useApi.ts`.
- `src/locales/en.json`, `fr.json` — every user-visible string, in both languages (French is the
  default).
- `src/router/index.ts` — routes and the `accessGuard` that applies their access rules.
- `e2e/` — Playwright tests; `public/landing.html` — the static landing page.

## Tests and checks

Run these before opening a pull request; CI runs the same and both CI checks are required:

```bash
npx vue-tsc -b
npm run lint
npx vitest run
node scripts/check-i18n.mjs
npm audit --omit=dev --audit-level=high
npx vite build
npx playwright test
```

- Unit tests sit next to the code (`*.spec.ts`).
- End-to-end tests mock the API (`e2e/fixtures.ts`) and never reach a real backend. Select
  elements with `data-test` attributes.
- A bug fix comes with a test that fails without it.

## Pull requests

1. Branch from `main` (`feat/…`, `fix/…`, `chore/…`, `docs/…`).
2. Commit with [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
   `chore:`, `docs:`, `ci:`, `test:`).
3. Add a line under `## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md).
4. Open the PR with the template filled in, with screenshots for visible changes, and say if it
   needs a backend release first.
5. CI must be green. The maintainer reviews and merges.

## Releases

The maintainer tags releases `vX.Y.Z` on `main` and deploys them with `scripts/push.sh`, which
refuses an untagged or dirty tree. The deploy SSH settings come from
`~/.config/ascenda/deploy.env`; see the script's header.

## Security

Please do not open a public issue for a vulnerability. See [SECURITY.md](SECURITY.md).
