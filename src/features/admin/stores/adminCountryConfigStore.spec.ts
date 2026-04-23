import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockApi } = vi.hoisted(() => {
  const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
  return { mockApi }
})
vi.mock('@/composables/useApi', () => ({ default: mockApi }))

import { useAdminCountryConfigStore } from './adminCountryConfigStore'
import type { CountryRateConfig, CreateCountryRateConfigRequest } from './adminCountryConfigStore'

// ── fixtures ──────────────────────────────────────────────────────────────────

const fr: CountryRateConfig = {
  countryCode: 'FR',
  countryName: 'France',
  corporateTaxRate: 0.25,
  vatRate: 0.20,
  employerTaxRate: 0.45,
  mltInterestRate: 0.03,
  language: 'fr',
  currencySymbol: '€',
  updatedAt: '2026-01-01T00:00:00Z',
}

const be: CountryRateConfig = {
  countryCode: 'BE',
  countryName: 'Belgium',
  corporateTaxRate: 0.25,
  vatRate: 0.21,
  employerTaxRate: 0.2767,
  mltInterestRate: 0.03,
  language: 'fr',
  currencySymbol: '€',
  updatedAt: '2026-01-01T00:00:00Z',
}

const jpReq: CreateCountryRateConfigRequest = {
  countryCode: 'JP',
  countryName: 'Japan',
  corporateTaxRate: 0.2366,
  vatRate: 0.10,
  employerTaxRate: 0.1455,
  mltInterestRate: 0.005,
  language: 'ja',
  currencySymbol: '¥',
}

const jp: CountryRateConfig = { ...jpReq, updatedAt: '2026-03-27T00:00:00Z' }

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// ── fetchAll ──────────────────────────────────────────────────────────────────

describe('fetchAll', () => {
  it('populates configs and clears loading/error on success', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [fr, be] })
    const store = useAdminCountryConfigStore()

    await store.fetchAll()

    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/country-configs')
    expect(store.configs).toEqual([fr, be])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets loading true during request and false after', async () => {
    let resolveCall!: (v: any) => void
    mockApi.get.mockReturnValueOnce(new Promise(r => { resolveCall = r }))
    const store = useAdminCountryConfigStore()

    const p = store.fetchAll()
    expect(store.loading).toBe(true)
    resolveCall({ data: [] })
    await p
    expect(store.loading).toBe(false)
  })

  it('sets error and leaves configs empty on API failure', async () => {
    mockApi.get.mockRejectedValueOnce({ response: { data: { message: 'db down' } } })
    const store = useAdminCountryConfigStore()

    await store.fetchAll()

    expect(store.error).toBe('db down')
    expect(store.configs).toEqual([])
  })

  it('falls back to default error message when response has no message', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('network'))
    const store = useAdminCountryConfigStore()

    await store.fetchAll()

    expect(store.error).toBe('Failed to load country configs')
  })
})

// ── create ────────────────────────────────────────────────────────────────────

describe('create', () => {
  it('posts to correct URL and appends new config to list', async () => {
    mockApi.post.mockResolvedValueOnce({ data: jp })
    const store = useAdminCountryConfigStore()
    store.configs = [fr, be]

    const result = await store.create(jpReq)

    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/admin/country-configs', jpReq)
    expect(result).toEqual(jp)
    expect(store.configs).toHaveLength(3)
    expect(store.configs[2]).toEqual(jp)
  })

  it('returns null and sets error on API failure', async () => {
    mockApi.post.mockRejectedValueOnce({ response: { data: { message: 'code already exists' } } })
    const store = useAdminCountryConfigStore()

    const result = await store.create(jpReq)

    expect(result).toBeNull()
    expect(store.error).toBe('code already exists')
    expect(store.configs).toHaveLength(0)
  })

  it('uses default error message when response has no message', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('network'))
    const store = useAdminCountryConfigStore()

    await store.create(jpReq)

    expect(store.error).toBe('Failed to create country config')
  })

  it('sets saving true during request and false after', async () => {
    let resolve!: (v: any) => void
    mockApi.post.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const store = useAdminCountryConfigStore()

    const p = store.create(jpReq)
    expect(store.saving).toBe(true)
    resolve({ data: jp })
    await p
    expect(store.saving).toBe(false)
  })

  it('clears previous error before posting', async () => {
    mockApi.post.mockResolvedValueOnce({ data: jp })
    const store = useAdminCountryConfigStore()
    store.configs = []
    // manually set a stale error
    ;(store as any).error = 'stale error'

    await store.create(jpReq)

    expect(store.error).toBeNull()
  })
})

// ── update ────────────────────────────────────────────────────────────────────

describe('update', () => {
  it('calls PUT and replaces the config in the list', async () => {
    const updated = { ...fr, corporateTaxRate: 0.30 }
    mockApi.put.mockResolvedValueOnce({ data: updated })
    const store = useAdminCountryConfigStore()
    store.configs = [fr, be]

    const result = await store.update('FR', { corporateTaxRate: 0.30 })

    expect(mockApi.put).toHaveBeenCalledWith('/api/v1/admin/country-configs/FR', { corporateTaxRate: 0.30 })
    expect(result).toEqual(updated)
    expect(store.configs[0]).toEqual(updated)
    expect(store.configs[1]).toEqual(be) // other row untouched
  })

  it('returns null and sets error on failure', async () => {
    mockApi.put.mockRejectedValueOnce({ response: { data: { message: 'not found' } } })
    const store = useAdminCountryConfigStore()
    store.configs = [fr]

    const result = await store.update('FR', {})

    expect(result).toBeNull()
    expect(store.error).toBe('not found')
    expect(store.configs[0]).toEqual(fr) // original untouched
  })
})

// ── resetToDefault ────────────────────────────────────────────────────────────

describe('resetToDefault', () => {
  it('posts to reset endpoint and updates config in list', async () => {
    const defaultFr = { ...fr, vatRate: 0.20 }
    mockApi.post.mockResolvedValueOnce({ data: defaultFr })
    const store = useAdminCountryConfigStore()
    store.configs = [{ ...fr, vatRate: 0.999 }]

    const result = await store.resetToDefault('FR')

    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/admin/country-configs/FR/reset')
    expect(result).toEqual(defaultFr)
    expect(store.configs[0].vatRate).toBe(0.20)
  })

  it('returns null and sets error on failure', async () => {
    mockApi.post.mockRejectedValueOnce({ response: { data: { message: 'server error' } } })
    const store = useAdminCountryConfigStore()

    const result = await store.resetToDefault('FR')

    expect(result).toBeNull()
    expect(store.error).toBe('server error')
  })
})
