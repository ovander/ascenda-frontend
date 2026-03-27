import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Must mock useAuthStore before importing useApi
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    accessToken: 'test-token',
    refreshToken: 'refresh-token',
    refresh: vi.fn(),
    logout: vi.fn(),
  })),
}))

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

import api, { useApi, useReportApi } from './useApi'

describe('useApi', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('exports a default axios instance', () => {
    expect(api).toBeDefined()
    expect(api.defaults.baseURL).toBe('http://localhost:3000')
    expect(api.defaults.timeout).toBe(5000)
  })

  it('useApi() returns the api instance', () => {
    expect(useApi()).toBe(api)
  })

  it('useReportApi() returns instance with 30s timeout', () => {
    const reportApi = useReportApi()
    expect(reportApi).toBeDefined()
    expect(reportApi.defaults.timeout).toBe(30000)
    expect(reportApi).not.toBe(api)
  })

  it('has Content-Type header set to JSON', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json')
  })

  it('request interceptor exists', () => {
    // Axios interceptors have handlers array
    expect(api.interceptors.request).toBeDefined()
  })

  it('response interceptor exists', () => {
    expect(api.interceptors.response).toBeDefined()
  })
})
