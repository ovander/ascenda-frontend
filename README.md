# Ascenda Frontend

> The financial planning interface that turns complex models into clear decisions.

Ascenda is an **AI-powered financial planning and decision intelligence platform** for startups and growing companies. This repository contains the frontend — a Vue 3 single-page application that gives founders and operators a structured, intuitive interface to build financial models, run scenario simulations, visualise data, and interact with AI-generated insights.

---

## Table of Contents

- [Why Ascenda](#why-ascenda)
- [Business Drivers](#business-drivers)
- [Positioning](#positioning)
- [What Users Can Do](#what-users-can-do)
- [Key Features](#key-features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Backend Integration](#backend-integration)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Status](#status)

---

## Why Ascenda

Traditional financial tools are either:

- **Spreadsheet-based** → flexible but error-prone, non-collaborative, and impossible to scale
- **Enterprise FP&A platforms** → powerful but complex, expensive, and inaccessible to early-stage teams

Ascenda fills the gap: a structured financial modelling platform with the usability of a product and the rigour of a CFO-grade tool — augmented by AI so teams can not only compute their financials, but understand and act on them.

---

## Business Drivers

Ascenda is built on a set of concrete advantages over existing approaches:

- **Business model awareness** — Ascenda natively models the most common startup archetypes. Revenue drivers, cost structures, and KPIs adapt to the selected model — so the plan reflects reality, not a generic template.

  | Model | Revenue Driver |
  |---|---|
  | 📋 Generic | Volumes and unit costs entered manually — fits any product or service |
  | 🤝 Consulting / Service | Billable days = Headcount × Working Days × Utilisation |
  | ☁️ SaaS / Subscription | Revenue = Active Users × Monthly Fee × 12 |
  | 🏭 Manufacturing / Industry | Sales-volume forecast with unit cost adjusted for scrap rate and setup amortisation |
  | 🛒 Marketplace / Platform | Net revenue = GMV × Take Rate |
  | 📺 Media / Advertising | Revenue per mille = CPM × Fill Rate |
  | 🎓 Training / Events | Revenue = Sessions × Participants × Fill Rate × Price/participant |
- **Accuracy over flexibility** — A deterministic engine eliminates the formula errors, broken references, and version drift inherent to spreadsheet-based modelling.
- **Speed to insight** — Computed outputs update instantly as inputs change. No manual recalculation, no rebuild cycles.
- **Scenario intelligence** — Multiple scenarios live within the same structured model, enabling true side-by-side comparison rather than duplicated files.
- **AI that understands context** — AI narration and insights are grounded in the live financial model, not generic prompts. The AI knows the numbers.
- **Investor-ready by default** — Reports, cap table outputs, and financial summaries are structured for due diligence from day one.
- **Reduced dependency on finance specialists** — Founders can build and iterate on their own models with guardrails that prevent structural errors.
- **Auditability and versioning** — Every change is tracked. Snapshots allow point-in-time comparison and rollback.

---

## Positioning

Ascenda is built as a **Financial Operating System** for startups:

- Not just reporting → **decision-making**
- Not just spreadsheets → **structured models with auditability**
- Not just dashboards → **actionable insights powered by AI**

It bridges three worlds:

- CFO-grade financial modelling
- Founder-level usability
- AI-assisted interpretation and narration

---

## What Users Can Do

- Build and edit multi-year financial models (P&L, cash flow, balance sheet)
- Define products, price structures, revenue drivers, and growth assumptions
- Plan headcount, salaries, incentives, CapEx, and OpEx
- Run scenario simulations and compare outcomes side by side
- Manage cap table, funding rounds, option plans, and dilution waterfall
- Perform break-even and unit economics analysis
- Explore monthly and annual charts across all financial dimensions
- Generate investor-ready full financial reports
- Interact with AI narration to explain, validate, and optimise their plan
- Track changes via audit trail and point-in-time snapshots

---

## Key Features

**Financial Modelling Engine**
Full multi-year model across P&L, cash flow, balance sheet, WCR, ratios, and budget — all derived from a single deterministic compute engine on the backend.

**Scenario Simulation**
Create, clone, and compare multiple scenarios within a plan. Quickly explore base case, optimistic, and downside projections.

**AI-Powered Insights**
AI narration, assumption review, unit economics analysis, investor memo generation, and more — all triggered in-app and grounded in the live model.

**Cap Table & Financing**
Full shareholder registry, funding rounds, stock option plans, FastValo valuation scenarios, dilution waterfall, and InGeFiE compliance reporting.

**Break-Even Analysis**
Snapshot-based BEP module with fixed/variable cost classification, sensitivity analysis, and optimisation plan tooling.

**Interactive Charts & Dashboards**
Annual and monthly chart dashboards covering sales analysis, cost structure, P&L cascade, balance sheet structure, headcount evolution, and cash position.

**Tier-Gated Access**
Feature availability scales with subscription tier (Starter → Standard → Pro → Enterprise), enforced at both the route and API level.

**Multi-language UI**
Full French and English localisation, with French as the default locale.

**Snapshots & Audit Trail**
Point-in-time scenario snapshots with diff comparison; full audit trail for all user actions and data exports.

---

## Screenshots

> _Screenshots will be added as the product stabilises._

| Dashboard | Scenario P&L | AI Narration |
|---|---|---|
| ![Dashboard](./docs/screenshots/dashboard.png) | ![P&L](./docs/screenshots/pnl.png) | ![AI](./docs/screenshots/ai-narration.png) |

| Graphs | Cap Table | Break-Even |
|---|---|---|
| ![Graphs](./docs/screenshots/graphs.png) | ![Cap Table](./docs/screenshots/captable.png) | ![BEP](./docs/screenshots/bep.png) |

---

## Tech Stack

| Concern | Library / Version |
|---|---|
| Framework | [Vue 3](https://vuejs.org/) (v3.5) |
| Build tool | [Vite](https://vitejs.dev/) (v8) |
| Language | TypeScript (v5.9) |
| State management | [Pinia](https://pinia.vuejs.org/) (v3) |
| Routing | [Vue Router](https://router.vuejs.org/) (v4) |
| UI components | [PrimeVue](https://primevue.org/) (v4, Aura theme) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) (v3) |
| Charts | [Chart.js](https://www.chartjs.org/) + [vue-chartjs](https://vue-chartjs.org/) |
| HTTP client | [Axios](https://axios-http.com/) |
| Decimal arithmetic | [Decimal.js](https://mikemcl.github.io/decimal.js/) |
| Form validation | [Vee-validate](https://vee-validate.logaretm.com/) + [Yup](https://github.com/jquense/yup) |
| Internationalisation | [Vue i18n](https://vue-i18n.intlify.dev/) (FR / EN) |
| Unit tests | [Vitest](https://vitest.dev/) |
| E2E tests | [Playwright](https://playwright.dev/) |

---

## Architecture

The frontend follows a **feature-module architecture** — each financial domain lives in its own self-contained module under `src/features/`.

```
src/
├── components/
│   ├── common/        # Shared UI primitives (KChart, KCurrency, KMonthGrid, ...)
│   └── layout/        # AppShell, AppSidebar, AppTopbar
├── composables/       # Shared logic (useApi, useAuth, useTierGate, usePlanAccess, ...)
├── features/          # 26 feature modules (one per financial domain)
│   ├── ai/            # AI narration & insights
│   ├── bep/           # Break-even analysis (Pro)
│   ├── bsheet/        # Balance sheet
│   ├── budget/        # Monthly budget
│   ├── captable/      # Cap table (Pro)
│   ├── graphs/        # Annual & monthly charts
│   ├── pnl/           # Profit & loss
│   ├── report/        # Full financial report
│   ├── scenarios/     # Scenario management
│   ├── snapshots/     # Version snapshots
│   ├── staff/         # Headcount & payroll
│   └── ...            # + 15 more modules
├── plugins/           # Vue plugins (PrimeVue, Chart.js, i18n)
├── router/            # Vue Router with RBAC navigation guards
├── stores/            # Core Pinia stores (auth, tenant, planMembers, displayUnit, ui)
├── types/             # Shared TypeScript types
└── utils/             # Formatting, constants, logger
```

### State Management

Pinia stores are split into two layers:

- **Core stores** (`src/stores/`) — cross-cutting state: authentication, tenant context, plan membership, display unit preference, and UI flags
- **Feature stores** (`src/features/<module>/stores/`) — domain-specific state, co-located with the feature that owns it

### Routing & Access Control

Vue Router is configured with four navigation guard types:

- `requiresAuth` — redirects unauthenticated users to login
- `requiresPro` — blocks Standard tier tenants from Pro-only routes (cap table, BEP)
- `requiresAdmin` — restricts platform admin routes
- `requiresEditor` — restricts write actions to users with edit permission on the plan

### Display Units

A global `displayUnit` store lets users toggle between €, k€, and M€. All computed values scale accordingly without re-fetching from the API.

---

## Backend Integration

The frontend communicates with the [Ascenda backend](../backend/README.md) via a REST API.

- **Base URL** configured via `VITE_API_BASE_URL`
- **Authentication** via JWT bearer tokens, managed by `useApi.ts` with automatic token refresh on 401
- **Multi-tenancy** — tenant context is derived from the authenticated user's JWT and scoped on every request
- **Rate limiting** — batch endpoints (e.g. `/graphs/annual/all`) are used where multiple datasets are needed simultaneously, to avoid exhausting per-tenant rate limits
- **Tier gating** — feature availability is enforced both client-side (route guards, `useTierGate`) and server-side (backend middleware)

---

## Getting Started

### Prerequisites

- Node.js 20+
- A running instance of the [Ascenda backend](../backend/README.md)

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
# Edit .env with your API URL and OAuth credentials
```

### Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

### Run tests

```bash
npm run test           # unit tests (Vitest)
npm run test:coverage  # with coverage report
npm run test:e2e       # end-to-end tests (Playwright)
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Ascenda backend base URL | `http://localhost:3000` |
| `VITE_SOCRATE_CLIENT_ID` | OAuth2 client ID | — |
| `VITE_SOCRATE_BASE_URL` | Socrate OAuth2 server base URL | `https://auth.ascenda.com` |
| `VITE_SOCRATE_REDIRECT_URI` | OAuth2 redirect URI | `http://localhost:5173/callback` |
| `VITE_DEFAULT_LOCALE` | Default UI language (`fr` or `en`) | `fr` |

---

## Status

The Ascenda frontend is under active development.

Current focus:
- Stabilising core financial modelling views
- Expanding AI-assisted insight features
- Polishing chart dashboards and report generation
- Preparing for production-grade SaaS deployment
