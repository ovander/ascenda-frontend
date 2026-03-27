import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// graphStore uses `const api = useApi()` (named export), not default import
const { mockApiInstance } = vi.hoisted(() => {
  const mockApiInstance = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
  return { mockApiInstance }
})
vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => mockApiInstance),
  default: mockApiInstance,
}))
vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: vi.fn(() => ({ activePlan: { id: 'plan-1' } })),
}))
vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: vi.fn(() => ({ activeScenario: { id: 'sc-1' } })),
}))

import { useGraphStore } from './graphStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1'
const mockChart = { labels: ['2025', '2026'], datasets: [{ label: 'Revenue', data: [100, 200] }] }

describe('useGraphStore', () => {
  let store: ReturnType<typeof useGraphStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useGraphStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('annualCharts is empty object', () => { expect(store.annualCharts).toEqual({}) })
    it('monthlyCharts is empty object', () => { expect(store.monthlyCharts).toEqual({}) })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('fetchAnnualChart', () => {
    it('stores chart in annualCharts keyed by name', async () => {
      mockApiInstance.get.mockResolvedValue({ data: mockChart })
      await store.fetchAnnualChart('revenue')
      expect(store.annualCharts['revenue']).toEqual(mockChart)
    })

    it('calls correct endpoint', async () => {
      mockApiInstance.get.mockResolvedValue({ data: mockChart })
      await store.fetchAnnualChart('revenue')
      expect(mockApiInstance.get).toHaveBeenCalledWith(`${BASE}/graphs/annual?name=revenue`)
    })
  })

  describe('fetchMonthlyChart', () => {
    it('stores chart in monthlyCharts keyed by name', async () => {
      mockApiInstance.get.mockResolvedValue({ data: mockChart })
      await store.fetchMonthlyChart('revenue')
      expect(store.monthlyCharts['revenue']).toEqual(mockChart)
    })

    it('calls correct endpoint', async () => {
      mockApiInstance.get.mockResolvedValue({ data: mockChart })
      await store.fetchMonthlyChart('cashflow')
      expect(mockApiInstance.get).toHaveBeenCalledWith(`${BASE}/graphs/monthly?name=cashflow`)
    })
  })

  describe('fetchAllAnnual', () => {
    it('sets loading true then false', async () => {
      let seenLoading = false
      mockApiInstance.get.mockImplementation(async () => {
        seenLoading = store.loading
        return { data: mockChart }
      })
      await store.fetchAllAnnual()
      expect(seenLoading).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('sets error on failure', async () => {
      mockApiInstance.get.mockRejectedValue(new Error('Network error'))
      await store.fetchAllAnnual()
      expect(store.error).toBeTruthy()
    })

    it('clears loading on error', async () => {
      mockApiInstance.get.mockRejectedValue(new Error('fail'))
      await store.fetchAllAnnual()
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchAllMonthly', () => {
    it('sets loading true then false', async () => {
      let seenLoading = false
      mockApiInstance.get.mockImplementation(async () => {
        seenLoading = store.loading
        return { data: mockChart }
      })
      await store.fetchAllMonthly()
      expect(seenLoading).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('sets error on failure', async () => {
      mockApiInstance.get.mockRejectedValue(new Error('Network error'))
      await store.fetchAllMonthly()
      expect(store.error).toBeTruthy()
    })
  })
})
