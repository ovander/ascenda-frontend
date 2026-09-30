/**
 * E2E — Plans Dashboard (authenticated).
 *
 * Covers: plans list, empty state, plan-row navigation, "New Plan" button.
 * All API calls are intercepted — no backend required.
 */

import { test, expect, mockApiCalls, MOCK_PLAN, MOCK_USER, signInAs } from './fixtures'

test.describe('Plans Dashboard', () => {
  test('renders the dashboard heading', async ({ authedPage: page }) => {
    await expect(page.locator('h1')).toBeVisible()
    // The i18n key resolves to "Dashboard" or similar
    const heading = await page.locator('h1').textContent()
    expect(heading).toBeTruthy()
  })

  test('shows a welcome message for the logged-in user', async ({ authedPage: page }) => {
    await expect(page.getByText(new RegExp(MOCK_USER.name, 'i')).first()).toBeVisible()
  })

  test('"New Plan" button is visible', async ({ authedPage: page }) => {
    // The button label comes from i18n — look for the pi-plus icon as a reliable anchor
    const newPlanButton = page.locator('button:has(.pi-plus)')
    await expect(newPlanButton).toBeVisible()
  })

  test('"New Plan" button navigates to /plans/new', async ({ authedPage: page }) => {
    const btn = page.locator('button:has(.pi-plus)')
    await btn.click()
    await expect(page).toHaveURL(/\/plans\/new/)
  })

  test('shows the plans DataTable', async ({ authedPage: page }) => {
    const table = page.locator('.p-datatable')
    await expect(table).toBeVisible()
  })

  test('displays the mocked plan name in the table', async ({ authedPage: page }) => {
    await expect(page.getByText(MOCK_PLAN.name)).toBeVisible()
  })

  test('displays the plan status badge', async ({ authedPage: page }) => {
    // PrimeVue Tag component renders the status as text inside a span
    await expect(page.getByText(MOCK_PLAN.status)).toBeVisible()
  })

  test('clicking a plan row navigates to plan overview', async ({ authedPage: page }) => {
    const row = page.locator('.p-datatable-tbody tr').first()
    await row.click()
    await expect(page).toHaveURL(new RegExp(`/plans/${MOCK_PLAN.id}`))
  })
})

test.describe('Plans Dashboard — empty state', () => {
  test('shows empty-state message when no plans exist', async ({ page }) => {
    // Signed in (mocked BFF session) for every page.goto() below
    await signInAs(page, MOCK_USER)

    // Override API: return empty plans list but valid user
    await mockApiCalls(page)
    await page.route('**/api/v1/plans/**', route => route.fulfill({ json: [] }))
    await page.route('**/api/v1/plans', route => route.fulfill({ json: [] }))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/no plans yet/i)).toBeVisible()
  })
})
