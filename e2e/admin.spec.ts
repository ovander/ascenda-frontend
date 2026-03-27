/**
 * E2E — Admin Dashboard (admin role, no plan access).
 *
 * Covers: page structure, KPI cards, activity list, top-users table,
 * redirect behaviour for admin role, and sidebar navigation.
 * All API calls are intercepted — no backend required.
 */

import { test, expect, MOCK_ADMIN_STATS } from './fixtures'

const ADMIN_DASHBOARD_URL = '/admin/dashboard'

test.describe('Admin Dashboard — page structure', () => {
  test.beforeEach(async ({ adminPage: page }) => {
    // adminPage fixture already navigates to /admin/dashboard
  })

  test('page heading reads "Admin Dashboard"', async ({ adminPage: page }) => {
    await expect(page.locator('h1')).toHaveText('Admin Dashboard')
  })

  test('Users section heading is visible', async ({ adminPage: page }) => {
    await expect(page.getByText('Users', { exact: true })).toBeVisible()
  })

  test('Content section heading is visible', async ({ adminPage: page }) => {
    await expect(page.getByText('Content', { exact: true })).toBeVisible()
  })

  test('"Recent Activity" panel is visible', async ({ adminPage: page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible()
  })

  test('"Top Users by Activity" panel is visible', async ({ adminPage: page }) => {
    await expect(page.getByText('Top Users by Activity')).toBeVisible()
  })
})

test.describe('Admin Dashboard — KPI cards', () => {
  // Numbers can appear in multiple places (tables, sub-text, etc.) so we scope
  // to .text-3xl which is only used for KPI card values.
  test('Total Users card shows correct count', async ({ adminPage: page }) => {
    await expect(page.locator('.text-3xl').filter({ hasText: String(MOCK_ADMIN_STATS.users.total) }).first()).toBeVisible()
  })

  test('Owners card shows correct count', async ({ adminPage: page }) => {
    await expect(page.locator('.text-3xl').filter({ hasText: String(MOCK_ADMIN_STATS.users.byRole.owner) }).first()).toBeVisible()
  })

  test('Admins card shows correct count', async ({ adminPage: page }) => {
    await expect(page.locator('.text-3xl').filter({ hasText: String(MOCK_ADMIN_STATS.users.byRole.admin) }).first()).toBeVisible()
  })

  test('Members card shows correct count', async ({ adminPage: page }) => {
    await expect(page.locator('.text-3xl').filter({ hasText: String(MOCK_ADMIN_STATS.users.byRole.user) }).first()).toBeVisible()
  })

  test('Total Plans card shows correct count', async ({ adminPage: page }) => {
    await expect(page.locator('.text-3xl').filter({ hasText: String(MOCK_ADMIN_STATS.plans.total) }).first()).toBeVisible()
  })

  test('Scenarios card shows correct count', async ({ adminPage: page }) => {
    await expect(page.locator('.text-3xl').filter({ hasText: String(MOCK_ADMIN_STATS.scenarios.total) }).first()).toBeVisible()
  })
})

test.describe('Admin Dashboard — Recent Activity', () => {
  test('mocked plan activity entry is visible', async ({ adminPage: page }) => {
    await expect(page.getByText(MOCK_ADMIN_STATS.recentActivity[0].name)).toBeVisible()
  })

  test('mocked scenario activity entry is visible', async ({ adminPage: page }) => {
    await expect(page.getByText(MOCK_ADMIN_STATS.recentActivity[1].name)).toBeVisible()
  })
})

test.describe('Admin Dashboard — Top Users table', () => {
  test('DataTable is rendered', async ({ adminPage: page }) => {
    const table = page.locator('.p-datatable')
    await expect(table).toBeVisible()
  })

  test('top user name appears in the table', async ({ adminPage: page }) => {
    await expect(page.getByText(MOCK_ADMIN_STATS.topUsers[0].name)).toBeVisible()
  })

  test('top user email appears in the table', async ({ adminPage: page }) => {
    // Email also appears in activity list — scope to the DataTable
    await expect(
      page.locator('.p-datatable').getByText(MOCK_ADMIN_STATS.topUsers[0].email).first()
    ).toBeVisible()
  })
})

test.describe('Admin Dashboard — access control', () => {
  test('admin role lands on /admin/dashboard after navigating to /', async ({ page }) => {
    const { mockApiCalls, MOCK_ADMIN_USER } = await import('./fixtures')
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_ADMIN_USER }
    await page.addInitScript((data) => { ;(window as any).__E2E_AUTH__ = data }, payload)
    await mockApiCalls(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test('admin role is redirected away from plan routes', async ({ page }) => {
    const { mockApiCalls, MOCK_ADMIN_USER, PLAN_ID } = await import('./fixtures')
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_ADMIN_USER }
    await page.addInitScript((data) => { ;(window as any).__E2E_AUTH__ = data }, payload)
    await mockApiCalls(page)
    await page.goto(`/plans/${PLAN_ID}`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })
})

test.describe('Admin Dashboard — sidebar navigation', () => {
  test('admin sees the "Overview" sidebar link', async ({ adminPage: page }) => {
    await expect(page.getByText('Overview')).toBeVisible()
  })

  test('admin sees the "Administration" panel in the sidebar', async ({ adminPage: page }) => {
    // PanelMenu renders the parent item with role="button" in the aside
    await expect(page.locator('aside').getByText('Administration')).toBeVisible()
  })

  test('expanding "Administration" panel reveals submenu items', async ({ adminPage: page }) => {
    // Expand the Administration accordion panel
    await page.locator('aside').getByText('Administration').click()
    // PrimeVue PanelMenu renders submenu items as treeitems inside the region
    const adminRegion = page.getByRole('region', { name: 'Administration' })
    await expect(adminRegion.getByRole('treeitem').first()).toBeVisible({ timeout: 3000 })
  })

  test('clicking the Users submenu item navigates to /admin/users', async ({ adminPage: page }) => {
    // Expand the Administration accordion, then click the Users treeitem
    await page.locator('aside').getByText('Administration').click()
    const adminRegion = page.getByRole('region', { name: 'Administration' })
    // Users is the second treeitem (after Overview/Dashboard)
    await adminRegion.getByRole('treeitem').nth(1).click()
    await expect(page).toHaveURL(/\/admin\/users/)
  })
})
