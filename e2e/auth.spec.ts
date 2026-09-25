/**
 * E2E — Authentication flows (public / unauthenticated).
 *
 * These tests do NOT require a backend. They cover the PKCE login redirect,
 * the OAuth callback error path, and the unauthenticated redirect guard.
 */

import { test, expect } from '@playwright/test'

test.describe('Login redirect (Authorization Code + PKCE)', () => {
  // /login renders nothing: its route guard builds the authorize URL and
  // navigates to the identity provider. The authorize request is intercepted
  // so the suite never leaves the preview server or touches the real IdP.
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', route => route.fulfill({ json: {} }))
    await page.route('**/oauth/authorize**', route =>
      route.fulfill({ contentType: 'text/html', body: '<html><body data-testid="idp">idp</body></html>' }),
    )
  })

  async function authorizeUrl(page: import('@playwright/test').Page): Promise<URL> {
    await page.goto('/login')
    await page.waitForURL(/\/oauth\/authorize\?/)
    return new URL(page.url())
  }

  test('navigates to the identity provider authorize endpoint', async ({ page }) => {
    const url = await authorizeUrl(page)
    expect(url.pathname).toBe('/oauth/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBeTruthy()
    expect(url.searchParams.get('redirect_uri')).toMatch(/\/callback$/)
    expect(url.searchParams.get('scope')).toContain('openid')
  })

  test('sends a PKCE S256 challenge and a state nonce', async ({ page }) => {
    const url = await authorizeUrl(page)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    // base64url(SHA-256) is 43 characters without padding
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(url.searchParams.get('state')).toMatch(/^[a-z0-9]{32}$/)
  })

  test('generates a fresh state and challenge on every login', async ({ page }) => {
    const first = await authorizeUrl(page)
    const second = await authorizeUrl(page)
    expect(second.searchParams.get('state')).not.toBe(first.searchParams.get('state'))
    expect(second.searchParams.get('code_challenge')).not.toBe(first.searchParams.get('code_challenge'))
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
  // Unauthenticated visitors are sent to the SPA landing route (/landing),
  // carrying the requested path as ?redirect= for everything but "/".
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**',  route => route.fulfill({ json: {} }))
    await page.route('**/auth/**', route => route.fulfill({ json: {} }))
  })

  test('redirects / to /landing when not authenticated', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL(/\/landing(\?|$)/)
    await expect(page).toHaveURL(/\/landing$/)
  })

  test('redirects /plans to /landing', async ({ page }) => {
    await page.goto('/plans/some-plan-id')
    await page.waitForURL(/\/landing\?/)
    await expect(page).toHaveURL(/\/landing\?redirect=/)
  })

  test('redirects scenario dashboard to /landing', async ({ page }) => {
    await page.goto('/plans/p1/scenarios/s1/snapshots')
    await page.waitForURL(/\/landing\?/)
    await expect(page).toHaveURL(/\/landing\?redirect=/)
  })

  test('appends the requested path as redirect query param', async ({ page }) => {
    await page.goto('/plans/plan-1')
    await page.waitForURL(/\/landing\?/)
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toBe('/plans/plan-1')
  })
})
