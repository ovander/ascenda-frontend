import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'
import { useAuthStore, loginUrl } from './auth'

vi.mock('axios')

const USER = { id: 'u1', name: 'Ada', email: 'ada@example.test', role: 'owner' as const }
const SESSION = { authenticated: true, user: { sub: '42', email: 'ada@example.test' }, csrf: 'csrf-1' }

describe('auth store (BFF session)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(axios.get).mockReset()
    vi.mocked(axios.post).mockReset()
  })

  it('starts signed out, holding no token of any kind', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.csrf).toBeNull()
    expect(Object.keys(store.$state)).toEqual(expect.not.arrayContaining(['accessToken', 'refreshToken']))
  })

  it('loads the session and the user from same-origin paths', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: SESSION })
      .mockResolvedValueOnce({ data: USER })
    const store = useAuthStore()

    expect(await store.loadSession()).toBe(true)

    expect(vi.mocked(axios.get).mock.calls.map(c => c[0])).toEqual(['/bff/session', '/api/v1/users/me'])
    expect(store.csrf).toBe('csrf-1')
    expect(store.user).toEqual(USER)
    expect(store.checked).toBe(true)
  })

  it.each([
    ['not authenticated', { authenticated: false }],
    ['authenticated without a CSRF token', { authenticated: true }],
    ['an HTML page (the SPA fallback)', '<!doctype html>'],
    ['nothing', null],
  ])('treats %s as signed out', async (_label, data) => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data })
    const store = useAuthStore()
    expect(await store.loadSession()).toBe(false)
    expect(store.csrf).toBeNull()
    expect(axios.get).toHaveBeenCalledTimes(1)
  })

  it('treats an unreachable backend as signed out', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('network'))
    const store = useAuthStore()
    expect(await store.loadSession()).toBe(false)
  })

  it('keeps the session when only the profile fails (no sign-in loop)', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: SESSION })
      .mockRejectedValueOnce({ response: { status: 401 } })
    const store = useAuthStore()
    expect(await store.loadSession()).toBe(true)
    expect(store.user).toBeNull()
  })

  it('asks /bff/session once per page load, however many callers', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: SESSION })
      .mockResolvedValueOnce({ data: USER })
    const store = useAuthStore()
    const results = await Promise.all([store.ensureSession(), store.ensureSession(), store.ensureSession()])
    expect(results).toEqual([true, true, true])
    expect(await store.ensureSession()).toBe(true)
    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  it('signs in by navigating to the backend with the page to return to', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    useAuthStore().login('/plans/1?tab=pnl')
    expect(assign).toHaveBeenCalledWith('/bff/login?return_to=%2Fplans%2F1%3Ftab%3Dpnl')
    vi.unstubAllGlobals()
    expect(loginUrl()).toBe('/bff/login?return_to=%2F')
  })

  it('redeems a magic link into a session', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: SESSION })
    vi.mocked(axios.get).mockResolvedValueOnce({ data: USER })
    const store = useAuthStore()

    await store.magicLink('link-token')

    expect(axios.post).toHaveBeenCalledWith('/bff/magic-link/verify', { token: 'link-token' })
    expect(store.csrf).toBe('csrf-1')
    expect(store.user).toEqual(USER)
  })

  it('fails a magic link the backend did not turn into a session', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { authenticated: false } })
    await expect(useAuthStore().magicLink('t')).rejects.toThrow()
    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('signs out through the backend with the CSRF token', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ status: 204 })
    const store = useAuthStore()
    store.csrf = 'csrf-1'
    store.user = USER

    await store.logout()

    expect(axios.post).toHaveBeenCalledWith('/bff/logout', null, { headers: { 'X-CSRF-Token': 'csrf-1' } })
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
  })

  it('clears the local state even when the backend is unreachable', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('network'))
    const store = useAuthStore()
    store.csrf = 'csrf-1'
    await store.logout()
    expect(store.isAuthenticated).toBe(false)
  })

  it('does not call the backend to sign out without a session', async () => {
    await useAuthStore().logout()
    expect(axios.post).not.toHaveBeenCalled()
  })
})
