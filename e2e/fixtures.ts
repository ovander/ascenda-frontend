/**
 * Shared E2E test fixtures and helpers.
 *
 * Strategy
 * --------
 * The app uses Pinia in-memory state for authentication (no localStorage).
 * To test protected routes without a real backend + OAuth flow we:
 *   1. Intercept all /api/v1/** requests and return mock JSON.
 *   2. Load the app (lands on /login because unauthenticated).
 *   3. Inject auth tokens + user directly into the Pinia store via
 *      `page.evaluate()` using `document.querySelector('#app').__vue_app__`.
 *   4. Navigate to the target route — the router guard now sees isAuthenticated === true.
 *
 * For scenario-scoped modules (snapshots, settings, …) we additionally inject
 * the active plan + scenario into their respective Pinia stores.
 */

import { test as base, expect, type Page } from '@playwright/test'

// ─── Stable fixture IDs ────────────────────────────────────────────────────
export const PLAN_ID          = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
export const SCENARIO_ID      = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
export const SNAPSHOT_ID      = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
export const WIZARD_SCENARIO_ID = 'ffffffff-1111-1111-1111-111111111111'

// ─── Mock data ─────────────────────────────────────────────────────────────
export const MOCK_USER = {
  id:       'dddddddd-dddd-dddd-dddd-dddddddddddd',
  email:    'test@example.com',
  name:     'Test User',
  role:     'owner',
  tenantId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
}

export const MOCK_PLAN = {
  id:          PLAN_ID,
  name:        'E2E Test Plan',
  description: 'Automated end-to-end test plan',
  status:      'active',
  country:     'BE',
  createdAt:   '2025-01-15T10:00:00Z',
  updatedAt:   '2025-03-01T14:00:00Z',
}

export const MOCK_SCENARIO = {
  id:          SCENARIO_ID,
  planId:      PLAN_ID,
  name:        'Base Case',
  description: 'Base case scenario for E2E',
  isDefault:   true,
  createdAt:   '2025-01-15T10:00:00Z',
  updatedAt:   '2025-03-01T14:00:00Z',
}

export const MOCK_SNAPSHOT = {
  id:          SNAPSHOT_ID,
  scenarioId:  SCENARIO_ID,
  version:     1,
  label:       'Q1 Forecast',
  description: 'First quarter forecast snapshot',
  reason:      'Pre-analysis baseline',
  createdBy:   'test@example.com',
  createdAt:   '2025-03-01T09:00:00Z',
}

export const MOCK_WIZARD_SCENARIO = {
  id:          WIZARD_SCENARIO_ID,
  planId:      PLAN_ID,
  name:        'Conservative 2026',
  description: 'Bootstrap year — lean team, no external marketing',
  isDefault:   false,
  createdAt:   '2026-01-15T10:00:00Z',
  updatedAt:   '2026-01-15T10:00:00Z',
}

export const MOCK_ADMIN_USER = {
  id:       'ffffffff-ffff-ffff-ffff-ffffffffffff',
  email:    'admin@example.com',
  name:     'Admin User',
  role:     'admin',
  tenantId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
}

export const MOCK_ADMIN_STATS = {
  users: {
    total: 8,
    active: 7,
    inactive: 1,
    byRole: { owner: 1, admin: 2, user: 5 },
  },
  plans: {
    total: 12,
    byStatus: { draft: 4, active: 6, archived: 2 },
  },
  scenarios: {
    total: 28,
  },
  recentActivity: [
    { type: 'plan',     name: 'E2E Test Plan', action: 'created', actor: 'test@example.com', at: '2025-03-01T10:00:00Z' },
    { type: 'scenario', name: 'Base Case',     action: 'updated', actor: 'test@example.com', at: '2025-03-01T09:00:00Z' },
  ],
  topUsers: [
    { userId: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Test User', email: 'test@example.com', planCount: 5, scenarioCount: 12 },
    { userId: 'ffffffff-ffff-ffff-ffff-ffffffffffff', name: 'Admin User', email: 'admin@example.com', planCount: 0, scenarioCount: 0 },
  ],
}

export const MOCK_SETTINGS = {
  corporateTaxRate:     '0.25',
  vatRate:              '0.21',
  inflationRate:        '0.02',
  revenueGrowthRateY2:  '0.10',
  revenueGrowthRateY3:  '0.15',
  revenueGrowthRateY4:  '0.20',
  revenueGrowthRateY5:  '0.25',
}

// ─── API mock router ────────────────────────────────────────────────────────
/**
 * Registers page.route() handlers for all backend API calls so tests run
 * without a live backend. More-specific patterns must be registered first.
 */
export async function mockApiCalls(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url    = route.request().url()
    const method = route.request().method().toUpperCase()

    // ── Users ──────────────────────────────────────────────────────────────
    if (/\/api\/v1\/users\/me/.test(url)) {
      return route.fulfill({ json: MOCK_USER })
    }

    // ── Plans ──────────────────────────────────────────────────────────────
    if (/\/api\/v1\/plans\/?$/.test(url) && method === 'GET') {
      return route.fulfill({ json: [MOCK_PLAN] })
    }
    if (/\/api\/v1\/plans\/?$/.test(url) && method === 'POST') {
      return route.fulfill({ status: 201, json: MOCK_PLAN })
    }
    if (new RegExp(`/api/v1/plans/${PLAN_ID}/?$`).test(url)) {
      return route.fulfill({ json: MOCK_PLAN })
    }

    // ── Scenarios ──────────────────────────────────────────────────────────
    if (new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/?$`).test(url) && method === 'GET') {
      return route.fulfill({ json: [MOCK_SCENARIO] })
    }
    if (new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/?$`).test(url)) {
      return route.fulfill({ json: MOCK_SCENARIO })
    }

    // ── Snapshots ──────────────────────────────────────────────────────────
    if (new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/snapshots/?$`).test(url)) {
      if (method === 'GET')  return route.fulfill({ json: [MOCK_SNAPSHOT] })
      if (method === 'POST') return route.fulfill({ status: 201, json: MOCK_SNAPSHOT })
    }
    if (new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/snapshots/`).test(url)) {
      return route.fulfill({ json: {} })
    }

    // ── Admin stats ────────────────────────────────────────────────────────
    if (/\/api\/v1\/admin\/stats/.test(url)) {
      return route.fulfill({ json: MOCK_ADMIN_STATS })
    }

    // ── Users list (admin user management) ────────────────────────────────
    if (/\/api\/v1\/users\/?$/.test(url) && method === 'GET') {
      return route.fulfill({ json: [MOCK_USER, MOCK_ADMIN_USER] })
    }

    // ── Settings ───────────────────────────────────────────────────────────
    if (new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/settings`).test(url)) {
      return route.fulfill({ json: MOCK_SETTINGS })
    }

    // ── Catch-all: return empty object so the app doesn't 500 ──────────────
    return route.fulfill({ json: {} })
  })

  // Auth endpoints (login, refresh, logout)
  await page.route('**/auth/**', async (route) => {
    route.fulfill({ json: {} })
  })
}

// ─── Auth injection ─────────────────────────────────────────────────────────
/**
 * Injects fake auth into the Pinia store AND registers an addInitScript so that
 * the auth state (window.__E2E_AUTH__) is re-seeded on every subsequent
 * page.goto() call.  The auth store reads window.__E2E_AUTH__ on init, so
 * the router guard sees isAuthenticated === true immediately on each navigation.
 */
export async function injectAuth(page: Page, user = MOCK_USER) {
  const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user }

  // Register init script — runs before the app boots on every future navigation
  await page.addInitScript((data) => {
    ;(window as any).__E2E_AUTH__ = data
  }, payload)

  // Also patch the currently-mounted Pinia state for immediate effect
  await page.evaluate((u) => {
    const app   = (document.querySelector('#app') as any)?.__vue_app__
    const pinia = app?.config?.globalProperties?.$pinia
    const auth  = pinia?.state?.value?.['auth']
    if (!auth) return
    auth.accessToken  = 'e2e-access-token'
    auth.refreshToken = 'e2e-refresh-token'
    auth.user         = u
  }, user)
}

/**
 * Injects the active plan and scenario into their Pinia stores so that
 * scenario-scoped pages (snapshots, settings, graphs, …) can load.
 */
export async function injectPlanContext(page: Page) {
  await page.evaluate(([plan, scenario]) => {
    const app   = (document.querySelector('#app') as any)?.__vue_app__
    const pinia = app?.config?.globalProperties?.$pinia
    if (!pinia) return

    const planState = pinia.state.value?.['plans']
    if (planState) {
      planState.activePlan = plan
      planState.plans      = [plan]
    }

    const scenarioState = pinia.state.value?.['scenarios']
    if (scenarioState) {
      scenarioState.activeScenario = scenario
      scenarioState.scenarios      = [scenario]
    }
  }, [MOCK_PLAN, MOCK_SCENARIO] as const)
}

// ─── Tenant tier injection ──────────────────────────────────────────────────
/**
 * Patches the Pinia tenant store so useTierGate() returns the given tier.
 * Call this AFTER the app has booted (post-goto), then navigate to the target
 * route via router.push() (not page.goto()) so Pinia state is preserved.
 */
export async function injectTenantTier(page: Page, tier: 'free' | 'pro' | 'enterprise' = 'pro') {
  await page.evaluate((t) => {
    const app   = (document.querySelector('#app') as any)?.__vue_app__
    const pinia = app?.config?.globalProperties?.$pinia
    if (!pinia) return

    // Path 1: store already initialised (a component has called useTenantStore)
    const store = (pinia as any)._s?.get('tenant')
    if (store) {
      store.tenant = { tier: t }
      return
    }

    // Path 2: store not yet initialised.
    // Pre-seed pinia.state so Pinia uses this as the initial state when the
    // store IS first used (same SSR hydration mechanism Pinia uses internally).
    if (!pinia.state.value['tenant']) {
      pinia.state.value['tenant'] = { tenant: null, users: [], loading: false, error: null }
    }
    pinia.state.value['tenant'].tenant = { tier: t }
  }, tier)
}

/**
 * Navigate to a route via Vue Router (no page reload).
 * Pinia reactive state set before this call is preserved.
 */
export async function routerPush(page: Page, path: string) {
  await page.evaluate((url) => {
    const app = (document.querySelector('#app') as any)?.__vue_app__
    app?.config?.globalProperties?.$router?.push(url)
  }, path)
  await page.waitForURL(`**${path}`)
}

// ─── Wizard mock helper ─────────────────────────────────────────────────────
/**
 * Captured payloads from the wizard's API calls.
 * Each field is set when the corresponding request fires.
 */
export type WizardCapture = {
  createScenario:    Record<string, unknown> | null
  updateConfig:      Record<string, unknown> | null
  updateObBalance:   Record<string, unknown> | null
  updateWcConfig:    Record<string, unknown> | null
  createProducts:    Record<string, unknown>[]
}

/**
 * Registers additional route handlers for the scenario wizard.
 * Returns a `WizardCapture` object that is populated as requests fire.
 *
 * IMPORTANT: call this AFTER `mockApiCalls()`.  Playwright applies handlers in
 * reverse registration order (last-registered = first-applied), so wizard-specific
 * handlers must be registered LAST to take priority over the catch-all.
 */
export async function mockWizardRoutes(page: Page, isPro = false): Promise<WizardCapture> {
  const capture: WizardCapture = {
    createScenario:  null,
    updateConfig:    null,
    updateObBalance: null,
    updateWcConfig:  null,
    createProducts:  [],
  }

  // POST /plans/:planId/scenarios/  →  create scenario
  await page.route(
    new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/?$`),
    async (route) => {
      const method = route.request().method().toUpperCase()
      if (method === 'POST') {
        capture.createScenario = await route.request().postDataJSON()
        return route.fulfill({ status: 201, json: MOCK_WIZARD_SCENARIO })
      }
      if (method === 'GET') {
        return route.fulfill({ json: [MOCK_SCENARIO] })
      }
      return route.continue()
    },
  )

  // PUT .../settings/config
  await page.route(
    new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/${WIZARD_SCENARIO_ID}/settings/config`),
    async (route) => {
      if (route.request().method() === 'PUT') {
        capture.updateConfig = await route.request().postDataJSON()
        return route.fulfill({ json: {} })
      }
      return route.continue()
    },
  )

  // PUT .../settings/opening-balance  (Pro only)
  await page.route(
    new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/${WIZARD_SCENARIO_ID}/settings/opening-balance`),
    async (route) => {
      if (route.request().method() === 'PUT') {
        capture.updateObBalance = await route.request().postDataJSON()
        return route.fulfill({ json: {} })
      }
      return route.continue()
    },
  )

  // PUT .../settings/wc-config  (Pro only)
  await page.route(
    new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/${WIZARD_SCENARIO_ID}/settings/wc-config`),
    async (route) => {
      if (route.request().method() === 'PUT') {
        capture.updateWcConfig = await route.request().postDataJSON()
        return route.fulfill({ json: {} })
      }
      return route.continue()
    },
  )

  // POST .../products/
  await page.route(
    new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/${WIZARD_SCENARIO_ID}/products/?$`),
    async (route) => {
      if (route.request().method() === 'POST') {
        const body = await route.request().postDataJSON()
        capture.createProducts.push(body)
        return route.fulfill({
          status: 201,
          json: { id: `prod-${capture.createProducts.length}`, ...body },
        })
      }
      return route.continue()
    },
  )

  return capture
}

// ─── Playwright fixture extension ───────────────────────────────────────────
type AuthFixtures = {
  /** A page that has already gone through auth injection (no backend needed). */
  authedPage: Page
  /** authedPage + active plan/scenario injected (for scenario-scoped modules). */
  scenarioPage: Page
  /** A page authenticated as an admin role user (no plan access). */
  adminPage: Page
}

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    // addInitScript must be registered BEFORE the first page.goto() so that it
    // runs on every navigation — including subsequent page.goto() calls in tests.
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_USER }
    await page.addInitScript((data) => { ;(window as any).__E2E_AUTH__ = data }, payload)
    await mockApiCalls(page)
    // Navigate directly to dashboard — auth store reads __E2E_AUTH__ on init
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await use(page)
  },

  adminPage: async ({ page }, use) => {
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_ADMIN_USER }
    await page.addInitScript((data) => { ;(window as any).__E2E_AUTH__ = data }, payload)
    await mockApiCalls(page)
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    await use(page)
  },

  scenarioPage: async ({ page }, use) => {
    const authPayload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_USER }
    await page.addInitScript((data) => { ;(window as any).__E2E_AUTH__ = data }, authPayload)
    // Seed plan/scenario context so stores initialise correctly on every page.goto()
    const ctxPayload = { plan: MOCK_PLAN, scenario: MOCK_SCENARIO }
    await page.addInitScript((data) => { ;(window as any).__E2E_PLAN_CTX__ = data }, ctxPayload)
    await mockApiCalls(page)
    // Navigate to dashboard first so Pinia stores are ready for context injection
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Also patch currently-mounted Pinia state for immediate effect
    await injectPlanContext(page)
    await use(page)
  },
})

export { expect }
