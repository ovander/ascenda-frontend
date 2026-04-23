/**
 * i18n.spec.ts — Language-switching end-to-end tests
 * ────────────────────────────────────────────────────
 * These tests verify that the application correctly switches between French and
 * English in response to the plan-level language setting stored in the Pinia
 * settings store.
 *
 * Strategy
 * --------
 * 1. Boot the app with the standard e2e fixtures (auth + plan context).
 * 2. Navigate to a financial view (P&L) that shows many translated strings.
 * 3. Inject the desired language into the Pinia settings store.
 * 4. Trigger a reactive re-render and assert that key UI strings match the
 *    expected locale's translations.
 *
 * Note: We test the *effect* of the language switch (visible text), not the
 * internal store state.  This is resilient to future store-shape changes.
 */

import { readFileSync } from 'fs'
import { join }         from 'path'
import { test, expect, PLAN_ID, SCENARIO_ID, MOCK_PLAN, MOCK_SCENARIO } from './fixtures'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Injects a language value into the Pinia settings store config.
 * The App.vue watcher on settingsStore.config.language re-sets locale.value,
 * which propagates to all reactive t() calls.
 */
async function setAppLanguage(page: any, lang: 'fr' | 'en') {
  await page.evaluate((language: string) => {
    const app   = (document.querySelector('#app') as any)?.__vue_app__
    const pinia = app?.config?.globalProperties?.$pinia

    // 1. Directly update the vue-i18n locale (most reliable — bypasses Pinia).
    //    In legacy:false mode, $i18n is the global Composer; locale is a Ref.
    //    Some builds expose the i18n instance at $i18n with the Composer at .global.
    const raw = app?.config?.globalProperties?.$i18n
    if (raw) {
      // Try direct locale ref first, then fall back to .global.locale
      const locRef = (raw.locale && typeof raw.locale === 'object' && 'value' in raw.locale)
        ? raw.locale
        : (raw.global?.locale && typeof raw.global.locale === 'object' && 'value' in raw.global.locale)
          ? raw.global.locale
          : null
      if (locRef) locRef.value = language
    }

    if (!pinia) return

    // 2. Also sync the Pinia settings store so the App.vue watcher keeps state consistent
    const store = (pinia as any)._s?.get('settings')
    if (store?.config) {
      store.config.language = language
      return
    }

    // Fall back to seeding the raw Pinia state
    if (!pinia.state.value['settings']) {
      pinia.state.value['settings'] = { config: {} }
    }
    pinia.state.value['settings'].config = { language }
  }, lang)

  // Give Vue two ticks to propagate the locale change to all reactive t() calls
  await page.waitForTimeout(200)
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Language switching (i18n)', () => {
  // Navigate to the P&L view before each test
  test.beforeEach(async ({ scenarioPage: page }) => {
    // Navigate to the scenario dashboard so plan context is in place
    await page.evaluate(([plan, scenario]) => {
      const app   = (document.querySelector('#app') as any)?.__vue_app__
      const pinia = app?.config?.globalProperties?.$pinia
      if (!pinia) return
      const planState = pinia.state.value?.['plans']
      if (planState) { planState.activePlan = plan; planState.plans = [plan] }
      const scenarioState = pinia.state.value?.['scenarios']
      if (scenarioState) { scenarioState.activeScenario = scenario; scenarioState.scenarios = [scenario] }
    }, [MOCK_PLAN, MOCK_SCENARIO] as const)

    await page.evaluate(([planId, scenarioId]) => {
      const app = (document.querySelector('#app') as any)?.__vue_app__
      app?.config?.globalProperties?.$router?.push(
        `/plans/${planId}/scenarios/${scenarioId}/pnl`
      )
    }, [PLAN_ID, SCENARIO_ID] as const)

    await page.waitForTimeout(300)
  })

  test('sidebar nav labels switch to French when language is fr', async ({ scenarioPage: page }) => {
    await setAppLanguage(page, 'fr')

    // Page title (h1) comes from t('nav.pnl').  Use .first() in case the same
    // string also appears in a tab label — avoids strict-mode violations.
    await expect(page.getByRole('heading', { name: 'Compte de résultat' }).first()).toBeVisible()
    // The P&L tab label also switches locale
    await expect(page.getByRole('tab', { name: 'Compte de résultat' })).toBeVisible()
  })

  test('sidebar nav labels switch to English when language is en', async ({ scenarioPage: page }) => {
    await setAppLanguage(page, 'en')

    await expect(page.getByRole('heading', { name: 'P&L Statement' }).first()).toBeVisible()
    await expect(page.getByRole('tab', { name: 'P&L Report' })).toBeVisible()
  })

  test('P&L page title updates on language switch', async ({ scenarioPage: page }) => {
    await setAppLanguage(page, 'fr')
    await expect(page.getByRole('heading', { name: 'Compte de résultat' }).first()).toBeVisible()

    await setAppLanguage(page, 'en')
    await expect(page.getByRole('heading', { name: 'P&L Statement' }).first()).toBeVisible()
  })

  test('P&L tab labels reflect active locale (FR)', async ({ scenarioPage: page }) => {
    await setAppLanguage(page, 'fr')
    // pnl.tab.report = "Compte de résultat" in FR
    await expect(page.getByRole('tab', { name: 'Compte de résultat' })).toBeVisible()
  })

  test('P&L tab labels reflect active locale (EN)', async ({ scenarioPage: page }) => {
    await setAppLanguage(page, 'en')
    // pnl.tab.report = "P&L Report" in EN
    await expect(page.getByRole('tab', { name: 'P&L Report' })).toBeVisible()
  })

  test('dashboard "New Plan" button label switches locale', async ({ authedPage: page }) => {
    await setAppLanguage(page, 'fr')
    await expect(page.getByRole('button', { name: 'Nouveau Plan' })).toBeVisible()

    await setAppLanguage(page, 'en')
    await expect(page.getByRole('button', { name: 'New Plan' })).toBeVisible()
  })

  // ── Settings page titles ────────────────────────────────────────────────────

  test('settings page title switches locale', async ({ scenarioPage: page }) => {
    // Navigate to settings
    await page.evaluate(([planId, scenarioId]) => {
      const app = (document.querySelector('#app') as any)?.__vue_app__
      app?.config?.globalProperties?.$router?.push(
        `/plans/${planId}/scenarios/${scenarioId}/settings`
      )
    }, [PLAN_ID, SCENARIO_ID] as const)
    await page.waitForTimeout(300)

    await setAppLanguage(page, 'fr')
    await expect(page.getByRole('heading', { name: 'Paramètres' }).first()).toBeVisible()

    await setAppLanguage(page, 'en')
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible()
  })

  test('settings tab labels switch locale (FR)', async ({ scenarioPage: page }) => {
    await page.evaluate(([planId, scenarioId]) => {
      const app = (document.querySelector('#app') as any)?.__vue_app__
      app?.config?.globalProperties?.$router?.push(
        `/plans/${planId}/scenarios/${scenarioId}/settings`
      )
    }, [PLAN_ID, SCENARIO_ID] as const)
    await page.waitForTimeout(300)

    await setAppLanguage(page, 'fr')
    await expect(page.getByRole('tab', { name: 'Configuration' })).toBeVisible()
  })

  test('settings tab labels switch locale (EN)', async ({ scenarioPage: page }) => {
    await page.evaluate(([planId, scenarioId]) => {
      const app = (document.querySelector('#app') as any)?.__vue_app__
      app?.config?.globalProperties?.$router?.push(
        `/plans/${planId}/scenarios/${scenarioId}/settings`
      )
    }, [PLAN_ID, SCENARIO_ID] as const)
    await page.waitForTimeout(300)

    await setAppLanguage(page, 'en')
    await expect(page.getByRole('tab', { name: 'Configuration' })).toBeVisible()
  })

  // ── Dashboard KPI card labels ───────────────────────────────────────────────

  test('scenario dashboard KPI card labels switch to FR', async ({ scenarioPage: page }) => {
    // scenario-dashboard route is plans/:planId/scenarios/:sid (no /dashboard suffix)
    await page.evaluate(([planId, scenarioId]) => {
      const app = (document.querySelector('#app') as any)?.__vue_app__
      app?.config?.globalProperties?.$router?.push(
        `/plans/${planId}/scenarios/${scenarioId}`
      )
    }, [PLAN_ID, SCENARIO_ID] as const)
    await page.waitForTimeout(300)

    await setAppLanguage(page, 'fr')
    // KPI card label: dashboard.kpi.revenueY1 = "CA Année 1" in FR
    await expect(page.getByText('CA Année 1')).toBeVisible()
  })

  test('scenario dashboard KPI card labels switch to EN', async ({ scenarioPage: page }) => {
    // scenario-dashboard route is plans/:planId/scenarios/:sid (no /dashboard suffix)
    await page.evaluate(([planId, scenarioId]) => {
      const app = (document.querySelector('#app') as any)?.__vue_app__
      app?.config?.globalProperties?.$router?.push(
        `/plans/${planId}/scenarios/${scenarioId}`
      )
    }, [PLAN_ID, SCENARIO_ID] as const)
    await page.waitForTimeout(300)

    await setAppLanguage(page, 'en')
    // KPI card label: dashboard.kpi.revenueY1 = "Revenue Y1" in EN
    await expect(page.getByText('Revenue Y1')).toBeVisible()
  })

  test('sidebar layer buttons switch locale (FR)', async ({ scenarioPage: page }) => {
    await setAppLanguage(page, 'fr')
    // ui.layerOperate = "GÉRER" in FR
    await expect(page.getByText('GÉRER')).toBeVisible()
    // ui.layerAnalyse = "ANALYSER" in FR
    await expect(page.getByText('ANALYSER')).toBeVisible()
  })

  test('sidebar layer buttons switch locale (EN)', async ({ scenarioPage: page }) => {
    await setAppLanguage(page, 'en')
    // ui.layerOperate = "OPERATE" in EN
    await expect(page.getByText('OPERATE')).toBeVisible()
    // ui.layerAnalyse = "ANALYSE" in EN
    await expect(page.getByText('ANALYSE')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Locale catalog completeness tests (unit-style — no server needed)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Locale catalog completeness', () => {
  /**
   * Read the JSON locale files directly from the source tree (Node.js FS) so
   * this test is independent of the running browser / vue-i18n instance.
   * This avoids the unreliable `$i18n.getLocaleMessage` access pattern that
   * differs across vue-i18n build modes (legacy vs. composition, .global wrapping).
   */
  test('both fr and en catalogs define all required nav keys', async () => {
    // process.cwd() is the project root when Playwright runs tests.
    // __dirname inside Playwright's bundled test output may resolve to '.'
    // rather than the test file's source directory, so we use cwd instead.
    const localesDir = join(process.cwd(), 'src/locales')
    const fr: Record<string, any> = JSON.parse(readFileSync(join(localesDir, 'fr.json'), 'utf-8'))
    const en: Record<string, any> = JSON.parse(readFileSync(join(localesDir, 'en.json'), 'utf-8'))

    const requiredKeys = [
      // ── Navigation ────────────────────────────────────────────────────────
      'nav.pnl', 'nav.bsheet', 'nav.ratios', 'nav.wcr', 'nav.cash',
      'nav.graphs', 'nav.pnlCash', 'nav.fiplan',
      // ── P&L ───────────────────────────────────────────────────────────────
      'pnl.tab.report', 'pnl.tab.graphs',
      'pnl.row.sales', 'pnl.row.ebitda', 'pnl.row.netProfit',
      // ── Balance Sheet ─────────────────────────────────────────────────────
      'bsheet.tab.detailed', 'bsheet.tab.condensed',
      // ── Ratios / WCR / Graphs ─────────────────────────────────────────────
      'ratios.tab.salesMargins', 'ratios.tab.profitability',
      'wcr.tab.analysis', 'wcr.tab.chart',
      'graphs.title', 'graphs.salesAnalysis',
      'pnlCash.tab.functional',
      // ── Enums ─────────────────────────────────────────────────────────────
      'enums.planStatus.draft', 'enums.planStatus.approved',
      // ── Messages ──────────────────────────────────────────────────────────
      'messages.planLocked', 'messages.newScenario',
      // ── AI (Sprint 1) ─────────────────────────────────────────────────────
      'ai.rerunAnalysis', 'ai.unknownFeature', 'ai.requiresPlan',
      'ai.runningScenarioAnalysis', 'ai.generatingAnalysis',
      'ai.intelligenceUnavailable', 'ai.aiCommentarySectionLabel', 'ai.readyToAnalyse',
      'ai.tierBadge.pro', 'ai.tierBadge.enterprise',
      // Spot-check two features (narrate + unit-economics) — full list lives in aiStore.spec
      'ai.features.narrate.label', 'ai.features.narrate.description',
      'ai.features.unit-economics.label', 'ai.features.unit-economics.description',
      // ── Dashboard KPIs (Sprint 1) ─────────────────────────────────────────
      'dashboard.kpi.revenueY1', 'dashboard.kpi.avgGrowth',
      'dashboard.kpi.ebitdaY1', 'dashboard.kpi.netProfitY1',
      'dashboard.kpi.cashEOY5', 'dashboard.kpi.npv',
      'dashboard.kpi.irr', 'dashboard.kpi.payback',
      'dashboard.modules', 'dashboard.cashPositive',
      // ── UI layer labels (Sprint 1) ────────────────────────────────────────
      'ui.layerOperate', 'ui.layerAnalyse',
      // ── Settings (Sprint 2) ───────────────────────────────────────────────
      'settings.title', 'settings.readOnlyAccess',
      'settings.tab.config', 'settings.tab.opening',
      'settings.tab.wc', 'settings.tab.opexParams',
      'settings.notAvailable', 'settings.openingNotConfigured', 'settings.wcNotAvailable',
      'settings.tooltip.cashAndSecurities',
      // ── Revenues (Sprint 2) ───────────────────────────────────────────────
      'revenues.title', 'revenues.description',
      'revenues.tab.table', 'revenues.tab.charts',
      'revenues.noData', 'revenues.col.segment', 'revenues.col.gmY1',
      'revenues.chart.turnoverBySegment', 'revenues.chart.grossMarginBySegment',
      'revenues.chart.grossMarginTrend', 'revenues.grossMarginPct',
      // ── Products (Sprint 2) ───────────────────────────────────────────────
      'products.driver.parameter',
      // ── FiPlan labels (Sprint 2) ──────────────────────────────────────────
      'fiplan.label.requirements', 'fiplan.label.resources',
      'fiplan.label.operatingCashFlow', 'fiplan.label.netProfit',
      'fiplan.label.capex', 'fiplan.label.dividends',
      // ── Cash labels (Sprint 2) ────────────────────────────────────────────
      'cash.label.netCashFlow', 'cash.label.openingBalance', 'cash.label.closingBalance',
      'cash.tooltip.netCashFlow', 'cash.tooltip.openingBalance', 'cash.tooltip.closingBalance',
    ]

    function getNestedKey(catalog: Record<string, any>, dotKey: string): unknown {
      const parts = dotKey.split('.')
      let node: any = catalog
      for (const part of parts) { node = node?.[part] }
      return node
    }

    const missing: string[] = []
    for (const [locale, catalog] of [['fr', fr], ['en', en]] as const) {
      for (const key of requiredKeys) {
        if (!getNestedKey(catalog, key)) missing.push(`${locale}:${key}`)
      }
    }

    expect(missing, `Missing translation keys: ${JSON.stringify(missing)}`).toHaveLength(0)
  })
})
