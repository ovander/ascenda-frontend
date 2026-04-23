/**
 * E2E — Adaptive Design System
 *
 * Verifies mobile-blocking, KpiGrid rendering, and ShowOn behavior across
 * all 6 sprint pages. Uses the shared authenticated `scenarioPage` fixture
 * so tests run against a fully booted, auth-injected app with plan/scenario
 * context — no real backend required.
 *
 * Navigation pattern:
 *   1. `scenarioPage` fixture boots the app at / with auth + plan/scenario state.
 *   2. `page.setViewportSize()` sets the breakpoint.
 *   3. `page.evaluate($router.push)` navigates without a page reload so Pinia
 *      state (isMobile, activePlan, activeScenario) is preserved.
 *   4. `page.waitForLoadState('networkidle')` waits for Vue to settle.
 */
import { test, expect, PLAN_ID, SCENARIO_ID } from './fixtures'

const MOBILE  = { width: 375, height: 812 }
const TABLET  = { width: 768, height: 1024 }
const DESKTOP = { width: 1280, height: 900 }

// ── Helper: router.push + wait ────────────────────────────────────────────────
async function push(page: import('@playwright/test').Page, path: string) {
  await page.evaluate((url) => {
    const app = (document.querySelector('#app') as any)?.__vue_app__
    app?.config?.globalProperties?.$router?.push(url)
  }, path)
  await page.waitForTimeout(300)
  await page.waitForLoadState('networkidle')
}

// ── Helper: set windowWidth via the E2E hook exposed by the ui store ──────────
// The ui store exposes window.__setWindowWidth() when __E2E_AUTH__ is present.
// This directly updates windowWidth.value → isMobile/isTablet/isDesktop recompute.
async function patchMobile(page: import('@playwright/test').Page, isMobile: boolean) {
  await page.evaluate((w) => {
    if (typeof (window as any).__setWindowWidth === 'function') {
      ;(window as any).__setWindowWidth(w)
    } else {
      // Fallback: dispatch a synthetic resize with innerWidth patched
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: w })
      window.dispatchEvent(new Event('resize'))
    }
  }, isMobile ? 375 : 1280)
  // Give Vue one tick to propagate the reactivity update
  await page.waitForTimeout(50)
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sprint 0 — mobileBlocked routes redirect on mobile', () => {
  const blockedRoutes = [
    { name: 'cash',   path: `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/cash`   },
    { name: 'budget', path: `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/budget` },
    { name: 'report', path: `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/report` },
    { name: 'fiplan', path: `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/fiplan` },
  ]

  for (const { name, path } of blockedRoutes) {
    test(`${name} route redirects on mobile`, async ({ scenarioPage }) => {
      await scenarioPage.setViewportSize(MOBILE)
      // Patch isMobile synchronously so the router guard sees it immediately
      await patchMobile(scenarioPage, true)
      await push(scenarioPage, path)
      // Guard should redirect away — URL should NOT end with the blocked segment
      expect(scenarioPage.url()).not.toContain(`/${name}`)
    })
  }
})

test.describe('Sprint 0 — graphs/monthly responsive grid', () => {
  test('monthly chart grid is responsive (grid-cols-1 md:grid-cols-2)', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(MOBILE)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/graphs/monthly`)
    // The grid element should exist in the DOM (class selector with escaped colon)
    const grid = scenarioPage.locator('.grid-cols-1').first()
    await expect(grid).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Sprint 2 — PNL mobile KpiGrid', () => {
  test('PNL shows mobile surface on mobile', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(MOBILE)
    await patchMobile(scenarioPage, true)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/pnl`)
    // Mobile surface container should be visible
    const surface = scenarioPage.locator('[data-testid="pnl-mobile-surface"]')
    await expect(surface).toBeVisible({ timeout: 5000 })
  })

  test('PNL shows Tabs on desktop', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(DESKTOP)
    await patchMobile(scenarioPage, false)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/pnl`)
    const tabs = scenarioPage.locator('.p-tabs').first()
    await expect(tabs).toBeVisible({ timeout: 5000 })
  })

  test('PNL mobile surface renders on mobile', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(MOBILE)
    await patchMobile(scenarioPage, true)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/pnl`)
    const surface = scenarioPage.locator('[data-testid="pnl-mobile-surface"]')
    await expect(surface).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Sprint 2 — Ratios mobile KpiGrid', () => {
  test('Ratios shows mobile surface on mobile', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(MOBILE)
    await patchMobile(scenarioPage, true)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/ratios`)
    const surface = scenarioPage.locator('[data-testid="ratios-mobile-surface"]')
    await expect(surface).toBeVisible({ timeout: 5000 })
  })

  test('Ratios shows Tabs on tablet', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(TABLET)
    await patchMobile(scenarioPage, false)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/ratios`)
    const tabs = scenarioPage.locator('.p-tabs').first()
    await expect(tabs).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Sprint 3 — WCR mobile adaptive', () => {
  test('WCR renders KpiGrid on mobile', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(MOBILE)
    await patchMobile(scenarioPage, true)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/wcr`)
    const kpiGrid = scenarioPage.locator('[data-testid="wcr-kpi-grid"]')
    await expect(kpiGrid).toBeVisible({ timeout: 5000 })
  })

  test('WCR renders Tabs on tablet', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(TABLET)
    await patchMobile(scenarioPage, false)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/wcr`)
    const tabs = scenarioPage.locator('.p-tabs').first()
    await expect(tabs).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Sprint 3 — Audit mobile adaptive', () => {
  test('Audit renders search input on mobile', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(MOBILE)
    await patchMobile(scenarioPage, true)
    await push(scenarioPage, '/audit')
    // ShowOn only="mobile" renders a single search input
    const input = scenarioPage.locator('input[placeholder*="Search audit"]')
    await expect(input).toBeVisible({ timeout: 5000 })
  })

  test('Audit renders DataTable on tablet', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(TABLET)
    await patchMobile(scenarioPage, false)
    await push(scenarioPage, '/audit')
    const table = scenarioPage.locator('.p-datatable').first()
    await expect(table).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Sprint 3 — CapTable mobile adaptive', () => {
  test('CapTable renders page without crash on mobile', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(MOBILE)
    await patchMobile(scenarioPage, true)
    await push(scenarioPage, `/plans/${PLAN_ID}/cap-table`)
    // Page renders something — either Pro gate, empty state, or shareholder cards
    const body = scenarioPage.locator('body')
    await expect(body).toBeVisible({ timeout: 5000 })
    // No JS error should prevent render — verify Cap Table text is somewhere on the page
    await expect(scenarioPage.locator('main, [role="main"], .p-scrollpanel-content, #app').first())
      .toContainText('Cap Table', { timeout: 5000 })
  })
})

test.describe('Sprint 3 — BEP mobile adaptive', () => {
  test('BEP renders mobile surface or Pro gate on mobile', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(MOBILE)
    await patchMobile(scenarioPage, true)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/bep`)
    // Either the BEP mobile block or the Pro gate appears — both are valid
    const hasContent = await scenarioPage.evaluate(() =>
      document.body.textContent?.includes('Break-Even') ||
      document.body.textContent?.includes('Pro Feature')
    )
    expect(hasContent).toBe(true)
  })

  test('BEP renders Tabs or Pro gate on tablet', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(TABLET)
    await patchMobile(scenarioPage, false)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/bep`)
    const hasContent = await scenarioPage.evaluate(() =>
      document.body.textContent?.includes('Break-Even') ||
      document.body.textContent?.includes('Pro Feature')
    )
    expect(hasContent).toBe(true)
  })
})

test.describe('Sprint 4 — BSheet mobile adaptive', () => {
  test('BSheet renders KpiGrid on mobile', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(MOBILE)
    await patchMobile(scenarioPage, true)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/bsheet`)
    const kpiGrid = scenarioPage.locator('[data-testid="bsheet-kpi-grid"]')
    await expect(kpiGrid).toBeVisible({ timeout: 5000 })
  })

  test('BSheet renders Tabs on tablet', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(TABLET)
    await patchMobile(scenarioPage, false)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/bsheet`)
    const tabs = scenarioPage.locator('.p-tabs').first()
    await expect(tabs).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Sprint 4 — PnlCash mobile adaptive', () => {
  test('PnlCash renders KpiGrid on mobile', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(MOBILE)
    await patchMobile(scenarioPage, true)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/pnl-cash`)
    const kpiGrid = scenarioPage.locator('[data-testid="pnlcash-kpi-grid"]')
    await expect(kpiGrid).toBeVisible({ timeout: 5000 })
  })

  test('PnlCash renders Tabs on tablet', async ({ scenarioPage }) => {
    await scenarioPage.setViewportSize(TABLET)
    await patchMobile(scenarioPage, false)
    await push(scenarioPage, `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/pnl-cash`)
    const tabs = scenarioPage.locator('.p-tabs').first()
    await expect(tabs).toBeVisible({ timeout: 5000 })
  })
})
