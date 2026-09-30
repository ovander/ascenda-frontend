/**
 * E2E — Passwordless sign-in with a Socrate magic link.
 *
 * The landing form asks the backend to have Socrate e-mail a link; the link
 * opens /magic-link?token=…&client_id=…, which posts the token to the backend
 * and signs the user in. No live backend: every call is intercepted.
 */

import { test, expect } from '@playwright/test'
import { mockApiCalls, PLAN_ID } from './fixtures'

test.describe('Magic-link request (landing page)', () => {
  // /landing exists twice: a full page load gets the static public/landing.html,
  // an in-app redirect (router guard) renders the Vue landing page. Both forms
  // post to the API on the app's own origin (Caddy routes /auth to it).
  const entries = [
    { name: 'static landing page', open: `/landing.html?redirect=/plans/${PLAN_ID}` },
    { name: 'in-app landing page', open: `/plans/${PLAN_ID}` },
  ]

  for (const entry of entries) {
    test(`${entry.name}: posts only the e-mail to the API and remembers the requested page`, async ({ page, baseURL }) => {
      await page.route('**/bff/session', route => route.fulfill({ json: { authenticated: false } }))
      await page.route('**/api/**', route => route.fulfill({ json: {} }))
      const requests: { url: string; body: unknown }[] = []
      await page.route('**/auth/magic-link', async (route) => {
        requests.push({ url: route.request().url(), body: route.request().postDataJSON() })
        await route.fulfill({ status: 202, json: { message: 'sent' } })
      })

      await page.goto(entry.open)
      const form = page.locator('#login form')
      await form.locator('input[type="email"]').fill('ada@example.com')
      await form.locator('button[type="submit"]').click()

      await expect(page.getByText(/magic link sent|check your inbox/i).first()).toBeVisible()
      expect(requests).toEqual([{ url: `${new URL(baseURL!).origin}/auth/magic-link`, body: { email: 'ada@example.com' } }])
      expect(await page.evaluate(() => localStorage.getItem('magic_link_redirect'))).toBe(`/plans/${PLAN_ID}`)
    })
  }
})

test.describe('Magic-link sign-in (/magic-link)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiCalls(page)
  })

  // The BFF redeems the link into a session: it answers like GET /bff/session
  // and sets the HttpOnly cookie; no token ever reaches the browser.
  async function mockVerify(page: import('@playwright/test').Page, status = 200) {
    const tokens: unknown[] = []
    let signedIn = false
    await page.route('**/bff/session', route => route.fulfill({
      json: signedIn ? { authenticated: true, user: { sub: '42' }, csrf: 'csrf-1' } : { authenticated: false },
    }))
    await page.route('**/bff/magic-link/verify', async (route) => {
      tokens.push(route.request().postDataJSON())
      if (status !== 200) return route.fulfill({ status, json: { code: 'UNAUTHORIZED', message: 'invalid' } })
      signedIn = true
      return route.fulfill({ json: { authenticated: true, user: { sub: '42' }, csrf: 'csrf-1' } })
    })
    return tokens
  }

  test('redeems the token with a POST and opens the dashboard', async ({ page }) => {
    const posted = await mockVerify(page)

    await page.goto('/magic-link?token=single-use&client_id=VowmSxfnObxDKFvdk1Lucg')

    await page.waitForURL(url => url.pathname === '/')
    expect(posted).toEqual([{ token: 'single-use' }])
    expect(page.url()).not.toContain('single-use')
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
    expect(stored).not.toContain('csrf-1')
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
