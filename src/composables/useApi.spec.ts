import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'

const auth = vi.hoisted(() => ({
  csrf: 'csrf-1' as string | null,
  recheckSession: vi.fn(),
  login: vi.fn(),
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))

import api, { useApi, useReportApi, useAIApi, useSnapshotApi, isAbsoluteUrl } from './useApi'

// Records every request that reaches the network and answers with the given statuses in turn.
function respond(...statuses: Array<number | { status: number; data: unknown }>) {
  const seen: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config)
    const next = statuses.shift() ?? 200
    const { status, data } = typeof next === 'number' ? { status: next, data: {} } : next
    const response = { status, statusText: '', headers: {}, config, data }
    if (status >= 400) {
      throw Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, config, response })
    }
    return response
  }
  api.defaults.adapter = adapter
  return seen
}

beforeEach(() => {
  auth.csrf = 'csrf-1'
  auth.recheckSession.mockReset()
  auth.login.mockReset()
  window.history.replaceState(null, '', '/plans/1?tab=pnl')
})

describe('useApi instances', () => {
  it('call the SPA origin, with no credentials for other origins', () => {
    for (const instance of [api, useReportApi(), useSnapshotApi(), useAIApi()]) {
      expect(instance.defaults.baseURL).toBe('')
      expect(instance.defaults.withCredentials).toBe(false)
      expect(instance.defaults.headers['Content-Type']).toBe('application/json')
    }
    expect(useApi()).toBe(api)
    expect(api.defaults.timeout).toBe(5000)
    expect(useReportApi().defaults.timeout).toBe(30_000)
    expect(useSnapshotApi().defaults.timeout).toBe(60_000)
    expect(useAIApi().defaults.timeout).toBe(120_000)
  })
})

describe('request interceptor', () => {
  it('never sends an Authorization header', async () => {
    const seen = respond(200, 200)
    await api.get('/api/v1/plans', { headers: { Authorization: 'Bearer smuggled' } })
    await api.post('/api/v1/plans', {}, { headers: { Authorization: 'Bearer smuggled' } })
    for (const config of seen) expect(config.headers.has('Authorization')).toBe(false)
  })

  it.each(['post', 'put', 'patch', 'delete'] as const)('sends the CSRF token on %s', async (method) => {
    const seen = respond(200)
    await api.request({ method, url: '/api/v1/plans/1' })
    expect(seen[0].headers.get('X-CSRF-Token')).toBe('csrf-1')
  })

  it('sends no CSRF token on safe methods', async () => {
    const seen = respond(200, 200)
    await api.get('/api/v1/plans')
    await api.head('/api/v1/plans')
    for (const config of seen) expect(config.headers.has('X-CSRF-Token')).toBe(false)
  })

  it.each(['https://evil.example/api/v1/plans', '//evil.example/api', 'http://localhost:8080/api/v1/plans'])(
    'refuses a request to another origin: %s',
    async (url) => {
      const seen = respond(200)
      await expect(api.get(url)).rejects.toThrow(/cross-origin/)
      expect(seen).toHaveLength(0)
    },
  )

  it('tells absolute from relative URLs', () => {
    expect(isAbsoluteUrl('/api/v1/plans')).toBe(false)
    expect(isAbsoluteUrl('plans')).toBe(false)
    expect(isAbsoluteUrl(undefined)).toBe(false)
    expect(isAbsoluteUrl('HTTPS://x')).toBe(true)
    expect(isAbsoluteUrl('//x')).toBe(true)
  })
})

describe('response interceptor', () => {
  it('on 401 re-checks the session and, when it is gone, signs in again to this page', async () => {
    respond(401)
    auth.recheckSession.mockResolvedValueOnce(false)
    await expect(api.get('/api/v1/plans')).rejects.toMatchObject({ response: { status: 401 } })
    expect(auth.recheckSession).toHaveBeenCalledOnce()
    expect(auth.login).toHaveBeenCalledWith('/plans/1?tab=pnl')
  })

  it('on 401 with the session still there, reports the error without a sign-in loop', async () => {
    respond(401)
    auth.recheckSession.mockResolvedValueOnce(true)
    await expect(api.get('/api/v1/plans')).rejects.toBeTruthy()
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('on a CSRF refusal fetches the current token and retries once', async () => {
    const seen = respond({ status: 403, data: { message: 'missing or invalid CSRF token' } }, 200)
    auth.csrf = 'stale'
    auth.recheckSession.mockImplementationOnce(async () => { auth.csrf = 'fresh'; return true })

    const res = await api.post('/api/v1/plans', {})

    expect(res.status).toBe(200)
    expect(seen.map(c => c.headers.get('X-CSRF-Token'))).toEqual(['stale', 'fresh'])
  })

  it('does not retry a CSRF refusal twice', async () => {
    const seen = respond(
      { status: 403, data: { message: 'missing or invalid CSRF token' } },
      { status: 403, data: { message: 'missing or invalid CSRF token' } },
    )
    auth.recheckSession.mockResolvedValue(true)
    await expect(api.post('/api/v1/plans', {})).rejects.toBeTruthy()
    expect(seen).toHaveLength(2)
  })

  it('does not retry any other 403', async () => {
    const seen = respond({ status: 403, data: { message: 'plan access denied' } })
    await expect(api.post('/api/v1/plans', {})).rejects.toBeTruthy()
    expect(seen).toHaveLength(1)
    expect(auth.recheckSession).not.toHaveBeenCalled()
  })
})
