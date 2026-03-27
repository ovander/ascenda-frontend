/**
 * E2E — Authentication flows (public / unauthenticated).
 *
 * These tests do NOT require a backend. They cover the login page UI,
 * the OAuth callback error path, and the unauthenticated redirect guard.
 */

import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    // Block API calls so no network errors appear in the console
    await page.route('**/api/**', route => route.fulfill({ json: {} }))
    await page.route('**/auth/**', route => route.fulfill({ json: {} }))
  })

  test('loads with the correct page title', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/KerPlan|Vite|frontend/i)
  })

  test('shows the login card with a visible heading', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('shows the app branding text', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Multi-Tenant SaaS Business Plan Application')).toBeVisible()
  })

  test('renders a gradient background', async ({ page }) => {
    await page.goto('/login')
    const bg = page.locator('.bg-gradient-to-br')
    await expect(bg).toBeVisible()
  })

  test('login card is visible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')
    const card = page.locator('.bg-white.rounded-xl')
    await expect(card).toBeVisible()
  })

  test('login card is visible on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/login')
    const card = page.locator('.bg-white.rounded-xl')
    await expect(card).toBeVisible()
  })
})

test.describe('OAuth callback', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**',  route => route.fulfill({ json: {} }))
    await page.route('**/auth/**', route => route.fulfill({ json: {} }))
  })

  test('stays on /callback when visiting the route', async ({ page }) => {
    await page.goto('/callback')
    await expect(page).toHaveURL(/callback/)
  })

  test('shows an error when code/state params are missing', async ({ page }) => {
    await page.goto('/callback')
    // Without ?code=&state= the CallbackView renders the error card
    await expect(
      page.getByText(/missing authorization code|authentication error/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('error card has a "Return to login" link', async ({ page }) => {
    await page.goto('/callback')
    await expect(page.getByRole('link', { name: /return to login/i })).toBeVisible({
      timeout: 5000,
    })
  })
})

test.describe('Navigation guards — unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**',  route => route.fulfill({ json: {} }))
    await page.route('**/auth/**', route => route.fulfill({ json: {} }))
  })

  test('redirects / to /login when not authenticated', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL(/login/)
    await expect(page).toHaveURL(/login/)
  })

  test('redirects /plans to /login', async ({ page }) => {
    await page.goto('/plans/some-plan-id')
    await page.waitForURL(/login/)
    await expect(page).toHaveURL(/login/)
  })

  test('redirects scenario dashboard to /login', async ({ page }) => {
    await page.goto('/plans/p1/scenarios/s1/snapshots')
    await page.waitForURL(/login/)
    await expect(page).toHaveURL(/login/)
  })

  test('appends redirect query param when bouncing to login', async ({ page }) => {
    await page.goto('/plans/plan-1')
    await page.waitForURL(/login/)
    // The router adds ?redirect=... so the user lands back after login
    expect(page.url()).toContain('redirect')
  })
})
