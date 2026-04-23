/**
 * E2E tests for ScenarioAnalysis v2 frontend integration.
 *
 * Tests two surfaces:
 *   1. ScenarioDashboardView — ScenarioIntelligenceSection compact card
 *   2. AINarrationView (feature=narrate) — ScenarioAnalysisCard full renderer
 *
 * Strategy:
 *   • Uses the `scenarioPage` fixture (pre-authenticated, plan/scenario injected).
 *   • Registers the analysis mock route AFTER mockApiCalls so it takes priority
 *     (Playwright: last-registered handler = first-applied).
 *   • Sets tenant tier to 'pro' via injectTenantTier so tier-gated content is visible.
 *   • Navigates via routerPush (no page reload) to preserve Pinia state.
 *
 * NOTE: Adjust DASHBOARD_URL if your router uses a different path for the
 * scenario overview (e.g. "/scenarios/:sid" without the plan prefix).
 */
import { test, expect, PLAN_ID, SCENARIO_ID } from './fixtures'
import { injectTenantTier, routerPush }        from './fixtures'

// ── URL constants ─────────────────────────────────────────────────────────────

const DASHBOARD_URL = `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}`
const NARRATE_URL   = `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/ai/narrate`

// ── Mock payloads ─────────────────────────────────────────────────────────────

const MOCK_ANALYSIS = {
  viability: {
    score:     78,
    label:     'Viable',
    rationale: 'The scenario demonstrates controlled risk with moderate growth.',
  },
  highlights: {
    headline:   'Solid plan with actionable improvements',
    strengths:  ['Strong ARR base', 'Low churn rate'],
    weaknesses: ['High Q2 burn rate'],
  },
  risks: [
    { title: 'Cash flow risk',    description: 'Burn exceeds projections',   urgency: 'high'   },
    { title: 'Market saturation', description: 'Competition intensifying',   urgency: 'medium' },
  ],
  drivers: [
    { title: 'Subscription growth', description: 'New MRR adding up', impact: 'positive', priority: 1 },
  ],
  trends: [
    { metric: 'MRR',   direction: 'up',   description: '8 % month-over-month growth' },
    { metric: 'Churn', direction: 'down',  description: 'Improved retention' },
  ],
  narration: {
    text:            'The plan is well-positioned for sustained growth over the next 12 months.',
    language:        'en',
    is_ai_generated: true,
  },
  generated_at: '2026-04-01T10:00:00Z',
}

const MOCK_NARRATION = {
  title:           'Scenario Executive Summary',
  summary:         'The base case scenario projects steady revenue growth with controlled costs.',
  paragraphs: [
    { type: 'info',    content: 'Revenue trajectory remains positive across all forecast years.' },
    { type: 'warning', content: 'Operating costs require careful monitoring in Q2.' },
  ],
  key_takeaways: [
    'Revenue growing at 8 % MoM',
    'Cost base is flat — no scaling model yet',
  ],
  is_ai_generated: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Register per-test API overrides that take priority over the catch-all in
 * mockApiCalls (Playwright: last-registered handler fires first).
 */
async function registerAnalysisMocks(page: Parameters<typeof routerPush>[0]) {
  // Analysis endpoint (GET)
  await page.route(
    new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/analysis`),
    (route) => route.fulfill({ json: MOCK_ANALYSIS }),
  )

  // Narration endpoint (POST) — used by AINarrationView
  await page.route(
    new RegExp(`/api/v1/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/ai/narrate`),
    (route) => route.fulfill({ json: MOCK_NARRATION }),
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard surface: ScenarioIntelligenceSection
// ─────────────────────────────────────────────────────────────────────────────

test.describe('ScenarioDashboardView — Scenario Intelligence section', () => {
  test.beforeEach(async ({ scenarioPage: page }) => {
    await registerAnalysisMocks(page)
    await injectTenantTier(page, 'pro')
    await routerPush(page, DASHBOARD_URL)
    await page.waitForLoadState('networkidle')
  })

  test('renders the "Scenario Intelligence" section header', async ({ scenarioPage: page }) => {
    await expect(
      page.getByText('Scenario Intelligence', { exact: false }),
    ).toBeVisible({ timeout: 6000 })
  })

  test('renders the viability score returned by the API', async ({ scenarioPage: page }) => {
    // Score "78" should appear inside the badge
    await expect(
      page.locator('text=78').first(),
    ).toBeVisible({ timeout: 6000 })
  })

  test('renders the "Viable" viability label', async ({ scenarioPage: page }) => {
    await expect(
      page.getByText('Viable', { exact: false }).first(),
    ).toBeVisible({ timeout: 6000 })
  })

  test('renders the top risk title from the analysis', async ({ scenarioPage: page }) => {
    await expect(
      page.getByText('Cash flow risk', { exact: false }),
    ).toBeVisible({ timeout: 6000 })
  })

  test('renders "View Full Analysis" CTA for pro user', async ({ scenarioPage: page }) => {
    await expect(
      page.getByText('View Full Analysis', { exact: false }),
    ).toBeVisible({ timeout: 6000 })
  })

  test('CTA links to the narrate page', async ({ scenarioPage: page }) => {
    const cta = page.getByText('View Full Analysis', { exact: false })
    await expect(cta).toBeVisible({ timeout: 6000 })
    // The button is rendered as an <a> element pointing to .../ai/narrate
    const href = await page.locator('a[href*="ai/narrate"]').first().getAttribute('href')
    expect(href).toContain('/ai/narrate')
  })
})

test.describe('ScenarioDashboardView — freemium locked view', () => {
  test.beforeEach(async ({ scenarioPage: page }) => {
    await registerAnalysisMocks(page)
    await injectTenantTier(page, 'free')
    await routerPush(page, DASHBOARD_URL)
    await page.waitForLoadState('networkidle')
  })

  test('shows "Upgrade to Pro to unlock" for freemium user', async ({ scenarioPage: page }) => {
    await expect(
      page.getByText('Upgrade to Pro to unlock', { exact: false }),
    ).toBeVisible({ timeout: 6000 })
  })

  test('does NOT show "View Full Analysis" CTA for freemium user', async ({ scenarioPage: page }) => {
    await expect(
      page.getByText('View Full Analysis', { exact: false }),
    ).not.toBeVisible({ timeout: 3000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Narrate page surface: ScenarioAnalysisCard (full renderer)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('AINarrationView (feature=narrate) — ScenarioAnalysisCard', () => {
  test.beforeEach(async ({ scenarioPage: page }) => {
    await registerAnalysisMocks(page)
    await injectTenantTier(page, 'pro')

    // AINarrationView does not fetch settings itself, so the locale would stay at
    // the app default ('fr').  We work around this by navigating to the Scenario
    // Dashboard first: ScenarioDashboardView calls settingsStore.fetchConfig(),
    // which returns MOCK_SETTINGS { language: 'en' }.  The App.vue watcher then
    // sets locale.value = 'en' before we proceed to the narrate page.
    await routerPush(page, DASHBOARD_URL)
    await page.waitForLoadState('networkidle')

    await routerPush(page, NARRATE_URL)
    await page.waitForLoadState('networkidle')
  })

  test('renders the viability score in ScenarioAnalysisCard', async ({ scenarioPage: page }) => {
    // Wait for loading spinner to disappear first
    await expect(page.locator('.p-progressspinner')).not.toBeVisible({ timeout: 25000 })

    await expect(
      page.getByText('78').first(),
    ).toBeVisible({ timeout: 6000 })
  })

  test('renders the "Viability Score" heading', async ({ scenarioPage: page }) => {
    await expect(page.locator('.p-progressspinner')).not.toBeVisible({ timeout: 25000 })

    await expect(
      page.getByText('Viability Score', { exact: false }),
    ).toBeVisible({ timeout: 6000 })
  })

  test('renders the "v2" badge in the feature header', async ({ scenarioPage: page }) => {
    await expect(
      page.getByText('v2', { exact: true }),
    ).toBeVisible({ timeout: 6000 })
  })

  test('renders Highlights section from analysis', async ({ scenarioPage: page }) => {
    await expect(page.locator('.p-progressspinner')).not.toBeVisible({ timeout: 25000 })

    await expect(
      page.getByText('Solid plan with actionable improvements', { exact: false }),
    ).toBeVisible({ timeout: 6000 })
  })

  test('renders risk titles from analysis', async ({ scenarioPage: page }) => {
    await expect(page.locator('.p-progressspinner')).not.toBeVisible({ timeout: 25000 })

    await expect(
      page.getByText('Cash flow risk', { exact: false }),
    ).toBeVisible({ timeout: 6000 })
  })

  test('renders AI Commentary section from narration endpoint', async ({ scenarioPage: page }) => {
    await expect(page.locator('.p-progressspinner')).not.toBeVisible({ timeout: 25000 })

    // The NarrationCard supplementary section is labelled "AI Commentary"
    await expect(
      page.getByText('AI Commentary', { exact: false }),
    ).toBeVisible({ timeout: 6000 })
  })
})
