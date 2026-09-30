/**
 * E2E — Authentication through the backend's Backend-for-Frontend (BFF).
 *
 * Sign-in runs on the backend: the SPA navigates to /bff/login, the backend
 * sends the browser to Socrate, Socrate back to /bff/callback, and the backend
 * sets an HttpOnly session cookie and returns to the page. Here a fake BFF and
 * a fake issuer play those parts with page.route(); no backend or identity
 * provider is reached, and nothing in the app is bypassed.
 */

import { test, expect, type Page, type Request } from '@playwright/test'
import { mockApiCalls, MOCK_USER, PLAN_ID } from './fixtures'

// The fake issuer lives on the app's origin: where Socrate is does not matter
// to the SPA (the backend redirects there), and a cross-origin https host
// would put the browser's TLS and network rules into the test.
const ISSUER_PATH = '/__fake-issuer'
const CSRF = 'csrf-from-the-bff'

/**
 * A page that sends the browser on to url. The real backend answers 302; a
 * mocked 302 would not do here, because the request a fulfilled redirect leads
 * to bypasses page.route() and reaches the preview server.
 */
function goOn(url: string) {
  return { contentType: 'text/html', body: `<html><body><script>location.replace(${JSON.stringify(url)})</script></body></html>` }
}

/**
 * A fake BFF and issuer. /bff/login sends the browser to the issuer's
 * /oauth/authorize (keeping return_to), the issuer to /bff/callback, and the
 * callback starts the session and returns to the page. Every request the app
 * makes is recorded.
 */
async function fakeBff(page: Page, opts: { signedIn?: boolean } = {}) {
  const state = { signedIn: opts.signedIn ?? false, logins: [] as URL[], requests: [] as Request[], logouts: [] as Request[] }
  page.on('request', r => state.requests.push(r))

  await page.route('**/bff/session', route => route.fulfill({
    headers: { 'Cache-Control': 'no-store' },
    json: state.signedIn
      ? { authenticated: true, user: { sub: '42', email: MOCK_USER.email, name: MOCK_USER.name }, csrf: CSRF }
      : { authenticated: false },
  }))
  await page.route('**/bff/login**', (route) => {
    const url = new URL(route.request().url())
    state.logins.push(url)
    const authorize = new URL(`${url.origin}${ISSUER_PATH}/oauth/authorize`)
    authorize.searchParams.set('response_type', 'code')
    authorize.searchParams.set('state', 'state-1')
    authorize.searchParams.set('code_challenge_method', 'S256')
    authorize.searchParams.set('redirect_uri', `${url.origin}/bff/callback`)
    authorize.searchParams.set('return_to', url.searchParams.get('return_to') ?? '/') // carried for the fake only
    return route.fulfill(goOn(authorize.toString()))
  })
  await page.route(`**${ISSUER_PATH}/**`, (route) => {
    const authorize = new URL(route.request().url())
    const callback = new URL(authorize.searchParams.get('redirect_uri')!)
    callback.searchParams.set('code', 'code-1')
    callback.searchParams.set('state', authorize.searchParams.get('state')!)
    callback.searchParams.set('rt', authorize.searchParams.get('return_to')!)
    // The user signs in at the issuer, which then sends the browser back.
    return route.fulfill(goOn(callback.toString()))
  })
  await page.route('**/bff/callback**', (route) => {
    const url = new URL(route.request().url())
    state.signedIn = true
    return route.fulfill(goOn(url.searchParams.get('rt') ?? '/'))
  })
  await page.route('**/bff/logout', (route) => {
    state.logouts.push(route.request())
    state.signedIn = false
    return route.fulfill({ status: 204 })
  })
  return state
}

async function expectNoAuthInBrowserStorage(page: Page) {
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  expect(stored).not.toContain(CSRF)
  expect(stored).not.toMatch(/token|verifier|state|session/i)
}

test.describe('Sign-in through the BFF', () => {
  test('sign-in comes back to the page that asked for it', async ({ page }) => {
    // /admin/tenant: an owner page that stays put once loaded (plan pages may
    // move on to a scenario by themselves). A signed-out visit reaches /login
    // with ?redirect= from the landing page (see the guard tests below).
    const target = '/admin/tenant'
    await mockApiCalls(page) // before fakeBff: the routes registered last win
    const bff = await fakeBff(page)

    // Every step of the round trip, for the failure message.
    const trail: string[] = []
    page.on('framenavigated', f => { if (f === page.mainFrame()) trail.push(`nav ${f.url()}`) })
    page.on('console', m => trail.push(`console.${m.type()} ${m.text()}`))
    page.on('pageerror', e => trail.push(`pageerror ${e.message}`))

    await page.goto(`/login?redirect=${encodeURIComponent(target)}`)

    try {
      await expect.poll(() => bff.logins.length).toBe(1)
      expect(bff.logins[0].searchParams.get('return_to')).toBe(target)
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe(target)
    } catch (e) {
      throw new Error(`${(e as Error).message}\n--- trail ---\n${trail.join('\n')}`, { cause: e })
    }
    // The page is now in the app, signed in.
    await expect(page.locator('[data-test="user-menu"]')).toBeVisible()
    await expectNoAuthInBrowserStorage(page)
  })

  test('the landing "Sign in" link goes straight to /bff/login', async ({ page }) => {
    await mockApiCalls(page) // before fakeBff: the routes registered last win
    const bff = await fakeBff(page)

    await page.goto('/login?auto=1')

    await page.waitForURL(url => url.pathname === '/')
    expect(bff.logins).toHaveLength(1)
  })

  test('API calls are same-origin, never carry a bearer, and send the CSRF token on unsafe methods', async ({ page, baseURL }) => {
    await mockApiCalls(page) // before fakeBff: the routes registered last win
    const bff = await fakeBff(page, { signedIn: true })

    await page.goto('/')
    await expect(page.locator('[data-test="user-menu"]')).toBeVisible()
    await page.locator('[data-test="user-menu"]').click()
    await page.getByRole('menuitem', { name: /déconnexion|logout/i }).click()
    await page.waitForURL(/\/landing/)

    const origin = new URL(baseURL!).origin
    const xhr = bff.requests.filter(r => ['xhr', 'fetch'].includes(r.resourceType()))
    expect(xhr.length).toBeGreaterThan(2)
    for (const r of xhr) {
      expect(new URL(r.url()).origin, r.url()).toBe(origin)
      expect(await r.headerValue('authorization'), r.url()).toBeNull()
    }
    expect(bff.logouts).toHaveLength(1)
    expect(await bff.logouts[0].headerValue('x-csrf-token')).toBe(CSRF)
    for (const r of xhr.filter(r => r.method() !== 'GET' && r.method() !== 'HEAD')) {
      expect(await r.headerValue('x-csrf-token'), r.url()).toBe(CSRF)
    }
    await expectNoAuthInBrowserStorage(page)
  })

  test('a lost session (401) re-checks /bff/session and signs in again to the same page', async ({ page }) => {
    await mockApiCalls(page) // before fakeBff: the routes registered last win
    const bff = await fakeBff(page, { signedIn: true })
    await page.goto('/')
    await expect(page.locator('[data-test="user-menu"]')).toBeVisible()

    // The session ends on the server (idle timeout, refresh rejected).
    bff.signedIn = false
    await page.route('**/api/v1/plans**', route => route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED', message: 'authentication required' } }))
    await page.evaluate(id => (document.querySelector('#app') as any).__vue_app__.config.globalProperties.$router.push(`/plans/${id}`), PLAN_ID)

    await expect.poll(() => bff.logins.length).toBeGreaterThan(0)
    expect(bff.logins[0].searchParams.get('return_to')).toBe(`/plans/${PLAN_ID}`)
  })

  test('a sign-in the backend refused shows why, without looping back to Socrate', async ({ page }) => {
    const bff = await fakeBff(page)

    await page.goto('/login?error=sign_in_failed&auto=1')

    await expect(page.locator('[data-test="login-error"]')).toBeVisible()
    await page.waitForTimeout(300)
    expect(bff.logins).toHaveLength(0)
    await page.locator('[data-test="login-button"]').click()
    await expect.poll(() => bff.logins.length).toBe(1)
  })
})

test.describe('Navigation guards — unauthenticated', () => {
  // Unauthenticated visitors are sent to the SPA landing route (/landing),
  // carrying the requested path as ?redirect= for everything but "/".
  test.beforeEach(async ({ page }) => {
    await page.route('**/bff/session', route => route.fulfill({ json: { authenticated: false } }))
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

  test('a backend that is down counts as signed out', async ({ page }) => {
    await page.route('**/bff/session', route => route.fulfill({ status: 502, body: 'Bad Gateway' }))
    await page.goto('/plans/plan-1')
    await page.waitForURL(/\/landing\?/)
  })
})
