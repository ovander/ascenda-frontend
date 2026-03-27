/**
 * E2E — Navigation guards and role-based access.
 *
 * Covers:
 *  - Unauthenticated redirect for all protected routes
 *  - Admin role cannot access business routes (plans, scenarios, …)
 *  - Owner/editor role CAN access admin-restricted routes
 *  - AppShell sidebar renders after login
 */

import { test, expect, mockApiCalls, MOCK_USER, PLAN_ID, SCENARIO_ID } from './fixtures'


test.describe('Unauthenticated redirect', () => {
  const protectedRoutes = [
    '/',
    `/plans/${PLAN_ID}`,
    `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/settings`,
    `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/snapshots`,
    `/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/graphs`,
    '/admin/tenant',
    '/admin/users',
  ]

  for (const route of protectedRoutes) {
    test(`redirects "${route}" to /login when not authenticated`, async ({ page }) => {
      await page.route('**/api/**',  r => r.fulfill({ json: {} }))
      await page.route('**/auth/**', r => r.fulfill({ json: {} }))
      await page.goto(route)
      await page.waitForURL(/login/)
      await expect(page).toHaveURL(/login/)
    })
  }
})

test.describe('AppShell after login', () => {
  test('sidebar is rendered for authenticated owner', async ({ page }) => {
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_USER }
    await page.addInitScript((d) => { ;(window as any).__E2E_AUTH__ = d }, payload)
    await mockApiCalls(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // AppShell renders AppSidebar — check for the nav element or sidebar class
    const sidebar = page.locator('nav, aside, [class*="sidebar"], [class*="Sidebar"]').first()
    await expect(sidebar).toBeVisible()
  })

  test('top bar is rendered for authenticated user', async ({ page }) => {
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_USER }
    await page.addInitScript((d) => { ;(window as any).__E2E_AUTH__ = d }, payload)
    await mockApiCalls(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // AppTopbar renders a header element
    const topbar = page.locator('header, [class*="topbar"], [class*="Topbar"]').first()
    await expect(topbar).toBeVisible()
  })
})

test.describe('Role-based access — admin role', () => {
  test('admin cannot access the plans dashboard and is redirected', async ({ page }) => {
    // Bootstrap the app as admin from the start so auth survives page.goto()
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: { ...MOCK_USER, role: 'admin' } }
    await page.addInitScript((d) => { ;(window as any).__E2E_AUTH__ = d }, payload)
    await mockApiCalls(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Navigate to a business route — router guard should redirect admin to admin-dashboard.
    // Use Vue Router push so Pinia state (admin role) is preserved without a full reload.
    // expect(page).toHaveURL polls for the URL change and handles SPA navigation correctly;
    // page.waitForURL would time out because SPA pushState doesn't emit a "load" event.
    await page.evaluate((planId) => {
      const app    = (document.querySelector('#app') as any)?.__vue_app__
      const router = app?.config?.globalProperties?.$router
      if (router) return router.push(`/plans/${planId}`)
    }, PLAN_ID)
    await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 5000 })
  })

  test('admin can access /admin/users', async ({ page }) => {
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: { ...MOCK_USER, role: 'admin' } }
    await page.addInitScript((d) => { ;(window as any).__E2E_AUTH__ = d }, payload)
    await mockApiCalls(page)
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/admin\/users/)
  })
})

test.describe('Role-based access — owner role', () => {
  test('owner can access /admin/tenant', async ({ page }) => {
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_USER }
    await page.addInitScript((d) => { ;(window as any).__E2E_AUTH__ = d }, payload)
    await mockApiCalls(page)
    await page.goto('/admin/tenant')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/admin\/tenant/)
  })

  test('owner can access the plans dashboard', async ({ page }) => {
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_USER }
    await page.addInitScript((d) => { ;(window as any).__E2E_AUTH__ = d }, payload)
    await mockApiCalls(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Should stay on dashboard (not redirected to login or admin)
    await expect(page).not.toHaveURL(/login/)
    await expect(page).not.toHaveURL(/admin\/users/)
  })
})

test.describe('Unknown routes', () => {
  test('unknown path redirects to the dashboard', async ({ page }) => {
    const payload = { accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_USER }
    await page.addInitScript((d) => { ;(window as any).__E2E_AUTH__ = d }, payload)
    await mockApiCalls(page)
    await page.goto('/this/path/does/not/exist')
    // Router has a catch-all that redirects to '/'
    await expect(page).not.toHaveURL(/this\/path\/does/)
  })
})
