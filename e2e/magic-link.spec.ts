/**
 * E2E — Passwordless sign-in with a Socrate magic link.
 *
 * The landing form asks the backend to have Socrate e-mail a link; the link
 * opens /magic-link?token=…&client_id=…, which posts the token to the backend
 * and signs the user in. No live backend: every call is intercepted.
 */

import { test, expect } from '@playwright/test'
import { mockApiCalls, PLAN_ID } from './fixtures'

const API = 'https://api.ascenda.vandermoten.eu' // VITE_API_BASE_URL of the build under test

test.describe('Magic-link request (landing page)', () => {
  // /landing exists twice: a full page load gets the static public/landing.html,
  // an in-app redirect (router guard) renders the Vue landing page. Both forms
  // must post to the API origin, not to the frontend host.
  const entries = [
    { name: 'static landing page', open: `/landing.html?redirect=/plans/${PLAN_ID}` },
    { name: 'in-app landing page', open: `/plans/${PLAN_ID}` },
  ]

  for (const entry of entries) {
    test(`${entry.name}: posts only the e-mail to the API and remembers the requested page`, async ({ page }) => {
      await page.route('**/api/**', route => route.fulfill({ json: {} }))
      const requests: { url: string; body: unknown }[] = []
      await page.route('**/auth/magic-link', async (route) => {
        // The API is on another origin: answer the CORS preflight.
        if (route.request().method() === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
          } })
        }
        requests.push({ url: route.request().url(), body: route.request().postDataJSON() })
        await route.fulfill({ status: 202, json: { message: 'sent' }, headers: { 'Access-Control-Allow-Origin': '*' } })
      })

      await page.goto(entry.open)
      const form = page.locator('#login form')
      await form.locator('input[type="email"]').fill('ada@example.com')
      await form.locator('button[type="submit"]').click()

      await expect(page.getByText(/magic link sent|check your inbox/i).first()).toBeVisible()
      expect(requests).toEqual([{ url: `${API}/auth/magic-link`, body: { email: 'ada@example.com' } }])
      expect(await page.evaluate(() => localStorage.getItem('magic_link_redirect'))).toBe(`/plans/${PLAN_ID}`)
    })
  }
})

test.describe('Magic-link sign-in (/magic-link)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiCalls(page)
  })

  async function mockVerify(page: import('@playwright/test').Page, status = 200) {
    const tokens: unknown[] = []
    await page.route('**/auth/magic-link/verify', async (route) => {
      tokens.push(route.request().postDataJSON())
      if (status !== 200) return route.fulfill({ status, json: { error: { message: 'invalid' } } })
      return route.fulfill({ json: { accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 } })
    })
    return tokens
  }

  test('redeems the token with a POST and opens the dashboard', async ({ page }) => {
    const posted = await mockVerify(page)

    await page.goto('/magic-link?token=single-use&client_id=VowmSxfnObxDKFvdk1Lucg')

    await page.waitForURL(url => url.pathname === '/')
    expect(posted).toEqual([{ token: 'single-use' }])
    expect(page.url()).not.toContain('single-use')
  })

  test('opens the page remembered when the link was requested', async ({ page }) => {
    await mockVerify(page)
    await page.addInitScript(id => localStorage.setItem('magic_link_redirect', `/plans/${id}`), PLAN_ID)

    await page.goto('/magic-link?token=single-use')

    await page.waitForURL(url => url.pathname === `/plans/${PLAN_ID}`)
  })

  test('explains an invalid, expired or used link and removes the token from the URL', async ({ page }) => {
    await mockVerify(page, 401)

    await page.goto('/magic-link?token=spent')

    // French is the default language until a plan sets another one.
    await expect(page.locator('[data-test="magic-link-error"]')).toContainText(/invalide, a expiré ou a déjà été utilisé/i)
    await expect(page.getByRole('link', { name: /demander un nouveau lien/i })).toBeVisible()
    expect(new URL(page.url()).search).toBe('')
  })

  test('shows the error without calling the API when the link has no token', async ({ page }) => {
    const posted = await mockVerify(page)

    await page.goto('/magic-link')

    await expect(page.locator('[data-test="magic-link-error"]')).toBeVisible()
    expect(posted).toEqual([])
  })
})
