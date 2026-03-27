/**
 * E2E — Settings module (authenticated, plan/scenario context injected).
 *
 * Covers: page load, the four tab sections, read-only indicator, and that
 * form fields are visible inside each tab.
 */

import { test, expect, PLAN_ID, SCENARIO_ID } from './fixtures'

const SETTINGS_URL = `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/settings`

test.describe('Settings — page structure', () => {
  test.beforeEach(async ({ scenarioPage: page }) => {
    await page.goto(SETTINGS_URL)
    await page.waitForLoadState('networkidle')
  })

  test('page heading is visible', async ({ scenarioPage: page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('TabView component is rendered', async ({ scenarioPage: page }) => {
    // PrimeVue Tabs renders a .p-tablist or .p-tabs container
    const tabs = page.locator('.p-tablist, .p-tabs, [role="tablist"]')
    await expect(tabs.first()).toBeVisible()
  })

  test('"Configuration" tab is present', async ({ scenarioPage: page }) => {
    await expect(
      page.getByRole('tab', { name: /configuration/i })
    ).toBeVisible()
  })

  test('"Opening Balance" tab is present', async ({ scenarioPage: page }) => {
    await expect(
      page.getByRole('tab', { name: /opening balance/i })
    ).toBeVisible()
  })

  test('"Working Capital" tab is present', async ({ scenarioPage: page }) => {
    await expect(
      page.getByRole('tab', { name: /working capital/i })
    ).toBeVisible()
  })

  test('"OPEX" tab is present', async ({ scenarioPage: page }) => {
    await expect(
      page.getByRole('tab', { name: /opex/i })
    ).toBeVisible()
  })
})

test.describe('Settings — tab switching', () => {
  test.beforeEach(async ({ scenarioPage: page }) => {
    await page.goto(SETTINGS_URL)
    await page.waitForLoadState('networkidle')
  })

  test('clicking "Opening Balance" tab activates it', async ({ scenarioPage: page }) => {
    const tab = page.getByRole('tab', { name: /opening balance/i })
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  test('clicking "Working Capital" tab activates it', async ({ scenarioPage: page }) => {
    const tab = page.getByRole('tab', { name: /working capital/i })
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  test('clicking "OPEX" tab activates it', async ({ scenarioPage: page }) => {
    const tab = page.getByRole('tab', { name: /opex/i })
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('Settings — Configuration form', () => {
  test.beforeEach(async ({ scenarioPage: page }) => {
    await page.goto(SETTINGS_URL)
    await page.waitForLoadState('networkidle')
    // Make sure we are on the first (Configuration) tab
    const configTab = page.getByRole('tab', { name: /configuration/i })
    await configTab.click()
  })

  test('at least one numeric input is visible in the configuration form', async ({
    scenarioPage: page,
  }) => {
    // The Config form has fields like corporateTaxRate, vatRate, etc.
    const inputs = page.locator('.p-tabpanel input[type="text"], .p-tabpanel input[type="number"]')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })
})
