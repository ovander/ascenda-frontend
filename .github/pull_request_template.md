## What and why

<!-- What this changes and why. Link the issue if there is one ("Closes #…"). -->

## How it was tested

<!-- New or changed tests, and anything checked in the browser. Screenshots for visible changes. -->

- [ ] `vue-tsc -b`, `npm run lint` (no errors), `vitest run` pass
- [ ] `node scripts/check-i18n.mjs` passes (new strings in `en.json` and `fr.json`)
- [ ] `playwright test` passes
- [ ] A line is added under `## [Unreleased]` in `CHANGELOG.md`

## Deploy notes

<!-- Delete what does not apply. -->
- Needs backend release: <!-- version or PR, deploy the backend first -->
- New or changed `VITE_*` variable: <!-- name, also in .env.production -->
