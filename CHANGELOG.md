# Changelog

All notable changes to the Ascenda frontend. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/). Numbers like (#23) are pull requests
in this repository. Entries before 1.2.0 are rebuilt from the release tags.

## [Unreleased]

### Changed
- Production build signs in at the new Socrate, `https://socrate.vandermoten.eu`, with its client
  ID `cVqYPgs3uGZYgw1x6F3aOQ` (`.env.production`). Deploy together with the backend cut-over.

## [1.5.0] - 2026-09-29

### Added
- Contributor files: `CLAUDE.md`, `CONTRIBUTING.md`, this changelog, `SECURITY.md`,
  `CODEOWNERS`, issue and pull-request templates (#26).
- CI gates: unit-test coverage floors (`vite.config.ts`), a cap of 318 ESLint warnings, and lint
  rules that keep raw `fetch` and the default axios import out of the app outside `useApi.ts`,
  the auth store and the landing forms (#27).
- Release workflow: a `vX.Y.Z` tag publishes a GitHub Release with its `CHANGELOG.md` section as
  notes and the production build as a tarball (#27).

## [1.4.0] - 2026-09-29

### Added
- Magic-link sign-in: new `/magic-link` page that redeems Socrate's e-mailed link through the
  backend and opens the page the user asked for (#23).
- AGPL-3.0 licence (#25).
- Socrate v1.3.0 compatibility report (#21, #24).

### Changed
- `scripts/push.sh` reads the VPS SSH settings from `~/.config/ascenda/deploy.env` (#25).

### Fixed
- Token refresh keeps the rotated refresh token; logout revokes it (#22).
- Both landing pages post the magic-link and sign-up forms to the API instead of the frontend
  host (#23).

## [1.3.4] - 2026-09-26

### Changed
- Pinia 4 and vue-router 5; Sentry 10; the navigation guard returns its redirect instead of
  calling `next()` (#20).

## [1.3.3] - 2026-09-26

### Changed
- Vitest 5 (#18).

### Fixed
- Scenario wizard: deprecated `Dropdown` and `Steps` replaced with `Select` and `Stepper`; the
  step bar follows the current step and earlier steps are clickable (#19).

## [1.3.2] - 2026-09-26

### Changed
- TypeScript 6.0; `baseUrl` removed, `@/*` path mapping relative (#17).

## [1.3.1] - 2026-09-26

### Fixed
- Products labelled by their driver: prize money in events, contracts as contract revenue;
  margins tab only where indirect sales exist (#15).
- Year grids: only amounts follow the €/k€/M€ unit; margins and incentive % entered as real
  percentages (#16).

## [1.3.0] - 2026-09-26

### Changed
- Tailwind CSS 4 (Vite plugin); layout unchanged (#14).
- Node 24 everywhere; vue-i18n 11; `@primeuix/themes`; Vue, PrimeVue, vue-tsc, Playwright and
  test-utils updates (#13).

## [1.2.2] - 2026-09-26

### Added
- About Ascenda (user menu) and a System section on the admin dashboard: version, commit, build
  time and toolchain of the app and the server (#11).

### Removed
- Cost variability factors from the product form, cards and wizard (#12).

### Fixed
- Inter and Sora fonts load again; CSS minified (#10).

## [1.2.1] - 2026-09-26

### Changed
- One-command deploy with a version guard; the site serves `/VERSION` (#9).

## [1.2.0] - 2026-09-25

### Added
- Athlete drivers: competition (prize money) and contract (sponsorship) forms, with live results
  and impossible-result warnings (#7); tour presets for Europe and the United States, coach as an
  annual fee plus a share of winnings (#8).
- CI workflow: typecheck, unit tests, i18n, audit, build, Playwright (#4); ESLint gating CI (#6).

### Fixed
- Playwright auth specs aligned with the PKCE redirect and the `/landing` guard (#5).

### Security
- User content escaped in print popups (stored XSS) (#2).
- All npm audit advisories fixed (#3).

## [1.1.0] - 2026-04-24

### Fixed
- Deploy script for the reference model: no circular symlink, first deploy converts the
  directory, release paths readable by the web server.

## [1.0.1] - 2026-04-24

### Added
- Landing page, sign-in flow, deploy scripts.

## [1.0.0] - 2026-04-23

### Added
- First production release: responsive layout, French and English, AI modules.

## [0.1.0] - 2026-03-27

### Added
- Initial frontend and README.

[Unreleased]: https://github.com/ovander/ascenda-frontend/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/ovander/ascenda-frontend/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ovander/ascenda-frontend/compare/v1.3.4...v1.4.0
[1.3.4]: https://github.com/ovander/ascenda-frontend/compare/v1.3.3...v1.3.4
[1.3.3]: https://github.com/ovander/ascenda-frontend/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/ovander/ascenda-frontend/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/ovander/ascenda-frontend/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/ovander/ascenda-frontend/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/ovander/ascenda-frontend/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/ovander/ascenda-frontend/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/ovander/ascenda-frontend/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ovander/ascenda-frontend/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/ovander/ascenda-frontend/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/ovander/ascenda-frontend/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/ovander/ascenda-frontend/releases/tag/v0.1.0
