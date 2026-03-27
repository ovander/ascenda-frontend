/**
 * E2E — Snapshots module (authenticated, plan/scenario context injected).
 *
 * Covers: info banner, table display, create dialog, compare button state,
 * and the action buttons rendered per row.
 */

import { test, expect, PLAN_ID, SCENARIO_ID, MOCK_SNAPSHOT } from './fixtures'

const SNAPSHOTS_URL = `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/snapshots`

test.describe('Snapshots — page structure', () => {
  test.beforeEach(async ({ scenarioPage: page }) => {
    await page.goto(SNAPSHOTS_URL)
    await page.waitForLoadState('networkidle')
  })

  test('page heading reads "Snapshots"', async ({ scenarioPage: page }) => {
    await expect(page.locator('h1')).toHaveText('Snapshots')
  })

  test('informational banner is visible', async ({ scenarioPage: page }) => {
    // The blue info banner added in the module
    const banner = page.locator('.bg-blue-50')
    await expect(banner).toBeVisible()
  })

  test('banner contains the word "snapshot"', async ({ scenarioPage: page }) => {
    const banner = page.locator('.bg-blue-50')
    await expect(banner).toContainText(/snapshot/i)
  })

  test('banner mentions "Compare"', async ({ scenarioPage: page }) => {
    const banner = page.locator('.bg-blue-50')
    await expect(banner).toContainText(/compare/i)
  })

  test('"Create Snapshot" button is visible', async ({ scenarioPage: page }) => {
    const btn = page.getByRole('button', { name: /create snapshot/i })
    await expect(btn).toBeVisible()
  })

  test('"Compare" button is disabled when no rows are selected', async ({ scenarioPage: page }) => {
    const compareBtn = page.getByRole('button', { name: /compare/i })
    await expect(compareBtn).toBeVisible()
    await expect(compareBtn).toBeDisabled()
  })
})

test.describe('Snapshots — table content', () => {
  test.beforeEach(async ({ scenarioPage: page }) => {
    await page.goto(SNAPSHOTS_URL)
    await page.waitForLoadState('networkidle')
  })

  test('DataTable is rendered', async ({ scenarioPage: page }) => {
    const table = page.locator('.p-datatable')
    await expect(table).toBeVisible()
  })

  test('mocked snapshot label appears in the table', async ({ scenarioPage: page }) => {
    await expect(page.getByText(MOCK_SNAPSHOT.label)).toBeVisible()
  })

  test('mocked snapshot version number appears', async ({ scenarioPage: page }) => {
    // Version is rendered as "#1" in a font-mono span
    await expect(page.locator('.font-mono').filter({ hasText: `#${MOCK_SNAPSHOT.version}` })).toBeVisible()
  })

  test('mocked snapshot createdBy appears', async ({ scenarioPage: page }) => {
    await expect(page.getByText(MOCK_SNAPSHOT.createdBy)).toBeVisible()
  })

  test('action buttons are rendered for each row', async ({ scenarioPage: page }) => {
    // Each row has action buttons (View / Restore / Clone / Delete)
    // They are icon-only buttons — check at least one exists in the table body
    const rowActions = page.locator('.p-datatable-tbody button')
    const count = await rowActions.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Snapshots — Create dialog', () => {
  test.beforeEach(async ({ scenarioPage: page }) => {
    await page.goto(SNAPSHOTS_URL)
    await page.waitForLoadState('networkidle')
  })

  test('clicking "Create Snapshot" opens the dialog', async ({ scenarioPage: page }) => {
    await page.getByRole('button', { name: /create snapshot/i }).click()
    // PrimeVue Dialog renders with role="dialog"
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('dialog contains a Label field', async ({ scenarioPage: page }) => {
    await page.getByRole('button', { name: /create snapshot/i }).click()
    await expect(page.getByPlaceholder('e.g., Q1 Forecast')).toBeVisible()
  })

  test('dialog contains a Description field', async ({ scenarioPage: page }) => {
    await page.getByRole('button', { name: /create snapshot/i }).click()
    await expect(page.getByPlaceholder('Brief description...')).toBeVisible()
  })

  test('dialog contains a Reason field', async ({ scenarioPage: page }) => {
    await page.getByRole('button', { name: /create snapshot/i }).click()
    await expect(page.getByPlaceholder('e.g., Updated assumptions')).toBeVisible()
  })

  test('submitting without a label shows a validation warning', async ({ scenarioPage: page }) => {
    await page.getByRole('button', { name: /create snapshot/i }).click()
    // Click Save/Create without filling the label
    await page.getByRole('button', { name: /save|create/i }).last().click()
    // PrimeVue Toast warning should appear
    await expect(page.locator('.p-toast').first()).toBeVisible({ timeout: 3000 })
  })

  test('filling label and saving calls the API and closes dialog', async ({
    scenarioPage: page,
  }) => {
    await page.getByRole('button', { name: /create snapshot/i }).click()
    await page.getByPlaceholder('e.g., Q1 Forecast').fill('My New Snapshot')
    await page.getByRole('button', { name: /save|create/i }).last().click()
    // On success the dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  })
})
